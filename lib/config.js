/** Paramètres de l'appli */
module.exports = {
	/** Port utilisé par le serveur node.js */
	port : 8080,
	
	/** paramètres de cookie */
	cookie : {
		secret : 'chat_secret',
		name : 'sid'
	},
	
	/** object options passé au constructeur du module UserManagement. */
	userMgmtOptions : {
		hostname : 'localhost', // valeur par défaut
		port : 27017, // valeur par défaut
		database : 'user_management', // valeur par défaut
		tokenExpiration : 24 // valeur par défaut = 168h soit 1 semaine
	},
	
	/** URL des vues */
	templatesUrls : {
		index : 'index.ejs',
		logIn : 'login.ejs',
		logOut : 'logout.ejs',
		signIn : 'signin.ejs'
	},
	
	/** Configuration mongo db */
	mongodbUrl : "mongodb://localhost:27017/chatdb",
	
	/** Configuration de la fonctionnalité des statuts des utilisateurs. */
	defaultUserStatus : 'userstatus-available',
	usersStatus : [{
			id : 'userstatus-available',
			name : 'Available',
			cssClass : 'glyphicon-ok'
		}, {
			id : 'userstatus-busy',
			name : 'Busy',
			cssClass : 'glyphicon-time'
		}, {
			id : 'userstatus-donotdisturb',
			name : 'Do Not Disturb',
			cssClass : 'glyphicon-exclamation-sign'
		}, {
			id : 'userstatus-afk',
			name : 'Away from keyboard',
			cssClass : 'glyphicon-briefcase'
		}
	],
	
	/** Paramètres pour la fonctionnalité d'upload de fichier. */
	fileUpload : {
		dataBufferLength : 512 * 1024, // 524288
		blockSize : 256 * 1024, // 262144
		tempDir: 'temp/',
		shareDir: 'share/'
	}
};
