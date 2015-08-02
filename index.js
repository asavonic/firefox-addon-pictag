var self = require('sdk/self');
var window = require('sdk/window/utils');
var buttons = require('sdk/ui/button/action');
var tabs = require("sdk/tabs");
var contextMenu = require("sdk/context-menu");

let { Cc, Ci, Cu } = require('chrome');
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/osfile.jsm"); // OS.File things
Cu.import("resource://gre/modules/Downloads.jsm");
Cu.import("resource://gre/modules/Task.jsm");
// Context menu integration
var menuItem = contextMenu.Item({
    label: "Save image with tags",
    context: contextMenu.SelectorContext("img"),
    contentScript: 'self.on("click", function (node, data) {' +
        '  self.postMessage(node.src);' +
        '});',
    onMessage: openSaveImageDialog
});

function openSaveImageDialog(imageUri) {
    console.log(imageUri);
    dlg = window.open("chrome://pictag/content/saveImage.xul",
		      "pictag-save-image",
		      "chrome,centerscreen");

    dlg.saveImageWithTags = function(tags) {
	saveImageWithTags(imageUri, tags)
    }
}

function saveImageWithTags(imageUri, tags) {
    var storage = getStorageDir();
    var filename = imageUri.substring(imageUri.lastIndexOf('/')+1);

    var firstTagFile = null;
    // find out the first tag to save and skip already processed tags
    while (firstTagFile == null && tags.length > 0) {
	var firstTag = tags.shift();
	var file = tagFilePath(firstTag, filename);
	if (!pathExists(file)) {
	    firstTagFile = file;
	}
    }

    // file have been saved to all tags or no tags were selected at all
    if (firstTagFile == null) {
	return;
    }

    downloadFile(imageUri, firstTagFile, function() {
	// copy image to other tags
	copyImageToTags(firstTagFile, tags);
    });
}

function copyImageToTags(imageFile, tags) {
    filename = OS.Path.basename(imageFile);
    for (i = 0; i < tags.length; i++) {
	dest = tagFilePath(tags[i], filename);
	if (!pathExists(dest)) {
	    OS.File.copy(imageFile, dest);
	}
    }
}

function tagFilePath(tag, filename) {
    var storage = getStorageDir();
    var dir = OS.Path.join(storage, tag);

    var path;
    // no error if directory is already exists
    let promise = OS.File.makeDir(dir);
    promise = promise.then(
	function onSuccess() {
	    path = OS.Path.join(dir, filename);
	}
    );

    return path;
}

function pathExists(path) {
    var exists;
    let promise = OS.File.exists(path);
    promise = promise.then(
	function onSuccess(result) {
	    exists = result;
	}
    )

    return exists;
}

function downloadFile(remote, local, callback) {
    Task.spawn(function () {
	yield Downloads.fetch(remote, local);
    }).then(callback, Cu.reportError);
}

function getDefaultStorageDir() {
    var default_storage = OS.Path.join(OS.Constants.Path.homeDir, "PicTag");
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
