/* GLOBALS */

var onboardingPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "onboarding"});

/* MAIN */

// Explains how to select a conversation
var selectMessagesProtipPayload = function() {
	console.log("Prompting post-signup tutorial.");

	var canvas = document.createElement('div');
	var protip = document.createElement("div");

	// TODO: Update font-family with Neuzeit S LT Std (imported locally)
	// TODO: Add in a picture of the extension icon (probably change the line spacing too)
	var tipDefs = `<div style="top: 5.5%; text-align: center; padding-top: 4%; position: relative;">
										<h3 style="font-family: Helvetica; font-size: 15px; font-weight: 600; color: rgb(125,132,142);"> Welcome to the club :) </h3>
										<p style="font-family: Helvetica; font-weight: 400; font-size: 14px; color: rgb(125,132,142); width: 79%; margin-left: auto; margin-right: auto;"> To get started, click the extension icon and select the messages you want to save.</p>
										<form id="form-wrapper"><input id="got-it" type="submit" value="Got it!" style="border: none; color: rgb(255,255,255); background-color: rgb(44,158,212); text-align: center; font-family: Helvetica; font-size: 14px; font-weight: 400; padding: 12px 10%; border-radius: 12px 2px 12px 2px; cursor: pointer; margin-top: 3.05%; outline: none;"></form>
									</div>`;

	// Assigns CSS attributes to the canvas and protip container
	canvas.style.backgroundColor = "rgba(0,0,0,.35)";
	canvas.style.zIndex = "2147483647";
	canvas.style.width = "100%";
	canvas.style.height = "100%";
	canvas.style.top = "0px";
	canvas.style.left = "0px";
	canvas.style.display = "block";
	canvas.style.position = "absolute";

	protip.style.position = "fixed";
	protip.style.width = "390px"; // 27%
	protip.style.height = "190px";
	protip.style.top = "50%";
	protip.style.left = "50%"; // 36.5%
	protip.style.marginLeft = "-195px";
	protip.style.transform = "translateY(-50%)";
	protip.style.borderRadius = "10px";
	protip.style.backgroundColor = "#FFFFFF";
	protip.style.zIndex = "2147483647";

	protip.innerHTML = tipDefs; // Wraps the text and button with the protip container

	document.body.appendChild(canvas); // Imposes a low-opacity "canvas" on entire page
	document.body.appendChild(protip); // Prompts the protip

	var confirm = document.getElementById("got-it");
	var form = document.getElementById("form-wrapper");

	// NOTE: Not the best or most sustainable alternative to :hover
	confirm.onmouseover = function() {
		this.style.backgroundColor = "rgb(101,184,203)";
	}

	// NOTE: Not the best or most sustainable alternative to :hover
	confirm.onmouseout = function() {
		this.style.backgroundColor = "rgb(44,158,212)";
	}

	form.onsubmit = function() {
		console.log("User accepted the protip.");
		document.body.removeChild(protip);
		document.body.removeChild(canvas);
	}

	canvas.onclick = function() {
		console.log("User left the protip.");
		document.body.removeChild(protip);
		document.body.removeChild(canvas);
	}

	console.log("Displayed the 'select messages' protip.");
}

// Explains how to access saved conversations
var fileManagerProtipPayload = function() {
	console.log("Prompting post-save tutorial.");

	var canvas = document.createElement('div');
	var protip = document.createElement("div");

	// TODO: Update font-family with Neuzeit S LT Std (imported locally)
	// TODO: Add in a picture of the extension icon (probably change the line spacing too)
	var tipDefs = `<div style="top: 5.5%; text-align: center; padding-top: 4%; position: relative;">
										<h3 style="font-family: Helvetica; font-size: 15px; font-weight: 600; color: rgb(125,132,142);"> You just saved your first conversation! </h3>
										<p style="font-family: Helvetica; font-weight: 400; font-size: 14px; color: rgb(125,132,142); width: 79%; margin-left: auto; margin-right: auto;"> Right-click the extension icon and select "Find Messages" to access your saved conversations. </p>
										<form id="form-wrapper"><input id="got-it" type="submit" value="Got it!" style="border: none; color: rgb(255,255,255); background-color: rgb(44,158,212); text-align: center; font-family: Helvetica; font-size: 14px; font-weight: 400; padding: 12px 10%; border-radius: 12px 2px 12px 2px; cursor: pointer; margin-top: 3.05%; outline: none;"></form>
									</div>`;

	// Assigns CSS attributes to the canvas and protip container
	canvas.style.backgroundColor = "rgba(0,0,0,.35)";
	canvas.style.zIndex = "2147483647";
	canvas.style.width = "100%";
	canvas.style.height = "100%";
	canvas.style.top = "0px";
	canvas.style.left = "0px";
	canvas.style.display = "block";
	canvas.style.position = "absolute";

	protip.style.position = "fixed";
	protip.style.width = "390px"; // 27%
	protip.style.height = "190px";
	protip.style.top = "50%";
	protip.style.left = "50%"; // 36.5%
	protip.style.marginLeft = "-195px";
	protip.style.transform = "translateY(-50%)";
	protip.style.borderRadius = "10px";
	protip.style.backgroundColor = "#FFFFFF";
	protip.style.zIndex = "2147483647";

	protip.innerHTML = tipDefs; // Wraps the text and button with the protip container

	document.body.appendChild(canvas); // Imposes a low-opacity "canvas" on entire page
	document.body.appendChild(protip); // Prompts the protip

	var confirm = document.getElementById("got-it");
	var form = document.getElementById("form-wrapper");

	// NOTE: Not the best or most sustainable alternative to :hover
	confirm.onmouseover = function() {
		this.style.backgroundColor = "rgb(101,184,203)";
	}

	// NOTE: Not the best or most sustainable alternative to :hover
	confirm.onmouseout = function() {
		this.style.backgroundColor = "rgb(44,158,212)";
	}

	form.onsubmit = function() {
		console.log("User confirmed protip.");
		window.postMessage({type: "submit", submitted: true}, '*'); // CHECK

		document.body.removeChild(protip);
		document.body.removeChild(canvas);
	}

	canvas.onclick = function() {
		window.postMessage({type: "submit", submitted: false}, '*'); // CHECK

		document.body.removeChild(protip);
		document.body.removeChild(canvas);
	}

	console.log("Displayed an onboarding tooltip.");
}

// Prepares the selectMessagesProtip JS injection
var selectMessagesProtipInject = function() {
	var script = document.createElement('script');
	script.textContent = "(" + selectMessagesProtipPayload.toString() + ")();";
	document.head.appendChild(script);
}

// Prepares the fileManagerProtip JS injection
var fileManagerProtipInject = function() {
	var script = document.createElement('script');
	script.textContent = "(" + fileManagerProtipPayload.toString() + ")();";
	document.head.appendChild(script);
}

// Listens for the first "saved messages" event
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "first_save") {
		console.log("User has saved a conversation for the first time.");
		fileManagerProtipInject();
	} else if (request.message = "first-signup") {
		console.log("User has signed up for the first time.");
		selectMessagesProtipInject();
	}
});

// Injected JS --> here --> background script
window.addEventListener('message', function(event) {
	if (event.data.type && event.data.type == "submit")
		onboardingPort.postMessage({submitted: event.data.submitted});
});
