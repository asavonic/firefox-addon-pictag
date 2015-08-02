var self = require('sdk/self');
var window = require('sdk/window/utils');
var buttons = require('sdk/ui/button/action');
var tabs = require("sdk/tabs");
var contextMenu = require("sdk/context-menu");

let { Cc, Ci, Cu } = require('chrome');
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
var IOService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

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
