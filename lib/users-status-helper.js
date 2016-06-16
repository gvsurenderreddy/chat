// users status helper
var config = require('./config');
var log = require('gelf-pro');
log.setConfig(config.gelfProConfig);

//assert.equal(typeof(config), 'object', "'config' must be of the type object.");
//assert.equal((config.usersStatus.constructor == Array), true, "'config.usersStatus' must be of type Array.");




var self = module.exports = {

	/**
	 * Look for an element matching the statusId.
	 * @param {string} statusId - The status ID.
	 */
	indexOf : function (statusId) {

		//assert.equal(typeof(statusId), 'string', "'statusId' must be of type string.");

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

	/**
	 * Gets all the defined users statuses.
	 */
	getAll : function () {

		return config.usersStatus;
	},

	/**
	 * Gets the status matching the id in parameter.
	 * @param {string} statusId - The userstatus ID.
	 */
	get : function (statusId) {

		//assert.equal(typeof(statusId), 'string', "'statusId' must be of type string.");

		var index = self.indexOf(statusId);
		if (index >= 0) {
			return config.usersStatus[index];
		}
		return null;
	},

	/**
	 * Gets the default userstatus.
	 */
	getDefault : function () {

		var index = self.indexOf(config.defaultUserStatus);
		if (index >= 0) {
			return config.usersStatus[index];
		}
		return null;
	}

};

log.info("users-status-helper.js loaded");
