
var displayAlert = function(css, message) {
	$('#alert-area').html('<div class="alert alert-' + css + ' alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><strong>OK!</strong>&nbsp;' + message + '</div>');
}

$('#btn-save-profile').click(function (e) {

	var firstname = $('#firstname').val();
	var lastname = $('#lastname').val();
	var dateOfBirth = $('#date-of-birth').datepicker('getDate');
	var country = $('#country').val();
	var email = $('#email').val();

	if (!(firstname == '' && lastname == '' && dateOfBirth == '' && country == '' && email == '' && imageData == '')) {
		var formData = {
			'firstname' : firstname,
			'lastname' : lastname,
			'date-of-birth' : dateOfBirth,
			'country' : country,
			'email' : email,
			'avatar-image' : imageData
		}
		$.ajax({
			url : '/userProfile',
			dataType : 'json',
			data : formData,
			type : 'POST',
			
			/** success Type: Function( Anything data, String textStatus, jqXHR jqXHR ) */
			success : function (data) {
				console.log(data);
				if (data.error == null) {
					displayAlert('success', data.message);
				} else {
					displayAlert('danger', data.error);
				}
			},
			
			/** error Type: Function( jqXHR jqXHR, String textStatus, String errorThrown ) */
			error : function (jqXHR, textStatus, errorThrown) {
				displayAlert('danger', textStatus);
			}
		});
	}

	return false;

});


var imageData = null;
$('#avatar-image').bind('change', function (e) {
	var data = e.originalEvent.target.files[0];
	var reader = new FileReader();
	reader.onload = function (evt) {
		imageData = evt.target.result;
		//console.dir(imageData);
	};
	reader.readAsDataURL(data);
});
// function getBase64Image(imgElem) {
	// // imgElem must be on the same server otherwise a cross-origin error will be thrown "SECURITY_ERR: DOM Exception 18"
	// var canvas = document.createElement("canvas");
	// canvas.width = imgElem.clientWidth;
	// canvas.height = imgElem.clientHeight;
	// var ctx = canvas.getContext("2d");
	// ctx.drawImage(imgElem, 0, 0);
	// var dataURL = canvas.toDataURL("image/png");
	// return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
// }

/** Code exécuté lorsque le document est prêt */
$(document).ready(function () {

	$('#date-of-birth').datepicker({
		language : "fr",
		orientation : "top right",
		autoclose : true
	});

	$(':file').filestyle();

	// remplissage des inputs...
	if (!!userProfile.firstname)
		$('#firstname').val(userProfile.firstname);
	if (!!userProfile.lastname)
		$('#lastname').val(userProfile.lastname);
	if (!!userProfile['date-of-birth'])
	{
		var dateOfBirth = moment(userProfile['date-of-birth']);
		$('#date-of-birth').datepicker('update', dateOfBirth);
	}
	if (!!userProfile.country)
		$('#country').val(userProfile.country);
	if (!!userProfile.email)
		$('#email').val(userProfile.email);

});
