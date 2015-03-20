var data = userProfile || {}; // équivalent de userProfile ?? new Object(); en c#.

//console.dir(data);

var displayAlert = function (css, title, message) {
	$('#alert-area').html('<div class="alert alert-' + css + ' alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><strong>' + title + '</strong>&nbsp;' + message + '</div>');
}

//$('#btn-save-profile').click(function (e) {
$('form').submit(function (e) {
	e.preventDefault();
	
	/** Enregistrement de l'image du profil utilisateur. */
	var formData = new FormData();
	try{
		formData.append('file', $('input:file').files[0]);
	}catch(ex){
		console.dir(ex);
	}
	
	$.ajax({
		url : '/userProfile',
		dataType : 'json',
		data : formData,
		processData : false,
		contentType : false,
		type : 'POST',
		mimeType: 'multipart/form-data',
		success : function (data) {
			if (data.error != null) {
				displayAlert('danger', 'Erreur !', data.error);
			} else {
				displayAlert('success', 'OK !', data.message);
			}
		},
		error : function (jqXHR, textStatus, errorThrown) {
			displayAlert('danger', 'Erreur!', textStatus);
		}
	});

	return false;
});

$('#avatar-image').change(function (e) {
	var reader = new FileReader();
	reader.onload = function (evt) {
		$('#profile-picture').attr('src', evt.target.result);
	};
	reader.readAsDataURL(e.target.files[0]);
});

/** Code exécuté lorsque le document est prêt */
$(document).ready(function () {

	$('#date-of-birth').datepicker({
		language : "fr",
		orientation : "top right",
		autoclose : true
	});

	$(':file').filestyle();

	// remplissage des inputs...
	try {
		
		//console.dir(userProfile);
		
		if (!!userProfile.firstname)
			$('#firstname').val(userProfile.firstname);
		
		if (!!userProfile.lastname)
			$('#lastname').val(userProfile.lastname);
		
		if (!!userProfile.country)
			$('#country').val(userProfile.country);

		if (!!userProfile.email)
			$('#email').val(userProfile.email);

		if (!!userProfile['date-of-birth']) {
			var dateOfBirth = userProfile['date-of-birth'];
			$('#date-of-birth').datepicker('update', dateOfBirth);
		}

		// image
		if (typeof(userProfile['filename']) != 'undefined') {
			console.log('filename: ' + userProfile['filename']);
			$('#profile-picture').attr('src', "/avatars/" + userProfile['filename']);
		}

	} catch (e) {
		console.log("exception! " + e);
	}
});
