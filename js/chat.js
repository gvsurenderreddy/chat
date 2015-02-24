/**************************/
/** chat.js : client file */
/**************************/

/** GEOLOCALISATION */
var geolocationHelper = self = {

	geocoder : null,
	currentUserGeocodeResult : null,
	currentUserAddress : null,
	currentUserCity : null,
	currentUserCountry : null,

	reset : function () {
		self.geocoder = null;
		self.currentUserGeocodeResult = null;
		self.currentUserAddress = null;
		self.currentUserCity = null;
		self.currentUserCountry = null;
	},
	/** Get the latitude and the longitude; */
	success : function (position) {
		var lat = position.coords.latitude;
		var lng = position.coords.longitude;
		self.codeLatLng(lat, lng);
	},
	error : function () {
		alert("Geocoder failed");
		console.log("Geocoder failed");
	},
	initialiseGeolocation : function () {
		console.log("init. de la géolocalisation...");

		if (navigator.geolocation)
			navigator.geolocation.getCurrentPosition(self.success, self.error);

		//console.log("géolocalisation " + navigator.geolocation ? "activée" : "désactivée");

		self.geocoder = new google.maps.Geocoder();
	},
	codeLatLng : function (lat, lng) {

		var latlng = new google.maps.LatLng(lat, lng);
		self.geocoder.geocode({
			'latLng' : latlng
		}, function (results, status) {
			if (status == google.maps.GeocoderStatus.OK) {

				console.log(results);
				self.currentUserGeocodeResult = results;

				if (results[1]) {
					//formatted address
					self.currentUserAddress = results[0].formatted_address;

					//find country name
					for (var i = 0; i < results[0].address_components.length; i++) {
						for (var b = 0; b < results[0].address_components[i].types.length; b++) {

							// city data
							if (results[0].address_components[i].types[b] == "locality") {
								if (self.currentUserCity == null)
									self.currentUserCity = results[0].address_components[i].long_name;
							}

							// country data
							if (results[0].address_components[i].types[b] == "country") {
								if (self.currentUserCountry == null)
									self.currentUserCountry = results[0].address_components[i].long_name;
							}
						}
					}
				} else {
					console.log("No results found");
				}
			} else {
				console.log("Geocoder failed due to: " + status);
			}
		});
	}
};


/** SOCKET.IO */
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
	addMessage(data.username, data.message, momentDate.format(), data.location);
});
socket.on('disconnect', function () {
	displayMessage('<i class="fa fa-times-circle"></i> Vous avez été déconnecté du serveur de chat.');
});
socket.on('connect', function () {
	displayMessage('<i class="fa fa-check-circle"></i> <em>Vous êtes à présent connecté au serveur de chat en tant que <strong>' + USERNAME + '</strong>.</em>');
});
socket.on('user-connected', function (data) {
	displayMessage(data.username + ' a rejoint le Chat !');
});
socket.on('user-disconnected', function (data) {
	displayMessage('<i class="fa fa-times-circle"></i> ' + data.username + ' a quitté la discussion.');
});
socket.on('user-image', displayImage);
socket.on('error', function (err) {
	displayMessage('<i class="fa fa-exclamation-circle"></i> ' + (err ? err : 'An unknown error has occurred.'));
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
			address: geolocationHelper.currentUserAddress,
			country: geolocationHelper.currentUserCountry,
			city: geolocationHelper.currentUserCity
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
		//console.log('message: ' + message);
		if (message.length == 0) {
			isTyping = false;
			return;
		}
		if (message.length == 1 && isTyping == true) {
			socket.emit('stopped-typing', USERNAME);
			isTyping = false;
			return;
		}
	}
	else if (event.which != 13) {
		isTyping = true;
		socket.emit('user-typing', {
			"username" : USERNAME,
			"date" : new Date()
		});
	}
});
$('#message').change(function(){
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
var addMessage = function (username, message, date, location) {
	// 0: username, 1: user's avatar, 2: date, 3: message, 4: localisation
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
	
	if (location.city != null) {
		$('strong.primary-font:last').append('<small class="text-muted"><i class="fa fa-location-arrow fa-fw"></i>A proximit&eacute; de ' + location.city + '</small>');
	}
	
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
			//geocodeResult: geolocationHelper.currentUserGeocodeResult,
			address: geolocationHelper.currentUserAddress,
			country: geolocationHelper.currentUserCountry,
			city: geolocationHelper.currentUserCity
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
});