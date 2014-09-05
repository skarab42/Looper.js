/*
	main.js - 2014

	CopyLeft, License etc... All right! (sic)

	Written by Sébastien Mischler (aka skarab)
*/

// get microphone stream
Looper().getMicrophone(LooperApp().init, function(e) {
	throw new Error(e.name);
});