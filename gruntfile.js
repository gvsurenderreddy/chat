module.exports = function(grunt) {

  // Variables privées
  var jsSrc = [
   'js/bootstrap-filestyle.js',
   'js/geolocation-helper.js',
   'js/chat.js',
   'js/chat-file-upload.js',
   'js/string.format.js',
  ];
  var jsDist = 'dist/chat.min.js';

  // Concaténation
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Configuration de Grunt
  grunt.initConfig({
    concat: {
      options: {
        separator: ';',
      },
      dist: {
        src: jsSrc,
        dest: jsDist,
      },
    },
    uglify: {
      options: {
        separator: ';',
      },
      dist: {
        src: jsSrc,
        dest: jsDist,
      },
    },
    watch: {
      scripts: {
        files: 'js/*.js', // Tous les fichiers JavaScript du dossier js/
        tasks: ['uglify:dist'],
      },
      // ,
      // styles : {
      // files : '**/*.scss',
      // tasks : ['sass:dist']
      // }
    },
  });

  // Définition des tâches Grunt
  grunt.registerTask('default', ['dev', 'watch']);
  grunt.registerTask('dev', ['concat:dist']);
  grunt.registerTask('dist', ['uglify:dist']);

}
