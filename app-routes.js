var AuthManager = require('./auth-manager'); // charge le gestionnaire d'authentification d�fini dans ./auth-manager.js
var config = require('./config');
var bodyParser = require('body-parser'); // Charge le middleware de gestion des param�tres
var urlencodedParser = bodyParser.urlencoded({
		extended : false
	});

module.exports = function (app) {

	/** Middleware for limited access **/
	function requireLogin(req, res, next) {
		// page d'accueil: v�rification qu'il y a un token
		// enregistr� en session:
		if (typeof(req.session.authToken) == 'undefined' || req.session.authToken == null) {
			console.log('Aucun token en session.');

			// aucun token en session : on affiche le template de connexion.
			res.render(config.templatesUrls.logIn, {
				"message" : "Veuillez vous connecter."
			});
		} else {
			// Il y a un token en session;
			// on va le v�rifier.
			AuthManager.checkToken(req.session.authToken, function (valid, username) {
				if (!valid) {
					console.log('Token invalide');
					console.log('Affichage de la page de connexion');
					res.render(config.templatesUrls.logIn, {
						"message" : "Session expir�e, veuillez vous reconnecter."
					});
				} else {
					console.log('Token valide, utilisateur: [' + username + ']');
					
					// l'utilisateur est authentifi�, on le laisse passer.
					next();
				}
			});
		}
	}

	/** GESTION DES ROUTES **/
	app.get('/', requireLogin, function (req, res, next) {
		res.render(config.templatesUrls.index, {
			'username' : req.session.username
		});
	});
	app.post('/login', urlencodedParser, function (req, res) {

		// on teste que le login & le password ont bien �t� renseign�s.
		if (req.body.login != '') {

			// on lance la v�rification des identifiants.
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
					console.log('L\'utilisateur a bien �t� authentifi� !');

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
					"message" : "D�connexion r�alis�e avec succ�s."
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

			// donn�es suppl�mentaires:
			var extras = {
				date : new Date(),
				name : 'Finnius F. Bar'
			};

			// cr�ation de l'utilisateur...
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
	app.use(function (req, res, next) {
		// Page non trouv�e ? redirection vers /
		res.redirect('/');
	});
}
