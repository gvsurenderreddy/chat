var assert = require('assert');
var UserManagement = require('user-management');
var config = require('./config');

/** Module méthodes d'authentification **/
module.exports = {
	/** Vérification des inforamtions de connexion */
	checkCredentials : function (username, password, callback) {
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
	},
	/** vérif du jeton */
	checkToken : function (token, callback) {
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
	},
	/** creation de l'utilisateur */
	createUser : function (username, password, extras, callback) {
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
	},
	/** deco utilisateur : jeton expiré */
	logOutUser : function (token, callback) {
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
	}
};
