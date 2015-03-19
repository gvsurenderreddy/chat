var assert = require('assert');
var UserManagement = require('user-management');
var config = require('./config');

/** Module méthodes d'authentification **/
module.exports = {

	/**
	 * Check some user's credentials.
	 * @param {string} username - The username or login of the user.
	 * @param {string} password - The password of the user.
	 * @param {function} callback - The function to call after the check has been carried out. Callback params: result.
	 */
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
				if (err) throw err;
				users.authenticateUser(username, password, function (err, result) {
					if (err) throw err;

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

	/**
	 * Check user's authentication token.
	 * @param {string} token - The user's authentication token.
	 * @param {function} callback - The function to call after the check has been carried out. Callback params: valid, username, extras.
	 */
	checkToken : function (token, callback) {

		assert.equal(typeof(token), 'string', "'token' must be a string.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		try {
			// chargement de l'objet UserManagement
			var users = new UserManagement(config.userMgmtOptions);

			// The load method connects to MongoDB and loads the user management database
			users.load(function (err) {
				if (err) throw err;

				// vérification du token:
				users.isTokenValid(token, function (err, valid) {

					// récupérer le nom d'utilisateur
					users.getUsernameForToken(token, function (err, username) {
						if (err) throw err;
						
						users.getExtrasForToken(token, function(err, extras) {
							if (err) throw err;
							
							// fermeture de l'objet users.
							users.close();

							// on appelle le callback passé en param
							callback(valid, username, extras);
						});
					});
				});
			});
		} catch (e) {
			console.dir(e);
		}
	},

	/**
	 * Create a new user.
	 * @param {string} username - The username or login of the user.
	 * @param {string} password - The password of the user.
	 * @param {object} extras - Some more info about the user.
	 * @param {function} callback - The function to call after the user creation has been done.
	 */
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

				if (err) throw err;

				//console.log('Vérification: l\'utilisateur existe-t-il déjà ?');
				users.userExists(username, function (err, exists) {
					if (exists) {
						// console.log('L\'utilisateur existe déjà.');
						users.close();
						callback({
							'message' : 'L\'utilisateur existe déjà.',
							'error' : true
						});
					} else {
						// console.log('User does not exist');
						// console.log('Creating the user...');
						users.createUser(username, password, extras, function (err) {
							if (err) throw err;
							//console.log('User created !');
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

	/**
	 * Disconnect a user.
	 * @param {string} token - The user's authentication token.
	 * @param {function} callback - The function to call after the user has been disconnected (called with following params: error).
	 */
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

				//console.log('Déconnexion de l\'utilisateur');

				users.expireToken(token, function (err) {
					if (err) throw err;
					callback(err);
				});
			});
		} catch (e) {
			console.dir(e);
		}
	},

	/** Get a user's profile.
	 * @param {string} token - The user's authentication token.
	 * @param {function} callback - The function to call after the check has been carried out. Callback params: extras, err.
	 */
	getUserProfile : function (token, callback) {

		assert.equal(typeof(token), 'string', "'token' must be a string.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		try {
			// chargement de l'objet UserManagement
			var users = new UserManagement(config.userMgmtOptions);

			// The load method connects to MongoDB and loads the user management database
			users.load(function (err) {

				if (err) throw err;

				// vérification du token:
				users.isTokenValid(token, function (err, valid) {
					if (!valid) {
						//console.log('The token is not valid !');
						throw err;
					} else {
						users.getExtrasForToken(token, function (err, extras) {
							if (err) throw err;
							// on appelle le callback avec les paramètres
							callback(extras, err);
						});
					}
				});
			});
		} catch (e) {
			console.dir(e);
		}
	},

	/**
	 * Set a user's profile
	 * @param {string} token - The user's authentication token.
	 * @param {object} extras - Some more info about the user.
	 * @param {function} callback - The function to call after the user's profile has been set (called with following params : err).
	 */
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
						//console.log('The token is not valid !');
						//throw err;
						callback('The token is not valid !');
					} else {
						users.setExtrasForToken(token, extras, function (err) {
							// on vérif que la variable err est nulle
							if (err) throw err;
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
