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
Cu.import("resource://gre/modules/Services.jsm");

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
    console.log("taglist: " + getTagList().toString());
    dlg = window.open("chrome://pictag/content/saveImage.xul",
		      "pictag-save-image",
		      "chrome,centerscreen");

    dlg.saveImageWithTags = function(tags) {
	saveImageWithTags(imageUri, tags)
    }

    dlg.getTagList = getTagList;
    dlg.addTagToPrefs = addTagToPrefs;
}

hashCode = function(s){
  return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
}

function filenameFromURI(uri) {
    var filename = uri.substring(uri.lastIndexOf('/')+1);
    var dot = filename.indexOf('.');
    filename = filename.substring(0, dot) + "-" + Math.abs(hashCode(uri))
	+ filename.substring(dot);
    return filename;
}

function saveImageWithTags(imageUri, tags) {
    var storage = getStorageDir();
    var filename = filenameFromURI(imageUri);

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

function getTagList() {
    var prefs = Services.prefs.getBranch("extensions.@pictag.");
    try {
	var taglist_str = prefs.getComplexValue("taglist", Ci.nsISupportsString).data;
	if (taglist_str == "") {
	    return []
	} else {
	    return taglist_str.split(":");
	}
    } catch (e) {
	return [];
    }
}

function addTagToPrefs(tag) {
    var str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
    var prefs = Services.prefs.getBranch("extensions.@pictag.");
    var taglist = getTagList();
    taglist.push(tag);
    str.data = taglist.join(":");
    prefs.setComplexValue("taglist", Ci.nsISupportsString, str);
}

function getDefaultStorageDir() {
    var default_storage = OS.Path.join(OS.Constants.Path.homeDir, "PicTag");
    return default_storage;
}

function getStorageDir() {
    var prefs = Services.prefs.getBranch("extensions.@pictag.");
    var storage;
    try {
	storage = prefs.getComplexValue("storagedir", Ci.nsILocalFile);
    } catch (e) {
	storage = null;
    }

    if (!storage) {
	storage = getDefaultStorageDir();
    }

    Task.spawn(function () {
	yield OS.File.makeDir(storage);
    }).then(null, function (e) {
	Cu.reportError(e);
	promptService.alert(null, "PicTag error", "Unable to create PicTag directory in $HOME");
    });

    return storage;
}
