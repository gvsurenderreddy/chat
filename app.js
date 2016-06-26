/**
 * @author      Created by Quentin Villevieille <kwentinn@gmail.com>
 * @link        https://github.com/kwentinn/chat
 * @license     http://opensource.org/licenses/MIT
 *
 * @version     0.2.0
 */


// Loads the config.js & checks it /////////////////////////////////////

var config = require('./lib/config');
require('./lib/config-checker')(config);


// Requires section ////////////////////////////////////////////////////

var log = require('gelf-pro'); // GelfPro for logging stuff on a graylog server
var express = require('express');
var app = express();
var bodyParser = require('body-parser'); // Middleware for handling params.
// FYI: upload file size is limited to 50MB via POST
var session = require('express-session');
var cookie = require('cookie');
var cookieParser = require('cookie-parser');
var MongoStore = require('connect-mongo')(session);
var assert = require('assert'); // Module de test unitaire
var ejs = require('ejs'); // Templating ejs
var ent = require('ent'); // Block HTML chars for security reasons
var urlregex = require('url-regexp');
var moment = require('moment'); // Date format helper
var fs = require('fs'); // File access provider
var util = require('util');


// Create instances & configs //////////////////////////////////////////

var mongoStore = new MongoStore({ // Create a store to save session in DB
  url: config.mongodbUrl,
});
log.setConfig(config.gelfProConfig); // Configure the logger


// Chat-specific libraries (BL classes & services) /////////////////////

var chatDbService = require('./lib/chat-db-service'); // Charge le service de base de données du chat
var usersStatusHelper = require('./lib/users-status-helper');
var connectedUsersHelper = require('./lib/connected-users-helper'); // Gestionnaire d'utilisateurs connectés
var ft = require('./lib/file-transfer-service'); // Service de transfert de fichiers


// More config /////////////////////////////////////////////////////////

app.set('views', __dirname + '/views'); // Les vues se trouvent dans le répertoire "views"
app.set('view engine', 'ejs'); // Moteur de template = ejs
app.use(cookieParser(config.cookie.secret));
app.use(session({
  name: config.cookie.name,
  store: mongoStore,
  secret: config.cookie.secret,
  saveUninitialized: true,
  resave: true,
  cookie: {
    path: '/',
    httpOnly: true,
    secure: false,
    maxAge: null,
  },
}));
require('./lib/app-routes')(app); // Initialise REST routes


// initialise WebSocket ////////////////////////////////////////////////
var server = require('http').Server(app).listen(config.port);
var io = require('socket.io')(server);


// Saves sessionID in socket object. ///////////////////////////////////
io.use(function ioSession(socket, next) {

  // Create the fake req that cookieParser will expect
  var req = {
    headers: {
      cookie: socket.request.headers.cookie,
    },
  };

  // Run the parser and store the sessionID
  cookieParser(config.cookie.secret)(req, null, function() {});
  socket.sessionID = req.signedCookies[config.cookie.name] || req.cookies[config.cookie.name];

  next();
});


