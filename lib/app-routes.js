var AuthManager = require('./auth-manager'); // charge le gestionnaire d'authentification défini dans ./auth-manager.js
var config = require('./config');
var bodyParser = require('body-parser'); // Charge le middleware de gestion des paramètres
var urlencodedParser = bodyParser.urlencoded({
		extended : false
	});
var express = require('express');
var moment = require('moment');

module.exports = function (app) {

	/** Middleware for limited access **/
	function requireLogin(req, res, next) {
		// page d'accueil: vérification qu'il y a un token
		// enregistré en session:
		if (typeof(req.session.authToken) == 'undefined' || req.session.authToken == null) {
			console.log('Aucun token en session.');

			// aucun token en session : on affiche le template de connexion.
			res.render(config.templatesUrls.logIn, {
				"message" : "Veuillez vous connecter."
			});
		} else {
			// Il y a un token en session;
			// on va le vérifier.
			AuthManager.checkToken(req.session.authToken, function (valid, username) {
				if (!valid) {
					console.log('Token invalide');
					console.log('Affichage de la page de connexion');
					res.render(config.templatesUrls.logIn, {
						"message" : "Session expirée, veuillez vous reconnecter."
					});
				} else {
					console.log('Token valide, utilisateur: [' + username + ']');

					// l'utilisateur est authentifié, on le laisse passer.
					next();
				}
			});
		}
	}

	// GESTION DES "PAGES" DE L'APPLICATION
	app.get('/', requireLogin, function (req, res, next) {
		res.render(config.templatesUrls.index, {
			'username' : req.session.username,
			'blockSize' : config.fileUpload.blockSize
		});
	});
	app.post('/login', urlencodedParser, function (req, res) {

		// on teste que le login & le password ont bien été renseignés.
		if (req.body.login != '') {

			// on lance la vérification des identifiants.
			AuthManager.checkCredentials(req.body.login, req.body.password, function (result) {
				if (!result.userExists || !result.passwordsMatch) {
					// password incorrect
					console.log('Utilisateur ou mot de passe invalide');
					res.statusCode = 401;
					res.render(config.templatesUrls.logIn, {
						'error' : "Utilisateur ou mot de passe invalide"
					});
				} else {
					// ok !
					console.log('L\'utilisateur a bien été authentifié !');

					// on stocke le token en session:
					req.session.authToken = result.token;

					// on stocke le username en session
					req.session.username = req.body.login;

					// on redirige vers la page d'accueil.
					res.redirect('/');
				}
			});
		} else {
			res.render(config.templatesUrls.logIn, {
				'error' : "Merci de renseigner le login"
			});
		}
	});
	app.get('/logout', function (req, res) {
		if (typeof(req.session.authToken) !== null) {
			AuthManager.logOutUser(req.session.authToken, function (error) {
				req.session.authToken = null;
				var obj = error ? {
					"error" : error
				}
				 : {
					"message" : "Déconnexion réalisée avec succès."
				};
				res.render(config.templatesUrls.logOut, obj);
			});
		} else {
			res.redirect('/');
		}
	});
	app.get('/signin', function (req, res) {
		res.render(config.templatesUrls.signIn, {});
	});
	app.post('/signin', urlencodedParser, function (req, res) {
		if (req.body.login != '' && req.body.password != '') {

			// verif du nom d'utilisateur (caractères alphanum, - et _ autorisés)
			var regex = /^(\-|\w|\_|\d)+$/g;
			var test = regex.test(req.body.login);
			console.log("test = " + test);

			if (test === false) {
				res.render(config.templatesUrls.signIn, {
					error : "Caractères invalides détectés. Impossible de créer l'utilisateur avec ce login. Choisissez un nom contenant uniquement des caractères alphanumériques, un tiret ou un underscore."
				});
				return;
			}

			// données supplémentaires:
			var extras = {
				date : new Date(),
				name : 'Finnius F. Bar',
				avatar : ''
			};

			// création de l'utilisateur...
			AuthManager.createUser(req.body.login, req.body.password, extras, function (result) {
				if (result.error == true) {
					res.render(config.templatesUrls.signIn, {
						'error' : result.message
					});
				} else {
					res.render(config.templatesUrls.logIn, {
						'message' : result.message
					});
				}
			});
		} else {
			res.render(config.templatesUrls.signIn, {
				'error' : "Merci de renseigner les champs obligatoires"
			});
		}
	});
	app.get('/api/:resource', requireLogin, function (req, res, next) {
		if (req.params.resource == "users-status") {
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(config.usersStatus));
		}
	});
	app.get('/userProfile', requireLogin, function (req, res, next) {
		AuthManager.getUserProfile(req.session.authToken, function (extras, err) {
			
			if (extras['date-of-birth'] != '' || extras['date-of-birth'] != null){
				extras['date-of-birth'] = moment(new Date(extras['date-of-birth']));
				console.log('dob: ' + extras['date-of-birth']);
			}
			res.render(config.templatesUrls.userProfile, {
				'username' : req.session.username,
				'userProfile' : JSON.stringify(extras)
			});
		});
	});
	app.post('/userProfile', urlencodedParser, function (req, res, next) {

		console.log("[POST]/userProfile!");

		var extras = {};

		if (req.body['lastname'] != '')
			extras['lastname'] = req.body['lastname'];

		if (req.body['firstname'] != '')
			extras['firstname'] = req.body['firstname'];

		if (req.body['email'] != '')
			extras['email'] = req.body['email'];

		if (req.body['date-of-birth'] != null)
			extras['date-of-birth'] = req.body['date-of-birth'];

		if (req.body['country'] != '')
			extras['country'] = req.body['country'];

		if (req.body['avatar-image'] != '')
			extras['avatar-image'] = req.body['avatar-image'];

		//console.dir(extras);

		console.dir("session: " + req.session);

		AuthManager.setUserProfile(req.session.authToken, extras, function (err) {
			var data = {
				'error' : err,
				'message' : "Profil sauvegardé avec succès."
			};
			//console.dir(data);
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(data));
		});
	});

	// RESOURCES FILES : PUBLIC
	app.use('/share', express.static(__dirname + '/../' + config.fileUpload.shareDir));
	app.use('/bootstrap', express.static(__dirname + '/../node_modules/bootstrap/dist'));
	app.use('/bootstrap-datepicker', express.static(__dirname + '/../node_modules/bootstrap-datepicker/dist'));
	app.use('/moment', express.static(__dirname + '/../node_modules/moment'));
	app.use('/css', express.static(__dirname + '/../css'));
	app.use('/js', express.static(__dirname + '/../js'));
	app.use('/dist', express.static(__dirname + '/../dist'));
	app.use('/font-awesome', express.static(__dirname + '/../node_modules/font-awesome'));

	// PAGE NON TROUVEE ...
	app.use(function (req, res, next) {
		// Page non trouvée ? redirection vers /
		res.redirect('/');
	});
};
