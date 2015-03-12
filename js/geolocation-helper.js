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
	success : function (position) {
		/** Get the latitude and the longitude; */
		var lat = position.coords.latitude;
		var lng = position.coords.longitude;
		self.codeLatLng(lat, lng);
	},
	error : function () {
		console.log("Geocoder failed");
	},
	initialiseGeolocation : function () {
		console.log("init. de la géolocalisation...");

		if (navigator.geolocation)
			navigator.geolocation.getCurrentPosition(self.success, self.error);

		self.geocoder = new google.maps.Geocoder();
	},
	codeLatLng : function (lat, lng) {

		var latlng = new google.maps.LatLng(lat, lng);
		self.geocoder.geocode({
			'latLng' : latlng
		}, function (results, status) {
			if (status == google.maps.GeocoderStatus.OK) {

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
