/* GLOBALS */

injectedFileManager = false;
getConversationsPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "get-conversations"});
addFolderPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "add-folder"});
renameFolderPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "rename-folder"});
renameConversationPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "rename-conversation"});
deleteFolderPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "delete-folder"});
deleteConversationPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "delete-conversation"});
inviteFriendPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "invite-friend"});

/* MAIN */

var fileManager = function() {

	// Keeps track of the currently selected folder / conversation
	CUR_SELECTED = "";

	var openFileManager = function(folderList) {
		console.log("Running file manager.");

		// Recursive helper function for getFolderTreeView
		var getFolderTreeViewRecursive = function(folder) {
			var folderListHTML = "<ul style='margin-left: 15px;'>";
			// NOTE: Switch the order of these loops to change whether conversations or subfolders come first
			for (var i = 0; i < folder["conversations"].length; i++) {
				folderListHTML += "<li class='tabberConversation' style='color: #2C9ED4; margin: 0;'>" + folder["conversations"][i]["name"] + "</li>";
				// Adds conversation messages as hidden list elements under the conversation name
				if (folder["conversations"][i]["messages"].length > 0) {
					folderListHTML += "<ul style='display: none'>";
					for (var j = 0; j < folder["conversations"][i]["messages"].length; j++) {
						folderListHTML += "<li data-author='" + folder["conversations"][i]["messages"][j]["author"] + "'>" + folder["conversations"][i]["messages"][j]["message"] + "</li>";
					}
					folderListHTML += "</ul>"
				}
			}
			for (var i = 0; i < folder["children"].length; i++) {
				folderListHTML += "<li class='tabberFolder' style='color: #7B7F84; margin: 0;'>" + folder["children"][i]["name"] + "</li>";
				folderListHTML += getFolderTreeViewRecursive(folder["children"][i]);
			}
			return folderListHTML + "</ul>";
		}

		// Returns a recursive tree view using nested lists of the folderList
		var getFolderTreeView = function(folderList) {
			// Use this to show root
			// NOTE: We keep the <li> for compatibility with getFolderPath()
			// var folderListHTML = "<ul><li class='tabberFolder tabberRootFolder' style='color: #7B7F84; margin: 0;'>" + folderList["folders"][0]["name"] + "</li>";
			var folderListHTML = "<ul style='margin-left: -15px;'><li class='tabberFolder tabberRootFolder' style='display: none;'></li>";
			folderListHTML += getFolderTreeViewRecursive(folderList["folders"][0]) + "</ul>";
			return "<div style='overflow-y: auto; height: 200px; border: 1px solid #333;'> " + folderListHTML + " </div><br>";
		}

		// Gets the path of folder names from the root folder to the passed in element
		// "/path/from/root/..."
		var getFolderPath = function(folder) {
			console.log(folder);
			if (folder.classList.contains("tabberRootFolder")) return folder.innerText;
			return getFolderPath(folder.parentNode.previousSibling) + "/" + folder.innerText
		}

		// Adds event listeners for folders for left and double left click
		var addFolderListeners = function(folder) {
			// Left click toggles folder expand / collapse when clicked
			folder.addEventListener("click", function() {
				var currentFolder = document.getElementById("currentFolderDisplay");
				currentFolder.value = this.innerHTML;
				if (CUR_SELECTED) CUR_SELECTED.style.backgroundColor = "";
				this.style.backgroundColor = "#CCC";
				CUR_SELECTED = this;
			}, false);
			// Left click toggles folder expand / collapse when clicked
			folder.addEventListener("dblclick", function() {
				if (this.nextSibling.style.display == "none") {
					this.nextSibling.style.display = "";
				}
				else this.nextSibling.style.display = "none";
			}, false);
		}

		// Adds event listeners for conversations for left click
		var addConversationListeners = function(conversation) {
			// Left click updates conversation view text
			conversation.addEventListener("click", function() {
				conversationDisplay.innerHTML = "";
				for (var j = 0; j < this.nextSibling.childNodes.length; j++) {
					var message = document.createElement('p');
					message.innerHTML = this.nextSibling.childNodes[j].getAttribute("data-author") + ": " + this.nextSibling.childNodes[j].innerHTML;
					conversationDisplay.appendChild(message);
				}
				if (CUR_SELECTED) CUR_SELECTED.style.backgroundColor = "";
				this.style.backgroundColor = "#CCC";
				CUR_SELECTED = this;
			});
		}

		// Example nested structure: Use for testing

		// {"folders": [{"_id": "...", "conversations": [...], "name": "...", "children": [...], "user_id": "..."}]}
		// var folderList = {"folders": [
		// 								{"_id": 12345, "conversations": [], "name": "Everything", "children": [
		// 									{"_id": 12346, "conversations": [
		// 										{"name": "Conversation 1", "messages": [
		// 											{"author": "Matthew", "message": "Message 1"},
		// 											{"author": "Jon", "message": "Message 2"},
		// 											{"author": "Matthew", "message": "Message 3"},
		// 										]},
		// 										{"name": "Conversation 2", "messages": [
		// 											{"author": "Matthew", "message": "Message 1"},
		// 											{"author": "Jon", "message": "Message 2"},
		// 										]}
		// 									], "name": "Folder 1", "children": [], "user_id": "test_id"},
		// 									{"_id": 12347, "conversations": [], "name": "Folder 2", "children": [
		// 										{"_id": 12348, "conversations": [], "name": "Folder 3", "children": [], "user_id": "test_id"},
		// 										{"_id": 12349, "conversations": [], "name": "Folder 4", "children": [
		// 											{"_id": 12350, "conversations": [
		// 												{"name": "Conversation 3", "messages": [
		// 													{"author": "Matthew", "message": "Message 1"},
		// 													{"author": "Jon", "message": "Message 2"},
		// 													{"author": "Matthew", "message": "Message 3"},
		// 													{"author": "Michael", "message": "Message 4"},
		// 												]}
		// 											], "name": "Folder 5", "children": [], "user_id": "test_id"}
		// 										], "user_id": "test_id"}
		// 									], "user_id": "test_id"}
		// 								], "user_id": "test_id"},
		// 							]};

		// console.log(folderList);

		var canvas = document.createElement('div');
		var fileManager = document.createElement("div");

		var formDefs = `<form id="cancelForm">
							<input id="cancelButton" type="button" value="Cancel" style="width: 100%; background-color: #FFF; color: #2C9ED4; padding: 14px 20px; margin: 8px 0; border-style: solid; border-color: #2C9ED4; border-radius: 4px; cursor: pointer;">
						</form>`;

		canvas.style = "background-color: rgba(0,0,0,.35); z-index: 2147483647; width: 100%; height: 100%; top: 0px; left: 0px; display: block; position: absolute;";

		fileManager.style.position = "fixed";
		fileManager.style.width = "50%";
		fileManager.style.height = "600px";
		fileManager.style.top = "10%";
		fileManager.style.left = "25%";
		fileManager.style.borderRadius = "5px";
		fileManager.style.padding = "20px";
		fileManager.style.backgroundColor = "#FFFFFF";
		fileManager.style.zIndex = "2147483647";

		var currentFolderView = "<div style='height: 50px;'>\
									<input type='text' id='currentFolderDisplay' placeholder='" + folderList["folders"][0]["name"] + "'>\
									<input type='button' id='tabberAddFolder' value='+'>\
									<input type='button' id='tabberRename' value='/'>\
									<input type='button' id='tabberRemove' value='-'>\
									<input type='button' id='tabberInviteFriends' value='i'>\
								</div>";
		var folderTreeView = getFolderTreeView(folderList);
		var conversationView = "<div id='conversationDisplay' style='overflow-y: auto; height: 200px; border: 1px solid #333;'></div>";

		fileManager.innerHTML = currentFolderView + folderTreeView + conversationView + formDefs;

		document.body.appendChild(canvas); // Imposes a low-opacity "canvas" on entire page
		document.body.appendChild(fileManager); // Prompts the "save" dialog

		var tabberFolders = document.getElementsByClassName("tabberFolder");
		var tabberConversations = document.getElementsByClassName("tabberConversation");

		// Folder event listeners
		for (var i = 0; i < tabberFolders.length; i++) {
			if (tabberFolders[i].nextSibling && tabberFolders[i].nextSibling.tagName.toLowerCase() == "ul") {
				addFolderListeners(tabberFolders[i]);
			}
		}

		// Displays a conversation when clicked
		var conversationDisplay = document.getElementById("conversationDisplay");
		for (var i = 0; i < tabberConversations.length; i++) {
			addConversationListeners(tabberConversations[i]);
		}

		// Adds a subfolder under the currently selected folder
		var addFolderButton = document.getElementById("tabberAddFolder");
		addFolderButton.addEventListener("click", function() {
			var currentFolderChildren = CUR_SELECTED.nextSibling.childNodes; // List of following <ul> which has folder contents

			// NOTE: Each conversation / folder has 2 corresponding elements: the <li> and the <ul> following it

			// New folder <li>
			var newFolder = document.createElement("li");
			newFolder.innerHTML = "New Folder";
			newFolder.style.color = "#7B7F84";
			newFolder.contentEditable = "true";
			var parent = CUR_SELECTED;
			var parentName = CUR_SELECTED.innerHTML;
			var parentPath = getFolderPath(parent);
			newFolder.addEventListener("keydown", function(e) {
				if (e.key == "Enter") {
					// Prevents duplicate folder names in the same parent folder
					var duplicate = false;
					// console.log(this.innerText);
					for (var i = 0; i < currentFolderChildren.length; i++) {
						if (currentFolderChildren[i].classList.contains("tabberFolder") && currentFolderChildren[i].innerText == this.innerText) {
							console.log("Duplicate folder found. Cannot create folder.");
							alert("There's already a folder inside " + parentName + " with that same name!");
							e.preventDefault();
							return;
						}
					}
					// NOTE: We add the class here, otherwise it would detect itself as a duplicate
					newFolder.classList.add("tabberFolder");
					this.contentEditable = false;
					window.postMessage({type: "add_folder", text: {path: parentPath + "/" + this.innerText}}, '*');
					console.log("Added folder to database");
				}
			});
			addFolderListeners(newFolder);

			// New folder <ul> element
			var newFolderList = document.createElement("ul");
			newFolderList.style.marginLeft = "15px";

			// If we want to insert before a certain element, use the commented line
			// CUR_SELECTED.nextSibling.insertBefore(newFolderList, currentFolderChildren[i]);
			CUR_SELECTED.nextSibling.appendChild(newFolderList);
			CUR_SELECTED.nextSibling.insertBefore(newFolder, newFolderList);

			// Set cursor to end
			var range = document.createRange();
			var sel = window.getSelection();
			range.setStart(newFolder, 1);
			sel.removeAllRanges();
			sel.addRange(range);
			newFolder.focus();
		});

		// Renames the currently selected folder
		var renameButton = document.getElementById("tabberRename");
		renameButton.addEventListener("click", function() {
			console.log("Renaming element");
			CUR_SELECTED.contentEditable = true;
			var oldName = CUR_SELECTED.innerText;
			var elem = CUR_SELECTED;
			var path = getFolderPath(elem);
			var currentFolderChildren =	CUR_SELECTED.parentNode.childNodes;
			var parentName = CUR_SELECTED.parentNode.previousSibling.innerText;
			CUR_SELECTED.addEventListener("keydown", function rename_keydown(e) {
				if (e.key == "Enter") {
					if (elem.classList.contains("tabberFolder")) {
						for (var i = 0; i < currentFolderChildren.length; i++) {
							if (currentFolderChildren[i].isContentEditable == false && currentFolderChildren[i].classList.contains("tabberFolder") && currentFolderChildren[i].innerText == this.innerText) {
								console.log("Duplicate folder found. Cannot rename folder.");
								alert("There's already a folder inside " + parentName + " with that same name!");
								e.preventDefault();
								return;
							}
						}
						this.contentEditable = false;
						window.postMessage({type: "rename_folder", text: {path: path, newName: this.innerText}}, '*');
						this.removeEventListener("keydown", rename_keydown);
						console.log("Renamed folder in database");
					}
					else if (elem.classList.contains("tabberConversation")) {
						for (var i = 0; i < currentFolderChildren.length; i++) {
							if (currentFolderChildren[i].isContentEditable == false && currentFolderChildren[i].classList.contains("tabberConversation") && currentFolderChildren[i].innerText == this.innerText) {
								console.log("Duplicate conversation found. Cannot rename conversation.");
								alert("There's already a conversation inside " + parentName + " with that same name!");
								e.preventDefault();
								return;
							}
						}
						this.contentEditable = false;
						window.postMessage({type: "rename_conversation", text: {path: path, newName: this.innerText}}, '*');
						this.removeEventListener("keydown", rename_keydown);
						console.log("Renamed conversation in database");
					}
				}
			})

			// Set cursor to end
			var range = document.createRange();
			var sel = window.getSelection();
			range.setStart(CUR_SELECTED, 1);
			sel.removeAllRanges();
			sel.addRange(range);
			CUR_SELECTED.focus();
		});

		// Removes the currently selected folder (and everything in it)
		var removeButton = document.getElementById("tabberRemove");
		removeButton.addEventListener("click", function() {
			console.log("Removing element");
			// Sends delete folder request to server
			// window.postMessage({type: "delete_folder", text: {name: CUR_SELECTED.innerText, parent: CUR_SELECTED.parentNode.previousSibling.innerText}}, '*');
			var path = getFolderPath(CUR_SELECTED);
			if (CUR_SELECTED.classList.contains("tabberFolder")) {
				window.postMessage({type: "delete_folder", text: {path: path}}, '*');

				// Don't delete the root folder
				if (CUR_SELECTED.classList.contains("tabberRootFolder")) {
					alert("You can't delete that folder!");
					return;
				}

				CUR_SELECTED.parentNode.removeChild(CUR_SELECTED.nextSibling); // Removes ul
				CUR_SELECTED.parentNode.removeChild(CUR_SELECTED); // Removes li
			}
			else if (CUR_SELECTED.classList.contains("tabberConversation")) {
				window.postMessage({type: "delete_conversation", text: {path: path}}, '*');

				CUR_SELECTED.parentNode.removeChild(CUR_SELECTED.nextSibling); // Removes ul
				CUR_SELECTED.parentNode.removeChild(CUR_SELECTED); // Removes li
			}
		});

		// Opens the referral dialog
		var inviteFriendButton = document.getElementById("tabberInviteFriends");
		inviteFriendButton.addEventListener("click", function() {
			console.log("Opening referral dialog");
			// Sends request to open the referral dialog to the background script
			window.postMessage({type: "invite_friend", text: {}}, '*');
		});


		var cancelForm = document.getElementById("cancelButton");

		cancelForm.onclick = function() {
			document.body.removeChild(fileManager);
			document.body.removeChild(canvas);
		}

		console.log("Displayed file manager.");
	}

	// Content scripts --> here --> injected JS
	window.addEventListener('message', function(event) {
		if (event.data.type && event.data.type == "tabber_file_manager") {
			console.log("JS injection received: " + event.data.text);
			// Sends request to get all conversations once file manager is opened
			window.postMessage({type: "get_conversations", text: {}}, '*');
		}
		if (event.data.type && event.data.type == "tabber_folder_list") {
			console.log("Folder list received: " + event.data.contents);
			openFileManager(event.data.contents);
		}
	});
}

