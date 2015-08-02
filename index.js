
var self = require('sdk/self');

// a dummy function, to show how tests work.
// to see how to test this function, look at test/test-index.js
function dummy(text, callback) {
  callback(text);
}

exports.dummy = dummy;

var window = require('sdk/window/utils');
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

window.saveImageWithTags = function(tags) {
    if (!(imageUri in window)) {
	window.alert("No image selected!");
    }

    console.log("Saving " + imageUri + " with tags:" + tags.toString());
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
	dlg = window.open("chrome://pictag/content/saveImage.xul",
			  "pictag-save-image",
			  "chrome,centerscreen");

	dlg.saveImageWithTags = function(tags) {
	    console.log("Saving " + selectedImage + " with tags:" + tags.toString());
	    saveImageWithTags(selectedImage, tags)
	}
    }
});

function saveImageWithTags(imageUri, tags) {
    var storage = getStorageDir();
    console.log("storage dir is " + storage.path);
    var firstTag = tags.shift();
    var filename = imageUri.substring(imageUri.lastIndexOf('/')+1);
    var firstTagFile = storage.clone();
    firstTagFile.append(firstTag);
    firstTagFile.create(1, 0700);
    firstTagFile.append(filename);

    downloadFile(imageUri, firstTagFile, function () {
	for (i = 0; i < tags.length; i++) {
	    var nextTagDir = storage.clone();
	    nextTagDir.append(tags[i]);
	    if (!nextTagDir.exists()) {
		nextTagDir.create(1, 0700);
	    }
	    firstTagFile.copyTo(nextTagDir, filename);
	}
    })
}

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
var IOService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

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

function downloadFile(remote, local, callback) {
    var downloadObserver = {onDownloadComplete: function(nsIDownloader, nsresult, file) {
	callback();
    }};

    var downloader = Cc["@mozilla.org/network/downloader;1"].createInstance();
    downloader.QueryInterface(Ci.nsIDownloader);
    downloader.init(downloadObserver, local);

    var httpChan = IOService.newChannel(remote, "", null);
    // httpChan.QueryInterface(Ci.nsIHttpChannel);
    httpChan.asyncOpen(downloader, local);
}

