class ParameterManager {
	constructor() {
		this.database = {
			"vratio": "45",
			"tsize": "20",
			"pause": "0.2",
		};
		const argLine = location.search.substring(1);
		if (argLine != "") {
			const args = argLine.split("&");
			for (let arg of args) {
				const pair = arg.split("=");
				this.database[pair[0]] = pair[1];
			}
		}
	}
	get(key) {
		if (key in this.database) {
			return this.database[key];
		} else {
			return "";
		}
	}
	set(key, value) {
		this.database[key] = value;
	}
}

class GlobalManager {
	constructor() {
		this.headerSection = document.getElementById("HeaderSection");
		this.wholeBodySection = document.getElementById("WholeBodySection");
		this.footerSection = document.getElementById("FooterSection");
		this.mediaFile = document.getElementById("MediaFile");
		this.videoFilename = document.getElementById("VideoFilename");
		this.scriptFilename = document.getElementById("ScriptFilename");
		this.videoContainer = document.getElementById("VideoContainer");

		this.videoPlayer = document.getElementById("VideoPlayer");
		this.videoPlayer.controls = false;

		this.pressPlay = document.getElementById("PressPlay");
		this.isPressHold = false;
		this.pressPlay.value = pressToPlayLabel(0);

		this.playPause = document.getElementById("PlayPause");
		this.speedController = document.getElementById("SpeedController");
		this.speedMeter = document.getElementById("SpeedMeter");
		this.speedResetButton = document.getElementById("SpeedResetButton");
		this.scriptDiv = document.getElementById("ScriptDiv");
		this.textArea = document.getElementById("TextArea");

		this.startTime = 0.0;

		this.videoControls = document.getElementById('Video-controls');
		this.progress = document.getElementById('Progress');
		this.progressBar = document.getElementById('Progress-bar');
		this.leftArrowButton = document.getElementById("LeftArrowButton");
		this.rightArrowButton = document.getElementById("RightArrowButton");
		this.jumpSelector = document.getElementById("JumpSelector");
		this.langSelector = document.getElementById("LangSelector");
		this.timeDisplay = document.getElementById("TimeDisplay");
		this.leftHalf = document.getElementById("LeftHalf");
		this.rightHalf = document.getElementById("RightHalf");

		this.frameWidth = "640";
		this.interactiveArray = [];
		this.tracePtr = 0;
		this.baseColor = "white";
		this.emphasisColor = "pink";
		this.displayOffset = 2;
		this.analyse = true;

		this.speedStorage = 1.0;
		this.defaultSpeedLabel = "1x Speed";

		this.fontSize = document.getElementById("FontSize");
		this.paraSize = document.getElementById("ParaSize");

		this.parameterMgr = new ParameterManager();
	}
}


let G = new GlobalManager();

/********************************************************************************
 *	Event handlers
 ********************************************************************************/
//
// System events
//
// Window resize event
window.addEventListener("resize", (evt) => {
	resize();
});

// Window load event
window.addEventListener("load", (evt) => {
	resize();
});

// Invoked when a media file is loaded
G.videoPlayer.addEventListener('loadedmetadata', () => {
	G.progress.setAttribute('max', G.videoPlayer.duration);
});

// Invoked when the app begins to play
G.videoPlayer.addEventListener('play', () => {
	//	changeButtonState('playpause');
	G.tracePtr = findLine();
	clearAllLines();
	if (!G.isPressHold) {
		G.playPause.style = "background: red";
		G.playPause.value = "Tap to Pause";
	}
	let time = G.videoPlayer.currentTime;
	G.animationHandle = requestAnimationFrame(function accelerator() {
		if (time != G.videoPlayer.currentTime) {
			time = G.videoPlayer.currentTime;
			G.videoPlayer.dispatchEvent(new CustomEvent("timeupdate"));
		}
		G.animationHandle = requestAnimationFrame(accelerator);
	});
}, false);

// Invoked when the app pauses to play
G.videoPlayer.addEventListener('pause', () => {
	resetPlayPause();
	cancelAnimationFrame(G.animationHandle);
}, false);

// Invoked while playing the media
G.videoPlayer.addEventListener('timeupdate', () => {
	G.progress.value = G.videoPlayer.currentTime;
	G.timeDisplay.innerHTML = getTime(G.videoPlayer.currentTime).substring(0, 8);
	G.progressBar.style.width = Math.floor((G.videoPlayer.currentTime / G.videoPlayer.duration) * 100) + '%';
	interactiveSubtitles();
});


