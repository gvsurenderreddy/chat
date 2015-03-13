/**
 * db-service
 * - Stockage des utilisateurs connectés
 * - Historisation des messages
 *- Récupération des utilisateurs connectés.
 */
var config = require('./config');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var self = module.exports = {

	/** The connected users collection. */
	collection : {
		connectedUsers : 'connected_users',
		messages : 'messages'
	},

	/**
	 * Inserts a user in the connected users collection.
	 * @param {string} username - The username/login of the user.
	 * @param {function} callback - A callback function to call when done (params: result)
	 */
	insertConnectedUser : function (username, callback) {

		assert.equal(typeof(username), 'string', "'username' must be a string.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		MongoClient.connect(config.mongodbUrl, function (err, db) {
			var collection = db.collection(self.collection.connectedUsers);
			collection.count({
				username : username
			}, function (err2, count) {
				console.log("count: " + count);
				if (count > 0) {
					db.close();
					callback(null);
				} else {
					collection.insert({
						username : username,
						connectionDate : new Date()
					}, function (err3, result) {
						assert.equal(err3, null);
						//console.log("Inserted 1 document into the following collection: " + self.collection.connectedUsers);
						callback(result);
						db.close();
					});
				}
			});
		});
	},

	/**
	 * Deletes a user in the connected users collection.
	 * @param {string} username - username
	 * @param {function} callback - A callback function to call when done (params: ).
	 */
	deleteConnectedUser : function (username, callback) {

		assert.equal(typeof(username), 'string', "'username' must be a string.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		MongoClient.connect(config.mongodbUrl, function (err, db) {
			db
			.collection(self.collection.connectedUsers)
			.remove({
				username : username
			}, function (err2, result) {
				db.close();
				assert.equal(err2, null);
				//console.log("Removed the user with username = [" + username + "] from the collection [" + self.collection.connectedUsers + "]");
				callback(result);
			});
		});
	},

	/**
	 * Inserts a message in the DB.
	 * @param {object} messageObject - The message object to insert in the DB.
	 * @param {function} callback - A callback function to call when done (params: result).
	 */
	insertMessage : function (messageObject, callback) {

		assert.equal(typeof(messageObject), 'object', "'messageObject' must be an object.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		MongoClient.connect(config.mongodbUrl, function (err, db) {
			db
			.collection(self.collection.messages)
			.insert(messageObject, function (err2, result) {
				db.close();
				assert.equal(err2, null);
				//console.log("Inserted 1 message into the messages collection !");
				callback(result);
			});
		});
	},

	/**
	 * Finds the connected users.
	 * @param {function} callback - A callback function to call when done (params: users).
	 */
	findConnectedUsers : function (callback) {

		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		MongoClient.connect(config.mongodbUrl, function (err, db) {
			db
			.collection(self.collection.connectedUsers)
			.find({}).toArray(function (err, users) {
				db.close();

				assert.equal(err, null);

				callback(users);
			});
		});
	}

};
