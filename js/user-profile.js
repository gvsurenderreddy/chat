var imageData = null;

var displayAlert = function (css, title, message) {

	$('#alert-area').html('<div class="alert alert-' + css + ' alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><strong>' + title + '</strong>&nbsp;' + message + '</div>');
}

// $('#btn-save-profile').click(function (e) {

// var firstname = $('#firstname').val();
// var lastname = $('#lastname').val();
// var dateOfBirth = $('#date-of-birth').datepicker('getDate');
// var country = $('#country').val();
// var email = $('#email').val();

// /** Enregistrement de l'image du profil utilisateur. */
// if (imageData != null) {
// $.ajax({
// url : '/user-image',
// dataType : 'json',
// //contentType : 'application/octet-stream',
// //processData : false,
// data : imageData,
// type : 'POST',
// success : function (data) {
// if (data.error != null) {
// displayAlert('danger', 'Erreur !', data.error);
// } else {
// displayAlert('success', 'OK !', data.message);
// }
// },
// error : function (jqXHR, textStatus, errorThrown) {
// displayAlert('danger', 'Erreur!', textStatus);
// }
// });
// }

// /** Enregistrement des autres infos du profil utilisateur. */
// // if (!(firstname == '' && lastname == '' && dateOfBirth == '' && country == '' && email == '')) {
// // var formData = {
// // 'firstname' : firstname,
// // 'lastname' : lastname,
// // 'date-of-birth' : dateOfBirth,
// // 'country' : country,
// // 'email' : email
// // //'avatar-image' : imageData
// // }

// // $.ajax({
// // url : '/userProfile',
// // dataType : 'json',
// // data : formData,
// // type : 'POST',

// // /** success Type: Function( Anything data, String textStatus, jqXHR jqXHR ) */
// // success : function (data) {
// // console.log(data);
// // if (data.error != null) {
// // displayAlert('danger', 'Erreur!', data.error);
// // } else {
// // displayAlert('success', 'Succès!', data.message);
// // }
// // },

// // /** error Type: Function( jqXHR jqXHR, String textStatus, String errorThrown ) */
// // error : function (jqXHR, textStatus, errorThrown) {
// // displayAlert('danger', 'Erreur!', textStatus);
// // }
// // });

// // }

// return false;

// });

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
		if (userProfile['filename'] != ''){
			console.log('filename: ' + userProfile['filename']);
			$('#profile-picture').attr('src', "/avatars/" + userProfile['filename']);
		}
		
	} catch (e) {
		console.log("exception! " + e);
	}
});
