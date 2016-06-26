/** Paramètres de l'appli */
module.exports = {
  /** Port utilisé par le serveur node.js */
  port: 8080,

  session: {
    collection: 'users_sessions',
  },

  /** Paramètres de cookie */
  cookie: {
    secret: 'chat_secret',
    name: 'sid',
  },

  /** Object options passé au constructeur du module UserManagement. */
  userMgmtOptions: {
    hostname: 'localhost', // Valeur par défaut
    port: 27017, // Valeur par défaut
    database: 'user_management', // Valeur par défaut
    tokenExpiration: 24, // Valeur par défaut = 168h soit 1 semaine
  },

  /** URL des vues */
  templatesUrls: {
    index: 'index.ejs',
    logIn: 'login.ejs',
    logOut: 'logout.ejs',
    signIn: 'signin.ejs',
    userProfile: 'user-profile.ejs',
  },

  /** Configuration mongo db */
  mongodbUrl: 'mongodb://localhost:27017/chatdb',

  /** Configuration de la fonctionnalité des statuts des utilisateurs. */
  defaultUserStatus: 'userstatus-available',
  usersStatus: [{
    id: 'userstatus-available',
    name: 'Available',
    cssClass: 'glyphicon-ok',
  }, {
    id: 'userstatus-busy',
    name: 'Busy',
    cssClass: 'glyphicon-time',
  }, {
    id: 'userstatus-donotdisturb',
    name: 'Do Not Disturb',
    cssClass: 'glyphicon-exclamation-sign',
  }, {
    id: 'userstatus-afk',
    name: 'Away from keyboard',
    cssClass: 'glyphicon-briefcase',
  },
  ],

  /** Users' avatars */
  usersAvatars: {
    dirPath: 'avatars/',
    defaultImage: 'no-profile.jpg',
  },

  /** Paramètres pour la fonctionnalité d'upload de fichier. */
  fileUpload: {
    dataBufferLength: 1024 * 1024, // 1 MB
    blockSize: 512 * 1024, // 512 KB
    tempDir: 'temp/',
    shareDir: 'share/',
    tempExtension: '.temp',
  },

  /** https://www.npmjs.com/package/gelf-pro#configuration
   * gelf-pro config object. */
  gelfProConfig: {
    // Optional; default fields for all messages
    fields: {
      processName: 'chat-node.js',
    },
    filter: [], // Optional; filters to discard a message
    broadcast: [
     function(message) { // Broadcasting to console
      console[message.level > 3 ? 'log' : 'error'](message.short_message);
    },
    ], // Optional; listeners of a message
    levels: {}, // Optional; default: see the levels section below
    adapterName: 'udp', // Optional; currently supported "udp" and "tcp"; default: udp
    adapterOptions: {
      protocol: 'udp4', // Udp only; optional; udp adapter: udp4, udp6; default: udp4
      family: 4, // Tcp only; optional; version of IP stack; default: 4
      host: '192.168.1.15', // Optional; default: 127.0.0.1
      port: 12201, // Optional; default: 12201
    },
  },
};
