var self = module.exports = {
	_users : [],
	_usersLight : [],

	/** ajout d'un utilisateur connecté */
	add : function (sessionId, username) {
		if (self.indexOf(sessionId) == -1) {
			self._users.push({
				"sessionId" : sessionId,
				"username" : username,
				"connectionDate" : new Date()
			});
			self._usersLight.push({
				"username" : username
			});
		}
	},

	/** on recherche l'élément en fonction du sessionId */
	indexOf : function (sessionId) {
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
