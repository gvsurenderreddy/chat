// Charge la config depuis le fichier ./config.js
var config = require('./lib/config');

// Vérifie la config actuelle
require('./lib/config-checker')(config);

var log = require('gelf-pro');
log.setConfig(config.gelfProConfig);

var express = require('express');

// Charge le middleware de gestion des paramètres
var bodyParser = require('body-parser');
var app = express();
var session = require('express-session');
var cookie = require('cookie');
var cookieParser = require('cookie-parser');
var MongoStore = require('connect-mongo')(session);

var mongoStore = new MongoStore({ url: config.mongodbUrl });

// Module de test unitaire
var assert = require('assert');

// Templating ejs
var ejs = require('ejs');

// Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
var ent = require('ent');
var URLRegExp = require('url-regexp');

// utilitaire de formatage des dates
var moment = require('moment');
var fs = require('fs');
var util = require('util');

// Chat-specific libraries (kinda BL classes or services)

// Charge le service de base de données du chat
var chatDbService = require('./lib/chat-db-service');
var usersStatusHelper = require('./lib/users-status-helper');

// Gestionnaire d'utilisateurs connectés
var connectedUsersHelper = require('./lib/connected-users-helper');

// Service de transfert de fichiers
var ft = require('./lib/file-transfer-service');


// Les vues se trouvent dans le répertoire "views"
app.set('views', __dirname + '/views');

// Moteur de template = ejs
app.set('view engine', 'ejs');

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

// limite d'upload de fichier via méthode POST : 50MB
var bodyParser = require('body-parser');

// Initialise REST routes
require('./lib/app-routes')(app);

/** WebSocket */
var server = require('http').Server(app).listen(config.port);
var io = require('socket.io')(server);

/** Stocke le sessionID dans l'objet socket */
io.use(function ioSession(socket, next) {

	// Create the fake req that cookieParser will expect
	var req = {
		'headers' : {
			'cookie' : socket.request.headers.cookie
		}
	};

	// Run the parser and store the sessionID
	cookieParser(config.cookie.secret)(req, null, function () {});
	socket.sessionID = req.signedCookies[config.cookie.name] || req.cookies[config.cookie.name];

	next();
});

