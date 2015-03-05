var config = require('./config'); // cahrge la config depuis le fichier ./config.js
var app = require('express')();
var session = require('express-session');
var cookie = require('cookie');
var cookieParser = require('cookie-parser');
var MongoStore = require('connect-mongo')(session);
var mongoStore = new MongoStore({
		url : config.mongodbUrl
	});
var assert = require('assert'); // tests sur des variables dont une valeur est attendue.
var ejs = require('ejs'); // templating ejs
var ent = require('ent'); // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
var chatDbService = require('./chat-db-service'); // charge le service de base de données du chat
var URLRegExp = require('url-regexp');
var moment = require('moment'); // utilitaire de formatage des dates
var usersStatusHelper = require('./users-status-helper');
var fs = require('fs');
var util = require('util');

app.set('views', __dirname + '/views'); // les vues se trouvent dans le répertoire "views"
app.set('view engine', 'ejs'); // moteur de template = ejs
app.use(cookieParser(config.cookie.secret));
app.use(session({
		name : config.cookie.name,
		store : mongoStore,
		secret : config.cookie.secret,
		saveUninitialized : true,
		resave : true,
		cookie : {
			path : '/',
			httpOnly : true,
			secure : false,
			maxAge : null
		}
	}));

var DATA_BUFFER_LENGTH = config.fileUpload.dataBufferLength;
var BLOCK_SIZE = config.fileUpload.blockSize;
var ONE_MB = 1024 * 1024;

// Initialise REST routes
require('./app-routes')(app);

/** WebSocket */
var server = require('http').Server(app).listen(config.port);
var io = require('socket.io')(server);

/** Stocke le sessionID dans l'objet socket */
io.use(function ioSession(socket, next) {

	// create the fake req that cookieParser will expect
	var req = {
		"headers" : {
			"cookie" : socket.request.headers.cookie,
		},
	};

	// run the parser and store the sessionID
	cookieParser(config.cookie.secret)(req, null, function () {});
	socket.sessionID = req.signedCookies[config.cookie.name] || req.cookies[config.cookie.name];

	next();
});

// on récupère le gestionnaire d'utilisateurs connectés
var connectedUsersHelper = require('./connected-users-helper');
var files = {};

