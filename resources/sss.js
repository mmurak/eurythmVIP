class GlobalManager {
	constructor() {
		this.buttonArea = document.getElementById("ButtonArea");
		this.tableArea = document.getElementById("TableArea");
		this.file;

		this.columnPointer = 0;
		this.internalTable = {};
	}
}

let G = new GlobalManager();

document.querySelector('input[type="file"]').onchange = function(e) {
	G.file = this.files[0];
	if (G.file == null) return;
	while(G.buttonArea.firstChild) {
		G.buttonArea.removeChild(G.buttonArea.lastChild);
	}
	clearTable();
	mp4subtitles.load(G.file, readyCallback);
}

function readyCallback() {
	let languages = mp4subtitles.getAvailableLanguage();
	for (let fn of languages) {
		let btn = document.createElement("input");
		btn.type = "button";
		btn.className = "widgets";
		btn.value = fn;
		btn.onclick = () => {
			writeButtonClicked(fn);
		};
		G.buttonArea.appendChild(btn);
	}
}

function clearTable() {
	G.columnPointer = 0;
	G.internalTable = {};
	G.tableArea.innerHTML = "";
}

function writeButtonClicked(languageName) {
	let scriptsArray = mp4subtitles.getScriptsArray(languageName, buildInnerTable);
	buildPresentationTable();
}

function buildInnerTable(scriptsArray) {
	for (const entry of scriptsArray) {
		if (!(entry[0] in G.internalTable)) {
			G.internalTable[entry[0]] = {};
		}
		G.internalTable[entry[0]][G.columnPointer] = entry[2];
	}
	G.columnPointer++;
}

function buildPresentationTable() {
	G.tableArea.innerHTML = "";
	let scaffold = document.createElement("table");
	for (const entry of Object.keys(G.internalTable).map((x) => Number(x)).sort((a,b) => {a - b})) {
		const line = G.internalTable[entry];
		let newRow = scaffold.insertRow(-1);
		newRow.insertCell(0).innerHTML = getTime(entry, ".");
		for (let i = 0; i < G.columnPointer; i++) {
			let cell = newRow.insertCell(i+1);
			cell.innerHTML = (i in line) ? escapeHTML(line[i]) : "";
		}
	}
	G.tableArea.appendChild(scaffold);
}

function getTime(currentTime, delim) {
    let ct = Math.floor(currentTime / 1000);
    let hour = Math.floor(ct / 3600000);
    let minute = Math.floor(ct % 3600000 / 60000);
    let sec = Math.floor(ct % 60000 / 1000);
    let csec = Math.floor(ct % 1000);
    return ("00" + hour).slice(-2) + ":" + ("00" + minute).slice(-2) + ":" + ("00" + sec).slice(-2) + delim + ("000" + csec).slice(-3);
}

function escapeHTML(str) {
	return str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
