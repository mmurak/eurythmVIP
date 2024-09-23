class GlobalManager {
	constructor() {
		this.headerSection = document.getElementById("HeaderSection");
		this.wholeBodySection = document.getElementById("WholeBodySection");
		this.footerSection = document.getElementById("FooterSection");
		this.mediaFile = document.getElementById("MediaFile");
		this.videoFilename = document.getElementById("VideoFilename");
		this.scriptFilename = document.getElementById("ScriptFilename");
		this.videoContainer = document.getElementById("VideoContainer");
		this.videoElement = document.getElementById("VideoElement");
		this.pressPlay = document.getElementById("PressPlay");
		this.isPressHold = false;
		this.playPause = document.getElementById("PlayPause");
		this.selector = document.getElementById("Selector");
		this.speedMeter = document.getElementById("SpeedMeter");
		this.speedResetButton = document.getElementById("SpeedResetButton");
		this.scriptDiv = document.getElementById("ScriptDiv");
		this.textArea = document.getElementById("TextArea");
		this.startPoint = 0.0;
		this.videoControls = document.getElementById('Video-controls');
		this.progress = document.getElementById('Progress');
		this.progressBar = document.getElementById('Progress-bar');
		this.leftArrowButton = document.getElementById("LeftArrowButton");
		this.rightArrowButton = document.getElementById("RightArrowButton");
		this.jumpSelector = document.getElementById("JumpSelector");
		this.langSelector = document.getElementById("LangSelector");
		this.timeDisplay = document.getElementById("TimeDisplay");

		this.frameWidth = "640";
		this.interactiveArray = [];
		this.tracePtr = 0;
		this.baseColor = "white";
		this.emphasisColor = "pink";
		this.displayOffset = 2;
		this.analyse = true;

		this.speedStorage = 1.0;
		this.defaultSpeedLabel = "1x Speed";
	}
}

let G = new GlobalManager();

resize();

G.videoElement.controls = false;
G.videoControls.setAttribute('data-state', 'visible');


/*
 *	Event handlers
 */

// Window resize event
window.addEventListener("resize", (evt) => {
	resize();
});

// Window load event
window.addEventListener("load", (evt) => {
	resize();
});

// Invoked when Media input button is clicked
G.mediaFile.addEventListener("change", (evt) => {
	let file = evt.target.files[0];
	if  (typeof file === "undefined") return;
	let ext = file.name.split(".");
	if (ext.length < 2) return;
	switch (ext.pop()) {
		case "txt" :
			G.scriptFilename.innerHTML = file.name;
			let reader = new FileReader();
			reader.readAsText(file);
			reader.onload = function () {
				G.textArea.innerHTML = convertTxtScript(reader.result);
			}
			break;
		case "srt" :
			G.scriptFilename.innerHTML = file.name;
			let srtReader = new FileReader();
			srtReader.readAsText(file);
			srtReader.onload = function () {
				G.textArea.innerHTML = srt2internalExp(srtReader.result);
			}
			break;
		default:
			G.videoFilename.innerHTML = file.name;
			if (G.analyse) {
				mp4subtitles.load(file, readyCallback);
			}
			G.videoElement.src = window.URL.createObjectURL(file);
			G.startPoint = 0.0;
			resize();
			G.pressPlay.disabled = false;
			G.playPause.disabled = false;
			G.selector.value = 1.0;
			G.selector.dispatchEvent(new Event("input"));
			G.speedResetButton.value = G.defaultSpeedLabel;
			G.timeDisplay.innerHTML = "00:00:00";
	}
}, false);

// Invoked when PressPlay button is pressed down
G.pressPlay.addEventListener("mousedown", (evt) => { _processPressPlayStart(evt); });
G.pressPlay.addEventListener("touchstart", (evt) => { _processPressPlayStart(evt); });
function _processPressPlayStart(evt) {
	if (G.videoElement.src == "") return;
	G.isPressHold = true;
	resetPlayPause();
	G.videoElement.currentTime = G.startPoint;
	G.videoElement.play();
	evt.preventDefault();
}