io.sockets.on('connection', function (socket) {

	// L'utilisateur se connecte au chat, on l'annonce :
	mongoStore.get(socket.sessionID, function (err, session) {

		// ajout de l'utilisateur à la liste des utilisateurs connectés
		connectedUsersHelper.add(socket.sessionID, session.username, usersStatusHelper.getDefault());

		// on broadcaste l'énènement de connexion d'un nouvel utilisateur.
		socket.broadcast.emit('user-connected', {
			username : session.username,
			date : moment().format()
		});

		// on force le rafraîchissement de la liste des utilisateurs.
		io.sockets.emit('refresh-connected-users', {
			"connectedUsers" : connectedUsersHelper.getLite()
		});

		// debug
		console.log("connectedUsersHelper.getLite() = " + JSON.stringify(connectedUsersHelper.getLite()));
	});

	// When user leaves
	socket.on('disconnect', function () {

		// suppression de l'utilisateur dans le tableau
		connectedUsersHelper.remove(socket.sessionID);

		// recup de la session
		mongoStore.get(socket.sessionID, function (err, session) {
			console.log(session.username + ' vient de se deconnecter.\n');

			// on broadcaste le message de déconnexion d'un utilisateur :
			socket.broadcast.emit('user-disconnected', {
				username : session.username,
				date : Date.now()
			});

			// on broadcaste le message de refresh de la liste des utilisateurs :
			socket.broadcast.emit('refresh-connected-users', {
				"connectedUsers" : connectedUsersHelper.getLite()
			});
		});
	});

	// New message from client = "write" event
	socket.on('message', function (messageData) {

		console.dir(messageData);

		if (messageData == null)
			return;

		mongoStore.get(socket.sessionID, function (err, session) {
			// on vérifie le message : s'il contient une url, on l'affiche sous forme de lien cliquable
			var msgSplitArray = ent.encode(messageData.msg).split(' ');

			for (var i in msgSplitArray) {
				var urlMatches = URLRegExp.match(msgSplitArray[i]);
				if (urlMatches.length == 1)
					msgSplitArray[i] = '<a href="' + urlMatches[0] + '" target="_blank">' + urlMatches[0] + '</a>';
			}
			messageData.msg = msgSplitArray.join(" ");

			var messageObject = {
				username : session.username,
				message : messageData.msg,
				location: messageData.location,
				date : Date.now()
			};
			chatDbService.insertMessage(messageObject, function () {
				console.log("chatDbService.insertMessage success");
			});

			io.sockets.emit('message', messageObject);

			console.log('broadcast stopped-typing for user ' + session.username);
			socket.broadcast.emit('stopped-typing', session.username);
		});
	});
	socket.on('user-typing', function (data) {
		console.log("[" + data.date + "] " + data.username + " typing...");
		if (data)
			socket.broadcast.emit('user-typing', data);
	});
	socket.on('stopped-typing', function (username) {
		console.log(username + " stopped typing.");
		if (username)
			socket.broadcast.emit('stopped-typing', username);
	});
	socket.on('user-image', function (base64Image) {
		console.log('message "user-image" received !');

		// récupérer le nom d'utilisateur via la session de la websocket:
		mongoStore.get(socket.sessionID, function (err, session) {
			console.log('base64Image.length = ' + base64Image.length);
			assert.equal(null, err);
			socket.broadcast.emit('user-image', session.username, ent.encode(base64Image));
		});
	});
	/** Un utilisateur vient de mettre à jour son statut. */
	socket.on('user-status', function(data) {
		
		// un peu de log
		console.dir(data);
		
		// verification :
		assert.equal(typeof(data), 'object', "data mustbe an object.");
		
		// récupération du nouveau statut à partir de l'id
		var statusObj = usersStatusHelper.get(data.status);
		
		// on quitte si le status == null
		if (statusObj == null) return;
		
		// mise à jour du status de l'utilisateur via le sous-module connected-users-helper :
		connectedUsersHelper.updateStatus(socket.sessionID, statusObj);
		
		// on broadcaste le message de refresh de la liste des utilisateurs :
		io.sockets.emit('refresh-connected-users', {
			"connectedUsers" : connectedUsersHelper.getLite()
		});
		
		console.log("username: " + data.username + ", user-status: " + data.status);
	});

	/** Manage uploads */
	socket.on('upload-start', function (data) {

		var name = data['name'];

		console.log('starting upload for file: ' + name + ' size: ' + data['size']);

		files[name] = {
			fileSize : data['size'],
			data : '',
			downloaded : 0,
			startDate : new Date(),
			lastDataReceivedDate : new Date(),
			paused : false,
			pauseData : null,
			cancelled : false
		};

		var place = 0;
		try {
			var stat = fs.statSync(config.fileUpload.tempDir + name);
			
			socket.emit('file-exists', {
				'text' : "The File " + name + "already exists on the server."
			});
			
			// if (stat.isFile()) {
				// files[name]['downloaded'] = stat.size;
				// place = stat.size / BLOCK_SIZE;
			// }
			
		} catch (er) {
			// it's a new file
			fs.open('Temp/' + name + ".part", "a", 0755, function (err, fd) {
				if (err) {
					console.dir(err);
				} else {
					files[name]['handler'] = fd; // we store the file handler so we can write to it later
					socket.emit('moreData', {
						'place' : place,
						'percent' : 0,
						'rate' : 0,
						'downloaded' : 0
					});
				}
			});
		}
	});
	socket.on('upload-data', function (data) {
		var name = data['name'];

		if (files[name]['cancelled'] === true) {
			files[name] = null;
			return;
		}

		files[name]['downloaded'] += data['data'].length;
		files[name]['data'] += data['data'];

		if (files[name]['downloaded'] == files[name]['fileSize']) { // the file is fully loaded
			console.log('[' + name + '] file fully loaded');
			fs.write(files[name]['handler'], files[name]['data'], null, 'Binary', function (err, written) {
				var now = new Date();
				var span = (now - files[name]['startDate'])
				var rate = (files[name]['downloaded'] * 1000) / span;

				// on envoie un message de transfert réussi
				var obj = {
					'name' : name,
					'size' : Math.round(files[name]['fileSize'] / (ONE_MB) * 100) / 100, // MB
					'downloaded' : Math.round(files[name]['downloaded'] / (ONE_MB) * 100) / 100, // MB
					'startDate' : files[name]['startDate'],
					'finishDate' : now,
					'elapsedTime' : span,
					'rate' : (rate / (ONE_MB)).toFixed(3) // MB/s
				};
				console.dir(obj);
				socket.emit('done', obj);

				// fermer le fichier !
				fs.close(files[name]['handler'], function (err) {
					if (err)
						console.log('Exception ! ', err);
					else
						console.log('OK');
				});
			});
		} else if (files[name]['data'].length > DATA_BUFFER_LENGTH) {

			//console.log('[' + name + '] length = ' + files[name]['data'].length);

			fs.write(files[name]['handler'], files[name]['data'], null, 'Binary', function (err, written) {
				files[name]['data'] = ""; // resets the buffer.
				var rate = (data['data'].length * 1000) / (new Date() - files[name]['lastDataReceivedDate']);
				files[name]['lastDataReceivedDate'] = new Date();
				var place = files[name]['downloaded'] / BLOCK_SIZE;
				var percent = (files[name]['downloaded'] / files[name]['fileSize']) * 100;

				var msg = {
					'place' : place,
					'percent' : percent,
					'rate' : (rate / (ONE_MB)).toFixed(3), // MB/s
					'downloaded' : Math.round(files[name]['downloaded'] / (ONE_MB)) // MB
				};

				if (files[name]['paused'] === true) {
					files[name]['pauseData'] = msg;
				} else {
					socket.emit('moreData', msg);
				}
			});

		} else {
			//console.log('file: [' + name + '] downloaded: ' + files[name]['downloaded']);
			var rate = (data['data'].length * 1000) / (new Date() - files[name]['lastDataReceivedDate']);
			files[name]['lastDataReceivedDate'] = new Date();
			var place = files[name]['downloaded'] / BLOCK_SIZE;
			var percent = (files[name]['downloaded'] / files[name]['fileSize']) * 100;

			var msg = {
				'place' : place,
				'percent' : percent,
				'rate' : (rate / (ONE_MB)).toFixed(3), // MB/s
				'downloaded' : Math.round(files[name]['downloaded'] / (ONE_MB)) // MB
			};
			//console.dir(msg);
			if (files[name]['paused'] === true) {
				files[name]['pauseData'] = msg;
			} else {
				socket.emit('moreData', msg);
			}
		}
	});
	socket.on('upload-pause', function (data) {
		// 'data' doit contenir le nom du fichier
		console.log('pause event received!');
		//console.dir(data);
		var name = data['name'];
		if (files[name]['paused'] === false) {
			files[name]['paused'] = true;
		}
	});
	socket.on('upload-resume', function (data) {
		console.log('\'resume\' event received!');
		var name = data['name'];
		if (files[name]['paused'] === true) {

			files[name]['paused'] = false;

			var msg = files[name]['pauseData'];
			socket.emit('moreData', msg);
			//console.dir(msg);
		}
	});
	socket.on('upload-cancel', function (data) {
		console.log('\'cancel\' event received!');
		var name = data['name'];
		
		files[name]['cancelled'] = true;

		// supprimer le fichier téléchargé...
		fs.unlink('temp/' + name, function (err) {
			if (err)
				console.log("Error occurred !", err);
			else {
				console.log('successfully deleted /temp/' + name);

				// on tente de fermer le fichier ...
				try {
					fs.close(files[name]['handler'], function (err) {
						if (err)
							console.log('Exception ! ', err);
						else
							console.log('OK');
					});
				}catch(e){
					console.log('error when closing the file handler: ' + e);
				}
			}
		});
	});
});
