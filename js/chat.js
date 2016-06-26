/**************************/
/** chat.js : client file */
/**************************/

// We need to include geolocation-helper.js before this file.


/** SOCKET.IO */
var socket = io();

var isTyping = false;
var notifications = 0;

socket.on('refresh-connected-users', function (data) {
	$('#connected-users').empty();
	var users = data.connectedUsers;
	for (var i in users) {
		$('#connected-users').append(
			$('<li/>').html(
				'<a href="#" data-toggle="dropdown" aria-expanded="true" >' +
				'<span class="glyphicon ' + users[i].status.cssClass + '"></span>' +
				'&nbsp;' + users[i].username + ' - ' + users[i].status.name + '&nbsp;' +
				'<span class="caret"></span>' +
				'</a>' +
				'<ul class="dropdown-menu" role="menu">' +
				'<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Message privé</a></li>' +
				'<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Bloquer</a></li>' +
				'<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Envoyer un fichier</a></li>' +
				'</ul>'));
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
	if (notifications > 0)
		document.title = '(' + notifications + ') Node.js chat';
	var momentDate = moment(data.date);
	addMessage(data.username, data.message, momentDate.format("DD/MM/YYYY HH:mm"), data.location, data.profilePicture);
});
socket.on('disconnect', function () {
	displayInfo('<i class="fa fa-times-circle"></i> Vous avez été déconnecté du serveur de chat.');
});
socket.on('connect', function () {
	displayInfo('<i class="fa fa-check-circle"></i> <em>Vous êtes à présent connecté au serveur de chat en tant que <strong>' + USERNAME + '</strong>.</em>');
});
socket.on('user-connected', function (data) {
	displayInfo(data.username + ' a rejoint le Chat !');
});
socket.on('user-disconnected', function (data) {
	displayInfo('<i class="fa fa-times-circle"></i> ' + data.username + ' a quitté la discussion.');
});
socket.on('user-image', displayImage);
socket.on('error', function (err) {
	displayInfo('<i class="fa fa-exclamation-circle"></i> ' + (err ? err : 'An unknown error has occurred.'));
});

// Lorsqu'on envoie le formulaire, on transmet le message et on l'affiche sur la page
$('form').submit(function () {
	// récupération du message saisi par l'utilisateur
	var message = $('#message').val();

	// si message vide, on sort:
	if (message == '')
		return false;

	// On transmet le message au serveur
	socket.emit('message', {
		msg : message,
		location : {
			//geocodeResult: geolocationHelper.currentUserGeocodeResult,
			address : geolocationHelper.currentUserAddress,
			country : geolocationHelper.currentUserCountry,
			city : geolocationHelper.currentUserCity
		}
	});

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
		if (message.length == 0) {
			isTyping = false;
			return;
		}
		if (message.length == 1 && isTyping == true) {
			socket.emit('stopped-typing', USERNAME);
			isTyping = false;
			return;
		}
	} else if (event.which != 13) {
		isTyping = true;
		socket.emit('user-typing', {
			"username" : USERNAME,
			"date" : new Date()
		});
	}
});
$('#message').change(function () {
	var message = $('#message').val();
	if (message.length == 0 && isTyping == true) {
		socket.emit('stopped-typing', USERNAME);
		isTyping = false;
		return;
	}
})
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
var addMessage = function (username, message, date, location, profilePicture) {
	// 0: username, 1: user's avatar, 2: date, 3: message, 4: localisation
	var html_leftAlign =
		'<li class="left clearfix">' +
		'<span class="chat-img pull-left">' +
		'<img src="{1}" alt="User Avatar" class="img-circle" height="50" width="50" />' +
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
		'<img src="{1}" alt="User Avatar" class="img-circle" height="50" width="50" />' +
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
	//var avatar = (username == USERNAME) ? "http://placehold.it/50/55C1E7/fff" : "http://placehold.it/50/FA6F57/fff";
	html = String.format(html, username, profilePicture, date, message);
		
	$('#messages').append(html);
	if (location.city != null) {
		$('strong.primary-font:last').append('<small class="text-muted"><i class="fa fa-location-arrow fa-fw"></i>A proximit&eacute; de ' + location.city + '</small>');
	}

	scrollToBottom();
};
var displayInfo = function (message) {
	$('#messages').append($('<li>').html(message));
	scrollToBottom();
};
var scrollToBottom = function () {
	$('#main').animate({
		scrollTop : $('#main')[0].scrollHeight
	}, 1000);
};
var displayImage = function (username, base64Image) {
	$('#messages').append($('<ul>').append($('<b>').text(username), '<img src=\'' + base64Image + '\' />'));
};

var usersStatus = [];
var displayUsersStatus = function (data) {
	if (typeof(data) === 'undefined')
		return;
	usersStatus = data;
	for (var i in usersStatus) {
		var obj = usersStatus[i];
		$('#users-status').append('<li><a href="#" id="' + obj.id + '" onclick="changeUserStatus(' + i + ');"><span class="glyphicon ' + obj.cssClass + '" aria-hidden="true"></span>&nbsp;' + obj.name + '</a></li>');
	}
};
var changeUserStatus = function (index) {
	var obj = usersStatus[index];

	// on supprime la classe "selected" de tous les éléments de type a possédant la classe selected
	$('ul.dropdown-menu a.selected').removeClass('selected');

	// on ajoute la classe selected à l'élément cliqué, c'est-à-dire $(this)
	$(this).toggleClass('selected');

	// on envoie l'évènement/message au serveur
	socket.emit('user-status', {
		username : USERNAME,
		status : obj.id,
		geolocation : {
			address : geolocationHelper.currentUserAddress,
			country : geolocationHelper.currentUserCountry,
			city : geolocationHelper.currentUserCity
		}
	});
};

/** Code exécuté lorsque le document est prêt */
$(document).ready(function () {

	// initialisation de la géo-localisation
	geolocationHelper.initialiseGeolocation();

	// make ajax call:
	var request = $.ajax('/api/users-status');
	request.done(function (data) {
		displayUsersStatus(data);
	});
	request.fail(function () {
		alert('Error occurred!');
	});

	$(":file").filestyle();
	$('#uploadInfo').hide();
});
