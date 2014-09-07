/*
    main.js - 2014

    CopyLeft, License etc... All right! (sic)

    Written by Sébastien Mischler (aka skarab)
*/

try {
	// error function (need to be more verbose)
	function error(e) {
			// message
			var message = e.message || e.name;

			// log error message
			console.log('Looper.js: error:', message);
			
			// display error message
			$('#looper').html('<h1>Oups! ' + message + '</h1>');
	}
	
	// try to get microphone stream and init the app
	Looper().getMicrophone(LooperApp().init, error);
}
catch(e) {
	error(e);
}