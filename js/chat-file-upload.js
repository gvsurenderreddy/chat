/************************************************/
/** chat.js must be included before this file ! */
/************************************************/

console.log("socket: " + !!socket);
console.log("displayMessage: " + !!displayMessage);

var fileReader;
var name;
var selectedFile;
function fileChosen(evt) {
	selectedFile = evt.target.files[0];
	$('#nameBox').val(selectedFile.name);
	if (!selectedFile.slice)
		console.log('KO: slice method unavailable...');
	else
		console.log('OK: slice method available.');
}


socket.on('moreData', function (data) {
	//La variable BLOCK_SIZE est définie dans app.js et passée en param au template ejs.
	updateBar(data['percent'], data['rate'], data['downloaded']);
	var start = data['place'] * BLOCK_SIZE; // the next block's starting position
	
	// the variable that will hold the new block of data
	var newFile;
	if (selectedFile.slice) {
		var end = start + Math.min(BLOCK_SIZE, (selectedFile.size - start));
		newFile = selectedFile.slice(start, end);
	} else
		alert('slice method doesn\'t exist !');
	fileReader.readAsBinaryString(newFile);
});
socket.on('upload-done', function (data) {
	$('#upload-info').hide();
	$('#alert-area').show();
	$('#alert-area').html($('<p/>').html("<strong>Nom du fichier:</strong> " + data.name));
	$('#alert-area').append($('<p/>').html("<strong>Taille du fichier (Mo):</strong> " + data.size));
	$('#alert-area').append($('<p/>').html("<strong>Téléchargé (Mo):</strong> " + data.downloaded));
	$('#alert-area').append($('<p/>').html("<strong>Date de début:</strong> " + data.startDate));
	$('#alert-area').append($('<p/>').html("<strong>Date de fin:</strong> " + data.finishDate));
	$('#alert-area').append($('<p/>').html("<strong>Temps écoulé (ms):</strong> " + data.elapsedTime));
	$('#alert-area').append($('<p/>').html("<strong>Taux de transfert (Mo/s):</strong> " + data.rate));

	// reset des inputs
	$('#fileBox').val('');
	$('#nameBox').val('');
});
socket.on('error', function (err) {
	$('#alert-area').text(err);
});
socket.on('file-exists', function (data) {
	$('#alert-area').text(data.text);
});

var uploading = false;
function startUpload() {
	if (!!selectedFile) {
		fileReader = new FileReader();

		$('#upload-area').hide();
		$('#upload-info').show();
		$('#MB').text(toRoundedMegaByte(selectedFile.size) + "MB");
		
		fileReader.onload = function (evt) {
			socket.emit('upload-data', {
				'name' : selectedFile.name,
				'data' : evt.target.result
			});
		}
		
		socket.emit('upload-start', {
			'name' : selectedFile.name,
			'size' : selectedFile.size
		});

		$('#resume-upload').hide();
	} else {
		alert('Please select a file.');
	}
}
function toRoundedMegaByte(val) {
	return Math.round(val / (1024 * 1024));
}
function updateBar(percent, rate, downloaded) {
	$('div.progress-bar').attr('style', 'width : ' + Math.round(percent) + '%');
	$('div.progress-bar').attr('aria-valuenow', Math.round(percent));
	$('div.progress-bar').text(Math.round(percent) + "%");
	$('#percent').html(Math.round(percent * 100) / 100 + '%');
	$('#uploaded').html(downloaded + "MB");
	$('#rate').html(rate + ' Mo/s');
}

$('#pause-upload').click(function () {
	socket.emit('upload-pause', {
		'name' : selectedFile.name
	});
	$(this).hide();
	$('#resume-upload').show();
});
$('#resume-upload').click(function () {
	socket.emit('upload-resume', {
		'name' : selectedFile.name
	});
	$(this).hide();
	$('#pause-upload').show();
});
$('#cancel-upload').click(function () {
	socket.emit('upload-cancel', {
		'name' : selectedFile.name
	});

	$(this).hide();
	$('#resume-upload').hide();
	$('#pause-upload').hide();
	$('#upload-info').hide();
	$('#alertArea').text('The file upload has been cancelled.');
	$('#uploadArea').show();
	$('#fileBox').val('');
	$('#nameBox').val('');
});

$(":file").filestyle();
$('#upload-info').hide();
$('#alert-area').hide();

$(document).ready(function () {

	if (window.File && window.FileReader) {
		$('#upload-button').click(startUpload);
		$('#fileBox').change(fileChosen);
		
		// displayMessage defined in chat.js
		displayMessage("<strong>Good news:</strong> Your browser supports the <strong>file API</strong>.");

		var fr = new FileReader();
		if (!fr.readAsBinaryString) {
			displayMessage('The fileReader.readAsBinaryString method is unavailable! Please upgrade your browser or use another one.');
			$('#uploadArea').hide();
		}
		fr = null;
	} else {
		$('#uploadArea').hide();
		displayMessage("Your browser doesn't support the file API. Please update your browser.");
	}
	
});