//
// User events
//

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
		case "vtt" :
			G.scriptFilename.innerHTML = file.name;
			let vttReader = new FileReader();
			vttReader.readAsText(file);
			vttReader.onload = function () {
				G.textArea.innerHTML = srt2internalExp(vtt2srt(vttReader.result));
			}
			break;
		default:
			G.videoFilename.innerHTML = file.name;
			if (G.analyse) {
				mp4subtitles.load(file, readyCallback);
			}
			G.videoPlayer.src = window.URL.createObjectURL(file);
			G.startTime = 0.0;
			G.pressPlay.value = pressToPlayLabel(0);
			resize();
			G.pressPlay.disabled = false;
			G.playPause.disabled = false;
			G.speedController.value = 1.0;
			G.speedController.dispatchEvent(new Event("input"));
			G.speedResetButton.value = G.defaultSpeedLabel;
			G.timeDisplay.innerHTML = "00:00:00";
	}
}, false);

// Invoked when the PlayPause button is clicked
G.playPause.addEventListener('click', (e) => { _processPlayPause(e); });
function _processPlayPause(e) {
	if (G.videoPlayer.paused || G.videoPlayer.ended) {
		G.videoPlayer.play();
	} else {
		G.videoPlayer.pause();
		if (e.shiftKey) {
			G.startTime = G.videoPlayer.currentTime;
			G.pressPlay.value = pressToPlayLabel(G.startTime);
		}
	}
	e.preventDefault();
}

// Invoked when PressPlay button is pressed down
G.pressPlay.addEventListener("mousedown", (evt) => { _processPressPlayStart(evt); });
G.pressPlay.addEventListener("touchstart", (evt) => { _processPressPlayStart(evt); });
function _processPressPlayStart(evt) {
	if (G.videoPlayer.src == "") return;
	G.isPressHold = true;
	resetPlayPause();
	G.videoPlayer.currentTime = G.startTime;
	G.videoPlayer.play();
	evt.preventDefault();
}

// Invoked when PressPlay button is released
G.pressPlay.addEventListener("mouseup", (evt) => { _processPressPlayEnd(evt); });
G.pressPlay.addEventListener("touchend", (evt) => {_processPressPlayEnd(evt); });
function _processPressPlayEnd(evt) {
	if ((G.isPressHold == false) || (G.videoPlayer.src == ""))  return;
	G.isPressHold = false;
	G.videoPlayer.pause();
	evt.preventDefault();
}

// Invoked when the Transcript area is clicked
G.textArea.addEventListener("click", (evt) =>{ _processTap(evt); });
G.textArea.addEventListener("touchstart", (evt) =>{_processTap(evt); });
function _processTap(evt) {
	moveFocalPoint();
	evt.preventDefault();
}

// Invoked when the Video screen is clicked
G.videoPlayer.addEventListener('click', (e) => { _processPlayPause(e); });

// Invoked when the progress bar is clicked
G.progress.addEventListener('click', (e) => {
	if (G.videoPlayer.src == "")  return;
	let pos = (e.pageX  - (G.progress.offsetLeft + G.progress.offsetParent.offsetLeft)) / G.progress.offsetWidth;
	const sPoint = pos * G.videoPlayer.duration;
	G.videoPlayer.currentTime = sPoint;
	G.startTime = sPoint;
	G.pressPlay.value = pressToPlayLabel(G.startTime);
	if (G.videoPlayer.paused) {
		resetPlayPause();
	}
});

// Double-click disabler
document.addEventListener("dblclick", (e) => {
	e.preventDefault();
});

// Invoked when the Speed controller is changed
G.speedController.addEventListener("input", (e) => {
	speedChange(G.speedController);
	G.speedController.blur();
});

// Invoked when Left arrow is clicked
G.leftArrowButton.addEventListener("click", _processLeftArrow);
function _processLeftArrow() {
	G.videoPlayer.currentTime = G.videoPlayer.currentTime - Number(G.jumpSelector.value);
}

// Invoked when Right arrow is clicked
G.rightArrowButton.addEventListener("click", _processRightArrow);
function _processRightArrow() {
	G.videoPlayer.currentTime = G.videoPlayer.currentTime + Number(G.jumpSelector.value);
}