// Invoked when PressPlay button is released
G.pressPlay.addEventListener("mouseup", (evt) => { _processPressPlayEnd(evt); });
G.pressPlay.addEventListener("touchend", (evt) => {_processPressPlayEnd(evt); });
function _processPressPlayEnd(evt) {
	if ((G.isPressHold == false) || (G.videoElement.src == ""))  return;
	G.isPressHold = false;
	G.videoElement.pause();
	evt.preventDefault();
}

// Invoked when the Transcript area is clicked
G.textArea.addEventListener("click", (evt) =>{ _processTap(evt); });
G.textArea.addEventListener("touchstart", (evt) =>{_processTap(evt); });
function _processTap(evt) {
	register();
	evt.preventDefault();
}

// Invoked when a media file is loaded
G.videoElement.addEventListener('loadedmetadata', () => {
	G.progress.setAttribute('max', G.videoElement.duration);
});

// Invoked when the app begins to play
G.videoElement.addEventListener('play', () => {
	//	changeButtonState('playpause');
	G.tracePtr = findLine();
	clearAllLines();
	if (!G.isPressHold) {
		G.playPause.style = "background: red";
		G.playPause.value = "Tap for\nPause";
	}
}, false);

// Invoked when the app pauses to play
G.videoElement.addEventListener('pause', () => {
	setPlayPause();
}, false);

// Invoked when the PlayPause button is clicked
G.playPause.addEventListener('click', (e) => { _processPlayPause(e); });
function _processPlayPause(e) {
	if (G.videoElement.paused || G.videoElement.ended) {
		G.videoElement.play();
	} else {
		G.videoElement.pause();
	}
}
// Invoked when the Video screen is clicked
G.videoElement.addEventListener('click', (e) => { _processPlayPause(e); });

// Invoked while playing the media
G.videoElement.addEventListener('timeupdate', () => {
	// For mobile browsers, ensure that the progress element's max attribute is set
	if (!G.progress.getAttribute('max')) {
		G.progress.setAttribute('max', G.videoElement.duration);
	}
	G.progress.value = G.videoElement.currentTime;
	G.timeDisplay.innerHTML = getTime(G.videoElement.currentTime).substring(0, 8);
	G.progressBar.style.width = Math.floor((G.videoElement.currentTime / G.videoElement.duration) * 100) + '%';
	interactiveSubtitles();
});

// Invoked when the progress bar is clicked
G.progress.addEventListener('click', (e) => {
	if (G.videoElement.src == "")  return;
	let pos = (e.pageX  - (G.progress.offsetLeft + G.progress.offsetParent.offsetLeft)) / G.progress.offsetWidth;
	const sPoint = pos * G.videoElement.duration;
	G.videoElement.currentTime = sPoint;
	G.startPoint = sPoint;
	if (G.videoElement.paused) {
		setPlayPause();
	}
});


// Double-click disabler
document.addEventListener("dblclick", (e) => {
	e.preventDefault();
});

// Invoked when the Speed selector is changed
G.selector.addEventListener("input", (e) => {
	speedChange(G.selector);
});

// Invoked when Left arrow is clicked
G.leftArrowButton.addEventListener("click", _processLeftArrow);
function _processLeftArrow() {
	G.videoElement.currentTime = G.videoElement.currentTime - Number(G.jumpSelector.value);
}

// Invoked when Right arrow is clicked
G.rightArrowButton.addEventListener("click", _processRightArrow);
function _processRightArrow() {
	G.videoElement.currentTime = G.videoElement.currentTime + Number(G.jumpSelector.value);
}

// Invoked when Speed reset button is clicked
G.speedResetButton.addEventListener("click", _speedReset);
function _speedReset() {
	if (G.selector.value == 1.0) {
		G.selector.value = G.speedStorage;
		G.speedResetButton.value = G.defaultSpeedLabel;
	} else {
		G.selector.value = 1.0;
		G.speedResetButton.value = G.speedStorage + "x Speed";
	}
	G.selector.dispatchEvent(new Event("input"));
}

