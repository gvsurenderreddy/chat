var AuthManager = require('./auth-manager'); // charge le gestionnaire d'authentification défini dans ./auth-manager.js
var config = require('./config');
var bodyParser = require('body-parser'); // Charge le middleware de gestion des paramètres
var urlencodedParser = bodyParser.urlencoded({ extended : false });
var express = require('express');
var moment = require('moment');
var fs = require('fs');
var assert = require('assert');
var formidable = require('formidable');
var util = require('util');
var log = require('gelf-pro');
log.setConfig(config.gelfProConfig);


module.exports = function (app) {

	/** Middleware for limited access **/
	function requireLogin(req, res, next) {
		
		log.info("requireLogin");
		
		// page d'accueil: vérification qu'il y a un token enregistré en session.
		log.info("page d'accueil: vérification qu'il y a un token enregistré en session.");
		if (typeof(req.session.authToken) == 'undefined' || req.session.authToken == null) {
			
			// aucun token en session : on affiche le template de connexion.
			log.info("requireLogin - aucun token en session : on affiche le template de connexion.");
			res.render(config.templatesUrls.logIn, { "message" : "Veuillez vous connecter." });
			return;
		}

		// Il y a un token en session;
		// on va le vérifier.
		log.info("Il y a un token en session, on va le vérifier...");
		AuthManager.checkToken(req.session.authToken, function (err, valid, username, extras) {
			
			if (err) {
				log.error("requireLogin - Erreur...", err);
				res.render(config.templatesUrls.logIn, { "message" : "Une exception s'est produite : " + err });
				return;
			}

			if (!valid) {
				log.info("requireLogin - Session utilisateur expirée: ", {"valid":valid, "username": username, "extras": extras });
				res.render(config.templatesUrls.logIn, { "message" : "Session expirée, veuillez vous reconnecter." });
				return;
			}
			
			log.info("requireLogin - Utilisateur authentifié [" + username + "]");
			req.session.extras = extras; // on stocke les données supplémentaires en session:
			next(); // l'utilisateur est authentifié, on le laisse passer.
		});
	}

	// GESTION DES "PAGES" DE L'APPLICATION
	app.get('/', requireLogin, function (req, res, next) {
		
		log.info("GET request on / received.");
		
		res.render(config.templatesUrls.index, {
			'username' : req.session.username,
			'blockSize' : config.fileUpload.blockSize
		});
	});
	app.post('/login', urlencodedParser, function (req, res) {
		
		log.info("GET request on /login received.");
		
		// on teste que le login & le password ont bien été renseignés.
		if (req.body.login != '') {
			
			// on lance la vérification des identifiants.
			AuthManager.checkCredentials(req.body.login, req.body.password, function (err, result, extras) {
				
				// Always check err before doing anything!
				if (err) {
					// Erreur survenue.
					log.error("Error occurred while checking credentials.", err);
				}else{
					
					// Pas d'erreur.
					if (!result.userExists || !result.passwordsMatch) {
						
						// password incorrect/Mauvais nom d'utilisateur
						res.statusCode = 401;
						res.render(config.templatesUrls.logIn, {
							'error' : "Utilisateur ou mot de passe invalide"
						});
						
						log.error("Unknown username or invalid password!");
						
					} else {
						AuthManager.getUserProfile(result.token, function (err, extras) {
							if (err) {
								log.error("Error while getting user profile.", err);
								res.statusCode = 401;
								res.render(config.templatesUrls.logIn, { 'error' : err });
								return;
							}
							
							
							log.info("User profile retrieved successfully for username " + req.body.login);
							
							// on stocke le token en session:
							req.session.authToken = result.token;

							// on stocke le username en session
							req.session.username = req.body.login;

							// on stocke en session les infos du profil.
							req.session.extras = extras;

							// on redirige vers la page d'accueil.
							res.redirect('/');
						});
					}
				}
				
			});
			
		} else {
			res.render(config.templatesUrls.logIn, {
				'error' : "Merci de renseigner le login"
			});
		}
		
	});
	app.get('/logout', function (req, res) {
		
		log.info("GET request on /logout received.");
		
		if (req.session.authToken != null) {
			AuthManager.logOutUser(req.session.authToken, function (err, message) {
				
				// on vide les variables en session.
				req.session.authToken = null;
				req.session.username = null;
				req.session.extras = null;
				
				res.render(config.templatesUrls.logOut, {
					'error' : err,
					'message' : message
				});
			});
		} else {
			res.redirect('/');
		}
	});
	app.get('/signin', function (req, res) {
		
		log.info("GET request on /signin received.");
		
		res.render(config.templatesUrls.signIn, {});
	});
	app.post('/signin', urlencodedParser, function (req, res) {
		
		log.info("POST request on /signin received.");
		
		if (req.body.login != '' && req.body.password != '') {
			// données supplémentaires:
			var extras = {
				date : new Date(),
				name : 'Finnius F. Bar',
				avatar : ''
			};

			// création de l'utilisateur...
			AuthManager.createUser(req.body.login, req.body.password, extras, function (err, message) {
				if (err) {
					res.render(config.templatesUrls.signIn, {
						'error' : err
					});
					return;
				}
				
				res.render(config.templatesUrls.logIn, {
					'message' : message
				});
			});
		} else {
			res.render(config.templatesUrls.signIn, {
				'error' : "Merci de renseigner les champs obligatoires."
			});
		}
	});
	app.get('/api/:resource', requireLogin, function (req, res, next) {
		
		log.info("GET request on /api/:resource received.");
		
		if (req.params.resource == "users-status") {
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(config.usersStatus));
		}
	});
	app.get('/userProfile', requireLogin, function (req, res, next) {
		
		log.info("GET request on /userProfile received.");
		
		AuthManager.getUserProfile(req.session.authToken, function (err, extras) {
			if (err) {
				res.render(config.templatesUrls.userProfile, {
					'username' : req.session.username,
					'userProfile' : null,
					'error' : err
				});
				return;
			}

			res.render(config.templatesUrls.userProfile, {
				'username' : req.session.username,
				'userProfile' : JSON.stringify(extras),
				'error' : null
			});
		});
	});
	
	/*app.post('/userProfile', urlencodedParser, function (req, res, next) {

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

		AuthManager.setUserProfile(req.session.authToken, extras, function (err, message) {
			console.log("Profil sauvegardé avec succès.");
			var data = {
				'error' : err,
				'message' : "Profil sauvegardé avec succès."
			};
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(data));
		});
	});*/
	
	app.post('/userProfile', function (req, res) {
		
		log.info("POST request on /userProfile received.");
		
		var extras = {};
		var form = new formidable.IncomingForm();
		form.encoding = 'utf-8';
		form.keepExtensions = true;
		form.uploadDir = __dirname + '/../' + config.usersAvatars.dirPath;
		form.parse(req, function (err, fields, files) {
			if (err) {
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({
						'place' : 'form.parse()',
						'error' : err,
						'message' : null
					}));
			}
		});
		form.on('fileBegin', function (name, file) {
			if (file.name != '') {
				console.log("file.name: "+file.name);
				extras.filename = file.name;
				var newPath = __dirname + '/../' + config.usersAvatars.dirPath + file.name;
				file.path = newPath;
				console.log("newPath: ", newPath);
			}
		});
		form.on('end', function () {
			
			AuthManager.setUserProfile(req.session.authToken, extras, function (err, message) {
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({
					'place' : 'form.on(\'end\')',
					'error' : err,
					'message' : message
				}));
			});
		});
		form.on('field', function (name, value) {
			
			console.log(name);
			
			if (value != '')
				extras[name] = value;
		});
		form.on('error', function (err) {
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({
					'place' : 'form.on(\'error\')',
					'error' : err,
					'message' : null
				}));
		});
	});

	// RESOURCES FILES : PUBLIC
	app.use('/avatars', express.static(__dirname + '/../' + config.usersAvatars.dirPath));
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
		
		log.info("Page not found... redirecting to / page");
		
		// Page non trouvée ? redirection vers /
		res.redirect('/');
	});
};
