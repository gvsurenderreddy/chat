var assert = require('assert');
var UserManagement = require('user-management');
var config = require('./config');
var log = require('gelf-pro');
log.setConfig(config.gelfProConfig);


/** Module méthodes d'authentification **/
module.exports = {

	/**
	 * Check some user's credentials.
	 * @param {string} username - The username or login of the user.
	 * @param {string} password - The password of the user.
	 * @param {function} callback - The function to call after the check has been carried out. Callback params: err, result.
	 */
	checkCredentials : function (username, password, callback) {

		// vérification des paramètres en entrée :
		assert.equal(typeof(username), 'string', "'username' must be a string.");
		assert.equal(typeof(password), 'string', "'password' must be a string.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		// création de l'objet UserManagement.
		var users = new UserManagement(config.userMgmtOptions);

		// The load method connects to MongoDB and loads the user management database.
		users.load(function (err) {
			if (err) {
				callback(err, null);
				return;
			}
			users.authenticateUser(username, password, function (err, result) {
				if (err) {
					callback(err, null);
					return
				}
				users.close(); // fermeture de l'objet users.
				callback(null, result); // appel au callback passé en paramètre
			});
		});
	},

	/**
	 * Check user's authentication token.
	 * @param {string} token - The user's authentication token (can be null, so no need to be checked).
	 * @param {function} callback - The function to call after the check has been carried out. Must be set. Callback params: err, valid, username, extras.
	 */
	checkToken : function (token, callback) {
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		// chargement de l'objet UserManagement
		var users = new UserManagement(config.userMgmtOptions);

		// The load method connects to MongoDB and loads the user management database
		users.load(function (err) {
			if (err) {
				callback(err, null, null, null);
				return;
			}
			// vérification du token:
			users.isTokenValid(token, function (err, valid) {
				if (err) {
					callback(err, null, null, null);
					return;
				}
				// récupérer le nom d'utilisateur
				users.getUsernameForToken(token, function (err, username) {
					if (err) {
						callback(err, null, null, null);
						return;
					}

					users.getExtrasForToken(token, function (err, extras) {
						if (err) {
							callback(err, null, null, null);
							return;
						}
						// fermeture de l'objet users.
						users.close();

						// on appelle le callback passé en param
						callback(err, valid, username, extras);

					});
				});
			});
		});
	},

	/**
	 * Create a new user.
	 * A check is done upon the username (only alphanumeric chars, '-' and '_').
	 * @param {string} username - The username or login of the user.
	 * @param {string} password - The password of the user.
	 * @param {object} extras - Some more info about the user.
	 * @param {function} callback - The function to call after the user creation has been done. Callback params: err, result.
	 */
	createUser : function (username, password, extras, callback) {

		assert.equal(typeof(username), 'string', "'username' must be a string.");
		assert.equal(typeof(password), 'string', "'password' must be a string.");
		assert.equal(typeof(extras), 'object', "'extras' must be a object.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		// verif du nom d'utilisateur (caractères alphanum, - et _ autorisés)
		var regex = /^(\-|\w|\_|\d)+$/g;
		var test = regex.test(username);
		console.log("test = " + test);

		if (test === false) {
			callback(new Error("Caractères invalides détectés. Impossible de créer l'utilisateur avec ce login. Choisissez un nom contenant uniquement des caractères alphanumériques, un tiret ou un underscore."), null);
			return;
		}

		// chargement de l'objet UserManagement
		var users = new UserManagement(config.userMgmtOptions);

		// The load method connects to MongoDB and loads the user management database
		users.load(function (err) {
			if (err) {
				callback(err, null);
				return;
			}

			//console.log('Vérification: l\'utilisateur existe-t-il déjà ?');
			users.userExists(username, function (err, exists) {

				if (err) {
					callback(err, null);
					return;
				}

				if (exists) {
					users.close();
					callback(new Error("L'utilisateur existe déjà."), null);
					return;
				}

				users.createUser(username, password, extras, function (err) {
					if (err) {
						callback(err, null);
						return;
					}

					users.close();
					callback(null, "L'utilisateur a été créé.");
				});

			});
		});
	},

	/**
	 * Disconnect a user.
	 * @param {string} token - The user's authentication token. Can be null.
	 * @param {function} callback - The function to call after the user has been disconnected. Callback params: err, message.
	 */
	logOutUser : function (token, callback) {

		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		// chargement de l'objet UserManagement
		var users = new UserManagement(config.userMgmtOptions);

		// The load method connects to MongoDB and loads the user management database
		users.load(function (err) {
			if (err) {
				callback(err, null);
				return;
			}
			users.expireToken(token, function (err) {
				if (err) {
					callback(err, null);
					return;
				}
				callback(null, "Déconnexion réalisée avec succès.");
			});
		});
	},

	/** Get a user's profile.
	 * @param {string} token - The user's authentication token.
	 * @param {function} callback - The function to call after the check has been carried out. Callback params: err, extras.
	 */
	getUserProfile : function (token, callback) {

		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		// chargement de l'objet UserManagement
		var users = new UserManagement(config.userMgmtOptions);

		// The load method connects to MongoDB and loads the user management database
		users.load(function (err) {

			if (err) {
				callback(err, null);
				return;
			}

			// vérification du token:
			users.isTokenValid(token, function (err, valid) {

				if (err) {
					callback(err, null);
					return;
				}

				if (!valid) {
					callback(new Error("Le jeton d'authentification n'est pas valide."), null);
					return;
				}

				users.getExtrasForToken(token, function (err, extras) {

					if (err) {
						callback(err, null);
						return;
					}

					// on appelle le callback avec les paramètres
					callback(null, extras);
				});
			});
		});
	},

	/**
	 * Set a user's profile
	 * @param {string} token - The user's authentication token.
	 * @param {object} extras - Some more info about the user.
	 * @param {function} callback - The function to call after the user's profile has been set (called with following params : err, message).
	 */
	setUserProfile : function (token, extras, callback) {

		assert.equal(typeof(extras), 'object', "'extras' must be a object.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		// chargement de l'objet UserManagement
		var users = new UserManagement(config.userMgmtOptions);

		// The load method connects to MongoDB and loads the user management database
		users.load(function (err) {
			
			if (err){
				callback(err, null);
				return;
			}

			// vérification du token:
			users.isTokenValid(token, function (err, valid) {
				
				if (err){
					callback(err, null);
					return;
				}
				
				if (valid == false) {
					callback(new Error('The token is not valid !'), null);
					return;
				}
				
				users.setExtrasForToken(token, extras, function (err) {
					
					if (err) {
						callback(err, null);
						return;
					}
					
					callback(null, "Profil sauvegardé avec succès.");
				});
			});
		});
	}

};

log.info("auth-manager.js loaded");
