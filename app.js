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
var chatDbService = require('./chat-db-service') // charge le service de base de données du chat

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

io.sockets.on('connection', function (socket) {

	// L'utilisateur se connecte au chat, on l'annonce :
	mongoStore.get(socket.sessionID, function (err, session) {
		console.log('broadcasting message : user-connected = ' + session.username);
		chatDbService.insertConnectedUser(session.username, function () {
			console.log("chatDbService.insertConnectedUser(" + session.username + ")");
			// récupération de la liste des utilisateurs connectés.
			chatDbService.findConnectedUsers(function (users) {
				socket.broadcast.emit('user-connected', {
					username : session.username,
					date : new Date()
				});
				io.sockets.emit('connected-users', {
					usersList : users
				});
			});
		});
	});

	// When user leaves
	socket.on('disconnect', function () {
		mongoStore.get(socket.sessionID, function (err, session) {
			console.log(session.username + ' vient de se deconnecter.\n');
			chatDbService.deleteConnectedUser(session.username, function () {
				console.log("chatDbService.deleteConnectedUser(" + session.username + ")");
				// récupération de la liste des utilisateurs connectés.
				chatDbService.findConnectedUsers(function (users) {
					socket.broadcast.emit('user-disconnected', {
						username : session.username,
						date : Date.now()
					});
					io.sockets.emit('connected-users', {
						usersList : users
					});
				});
			});
		});
	});

	// New message from client = "write" event
	socket.on('message', function (message) {
		mongoStore.get(socket.sessionID, function (err, session) {
			console.log('Message recu : ' + message + ', username: ' + session.username);
			var messageObject = {
				username : session.username,
				message : message,
				date : Date.now()
			};
			chatDbService.insertMessage(messageObject, function () {
				console.log("chatDbService.insertMessage(" + session.username + ")");
			});
			socket.broadcast.emit('message', messageObject);
		});
	});

	socket.on('typing', function (data) {
		console.log(data.username + " typing at " + data.date);
	});
});
