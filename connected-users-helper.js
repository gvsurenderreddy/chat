var self = module.exports = {
	_users : [],
	_usersLight : [],

	/** ajout d'un utilisateur connect� */
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

	/** on recherche l'�l�ment en fonction du sessionId */
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

	/** suppression d'un utilisateur connect� */
	remove : function (sessionId) {
		var index = self.indexOf(sessionId);
		if (index != -1) {
			self._users.splice(index, 1);
			self._usersLight.splice(index, 1);
		}
	},

	/** r�cup�ration des utilisateurs connect�s */
	get : function () {
		return self._users;
	},

	/** r�cup�ration des utilisateurs connect�s sans le sessionId */
	getLite : function () {
		return self._usersLight;
	}
}
