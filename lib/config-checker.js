var assert = require('assert');
var test = require('unit.js');

/** Vérification du fichier de config. */
module.exports = function (config) {

	assert.equal(typeof(config), 'object', "'config' must be an object.");

	/** Port utilisé par le serveur node.js */
	assert.equal(Number.isInteger(config.port), true, "'config.port' must be an integer.");

	/** paramètres de cookie
	cookie : {
		secret : 'chat_secret',
		name : 'sid'
	} */
	assert.equal(typeof(config.cookie), 'object', "'config.cookie' must be an object.");
	for (var i in config.cookie) {
		assert.equal(typeof(config.cookie[i]), 'string', "'config.cookie." + i + "' must be an string.");
	}

	/** object options passé au constructeur du module UserManagement.
	hostname : 'localhost', // valeur par défaut
	port : 27017, // valeur par défaut
	database : 'user_management', // valeur par défaut
	tokenExpiration : 24 // valeur par défaut = 168h soit 1 semaine
	 */
	assert.equal(typeof(config.userMgmtOptions), 'object', "'config.userMgmtOptions' must be an object.");
	assert.equal(typeof(config.userMgmtOptions.hostname), 'string', "'config.userMgmtOptions.hostname' must be a string.");
	assert.equal(typeof(config.userMgmtOptions.database), 'string', "'config.userMgmtOptions.database' must be a string.");
	assert.equal(Number.isInteger(config.userMgmtOptions.port), true, "'config.userMgmtOptions.port' must be an integer.");
	assert.equal(Number.isInteger(config.userMgmtOptions.tokenExpiration), true, "'config.userMgmtOptions.tokenExpiration' must be an integer.");

	/** URL des vues :
	templatesUrls : {
	index : 'index.ejs',
	logIn : 'login.ejs',
	logOut : 'logout.ejs',
	signIn : 'signin.ejs',
	userProfile : 'user-profile.ejs'
	}, */
	assert.equal(typeof(config.templatesUrls), 'object', "'config.templatesUrls' must be an object.");
	for (var i in config.templatesUrls) {
		assert.equal(typeof(config.templatesUrls[i]), 'string', "'config.templatesUrls." + i + "' must be an string.");
	}
	
	/** Configuration mongo db 
	mongodbUrl : "mongodb://localhost:27017/chatdb" */
	assert.equal(typeof(config.mongodbUrl), 'string', "'config.userMgmtOptions.hostname' must be a string.");
	
	/** Paramètres pour la fonctionnalité d'upload de fichier.
	fileUpload : {
		dataBufferLength : 1024 * 1024, // 1 MB
		blockSize : 512 * 1024, // 512 KB
		tempDir : 'temp/',
		shareDir : 'share/',
		tempExtension : '.temp'
	}*/
	assert.equal(typeof(config.fileUpload), 'object', "'config.fileUpload' must be an object.");
	//assert.equal(Number.isInteger(config.fileUpload.dataBufferLength), 'object', "'config.fileUpload.dataBufferLength' must be an integer.");
	//assert.equal(Number.isInteger(config.fileUpload.blockSize), 'object', "'config.fileUpload.blockSize' must be an integer.");
	
	/**
	 * https://www.npmjs.com/package/gelf-pro#configuration
	 * // simple 
		log.setConfig({host: 'my.glog-server.net'});
		 
		// advanced 
		log.setConfig({
		  fields: {facility: "example", owner: "Tom (a cat)"}, // optional; default fields for all messages 
		  filter: [], // optional; filters to discard a message 
		  broadcast: [], // optional; listeners of a message 
		  levels: {}, // optional; default: see the levels section below  
		  adapterName: 'udp', // optional; currently supported "udp" and "tcp"; default: udp 
		  adapterOptions: {
			protocol: 'udp4', // udp only; optional; udp adapter: udp4, udp6; default: udp4 
			family: 4, // tcp only; optional; version of IP stack; default: 4 
			host: '127.0.0.1', // optional; default: 127.0.0.1 
			port: 12201 // optional; default: 12201 
		  }
		});
		**/
	assert.equal(typeof(config.gelfProConfig), 'object', "'config.gelfProConfig' must be an object.");

};