// Prepares the JS injection
var injectFileManager = function() {
	var script = document.createElement('script');
	script.textContent = "(" + fileManager.toString() + ")();";
	document.head.appendChild(script);
}

// Background script --> here --> injected JS
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "clicked_find_messages" && !injectedFileManager) {
		console.log("Sent request to inject file manager.");
		injectedFileManager = true;
		injectFileManager();
	}
	if (request.message == "clicked_find_messages") {
		console.log("Sent request to open injected file manager")
		window.postMessage({type: 'tabber_file_manager', text: 'Find messages clicked.', contents: request.folders}, '*' );
	}
	if (request.message == "tabber_folder_list") {
		console.log("Sent folderList to injected file manager")
		window.postMessage({type: 'tabber_folder_list', text: 'folderList sent.', contents: request.folderList}, '*' );
	}
});

// Injected JS --> here --> background script
window.addEventListener('message', function(event) {
	if (!event.data.type) {
		// console.log("Server message was not for tabber or not specified");
		return;
	}
	if (event.data.type == "get_conversations") getConversationsPort.postMessage();
	else if (event.data.type == "add_folder") addFolderPort.postMessage({path: event.data.text.path});
	else if (event.data.type == "rename_folder") renameFolderPort.postMessage({path: event.data.text.path, newName: event.data.text.newName});
	else if (event.data.type == "rename_conversation") renameConversationPort.postMessage({path: event.data.text.path, newName: event.data.text.newName});
	else if (event.data.type == "delete_folder") deleteFolderPort.postMessage({path: event.data.text.path});
	else if (event.data.type == "delete_conversation") deleteConversationPort.postMessage({path: event.data.text.path});
	else if (event.data.type == "invite_friend") inviteFriendPort.postMessage();
	else console.log("Invalid tabber server message");
});