document.addEventListener("keydown", (evt) => {
	if (evt.key == " ") {
		_processPlayPause(evt)
	} else if (evt.metaKey) {
		_processPressPlayStart(evt);
	} else if (evt.key == "ArrowLeft") {
		_processLeftArrow(evt);
	} else if (evt.key == "ArrowRight") {
		_processRightArrow(evt);
	} else if ((evt.key >= "1") && (evt.key <= "9")) {
		let delta = (evt.ctrlKey) ? Number(evt.key) : -Number(evt.key);
		G.videoElement.currentTime = G.videoElement.currentTime + delta;
	} else if (evt.key == "ArrowUp") {
		G.selector.value = Number(G.selector.value) + 0.05;
		speedChange(G.selector);
	} else if (evt.key == "ArrowDown") {
		G.selector.value = Number(G.selector.value) - 0.05;
		speedChange(G.selector);
	} else if ((evt.key == "d") || (evt.key == "D")) {
		_speedReset(evt);
	}
	evt.preventDefault();
});
document.addEventListener("keyup", (evt) => {
	if (G.isPressHold) {
		_processPressPlayEnd(evt);
	}
});

G.langSelector.addEventListener("change", (evt) => {
	const lang = G.langSelector[G.langSelector.selectedIndex].value;
	mp4subtitles.getScriptsArray(lang, scriptsReady);
});

/*
 * Functions
 */

// Invoked when the media file has been loaded
function readyCallback() {
	let langList = mp4subtitles.getAvailableLanguage();
	if (langList.includes("English")) {
		mp4subtitles.getScriptsArray("English", scriptsReady);
	}
	G.langSelector.innerHTML = "";
	for (const lang of langList) {
		const opt = document.createElement("option");
		opt.value = lang;
		opt.innerHTML = lang;
		G.langSelector.appendChild(opt);
	}
}

// Convert MP4 internal representation (tx3g) to SRT format
function scriptsReady(scriptsArray) {
	let sheet = "";
	let no = 1;
	for(let s of scriptsArray) {
		sheet += no + "\n" + getSRTTime(s[0], ",") + " --> " + getSRTTime(s[1], ",") + "\n" + s[2] + "\n\n";
		no++;
	}
	const sheetData = srt2internalExp(sheet);
	G.textArea.innerHTML = sheetData;
	if (sheetData == "") {
		G.scriptFilename.innerHTML = "";
	} else {
		G.scriptFilename.innerHTML = "(Inside the video file.)";
	}
}

// Convert SRT to the app's internal representation
function srt2internalExp(text) {
	let clusters = text.split(/\n\n/);
	let result = "";
	G.lineNo = 1;
	G.interactiveArray = [];
	for (let i = 0; i < clusters.length; i++) {
		// [1]:No [2]:StartTime [3]:Text
		let m = clusters[i].match(/^(\d+)\n(\d\d:\d\d:\d\d,\d\d\d) --> \d\d:\d\d:\d\d,\d\d\d\n((.|\n|\r\n)*)$/);
		if (m != null) {
			let savedTime =  m[2].replace(",", ".");
			let val = m[3].trim();		//		.replaceAll(/(\n|\r\n)/g, " ");
			result += "<a name='" + G.lineNo + "' id='L" + G.lineNo + "' class='A'>" + val + "</a>\n";
			G.lineNo++;
			G.interactiveArray.push(stringTimeToSec(savedTime) - 0.1);	// 0.1 for lag
		}
	}
	return result;
}

// Build up the Transcript area from internal representation.
function convertTxtScript(text) {
	G.interactiveArray = [];
	let clusters = text.split(/\n/);
	let result = "";
	G.lineNo = 1;
	for (line of clusters) {
		let blueMatch = line.match(/^\[\[(\d\d:\d\d:\d\d\.\d\d\d)\]\](.*)$/);
		if (blueMatch != null) {
			let blueTime = '<a name="' + G.lineNo + '" id="L' + G.lineNo + '" class="A">[[' + blueMatch[1] + ']]</a>';
			let rest = blueMatch[2];
			result += blueTime + rest + "<br/>\n";
			G.interactiveArray.push(stringTimeToSec(blueMatch[1]) - 0.1);		// 0.1 for lag
			G.lineNo++;
		} else {
			result += line + "<br/>\n";
		}
	}
	return result;
}

// Invoked when the Transcript area is clicked
function register() {
	const idCandidate = window.getSelection().baseNode.parentNode.id;
	if (idCandidate == "TextArea")  return;
	const sPoint = G.interactiveArray[Number(idCandidate.substring(1))-1] + 0.1;
	G.videoElement.currentTime = sPoint;
	G.startPoint = sPoint;
	G.textArea.blur();
	interactiveSubtitles();
}

