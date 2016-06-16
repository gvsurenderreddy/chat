/**
 * File Transfer Service
 * Handles files transfers between clients & server
 **/
var config = require('./config');
var fs = require('fs');
var log = require('gelf-pro');
log.setConfig(config.gelfProConfig);

// Constants :
var DATA_BUFFER_LENGTH = config.fileUpload.dataBufferLength;
var BLOCK_SIZE = config.fileUpload.blockSize;
var ONE_MB = 1024 * 1024;
var FILE_UPLOAD_TEMP_DIR = __dirname + '/../' + config.fileUpload.tempDir; // temp/
var FILE_UPLOAD_SHARE_DIR = __dirname + '/../' + config.fileUpload.shareDir; // share/
var FILE_UPLOAD_TEMP_EXT = config.fileUpload.tempExtension; // .part

// variable contenant les fichiers uploadés.
//var files = {};

var self = module.exports = {
	
	/**
	 * Contains files info
	 **/
	files : {},
	
	
	/**
	 * Reset file buffer
	 **/
	_resetBuffer : function(filename) {
		self.files[filename]['data'] = "";
	},
	
	/**
	 * Resets the lastDataReceivedDate field for the specified filename
	 * */
	_resetLastDataReceivedDate : function(filename) {
		self.files[filename]['lastDataReceivedDate'] = new Date();
	},
	
	/**
	 * @param <int> number of bytes received
	 * @return transfer rate in MB.
	 **/
	_calculateRate : function(filename, bytesReceived){
		return (((bytesReceived * 1000) / (new Date() - self.files[filename]['lastDataReceivedDate'])) / ONE_MB).toFixed(3);
	},
	
	/**
	 * Calculate the place where to put the new bytes to write.
	 * @return <int>
	 **/
	_calculatePlace : function(filename) {
		return self.files[filename]['downloaded'] / BLOCK_SIZE;
	},
	
	/**
	 * Calculate the place where to put the new bytes to write.
	 * @return <int>
	 **/
	_calculatePercent : function(filename) {
		return self.files[filename]['downloaded'] / self.files[filename]['fileSize'] * 100;
	},
	
	/**
	 * Calculate the downloaded bytes for the specified filename (rounded to the closest int) in MB.
	 * @return <int>
	 **/
	_calculateBytesDownloaded : function(filename) {
		return Math.round(self.files[filename]['downloaded'] / (ONE_MB));
	},
	
	/**
	 * Calculate the file size in MB.
	 * @return <int>
	 **/
	_calculateFileSize : function(filename) {
		return Math.round(self.files[filename]['fileSize'] / (ONE_MB) * 100) / 100; // MB
	},
	
	/**
	 * Calculate the file size in MB.
	 * @return <int>
	 **/
	_calculateElapsedTime : function(filename) {
		return new Date() - self.files[filename]['startDate']; // MB
	},
	
	/**
	 **/
	_getPausedData : function(filename) {
		return self.files[filename]['pauseData'];
	},
	
	
	
	/**
	 * Add a file transfer
	 * @data		
	 * @callback : function(err, moreDataInfo){ ... } 
	 * 
	 * moreDataInfo : JSON object : 
	 * {
	 * 		place		: <int>,
	 * 		percent		: <int>,
	 * 		rate		: <int>,
	 * 		downloaded	: <int>
	 * }
	 */
	addFileTransfer : function (data, callback) {
		try {
			
			if (!data || (!!data && !data.name){
				return callback(new Error("Data cannot be null"), null);
			}
			log.info("addFileTransfer");

			var name = data.name;

			// vérifier que files[name] n'existe pas déjà:
			if (!!self.files[name]) {
				return callback(new Error("The File " + name + "already exists on the server."), null);
			}
			
			self.files[name] = {
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

			log.info("addFileTransfer - checking filename " + name);

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
									return callback(err, null);
								}
								
								self.files[name]['handler'] = fd; // we store the file handler so we can write to it later
								
								return callback(null, {
									'place' : place,
									'percent' : 0,
									'rate' : 0,
									'downloaded' : 0
								});
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

			
		} catch (ex) {
			log.error("Error occurred.", ex);
			callback(ex, null);
		}
	},

	/**
	 * Save file data into temp dir, then moves it to the shared dir.
	 * @data
	 * @callback : function(err, obj)
	 * 
	 * obj is the following when the transfer is done:
	 * {
	 *	'done' : <indicates if the transfer is over or not (true)>
	 *	'name' : <filename>
	 *	'size' : <size in MB>
	 *	'downloaded' : <total downloaded mega bytes>
	 *	'startDate' : <transfer start date>
	 *	'finishDate' : <transfer end date>
	 *	'elapsedTime' : <elapsed time>
	 *	'rate' : <transfer rate in MB/s>
	 * }
	 * 
	 * or like this when the transfer is not over:
	 * 
	 * {
	 *	'done' : false,
	 * 	'place' : place,
	 *	'percent' : percent,
	 *	'rate' : (rate / (ONE_MB)).toFixed(3), // MB/s
	 *	'downloaded' : Math.round(self.files[name]['downloaded'] / (ONE_MB)) // MB
	 * }
	 **/
	saveFileData : function (data, callback) {
		// socket.on('upload-data', function (data) {
		var name = data['name'];
		
		// check if file transfer has not been cancelled.
		if (self.files[name]['cancelled'] === true) {
			self.files[name] = null;
			return callback(new Error("File transfer is cancelled. File: " + name), null);
		}

		// update downloaded length + bytes
		self.files[name]['downloaded'] += data['data'].length;
		self.files[name]['data'] += data['data'];

		// A. The file is fully loaded -> transfer finished
		if (self.files[name]['downloaded'] == self.files[name]['fileSize']) {

			log.info("File fully loaded", self.files[name]);
			fs.write(self.files[name]['handler'], self.files[name]['data'], null, 'Binary', function (err, written) {
				
				if (err) {
					log.error("Error while writing bytes to file [" + name + "]", err);
					callback(err, null);
				} else {
					
					// 1. close the file !
					fs.close(self.files[name]['handler'], function (err) {
						
						if (err) {
							log.error("Error while closing file [" + name + "]", err);
							return callback(err, null);
						}
						
						log.info("File [" + name + "] closed successfully");
						
						// 2. déplacer le fichier dans le répertoire de partage.
						var oldPath = FILE_UPLOAD_TEMP_DIR + name + FILE_UPLOAD_TEMP_EXT;
						var newPath = FILE_UPLOAD_SHARE_DIR + name;

						log.info("Moving file...", { 'oldPath' : oldPath, 'newPath' : newPath });

						fs.rename(oldPath, newPath, function (err) {
							if (err) {
								log.error("Error while moving file...", err);
								return callback(err, null);
							}
							

							// Create an object to pass in parameter with the callback
							var obj = {
								'done' : true,
								'name' : name,
								'size' : self._calculateFileSize(name),
								'downloaded' : self._calculateBytesDownloaded(name),
								'startDate' : self.files[name]['startDate'],
								'finishDate' : new Date(),
								'elapsedTime' : self._calculateElapsedTime(name),
								'rate' : self._calculateRate(name, data['data'].length)
							};

							log.info("Upload finished", obj);

							// Emitting 'upload-done' event.
							return callback(null, obj);
							
						});
						
					});
				}
			});
		}
		// B. Chunk received, we write it to the temp file!
		else if (self.files[name]['data'].length > DATA_BUFFER_LENGTH) { 

			// write incoming bytes
			fs.write(self.files[name]['handler'], self.files[name]['data'], null, 'Binary', function (err, written) {

				if (err) {
					log.error("Error while writing bytes to file " + name, err);
					return callback(err, null);
				}
				
				self._resetBuffer(name);
				
				var msg = {
					'done' : false,
					'place' : self._calculatePlace(name),
					'percent' : self._calculatePercent(name),
					'rate' : self._calculateRate(name, data['data'].length),
					'downloaded' : self._calculateBytesDownloaded(name)
				};
				
				self._resetLastDataReceivedDate(name);
				
				if (self.files[name]['paused'] === true) {
					// inform that the transfer is being paused and save the pause data.
					msg.paused = true;
					self.files[name]['pauseData'] = msg;
				}
				
				return callback(null, msg);
			});

		}
		// C. Save "pause" data for resuming purpose!
		else {
			
			var msg = {
				'done' : false,
				'place' : self._calculatePlace(name),
				'percent' : self._calculatePercent(name),
				'rate' : self._calculateRate(name, data['data'].length),
				'downloaded' : self._calculateBytesDownloaded(name)
			};

			if (self.files[name]['paused'] === true) {
				// inform that the transfer is being paused and save the pause data.
				msg.paused = true;
				self.files[name]['pauseData'] = msg;
			}
			
			return callback(null, msg);
		}
	},
		
	/**
	 * Set a pending file transfer as 'paused'.
	 * @data: incoming data (bytes)
	 * @callback : function(err) 
	 **/
	pauseFileTransfer : function (data, callback) {
		
		log.info("pauseFileTransfer");
		
		var name = data.name;
		
		if (self.files[name]['paused'] === false) {
			self.files[name]['paused'] = true;
			return callback(null);
		}
		
		return callback(new Error("Error while pausing file transfer (it might have already been closed)..."));
	},

	/**
	 * Resume a paused file transfer & write bytes to the temp dir.
	 * @data: incoming data (bytes)
	 * @callback : function(err, moreDataInfo) 
	 * 
	 * moreDataInfo : JSON object : 
	 * {
	 * 		place		: <int>,
	 * 		percent		: <int>,
	 * 		rate		: <int>,
	 * 		downloaded	: <int>
	 * }
	 * 
	 **/
	resumeFileTransfer : function (data, callback) {
		
		log.info("resumeFileTransfer");
		
		var name = data.name;
		
		if (self.files[name]['paused'] === true) {
			self.files[name]['paused'] = false;
			var msg = self._getPausedData(name);
			
			//socket.emit('moreData', msg);
			
			return callback(null, msg);
		}
		
		log.info("Cannot resume because the file is not paused.", { 'filename' : name });
		return callback(new Error("File is not paused"), null);
	},

	/**
	 * Cancels a pending file transfer and removes the temporary file.
	 * @data: incoming data (bytes)
	 * @callback : function(err) 
	 **/
	cancelFileTransfer : function (data, callback) {

		log.info("fileTransferService.cancelFileTransfer()");

		var name = data.name;
		self.files[name]['cancelled'] = true;

		// On supprime le fichier téléchargé
		var tempFilename = FILE_UPLOAD_TEMP_DIR + name + FILE_UPLOAD_TEMP_EXT;
		fs.unlink(tempFilename, function (err) {
			
			// always check err
			if (err) {
				log.error("Error while trying to delete the temporary downloaded file.", err);
				return callback(err);
			}
				
			// no error, let's close the file now.
			log.info("cancelFileTransfer - Successfully deleted the temporary downloaded file " + tempFilename);
			
			fs.close(self.files[name]['handler'], function (err) {
				if (err) {
					log.error("Error while closing the file", err);
					return callback(err);
				}
				
				log.info("File closed successfully!", { "file" : tempFilename });
				
				return callback(null);
			});
			
		});
	},

	/**
	 * Get all files on the server (inside the shared directory).
	 * @param <function> callback: function(err, files):
	 * 	 err : the error (if no error, must be null).
	 * 	 files : an array of string containing the transferred files.
	 **/
	getTransferredFiles : function (callback) {
		
		/** Asynchronous readdir(3).
		 * Reads the contents of a directory. The callback gets two arguments (err, files)
		 * where files is an array of the names of the files in the directory excluding '.' and '..'.  */
		fs.readdir(FILE_UPLOAD_SHARE_DIR, function (err, files) {
			
			if (err) {
				log.error("Cannot read directory " + FILE_UPLOAD_SHARE_DIR, err);
				return callback(err, null);
			}
			
			return callback(null, files);
		});
	}

};

log.info("file-transfer-service.js loaded.");
