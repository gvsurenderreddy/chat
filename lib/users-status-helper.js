// users status helper
var assert = require('assert');
var config = require('./config');

var self = module.exports = {

	/** on recherche l'élément en fonction du statusId */
	indexOf : function (statusId) {
		// vérif
		assert.equal(typeof(statusId), 'string', "'statusId' must be of type string.");

		var index = -1;
		for (var i in config.usersStatus) {
			var status = config.usersStatus[i];
			if (status.id == statusId) {
				index = i;
				break;
			}
		}
		return index;
	},

	/** Renvoie tous les statuts utilisateur */
	getAll : function () {
		return config.usersStatus;
	},

	/** Renvoie le status correspondant à l'id en paramètre. */
	get : function (statusId) {
		var index = self.indexOf(statusId);
		if (index >= 0) {
			return config.usersStatus[index];
		}
		return null;
	},

	getDefault : function(){
		var index = self.indexOf(config.defaultUserStatus);
		if (index >= 0) {
			return config.usersStatus[index];
		}
		return null;
	}
};