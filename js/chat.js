/**************************/
/** chat.js : client file */
/**************************/

var socket = io();

var isTyping = false;

socket.on('refresh-connected-users', function (data) {
	//console.log('refresh-connected-users data = ' + data);
	$('#connected-users').empty();
	//console.log("data: " + data);
	var users = data.connectedUsers;
	for (var i in users) {
		$('#connected-users').append($('<li/>').html('<span class="glyphicon ' + users[i].status.cssClass + '"></span> ' + users[i].username + ' - ' + users[i].status.name));
	}
});
socket.on('stopped-typing', function (username) {
	$('li#' + username).remove();
});
socket.on('user-typing', function (data) {
	// tester si l'élément de liste n'existe pas déjà, auquel cas, on ne fait rien.
	var match = $('li#' + data.username).length;
	if (match == 0) {
		$('#messages').append("<li id='" + data.username + "'>" + data.username + " est en train d'écrire... </li>");
		scrollToBottom();
	}
});
socket.on('message', function (data) {
	var momentDate = moment(data.date);
	console.log('il y a ' + momentDate.fromNow());
	addMessage(data.username, data.message, momentDate.format());
});
socket.on('disconnect', function () {
	displayMessage("Vous avez été déconnecté du serveur de chat.");
});
socket.on('connect', function () {
	displayMessage('<em>Vous êtes à présent connecté au serveur de chat en tant que <strong>' + USERNAME + '</strong>.</em>');
});
socket.on('user-connected', function (data) {
	displayMessage(data.username + ' a rejoint le Chat !');
});
socket.on('user-disconnected', function (data) {
	displayMessage(data.username + ' a quitté la discussion.');
});
socket.on('user-image', displayImage);
socket.on('error', function (e) {
	displayMessage(e ? e : 'An unknown error has occurred.');
});

// Lorsqu'on envoie le formulaire, on transmet le message et on l'affiche sur la page
$('form').submit(function () {
	// récupération du message saisi par l'utilisateur
	var message = $('#message').val();

	// si message vide, on sort:
	if (message == '')
		return false;

	// On transmet le message au serveur
	socket.emit('message', message);

	// Vide la zone de Chat et remet le focus dessus
	$('#message').val('').focus();

	// on remet à zéro le flag isTyping
	isTyping = false;

	return false;
});

$('#message').keydown(function (event) {
	// 13 = ENTER, 8 = backspace
	if (event.which == 8) {
		var message = $('#message').val();
		//console.log('message: ' + message);
		if (message == '' && isTyping == true) {
			socket.emit('stopped-typing', USERNAME);
			isTyping = false;
			return;
		}
	}
	if (event.which != 13) {
		isTyping = true;
		socket.emit('user-typing', {
			"username" : USERNAME,
			"date" : new Date()
		});
	}
});

$('#imagefile').bind('change', function (e) {
	var data = e.originalEvent.target.files[0];
	var reader = new FileReader();
	reader.onload = function (evt) {
		displayImage(USERNAME, evt.target.result);
		socket.emit('user-image', evt.target.result);
	};
	reader.readAsDataURL(data);
});

// Ajoute un message dans la page
var addMessage = function (username, message, date) {
	// 0: username, 1: user's avatar, 2: date, 3: message
	var html_leftAlign =
		'<li class="left clearfix">' +
		'<span class="chat-img pull-left">' +
		'<img src="{1}" alt="User Avatar" class="img-circle" />' +
		'</span>' +
		'<div class="chat-body clearfix">' +
		'<div class="header">' +
		'<strong class="primary-font">{0}</strong>' +
		'<small class="pull-right text-muted">' +
		'<i class="fa fa-clock-o fa-fw"></i> {2}' +
		'</small>' +
		'</div>' +
		'<p>{3}</p>' +
		'</div>' +
		'</li>';

	var html_rightAlign =
		'<li class="right clearfix">' +
		'<span class="chat-img pull-right">' +
		'<img src="{1}" alt="User Avatar" class="img-circle" />' +
		'</span>' +
		'<div class="chat-body clearfix">' +
		'<div class="header">' +
		'<strong class="pull-right primary-font">{0}</strong>' +
		'<small class=" text-muted">' +
		'<i class="fa fa-clock-o fa-fw"></i> {2}' +
		'</small>' +
		'</div>' +
		'<p>{3}</p>' +
		'</div>' +
		'</li>';

	var html = (username == USERNAME) ? html_leftAlign : html_rightAlign;
	var avatar = (username == USERNAME) ? "http://placehold.it/50/55C1E7/fff" : "http://placehold.it/50/FA6F57/fff";
	html = String.format(html, username, avatar, date, message);
	$('#messages').append(html);
	scrollToBottom();
};
var displayMessage = function (message) {
	$('#messages').append($('<li>').html(message));
	scrollToBottom();
};
var scrollToBottom = function () {
	$('#main').animate({
		scrollTop : $('#main')[0].scrollHeight
	}, 1000);
};
var displayImage = function (username, base64Image) {
	console.log("username: " + username + ", base64Image.length: " + base64Image.length);
	$('#messages').append($('<ul>').append($('<b>').text(username), '<img src=\'' + base64Image + '\' />'));
};

var usersStatus = [];
var displayUsersStatus = function(data) {
	if (typeof(data) === 'undefined') return;
	usersStatus = data;
	for (var i in usersStatus) {
		var obj = usersStatus[i];
		console.log('obj.id:' + obj.id);
		$('#users-status').append('<li><a href="#" id="' + obj.id + '" onclick="displayUsersStatus_callback(' + i + ');"><span class="glyphicon ' + obj.cssClass + '" aria-hidden="true"></span>&nbsp;' + obj.name + '</a></li>');
	}
};
var displayUsersStatus_callback = function (index) {
	
	var obj = usersStatus[index];
	
	// on supprime la classe "selected" de tous les éléments de type a possédant la classe selected
	$('ul.dropdown-menu a.selected').removeClass('selected');

	// on ajoute la classe selected à l'élément cliqué, c'est-à-dire $(this)
	$(this).toggleClass('selected');

	// on envoie l'évènement/message au serveur
	socket.emit('user-status', {
		username : USERNAME,
		status : obj.id
	});
};

/** Code exécuté lorsque le document est prêt */
$(document).ready(function () {
	// make ajax call:
	var request = $.ajax('/api/users-status');
	request.done(function (data) {
		displayUsersStatus(data);
		
		
	});
	request.fail(function () {
		alert('Error occurred!');
	});
});