// Invoked when Speed reset button is clicked
G.speedResetButton.addEventListener("click", _speedReset);
function _speedReset() {
	if (G.speedController.value == 1.0) {
		G.speedController.value = G.speedStorage;
		G.speedResetButton.value = G.defaultSpeedLabel;
	} else {
		G.speedController.value = 1.0;
		G.speedResetButton.value = G.speedStorage + "x Speed";
	}
	G.speedController.dispatchEvent(new Event("input"));
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
	} else if ((document.activeElement != G.fontSize) && (evt.key >= "1") && (evt.key <= "9")) {
		let delta = (evt.ctrlKey) ? Number(evt.key) : -Number(evt.key);
		G.videoPlayer.currentTime = G.videoPlayer.currentTime + delta;
	} else if (evt.key == "ArrowUp") {
		G.speedController.value = Number(G.speedController.value) + 0.05;
		speedChange(G.speedController);
	} else if (evt.key == "ArrowDown") {
		G.speedController.value = Number(G.speedController.value) - 0.05;
		speedChange(G.speedController);
	} else if ((evt.key == "d") || (evt.key == "D")) {
		_speedReset(evt);
	} else if ((evt.key == "v") || (evt.key == "V")) {
		changeLRbalance();
	}
//	evt.preventDefault();
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

G.fontSize.addEventListener("focus", (evt) => {
	G.fontSize.value = "";
});

G.fontSize.addEventListener("change", (evt) => {
	fixFontSize(G.fontSize.value);
	evt.stopPropagation();
	evt.preventDefault();
	G.fontSize.blur();
});

