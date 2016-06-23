/**
 * db-service
 * - Stockage des utilisateurs connectés
 * - Historisation des messages
 * - Récupération des utilisateurs connectés.
 */
var config = require('./config');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var log = require('gelf-pro');
log.setConfig(config.gelfProConfig);

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
		
		log.info("chatdbservice.insertConnectedUser", { user : username });

		assert.equal(typeof(username), 'string', "'username' must be a string.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		MongoClient.connect(config.mongodbUrl, function (err, db) {
			if (err) {
				log.error("Error while connecting to MongoDB", err);
				return callback(err, null);
			}
			var collection = db.collection(self.collection.connectedUsers);
				
			// count collection.
			collection.count({ username : username }, function (err, count) {
				
				if (err) {
					log.error("Error while retrieving count of '" + self.collection.connectedUsers + "' collection", err);
					return callback(err, null);
				}
				
				if (count > 0) {
					db.close();
					return callback(new Error("user is already connected"), null);
				} 
					
				// insert user & date into collection
				collection.insert({ username : username, connectionDate : new Date() }, function (err, result) {
					
					if (err) {
						log.error("Error while inserting user in '" + self.collection.connectedUsers + "' collection", err);
					} else {
						log.info("Inserted 1 document into collection", result);
					}
					db.close();
					return callback(err, result);
				});
				
			});
		});
	},

	/**
	 * Deletes a user in the connected users collection.
	 * @param {string} username - username
	 * @param {function} callback - A callback function to call when done (params: ).
	 */
	deleteConnectedUser : function (username, callback) {
		log.info("chatdbservice.deleteConnectedUser!!!");

		assert.equal(typeof(username), 'string', "'username' must be a string.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		MongoClient.connect(config.mongodbUrl, function (err, db) {
			
			if (err) {
				log.error("Error while connecting to MongoDB", err);
				return callback(err, null);
			}
			
			// remove user
			db
			.collection(self.collection.connectedUsers)
			.remove({ 'username' : username }, function (err, result) {
				if (err) {
					log.error("Error while removing user", err);
				} else {
					log.info("User successfully removed from '" + self.collection.connectedUsers + "' collection.");
				}
				db.close();
				return callback(err, result);
			});
			
		});
	},

	/**
	 * Inserts a message in the DB.
	 * @param {object} messageObject - The message object to insert in the DB.
	 * @param {function} callback - A callback function to call when done (params: err, result).
	 */
	insertMessage : function (messageObject, callback) {

		assert.equal(typeof(messageObject), 'object', "'messageObject' must be an object.");
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");
		
		
		MongoClient.connect(config.mongodbUrl, function (err, db) {
			
			if (err) {
				log.error("Error while connecting to MongoDB...", err);
				return callback(err, null);
			}
			
			// insert message
			db
			.collection(self.collection.messages)
			.insert(messageObject, function (err, result) {
				
				if (err) {
					log.error("Error while inserting message into '" + self.collection.messages + "' collection", err);
					db.close();
					return callback(err, null);
				} 
				
				log.info("New message inserted on mongodb");
				db.close();
				
				return callback(null, result);
			});
			
		});
	},

	/**
	 * Finds the connected users.
	 * @param {function} callback - A callback function to call when done (params: users).
	 */
	findConnectedUsers : function (callback) {
		log.info("chatdbservice.findConnectedUsers!!!");
		
		assert.equal(typeof(callback), 'function', "'callback' must be a function.");

		MongoClient.connect(config.mongodbUrl, function (err, db) {
			
			if (err) {
				log.error("Error while connecting to MongoDB", err);
				return callback(err, null);
			}
			
			// find all connecters users from "connected_users" collection
			db
			.collection(self.collection.connectedUsers)
			.find({}).toArray(function (err, users) {
				if (err) {
					log.error("Error while connecting to MongoDB", err);
				}
				db.close();
				return callback(err, users);
			});
		});
	}

};

log.info("chat-db-service loaded");
