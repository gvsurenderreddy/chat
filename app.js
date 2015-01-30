var config = require('./config'); // cahrge la config depuis le fichier ./config.js
var app = require('express')();
var session = require('express-session');
var cookie = require('cookie');
var cookieParser = require('cookie-parser');
var MongoStore = require('connect-mongo')(session);
var mongoStore = new MongoStore({
		url : config.mongodbUrl
	});
var bodyParser = require('body-parser'); // Charge le middleware de gestion des paramètres
var urlencodedParser = bodyParser.urlencoded({
		extended : false
	});
var assert = require('assert'); // tests sur des variables dont une valeur est attendue.
var ejs = require('ejs'); // templating ejs
var ent = require('ent'); // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
var AuthManager = require('./auth-manager'); // charge le gestionnaire d'authentification défini dans ./auth-manager.js
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

/** Middleware for limited access **/
function requireLogin(req, res, next) {
	// page d'accueil: vérification qu'il y a un token
	// enregistré en session:
	if (typeof(req.session.authToken) == 'undefined' || req.session.authToken == null) {
		console.log('Aucun token en session.');

		// aucun token en session : on affiche le template de connexion.
		res.render(config.templatesUrls.logIn, {
			"message" : "Veuillez vous connecter."
		});
	} else {
		// Il y a un token en session;
		// on va le vérifier.
		AuthManager.checkToken(req.session.authToken, function (valid, username) {
			if (!valid) {
				console.log('Token invalide');
				console.log('Affichage de la page de connexion');
				res.render(config.templatesUrls.logIn, {
					"message" : "Session expirée, veuillez vous reconnecter."
				});
			} else {
				console.log('Token valide, utilisateur: [' + username + ']');

				// on doit stocker dans un cookie le token d'authentification
				// et le nom d'utilisateur :
				console.log("cookie = " + req.headers.cookie);
				var hdr = cookie.serialize('authToken', req.session.authToken);
				var hdr2 = cookie.serialize('username', username);

				// l'utilisateur est authentifié, on le laisse passer.
				next();
			}
		});
	}
}

/** GESTION DES ROUTES **/
app.get('/', requireLogin, function (req, res, next) {
	res.render(config.templatesUrls.index, {
		'username' : req.session.username
	});
});
app.post('/login', urlencodedParser, function (req, res) {

	// on teste que le login & le password ont bien été renseignés.
	if (req.body.login != '') {

		// on lance la vérification des identifiants.
		AuthManager.checkCredentials(req.body.login, req.body.password, function (result) {

			if (!result.userExists || !result.passwordsMatch) {
				// password incorrect
				console.log('Utilisateur ou mot de passe invalide');
				res.statusCode = 401;
				res.render(config.templatesUrls.logIn, {
					'error' : "Utilisateur ou mot de passe invalide"
				});
			} else {
				// ok !
				console.log('L\'utilisateur a bien été authentifié !');

				// on stocke le token en session:
				req.session.authToken = result.token;

				// on stocke le username en session
				req.session.username = req.body.login;

				// on redirige vers la page d'accueil.
				res.redirect('/');
			}
		});
	} else {
		res.render(config.templatesUrls.logIn, {
			'error' : "Merci de renseigner le login"
		});
	}
});
app.get('/logout', function (req, res) {
	if (typeof(req.session.authToken) !== null) {
		AuthManager.logOutUser(req.session.authToken, function (error) {
			req.session.authToken = null;
			var obj = error ? {
				"error" : error
			}
			 : {
				"message" : "Déconnexion réalisée avec succès."
			};
			res.render(config.templatesUrls.logOut, obj);
		});
	} else {
		res.redirect('/');
	}
});
app.get('/signin', function (req, res) {
	res.render(config.templatesUrls.signIn, {});
});
app.post('/signin', urlencodedParser, function (req, res) {
	if (req.body.login != '' && req.body.password != '') {

		// données supplémentaires:
		var extras = {
			date : new Date(),
			name : 'Finnius F. Bar'
		};

		// création de l'utilisateur...
		AuthManager.createUser(req.body.login, req.body.password, extras, function (result) {
			if (result.error == true) {
				res.render(config.templatesUrls.signIn, {
					'error' : result.message
				});
			} else {
				res.render(config.templatesUrls.logIn, {
					'message' : result.message
				});
			}
		});
	} else {
		res.render(config.templatesUrls.signIn, {
			'error' : "Merci de renseigner les champs obligatoires"
		});
	}
});
app.use(function (req, res, next) {
	// Page non trouvée ? redirection vers /
	res.redirect('/');
});

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
		chatDbService.insertConnectedUser(session.username, function(){
			console.log("chatDbService.insertConnectedUser(" + session.username+")");
		});
		socket.broadcast.emit('user-connected', {
			username : session.username,
			date : new Date()
		});
	});

	// When user leaves
	socket.on('disconnect', function () {
		mongoStore.get(socket.sessionID, function (err, session) {
			console.log(session.username + ' vient de se deconnecter.\n');
			chatDbService.deleteConnectedUser(session.username,function(){
				console.log("chatDbService.deleteConnectedUser(" + session.username+")");
			});
			socket.broadcast.emit('user-disconnected', {
				username : session.username,
				date : Date.now()
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
			chatDbService.insertMessage(messageObject, function(){
				console.log("chatDbService.insertMessage(" + session.username+")");
			});
			socket.broadcast.emit('message', messageObject);
		});
	});

	socket.on('typing', function (data) {
		console.log(data.username + " typing at " + data.date);
	});
});
