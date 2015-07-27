
var self = require('sdk/self');

// a dummy function, to show how tests work.
// to see how to test this function, look at test/test-index.js
function dummy(text, callback) {
  callback(text);
}

exports.dummy = dummy;

var buttons = require('sdk/ui/button/action');
var tabs = require("sdk/tabs");

var button = buttons.ActionButton({
  id: "mozilla-link",
  label: "Visit Mozilla",
  icon: {
    "16": "./icon-16.png",
    "32": "./icon-32.png",
    "64": "./icon-64.png"
  },
  onClick: handleClick
});

function handleClick(state) {
  tabs.open("https://www.mozilla.org/");
}

var contextMenu = require("sdk/context-menu");
var menuItem = contextMenu.Item({
    label: "Save image with tags",
    context: contextMenu.SelectorContext("img"),
    contentScript: 'self.on("click", function (node, data) {' +
        '  self.postMessage(node.src);' +
        '});',
    onMessage: function (selectedImage) {
	console.log(selectedImage);
	var window = require('sdk/window/utils');
	window.open("chrome://pictag/content/saveImage.xul",
		    "pictag-save-image",
		    "chrome,centerscreen");
	var storage = getStorageDir();
	console.log("storage dir is " + storage.path);
    }
});

function getLocalDir() {
    let directoryService =
	Cc["@mozilla.org/file/directory_service;1"].
	getService(Ci.nsIProperties);
    // this is a reference to the profile dir (ProfD) now.
    let localDir = directoryService.get("ProfD", Ci.nsIFile);

    localDir.append("XULSchool");

    if (!localDir.exists() || !localDir.isDirectory()) {
	// read and write permissions to owner and group, read-only for others.
	localDir.create(Ci.nsIFile.DIRECTORY_TYPE, 0774);
    }

    return localDir;
}

let { Cc, Ci, Cu } = require('chrome');
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

function getDefaultStorageDir() {
    var default_storage = FileUtils.getDir("Home", ["PicTag"], true);
    return default_storage;
}

function getStorageDir() {
    Cu.import("resource://gre/modules/Services.jsm");
    var prefs = Services.prefs.getBranch("extensions.pictag.");

    try {
	var storage = prefs.getComplexValue("storagedir", Ci.nsILocalFile);
    } catch (e) {
	return getDefaultStorageDir();
    }

    if (!storage) {
	return getDefaultStorageDir();
    }

    return storage;
}
