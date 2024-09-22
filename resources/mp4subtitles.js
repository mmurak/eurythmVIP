var mp4 = mp4 || {};

mp4subtitles = (function() {
//private
	var ISO639dict = new ISO639();
	var MP4BoxFile = null;
	var Offset = 0;
	var Info = null;
	var ReadyCallback = null;	// callback registration used when the informations have gathered
	var Tx3gTracks = null;		// lang-code to trackNo dict
	var RevLangDict = {};			// Language name to language code dictionary

	function load(file, readyCallback) {
		var chunkSize = 1024 * 1024;
		var fileSize = file.size;
		Offset = 0;
		ReadyCallback = readyCallback;
		var readBlock = null;

		MP4BoxFile = MP4Box.createFile();
		MP4BoxFile.onError = function(e) {
			console.log("MP4Box error happened.");
			console.log(e);
		};

		Tx3gTracks = {};
		MP4BoxFile.onReady = function(info) {	// Information gathering finished
			for (var i = 0; i < info.tracks.length; i++) {
				if (info.tracks[i].codec == "tx3g") {
					Tx3gTracks[info.tracks[i].language] = i;
				}
			}
			Info = info;		// backin up for later use
			ReadyCallback();		// Calling to do sth.
		};
		function onParsedBuffer(mp4box, buffer) {		// 3rd phase of information gathering
			buffer.fileStart = Offset;
			mp4box.appendBuffer(buffer);
		}
		var onBlockRead = function(e) {	// 2nd phase of information gathering
			if (e.target.error == null) {
				onParsedBuffer(MP4BoxFile, e.target.result);
				Offset += e.target.result.byteLength;
			} else {
				console.log("Read error happened.");
				return;
			}
			if (Offset >= fileSize) {
				console.log("Reading done (" + fileSize + ")");
				MP4BoxFile.flush();
				return;
			}
			readBlock(Offset, chunkSize, file);		// repeat
		}
		readBlock = function(_offset, length, _file) {		// 1st phase of information gathering
			var reader = new FileReader();
			var blob = _file.slice(_offset, length + _offset);
			reader.onload = onBlockRead;
			reader.readAsArrayBuffer(blob);
		}
		readBlock(Offset, chunkSize, file);		// Initial entry point
	}

	function getAvailableLanguage() {
		var nameList = [];
		RevLangDict = {};
		for (var n of Object.keys(Tx3gTracks)) {
			var fullname = ISO639dict.getName(n);
			nameList.push(fullname);
			RevLangDict[fullname] = n;
		}
		return nameList.sort();
	}

	function getScriptsArray(languageName, onScriptsReady) {
		MP4BoxFile.onSamples = function(id, user, samples) {	// final callback
			var scriptsArray = [];
			for (var i = 1; i < samples.length-1; i++) {
				var startTime = samples[i].cts;
				var endTime = samples[i+1].cts;
				var line = "";
				var stringLen = samples[i].data[0] * 256 + samples[i].data[1] + 2;
				line = new TextDecoder("utf-8").decode(samples[i].data.slice(2, stringLen));
				if (line == "") {
					continue;
				}
				scriptsArray.push([startTime, endTime, line]);
			}
			onScriptsReady(scriptsArray);
		}
		var textTrack = null;
		var trackNo = Tx3gTracks[RevLangDict[languageName]];
		MP4BoxFile.setExtractionOptions(Info.tracks[trackNo].id, textTrack, {
			nbSamples: Info.tracks[trackNo].nb_samples
		});
		MP4BoxFile.start();
	}

	return {
		load: function(file, readyCallback) { return load(file, readyCallback); },
		getAvailableLanguage: function() { return getAvailableLanguage(); },
		getScriptsArray: function(languageName, readyCallback) { return getScriptsArray(languageName, readyCallback); },
	}
})();