// Controls the label for PlayPause button --- RESET
function resetPlayPause() {
	G.playPause.style = "background: #339270";
	G.playPause.value = "Tap Play\n " + getTime(G.startPoint).substring(0, 8) + "▷";
}

// Controls the label for PlayPause button --- SET
function setPlayPause() {
	G.playPause.style = "background: #339270";
	G.playPause.value = "Tap Play\n" + getTime(G.videoElement.currentTime).substring(0, 8) + "▷";
}

// Called when the rewind/FF buttons are clicked
function rewind(sec) {
	let result = G.videoElement.currentTime - sec;
	if (result < 0) {
		result = 0;
	} else if (result > G.videoElement.duration) {
		result = G.videoElement.duration;
	}
	G.videoElement.currentTime = result;
	if (G.videoElement.paused) {
		setPlayPause();
	}
}

// Called when Speed-slider's value has beern changed.
function speedChange(obj) {
	let speed = Number(obj.value);
	G.videoElement.playbackRate =speed;
	G.speedMeter.innerHTML = speed.toFixed(2);
	if (speed != 1) {
		G.speedStorage = speed;
		G.speedResetButton.value = G.defaultSpeedLabel;
	}
}

// Invoked when the Window size has been changed
function resize() {
	G.videoContainer.style + "Width: 100%;";
	G.textArea.style = "height: " + (window.innerHeight - 
		G.headerSection.getBoundingClientRect().height - 
		G.footerSection.getBoundingClientRect().height - 60) + "px;";
}



/*
 * Utilities
 */

// Convert milli sec. time to HH:MM:SS,mmm  (in SRT format, fraction time is separated by comma, not period.
function getSRTTime(currentTime) {
    let ct = Math.floor(currentTime / 1000);
    let hour = Math.floor(ct / 3600000);
    let minute = Math.floor(ct % 3600000 / 60000);
    let sec = Math.floor(ct % 60000 / 1000);
    let csec = Math.floor(ct % 1000);
    return ("00" + hour).slice(-2) + ":" + ("00" + minute).slice(-2) + ":" + ("00" + sec).slice(-2) + "," + ("000" + csec).slice(-3);
}

// Convert milli sec. time to HH:MM:SS.mmm
function getTime(currentTime) {
    let ct = Math.floor(currentTime * 1000);
    let hour = Math.floor(ct / 3600000);
    let minute = Math.floor(ct % 3600000 / 60000);
    let sec = Math.floor(ct % 60000 / 1000);
    let csec = Math.floor(ct % 1000);
    return ("00" + hour).slice(-2) + ":" + ("00" + minute).slice(-2) + ":" + ("00" + sec).slice(-2) + "." + ("00" + csec).slice(-3);
}

// Convert HH:MM:SS.mmm time to milli sec.
function stringTimeToSec(str) {
	let parts = str.split(/:/);
	let factor = 1;
	let val = 0;
	for (let i = parts.length - 1; i >= 0; i--) {
		val += factor * parts[i];
		factor *= 60;
	}
	return val;
}

/*
 * Subtitles procedures
 */

function interactiveSubtitles() {
	let ptr = findLine() + 1;
	if (ptr != G.tracePtr) {
		setBackgroundColor(G.tracePtr, G.baseColor);
	}
	if (ptr < G.interactiveArray.length + 1) {
		setBackgroundColor(ptr, G.emphasisColor);
		G.tracePtr = ptr;
	}
	let offset = (ptr > G.displayOffset) ? ptr - G.displayOffset : 1;
	window.location.hash = offset;
	G.playPause.focus();
}

// Reset the all the colour
function clearAllLines() {
	for (let i = 1; i < G.lineNo; i++) {
		setBackgroundColor(i, G.baseColor);
	}
}

function setBackgroundColor(at, color) {
	if (at < 1) return;
	document.getElementById("L" + at).style = "background-color:" + color;
}

function findLine() {
	let i = G.interactiveArray.length - 1;
	while((i >= 0) && (G.videoElement.currentTime < G.interactiveArray[i])) {
		i--;
	}
	return i;
}

