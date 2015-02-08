/** Paramètres de l'appli */
module.exports = {
	port : 8080,
	cookie : {
		secret : 'chat_secret',
		name : 'sid'
	},
	userMgmtOptions : {
		hostname : 'localhost', // valeur par défaut
		port : 27017, // valeur par défaut
		database : 'user_management', // valeur par défaut
		tokenExpiration : 24 // valeur par défaut = 168h soit 1 semaine
	},
	templatesUrls : {
		index : 'index.ejs',
		logIn : 'login.ejs',
		logOut : 'logout.ejs',
		signIn : 'signin.ejs'
	},
	mongodbUrl : "mongodb://localhost:27017/chatdb"
};
