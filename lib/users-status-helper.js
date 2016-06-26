// Users status helper
var config = require('./config');
var log = require('gelf-pro');
log.setConfig(config.gelfProConfig);

var self = module.exports = {

  /**
   * Look for an element matching the statusId.
   * @param {string} statusId - The status ID.
   */
  indexOf: function(statusId) {

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
  getAll: function() {
    return config.usersStatus;
  },

  /**
   * Gets the status matching the id in parameter.
   * @param {string} statusId - The userstatus ID.
   */
  get: function(statusId) {

    var index = self.indexOf(statusId);
    if (index >= 0) {
      return config.usersStatus[index];
    }
    return null;
  },

  /**
   * Gets the default userstatus.
   */
  getDefault: function() {

    var index = self.indexOf(config.defaultUserStatus);
    if (index >= 0) {
      return config.usersStatus[index];
    }
    return null;
  },

};

log.info('users-status-helper.js loaded');