// handles socket.io connections
io.sockets.on('connection', function (socket) {

	// L'utilisateur se connecte au chat, on l'annonce :
	mongoStore.get(socket.sessionID, function (err, session) {
		
		if (err) {
			log.error("Error while connecting to mongo db.", err);
			return;
		}

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
	});

	socket.on('disconnect', function () {

		// suppression de l'utilisateur dans le tableau
		connectedUsersHelper.remove(socket.sessionID);

		// recup de la session
		mongoStore.get(socket.sessionID, function (err, session) {
			if (err) {
				log.error("Error while connecting to mongo db.", err);
				return;
			}				

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

	/** Manage user messages & statuses */
	socket.on('message', function (messageData) {

		if (!messageData) {
			log.error("app.js : 'message' event received but messageData is empty.");
			return;
		}
		
		mongoStore.get(socket.sessionID, function (err, session) {
			
			if (err) {
				log.error("Error while getting session from mongodb.",err);
				return;
			}
			
			// on vérifie le message : s'il contient une url, on l'affiche sous forme de lien cliquable
			var msgSplitArray = ent.encode(messageData.msg).split(' ');
			for (var i in msgSplitArray) {
				var urlMatches = URLRegExp.match(msgSplitArray[i]);
				if (urlMatches.length == 1)
					msgSplitArray[i] = '<a href="' + urlMatches[0] + '" target="_blank">' + urlMatches[0] + '</a>';
			}
			messageData.msg = msgSplitArray.join(" ");

			var profilePic = '/' + config.usersAvatars.dirPath + ((typeof(session.extras.filename) == 'undefined' || session.extras.filename == '') ? config.usersAvatars.defaultImage : session.extras.filename);
			
			var messageObject = {
				username : session.username,
				message : messageData.msg,
				location : messageData.location,
				date : Date.now(),
				profilePicture : profilePic
			};
			
			chatDbService.insertMessage(messageObject, function (err, result) {
				
				log.info("app.js : chatDbService.insertMessage success", { 'result' : result});
			});

			io.sockets.emit('message', messageObject);
			socket.broadcast.emit('stopped-typing', session.username);
		});
	});
	socket.on('user-typing', function (data) {
		if (!data){
			log.error("app.js : user-typing event received but data is empty.");
		}
		socket.broadcast.emit('user-typing', data);
	});
	socket.on('stopped-typing', function (username) {
		if (!username) {
			log.error("app.js : stopped-typing event received but username is empty.");
		}
		socket.broadcast.emit('stopped-typing', username);
	});
	socket.on('user-image', function (base64Image) {
		log.info('message "user-image" received !');

		// récupérer le nom d'utilisateur via la session de la websocket:
		mongoStore.get(socket.sessionID, function (err, session) {
			if (err) {
				log.error("Error while connecting to mongo db", err);
				return;
			}
			socket.broadcast.emit('user-image', session.username, ent.encode(base64Image));
		});
	});
	socket.on('user-status', function (data) {
		/** Un utilisateur vient de mettre à jour son statut. */

		if (!data) {
			log.error("app.js : 'user-status' message received but data is empty.");
		}
		
		// récupération du nouveau statut à partir de l'id
		var statusObj = usersStatusHelper.get(data.status);

		// on quitte si le status == null
		if (!statusObj) {
			log.error("app.js : 'user-status' message received, but statusObj is empty.");
			return;
		}

		// mise à jour du status de l'utilisateur via le sous-module connected-users-helper :
		connectedUsersHelper.updateStatus(socket.sessionID, statusObj);

		// on broadcaste le message de refresh de la liste des utilisateurs :
		io.sockets.emit('refresh-connected-users', {
			'connectedUsers' : connectedUsersHelper.getLite()
		});

		log.info("username: " + data.username + ", user-status: " + data.status);
	});
	/** /Manage user messages & statuses */


	/** Manage uploads */
	socket.on('upload-start', function (data) {
		
		// new code
		ft.addFileTransfer(data, function(err, moreDataInfo) {
			
			if (err) {
				log.error("Error occurred in addFileTransfer !", err);
				return;
			}
			
			log.info('addFileTransfer returned with moredatainfo !', moreDataInfo);
			socket.emit('moreData', moreDataInfo);
			
		});
		
	});
	socket.on('upload-data', function (data) {
		var name = data.name;
		
		//new code: call file-transfer-service
		ft.saveFileData(data, function(err, obj) {
			
			if (err) { 
				log.error("Error occurred in saveFileData", err);
				return;
			}
			
			// transfer is finished !
			if (obj.done === true) {
				//transfer is over, 
				socket.emit('upload-done', obj);
				
				ft.getTransferredFiles(function(err) {
					
				});
			}
			// transfer is not finished
			else {
				
				if (!obj.paused) {
					socket.emit('moreData', obj);
				}
			}
		});
		
	});
	socket.on('upload-pause', function (data) {
		
		log.info("upload-pause");
		
		if (!data || !data.name) {
			log.error("Either data or data.name is empty.");
			return;
		}
		
		var name = data.name;		
		
		ft.pauseFileTransfer(data, function(err) {
			if (err) {
				log.error("Error while pausing file transfer.", err);
				return;
			}
			log.info("pauseFileTransfer success!");
		});
		
	});
	socket.on('upload-resume', function (data) {
		
		ft.resumeFileTransfer(data, function(err, moreDataObj) {
			if (err) {
				log.error("Error while resuming file transfer", err);
				return;
			}
			log.info("File transfer resumed");
			socket.emit('moreData', moreDataObj);
		});
		
	});
	socket.on('upload-cancel', function (data) {
		
		log.info("socket message received", { message: "upload-cancel", data: data });
		
		if (!data || !data.name) {
			log.error("Either data or data.name is empty.");
			return;
		}
		
		var name = data.name;
		
		ft.cancelFileTransfer(data, function(err) {
			
			if (err) {
				log.error("Error occurred while cancelling the file transfer.", err);
				return;
			}
			
			log.info("cancelFileTransfer : success!");
		});
		
	});
	socket.on('get-shared-files', function () {
		
		ft.getTransferredFiles(function(err, files) {
			
			if (err) {
				log.error("Cannot read directory " + FILE_UPLOAD_SHARE_DIR, err);
				return;
			}
			
			io.sockets.emit('shared-files', {
				'files' : files,
				'directory' : config.fileUpload.shareDir
			});
		});

	})
	/** /Manage uploads */
	
});
