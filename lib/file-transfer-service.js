var config = require('./config');
var fs = require('fs');
var log = require('gelf-pro');
log.setConfig(config.gelfProConfig);

var self = module.exports = {

	// Constants :
	var DATA_BUFFER_LENGTH = config.fileUpload.dataBufferLength;
	var BLOCK_SIZE = config.fileUpload.blockSize;
	var ONE_MB = 1024 * 1024;
	var FILE_UPLOAD_TEMP_DIR = __dirname + '/' + config.fileUpload.tempDir; // temp/
	var FILE_UPLOAD_SHARE_DIR = __dirname + '/' + config.fileUpload.shareDir; // share/
	var FILE_UPLOAD_TEMP_EXT = config.fileUpload.tempExtension; // .part

	// variable contenant les fichiers uploadés.
	var files = {};

	/**
	 * Add a file transfer
	 * @data
	 * @callback
	 */
	addFileTransfer : function (data, callback) {
		try {
			log.info("addFileTransfer");

			var name = data['name'];

			// vérifier que files[name] n'existe pas déjà:
			if (!!files[name]) {
				callback(new Error("The File " + name + "already exists on the server."), null);
			} else {
				files[name] = {
					fileSize : data['size'],
					data : '',
					downloaded : 0,
					startDate : new Date(),
					lastDataReceivedDate : new Date(),
					paused : false,
					pauseData : null,
					cancelled : false,
					tempName : name + FILE_UPLOAD_TEMP_EXT
				};

				var place = 0;

				log.info("checking filename " + name);

				// check temp directory
				fs.stat(FILE_UPLOAD_TEMP_DIR, function (err, stats) {

					if (err) {
						// error, the temporary directory does not exist!!!!
						log.error("The temporary directory does not exist!", err);
						callback(err, null);
					} else {

						// no error but...
						// we still need to check if the file already exists in the shared directory
						fs.stat(FILE_UPLOAD_TEMP_DIR + name, function (err, stats) {

							if (err) {

								// err is normal in this case because the file must not exist!
								log.info("File " + FILE_UPLOAD_TEMP_DIR + name + " does not exist");

								// it's a new file
								var tempFileName = FILE_UPLOAD_TEMP_DIR + name + FILE_UPLOAD_TEMP_EXT;

								fs.open(tempFileName, "a", 0755, function (err, fd) {
									if (err) {
										log.error("Error occurred while opening the file", err);
										callback(err, null);
									} else {
										files[name]['handler'] = fd; // we store the file handler so we can write to it later
										
										callback(null, {
											'place' : place,
											'percent' : 0,
											'rate' : 0,
											'downloaded' : 0
										});
										// socket.emit('moreData', {
											// 'place' : place,
											// 'percent' : 0,
											// 'rate' : 0,
											// 'downloaded' : 0
										// });
									}
								});
							} else {

								// stats must be set.
								log.info("File already exists!", stats);
								
								callback(new Error("The File " + name + "already exists on the server."), null);
								// socket.emit('file-exists', {
									// 'text' : "The File " + name + "already exists on the server."
								// });
							}

						});

					}
				});

			}
			
		} catch (ex) {
			log.error("Error occurred.", ex);
		}
	},

	saveFileData : function (data, callback) {
		// socket.on('upload-data', function (data) {
		var name = data['name'];
		
		// check if file transfer has not been cancelled.
		if (files[name]['cancelled'] === true) {
			files[name] = null;
			callback(new Error("File transfer is cancelled. File: " + name), null);
			return;
		}

		files[name]['downloaded'] += data['data'].length;
		files[name]['data'] += data['data'];

		// The file is fully loaded
		if (files[name]['downloaded'] == files[name]['fileSize']) {

			log.info("File fully loaded", files[name]);
			fs.write(files[name]['handler'], files[name]['data'], null, 'Binary', function (err, written) {
				
				if (err) {
					log.error("Error while writing bytes to file [" + name + "]", err);
					callback(err, null);
				} else {
					
					// 1. close the file !
					fs.close(files[name]['handler'], function (err) {
						if (err) {
							log.error("Error while closing file [" + name + "]", err);
							//callback(err, null);
						} else {
							log.info("File [" + name + "] closed successfully");
						}
					});

					// 2. déplacer le fichier dans le répertoire de partage.
					var oldPath = FILE_UPLOAD_TEMP_DIR + name + FILE_UPLOAD_TEMP_EXT;
					var newPath = FILE_UPLOAD_SHARE_DIR + name;

					log.info("Moving file...", {
						oldPath : oldPath,
						newPath : newPath
					});

					fs.rename(oldPath, newPath, function (err) {
						if (err) {
							log.error("Error while moving file...", err);
							callback(err, null);
						} else {
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

							log.info("Upload finished", obj);

							// Emitting 'upload-done' event.
							callback(null, obj);

							// // Send the new file list to everyone
							// fs.readdir(FILE_UPLOAD_SHARE_DIR, function (err, files) {
								// if (err) {
									// log.error("Error while reading shared directory.", err);
								// } else {
									// // actually sends the file list
									// io.sockets.emit('shared-files', {
										// 'files' : files,
										// 'directory' : config.fileUpload.shareDir
									// });
								// }
							// });
						}
					});
				}
			});
		} else if (files[name]['data'].length > DATA_BUFFER_LENGTH) {

			// write incoming bytes
			fs.write(files[name]['handler'], files[name]['data'], null, 'Binary', function (err, written) {

				if (err) {
					log.error("Error while writing bytes to file " + name, err);
				} else {
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
				}
			});

		} else {

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
		}
	},

	pauseFileTransfer : function (data, callback) {
		try {
			log.info("pauseFileTransfer");
			var name = data['name'];
			if (files && files[name]['paused'] === false) {
				files[name]['paused'] = true;
				callback(null, true);
			} else {
				callback(new Error("files is undefined!"), null);
			}
		} catch (ex) {
			log.error("pauseFileTransfer caused an error", ex);
			callback(ex, null);
		}
	},

	resumeFileTransfer : function (data, callback) {
		try {
			log.info("resumeFileTransfer");
			var name = data['name'];
			if (files[name]['paused'] === true) {
				files[name]['paused'] = false;
				var msg = files[name]['pauseData'];
				//socket.emit('moreData', msg);
				callback(null, true);
			} else {
				log.info("File " + name + " is not paused.");
			}
		} catch (ex) {
			log.error("resumeFileTransfer caused an error", ex);
			callback(ex, null);
		}
	},

	cancelFileTransfer : function (data, callback) {

		log.info("file-transfer-service.cancelFileTransfer()");

		var name = data['name'];
		files[name]['cancelled'] = true;

		// On supprime le fichier téléchargé
		var tempFilename = FILE_UPLOAD_TEMP_DIR + name + FILE_UPLOAD_TEMP_EXT;
		fs.unlink(tempFilename, function (err) {
			// always check err
			if (err) {
				log.error("Error while trying to delete the temporary downloaded file.", err);
			} else {
				
				// no error, let's close the file now.
				log.info("successfully deleted the temporary downloaded file", {
					"file" : tempFilename
				});
				try {
					fs.close(files[name]['handler'], function (err) {
						if (err) {
							log.error("Error while closing the file", err);
						} else {
							log.info("File closed successfully!", {
								"file" : tempFilename
							});
						}
					});
				} catch (ex) {
					log.error("Error while closing the file", ex);
				}
			}
		});
	},

	getTransferredFiles : function (data, callback) {
		/** Asynchronous readdir(3).
		 * Reads the contents of a directory. The callback gets two arguments (err, files)
		 * where files is an array of the names of the files in the directory excluding '.' and '..'.  */
		// on envoie la nouvelle liste de fichiers (à tout le monde)
		fs.readdir(FILE_UPLOAD_SHARE_DIR, function (err, files) {
			if (err) {
				log.error("Cannot read directory " + FILE_UPLOAD_SHARE_DIR, err);
			} else {
				io.sockets.emit('shared-files', {
					'files' : files,
					'directory' : config.fileUpload.shareDir
				});
			}
		});
	}

};