G.paraSize.addEventListener("input", (evt) => {
	fixPause(G.paraSize.value);
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
		if (lang == "English") {
			opt.selected = true;
		}
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

// Convert VTT to SRT representation
function vtt2srt(data) {
	const vttLines = data.split(/\r\n|\n|\r/);
	let srtText = "";
	let counter = 1;
	for (let i = 0; i < vttLines.length; i++) {
		const line = vttLines[i];
		if (line.trim() === "" || line.startsWith("WEBVTT") || line.startsWith("Kind: ") || line.startsWith("Language: ")) {
			continue;
		}
		
		const timeCode = line.match(/((\d{2}:)?\d{2}:\d{2}\.\d{3})\s+\-\-\>\s+((\d{2}:)?\d{2}:\d{2}\.\d{3}).*/);
		if (timeCode) {
			const startTime = timeCode[1];
			const endTime = timeCode[3];
			const srtStartTime = getTime(stringTimeToSec(startTime)).replace(".", ",");
			const srtEndTime = getTime(stringTimeToSec(endTime)).replace(".", ",");
			let textLines = [];
			for (let j = i + 1; j <vttLines.length; j++) {
				const textLine = vttLines[j];
				if (textLine.trim() === "" || textLine.match(/((\d{2}:)?\d{2}:\d{2}\.\d{3}) --> ((\d{2}:)?\d{2}:\d{2}\.\d{3})/)) {
					break;
				}
				textLines.push(textLine);
			}
			srtText += counter + "\n";
			srtText += srtStartTime + " --> " + srtEndTime + "\n";
			srtText += textLines.join("\n") + "\n\n";
			counter++;
			i += textLines.length;
		}
	}
//	console.log(srtText);
	return srtText;
}

// Convert SRT to the app's internal representation
function srt2internalExp(text) {
	let clusters = text.replaceAll("\r", "").split(/\n\n/);
	let result = "";
	G.lineNo = 1;
	G.interactiveArray = [];
	let lastEndTime = 0;
	let preBreak = "";
	const pause = Number(G.parameterMgr.get("pause"));
	for (let i = 0; i < clusters.length; i++) {
		// [1]:No [2]:StartTime [3]:EndTime [4]:Text
		let m = clusters[i].match(/^(\d+)\n(\d\d:\d\d:\d\d,\d\d\d) --> (\d\d:\d\d:\d\d,\d\d\d)\n((.|\n|\r\n)*)$/);
		if (m != null) {
			let currentStartTime =  stringTimeToSec(m[2].replace(",", "."));

			if ((currentStartTime - lastEndTime) > pause) {
				result += preBreak + "<span style='color: blue;'>" + m[2].substr(0, 8) + "</span><br>\n";
				preBreak = "<br><br>";
			}
			lastEndTime = stringTimeToSec(m[3].replace(",", "."));

			let val = m[4].trim();		//		.replaceAll(/(\n|\r\n)/g, " ");
			result += "<a name='" + G.lineNo + "' id='L" + G.lineNo + "' class='A'>" + val + "</a>\n";
			G.lineNo++;
			G.interactiveArray.push(currentStartTime) - 0.1;	// 0.1 for lag
		}
	}
	return result;
}

// Build up the Transcript area from internal representation.
function convertTxtScript(text) {
	let result = "";
	G.lineNo = 1;
	G.interactiveArray = [];
	const molecule = text.split(/\[\[/);
	for (let mol of molecule) {
		if (mol == "")  continue;
		let atom = mol.match(/(\d\d:\d\d:\d\d\.\d\d\d)\]\](.*)/);
		if (atom != null) {
			let blueTime = '<a name="' + G.lineNo + '" id="L' + G.lineNo + '" class="A">';
			result += blueTime + atom[2] + "</a>";
			G.interactiveArray.push(stringTimeToSec(atom[1]) - 0.1);		// 0.1 for lag
			G.lineNo++;
		}
	}
	return result;
}

// Invoked when the Transcript area is clicked
function moveFocalPoint() {
	const idCandidate = window.getSelection().anchorNode.parentNode.id;
	if ((idCandidate == "TextArea") || (idCandidate == "ScriptDiv") || (idCandidate == ""))  return;		// One of the gaps are clicked
	const sPoint = G.interactiveArray[Number(idCandidate.substring(1))-1] + 0.1;
	G.videoPlayer.currentTime = sPoint;
	G.startTime = sPoint;
	G.pressPlay.value = pressToPlayLabel(G.startTime);
	G.textArea.blur();
	interactiveSubtitles();
}

// Controls the label for PlayPause button --- RESET
function resetPlayPause() {
	G.playPause.style = "background: #339270";
	G.playPause.value = "Tap to Play";
}

// Called when the rewind/FF buttons are clicked
function rewind(sec) {
	let result = G.videoPlayer.currentTime - sec;
	if (result < 0) {
		result = 0;
	} else if (result > G.videoPlayer.duration) {
		result = G.videoPlayer.duration;
	}
	G.videoPlayer.currentTime = result;
	if (G.videoPlayer.paused) {
		resetPlayPause();
	}
}

// Called when Speed-slider's value has beern changed.
function speedChange(obj) {
	let speed = Number(obj.value);
	G.videoPlayer.playbackRate =speed;
	G.speedMeter.innerHTML = speed.toFixed(2);
	if (speed != 1) {
		G.speedStorage = speed;
		G.speedResetButton.value = G.defaultSpeedLabel;
	}
}

// Invoked when the Window size has been changed
function resize() {
	G.videoContainer.style + "width: 100%;";
	G.textArea.style = "width: 100%; height: " + (window.innerHeight - 
		G.headerSection.getBoundingClientRect().height - 
		G.footerSection.getBoundingClientRect().height - 60) + "px;";
	fixLRbalance(G.parameterMgr.get("vratio"));
	G.textArea.style.fontSize = G.parameterMgr.get("tsize") + "pt";
	G.fontSize.value = G.parameterMgr.get("tsize");
}



/*
 * Utilities
 */

function pressToPlayLabel(parm) {
	return "Press to Play\n" + getTime(parm).substring(0, 8) + "▷";
}

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
	while((i >= 0) && (G.videoPlayer.currentTime < G.interactiveArray[i])) {
		i--;
	}
	return i;
}

function changeLRbalance() {
	let inp = prompt("Enter left ratio (10〜90)", G.parameterMgr.get("vratio"));
	if (inp.match(/^\d+$/) && ((inp >= 10) && (inp <= 90))) {
		fixLRbalance(inp);
	}
}
function fixLRbalance(num) {
	G.leftHalf.style = "width: " + num + "%;";
	G.rightHalf.style = "width: " + (100 - num) + "%;";
	G.parameterMgr.set("vratio", num);
}

function fixFontSize(num) {
	G.textArea.style.fontSize =  num + "pt";
	G.parameterMgr.set("tsize", num);
	resize();
}

function fixPause(num) {
	G.parameterMgr.set("pause", num);
	const item = G.langSelector[G.langSelector.selectedIndex];
	if (item == null) return;
	const lang = item.value;
	mp4subtitles.getScriptsArray(lang, scriptsReady);
}