// Handles socket.io connections ///////////////////////////////////////
io.sockets.on('connection', function(socket) {

  // L'utilisateur se connecte au chat, on l'annonce :
  mongoStore.get(socket.sessionID, function(err, session) {

    if (err) {
      log.error('Error while connecting to mongo db.', err);
      return;
    }

    // Ajout de l'utilisateur à la liste des utilisateurs connectés
    connectedUsersHelper.add(socket.sessionID, session.username, usersStatusHelper.getDefault());
    chatDbService.insertConnectedUser(session.username, function(err){
      log.info("user inserted in db");
    });

    // On broadcaste l'énènement de connexion d'un nouvel utilisateur.
    socket.broadcast.emit('user-connected', {
      username: session.username,
      date: moment().format(),
    });

    // On force le rafraîchissement de la liste des utilisateurs.
    io.sockets.emit('refresh-connected-users', {
      connectedUsers: connectedUsersHelper.getLite(),
    });
  });

  socket.on('disconnect', function() {

    // Suppression de l'utilisateur dans le tableau
    connectedUsersHelper.remove(socket.sessionID);

    // Recup de la session
    mongoStore.get(socket.sessionID, function(err, session) {
      if (err) {
        log.error('Error while connecting to mongo db.', err);
        return;
      }

      chatDbService.deleteConnectedUser(session.username, function(err){
        log.info("user removed from db");
      });

      // On broadcaste le message de déconnexion d'un utilisateur :
      socket.broadcast.emit('user-disconnected', {
        username: session.username,
        date: Date.now(),
      });

      // On broadcaste le message de refresh de la liste des utilisateurs :
      socket.broadcast.emit('refresh-connected-users', {
        connectedUsers: connectedUsersHelper.getLite(),
      });
    });
  });

  /** Manage user messages & statuses */
  socket.on('message', function(messageData) {

    if (!messageData) {
      log.error('app.js : \'message\' event received but messageData is empty.');
      return;
    }

    mongoStore.get(socket.sessionID, function(err, session) {

      if (err) {
        log.error('Error while getting session from mongodb.',err);
        return;
      }

      // On vérifie le message : s'il contient une url, on l'affiche sous forme de lien cliquable
      var msgSplitArray = ent.encode(messageData.msg).split(' ');
      for (var i in msgSplitArray) {
        var urlMatches = urlregex.match(msgSplitArray[i]);
        if (urlMatches.length == 1)
         msgSplitArray[i] = '<a href="' + urlMatches[0] + '" target="_blank">' + urlMatches[0] + '</a>';
      }
      messageData.msg = msgSplitArray.join(' ');

      var profilePic = '/' + config.usersAvatars.dirPath + ((typeof (session.extras.filename) == 'undefined' || session.extras.filename == '') ? config.usersAvatars.defaultImage : session.extras.filename);

      var messageObject = {
          username: session.username,
          message: messageData.msg,
          location: messageData.location,
          date: Date.now(),
          profilePicture: profilePic,
        };

      chatDbService.insertMessage(messageObject, function(err, result) {

          log.info('app.js : chatDbService.insertMessage success', { result: result});
        });

      io.sockets.emit('message', messageObject);
      socket.broadcast.emit('stopped-typing', session.username);
    });
  });
  socket.on('user-typing', function(data) {
    if (!data) {
      log.error('app.js : user-typing event received but data is empty.');
    }
    socket.broadcast.emit('user-typing', data);
  });
  socket.on('stopped-typing', function(username) {
    if (!username) {
      log.error('app.js : stopped-typing event received but username is empty.');
    }
    socket.broadcast.emit('stopped-typing', username);
  });
  socket.on('user-image', function(base64Image) {
    log.info('message "user-image" received !');

    // Récupérer le nom d'utilisateur via la session de la websocket:
    mongoStore.get(socket.sessionID, function(err, session) {
      if (err) {
        log.error('Error while connecting to mongo db', err);
        return;
      }
      socket.broadcast.emit('user-image', session.username, ent.encode(base64Image));
    });
  });
  socket.on('user-status', function(data) {
    /** Un utilisateur vient de mettre à jour son statut. */

    if (!data) {
      log.error('app.js : \'user-status\' message received but data is empty.');
    }

    // Récupération du nouveau statut à partir de l'id
    var statusObj = usersStatusHelper.get(data.status);

    // On quitte si le status == null
    if (!statusObj) {
      log.error('app.js : \'user-status\' message received, but statusObj is empty.');
      return;
    }

    // Mise à jour du status de l'utilisateur via le sous-module connected-users-helper :
    connectedUsersHelper.updateStatus(socket.sessionID, statusObj);

    // On broadcaste le message de refresh de la liste des utilisateurs :
    io.sockets.emit('refresh-connected-users', {
      connectedUsers: connectedUsersHelper.getLite(),
    });

    log.info('username: ' + data.username + ', user-status: ' + data.status);
  });
  /** /Manage user messages & statuses */


  /** Manage uploads */
  socket.on('upload-start', function(data) {
    ft.addFileTransfer(data, function(err, moreDataInfo) {

      if (err) {
        log.error('Error occurred in addFileTransfer !', err);
        return;
      }

      log.info('addFileTransfer returned with moredatainfo !', moreDataInfo);
      socket.emit('moreData', moreDataInfo);

    });
  });
  socket.on('upload-data', function(data) {
    var name = data.name;

    //New code: call file-transfer-service
    ft.saveFileData(data, function(err, obj) {

      if (err) {
        log.error('Error occurred in saveFileData', err);
        return;
      }

      // Transfer is finished !
      if (obj.done === true) {
        //Transfer is over,
        socket.emit('upload-done', obj);

        ft.getTransferredFiles(function(err, files) {
           if (err) {
            log.error('Cannot read directory ' + FILE_UPLOAD_SHARE_DIR, err);
            return;
           }

         io.sockets.emit('shared-files', {
             files: files,
             directory: config.fileUpload.shareDir,
           });
         });
      }
      // Transfer is not finished
      else {

        if (!obj.paused) {
           socket.emit('moreData', obj);
         }
      }
    });
  });
  socket.on('upload-pause', function(data) {
    log.info('upload-pause');

    if (!data || !data.name) {
      log.error('Either data or data.name is empty.');
      return;
    }

    var name = data.name;

    ft.pauseFileTransfer(data, function(err) {
      if (err) {
        log.error('Error while pausing file transfer.', err);
        return;
      }
      log.info('pauseFileTransfer success!');
    });
  });
  socket.on('upload-resume', function(data) {
    ft.resumeFileTransfer(data, function(err, moreDataObj) {
      if (err) {
        log.error('Error while resuming file transfer', err);
        return;
      }
      log.info('File transfer resumed');
      socket.emit('moreData', moreDataObj);
    });
  });
  socket.on('upload-cancel', function(data) {
    log.info('socket message received', { message: 'upload-cancel', data: data });

    if (!data || !data.name) {
      log.error('Either data or data.name is empty.');
      return;
    }

    var name = data.name;

    ft.cancelFileTransfer(data, function(err) {

      if (err) {
        log.error('Error occurred while cancelling the file transfer.', err);
        return;
      }

      log.info('cancelFileTransfer : success!');
    });
  });
  socket.on('get-shared-files', function() {
    ft.getTransferredFiles(function(err, files) {
      if (err) {
        log.error('Cannot read directory ' + FILE_UPLOAD_SHARE_DIR, err);
        return;
      }
      io.sockets.emit('shared-files', {
          files: files,
          directory: config.fileUpload.shareDir,
        });
    });
  })
  /** /Manage uploads */

});

log.info('app.js loaded.');
