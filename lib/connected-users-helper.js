var assert = require('assert');
var config = require('./config');

var self = module.exports = {
	_users : [],
	_usersLight : [],

	/**
	 * Add a connected user.
	 * @param {string} sessionId - The session ID.
	 * @param {string} username - The user's username (or login).
	 * @param {object} statusObj - An object representing the user's status.
	 */
	add : function (sessionId, username, statusObj) {

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

	/**
	 * Update a user's status (FYI, the user is retrieved in the _users array from the session ID).
	 * @param {string} sessionId - The session ID.
	 * @param {object} statusObj - An object representing the user's status.
	 */
	updateStatus : function (sessionId, statusObj) {

		assert.equal(typeof(sessionId), 'string', "'sessionId' must be of type string.");
		assert.equal(typeof(statusObj), 'object', "'statusObj' must be of type object.");

		var index = self.indexOf(sessionId);
		if (index != -1) {

			// mettre à jour le statut de l'utilisateur
			self._users[index].status = statusObj;
			self._usersLight[index].status = statusObj;
		}
	},

	/**
	 * Look for a user via the session ID.
	 * @param {string} sessionId - The session ID.
	 */
	indexOf : function (sessionId) {

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

	/**
	 * Remove a connected user according to the session ID in parameter.
	 * @param {string} sessionId - The session ID.
	 */
	remove : function (sessionId) {

		assert.equal(typeof(sessionId), 'string', "'sessionId' must be of type string.");

		var index = self.indexOf(sessionId);
		if (index != -1) {
			self._users.splice(index, 1);
			self._usersLight.splice(index, 1);
		}
	},

	/**
	 * Get all the connected users.
	 * @return {array} The _users array;
	 */
	get : function () {
		return self._users;
	},

	/**
	 * Get all the connected users without the session ID.
	 * @return {array} The _usersLight array;
	 */
	getLite : function () {
		return self._usersLight;
	}
}
