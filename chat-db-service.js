/**
db-service
- Stockage des utilisateurs connectés
- Historisation des messages
- Récupération des utilisateurs connectés.
 **/
var config = require('./config');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var self = module.exports = {

	collection : {
		connectedUsers : 'connected_users',
		messages : 'messages'
	},

	/** insère un utilisateur dans la collection des utilisateurs connectés. */
	insertConnectedUser : function (username, callback) {
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
	deleteConnectedUser : function (username, callback) {
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
	insertMessage : function (messageObject, callback) {
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
	findConnectedUsers : function (callback) {
		MongoClient.connect(config.mongodbUrl, function (err, db) {
			db
			.collection(self.collection.connectedUsers)
			.find({}).toArray(function (err, users) {
				db.close();
				assert.equal(err, null);
				//console.log("Found the following records:");
				//console.dir(users);
				callback(users);
			});
		});
	}
};
