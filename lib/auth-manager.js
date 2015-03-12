var assert = require('assert');
var UserManagement = require('user-management');
var config = require('./config');

/** Module méthodes d'authentification **/
module.exports = {

	/** Vérification des inforamtions de connexion */
	checkCredentials : function (username, password, callback) {

		// vérification des paramètres en entrée :
		assert.equal(typeof(username), 'string', "'username' must be a string.");
		assert.equal(typeof(password), 'string', "'password' must be a string.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		try {
			// création de l'objet UserManagement.
			var users = new UserManagement(config.userMgmtOptions);

			// The load method connects to MongoDB and loads the user management database.
			users.load(function (err) {
				// gestion d'erreurs
				assert.equal(null, err);
				users.authenticateUser(username, password, function (err, result) {
					// verif de la var "err"
					assert.equal(null, err);

					// fermeture de l'objet users.
					users.close();

					// appel au callback passé en paramètre
					callback(result);
				});
			});

		} catch (e) {
			console.log('e=' + e);
		}
	},

	/** Vérification du jeton */
	checkToken : function (token, callback) {

		assert.equal(typeof(token), 'string', "'token' must be a string.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		try {
			// chargement de l'objet UserManagement
			var users = new UserManagement(config.userMgmtOptions);

			// The load method connects to MongoDB and loads the user management database
			users.load(function (err) {
				// on vérifie que 'err' est bien nul.
				assert.equal(null, err);

				// vérification du token:
				users.isTokenValid(token, function (err, valid) {

					// récupérer le nom d'utilisateur
					users.getUsernameForToken(token, function (err2, username) {
						// test variable err
						assert.equal(null, err2);

						// debogage console
						console.log('The username for the token is: ' + username);

						// fermeture de l'objet users.
						users.close();

						// on appelle le callback passé en param
						callback(valid, username);
					});

				});
			});
		} catch (e) {
			console.dir(e);
		}
	},

	/** creation de l'utilisateur */
	createUser : function (username, password, extras, callback) {

		assert.equal(typeof(username), 'string', "'username' must be a string.");
		assert.equal(typeof(password), 'string', "'password' must be a string.");
		assert.equal(typeof(extras), 'object', "'extras' must be a object.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		try {
			// chargement de l'objet UserManagement
			var users = new UserManagement(config.userMgmtOptions);

			// The load method connects to MongoDB and loads the user management database
			users.load(function (err) {

				// on vérifie que 'err' est bien nul.
				assert.equal(null, err);

				console.log('Vérification: l\'utilisateur existe-t-il déjà ?');
				users.userExists(username, function (err, exists) {
					if (exists) {
						console.log('L\'utilisateur existe déjà.');
						users.close();
						callback({
							'message' : 'L\'utilisateur existe déjà.',
							'error' : true
						});
					} else {
						console.log('User does not exist');
						console.log('Creating the user...');
						users.createUser(username, password, extras, function (err) {
							console.log('User created !');
							users.close();
							callback({
								'message' : "L'utilisateur a été créé.",
								'error' : false
							});
						});
					}
				});
			});
		} catch (e) {
			console.dir(e);
		}
	},

	/** deco utilisateur : jeton expiré */
	logOutUser : function (token, callback) {

		assert.equal(typeof(token), 'string', "'token' must be a string.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		try {

			// chargement de l'objet UserManagement
			var users = new UserManagement(config.userMgmtOptions);

			// The load method connects to MongoDB and loads the user management database
			users.load(function (err) {
				// on vérifie que 'err' est bien nul.
				assert.equal(null, err);

				console.log('Déconnexion de l\'utilisateur');

				users.expireToken(token, function (error) {
					//assert.equal(null, error);
					callback(error);
				});
			});
		} catch (e) {
			console.dir(e);
		}
	},

	/** getUserProfile
	 * token est le jeton d'authentification
	 * callback est la fonction à appeler, et prend les paramètres suivants: extras et err
	 */
	getUserProfile : function (token, callback) {

		assert.equal(typeof(token), 'string', "'token' must be a string.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		try {
			// chargement de l'objet UserManagement
			var users = new UserManagement(config.userMgmtOptions);

			// The load method connects to MongoDB and loads the user management database
			users.load(function (err) {
				// on vérifie que 'err' est bien nul.
				assert.equal(null, err);

				// vérification du token:
				users.isTokenValid(token, function (err, valid) {
					if (!valid) {
						console.log('The token is not valid !');
						throw err;
					} else {
						users.getExtrasForToken(token, function (err, extras) {
							// on vérif que la variable err est nulle
							assert.equal(null, err);

							// on appelle le callback avec les paramètres
							callback(extras, err);

							console.dir(extras);
						});
					}
				});
			});
		} catch (e) {
			console.dir(e);
		}
	},

	/** setUserProfile */
	setUserProfile : function (token, extras, callback) {

		assert.equal(typeof(token), 'string', "'token' must be a string.");
		assert.equal(typeof(extras), 'object', "'extras' must be a object.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");
		try {
			// chargement de l'objet UserManagement
			var users = new UserManagement(config.userMgmtOptions);

			// The load method connects to MongoDB and loads the user management database
			users.load(function (err) {
				// on vérifie que 'err' est bien nul.
				assert.equal(null, err);

				// vérification du token:
				users.isTokenValid(token, function (err, valid) {
					if (!valid) {
						console.log('The token is not valid !');
						//throw err;
						callback('The token is not valid !');
					} else {
						users.setExtrasForToken(token, extras, function (err) {
							// on vérif que la variable err est nulle
							assert.equal(null, err);
							// on appelle le callback avec les paramètres
							callback(err);
						});
					}
				});
			});
		} catch (e) {
			console.dir(e);
		}
	}

};
