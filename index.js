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

var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                              .getService(Ci.nsIPromptService);
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

hashCode = function(s){
  return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
}

function filenameFromURI(uri) {
    var filename = imageUri.substring(imageUri.lastIndexOf('/')+1);
    var dot = filename.firstIndexOf('.');
    filename = filename.substring(0, dot) + "-" + hashCode(uri) + filename.substring(dot);
    return filename;
}

function saveImageWithTags(imageUri, tags) {
    var storage = getStorageDir();
    var filename = imageUri.substring(imageUri.lastIndexOf('/')+1);

    // find out the first tag to save and skip already processed tags
    var firstTag = tags.shift();
    Task.spawn(function () {
	var firstTagFile = yield tagFilePath(firstTag, filename);
	var exists = yield OS.File.exists(firstTagFile);
	if (!exists) {
	    yield Downloads.fetch(imageUri, firstTagFile);
	}
	copyImageToTags(firstTagFile, tags);
    }
    ).then(null, function (e) {
	Cu.reportError(e);
	promptService.alert(null, "PicTag error", "Unable to save file, check the console");
    });
}

function copyImageToTags(imageFile, tags) {
    filename = OS.Path.basename(imageFile);
    return Task.spawn(function () {
	for (i = 0; i < tags.length; i++) {
	    var dest = yield tagFilePath(tags[i], filename);
	    var exists = yield OS.File.exists(dest);
	    if (!exists) {
		yield OS.File.copy(imageFile, dest);
	    }
	}
    });
}

function tagFilePath(tag, filename) {
    var storage = getStorageDir();
    var dir = OS.Path.join(storage, tag);
    let promise = OS.File.makeDir(dir);
    return promise.then(function () {
	return OS.Path.join(dir, filename);
    }, Cu.reportError);
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
