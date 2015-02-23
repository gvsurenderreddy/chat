var assert = require('assert');
var config = require('./config');

var self = module.exports = {
	_users : [],
	_usersLight : [],

	/** ajout d'un utilisateur connecté */
	add : function (sessionId, username, statusObj) {
		// vérif
		assert.equal(typeof(sessionId), 'string', "'sessionId' must be of type string.");
		assert.equal(typeof(username), 'string', "'username' must be of type string.");
		assert.equal(typeof(statusObj), 'object', "'statusObj' must be of type object.");

		if (self.indexOf(sessionId) == -1) {
			self._users.push({
				"sessionId" : sessionId,
				"username" : username,
				"connectionDate" : new Date(),
				"status" : statusObj
			});
			self._usersLight.push({
				"username" : username,
				"status" : statusObj
			});
		}
	},

	/** update */
	updateStatus : function (sessionId, statusObj) {
		// vérif
		assert.equal(typeof(sessionId), 'string', "'sessionId' must be of type string.");
		assert.equal(typeof(statusObj), 'object', "'statusObj' must be of type object.");
		
		var index = self.indexOf(sessionId);
		if (index != -1) {
			
			// mettre à jour le statut de l'utilisateur
			self._users[index].status = statusObj;
			self._usersLight[index].status = statusObj;
		}
	},

	/** on recherche l'élément en fonction du sessionId */
	indexOf : function (sessionId) {
		// vérif
		assert.equal(typeof(sessionId), 'string', "'sessionId' must be of type string.");
	
		var index = -1;
		for (var i in self._users) {
			var connectedUser = self._users[i];
			if (connectedUser.sessionId == sessionId) {
				index = i;
				break;
			}
		}
		return index;
	},

	/** suppression d'un utilisateur connecté */
	remove : function (sessionId) {
		// vérif
		assert.equal(typeof(sessionId), 'string', "'sessionId' must be of type string.");
		
		var index = self.indexOf(sessionId);
		if (index != -1) {
			self._users.splice(index, 1);
			self._usersLight.splice(index, 1);
		}
	},

	/** récupération des utilisateurs connectés */
	get : function () {
		return self._users;
	},

	/** récupération des utilisateurs connectés sans le sessionId */
	getLite : function () {
		return self._usersLight;
	}
}
