//var window = require('sdk/window/utils');
// find checked tags and return them to window.out
function returnTags() {
    console.log("returnTags()");
    var selected_tags = [];
    var rows = document.getElementById("grid-rows").childNodes;
    for (var i = 0; i < rows.length; i++) {
	var tags = rows[i].childNodes;
	for (var j = 0; j < tags.length; j++) {
	    if (tags[j].checked) {
		selected_tags.push(tags[j].label);
	    }
	}
    }

    saveImageWithTags(selected_tags);
}

function onLoad () {
    loadTags();
}

function createTagElem(num, label) {
    const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    var item = document.createElementNS(XUL_NS, "checkbox");
    item.setAttribute("label", label);
    item.setAttribute("id", "tag-" + num);
    item.setAttribute("persist", "checked");
    return item;
}

function createRowElem() {
    const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    var item = document.createElementNS(XUL_NS, "row");
    return item;
}

function loadTags() {
    var taglist = getTagList();
    var taglist_created = [];

    while (taglist.length != 0) {
	var tag = taglist.shift();
	taglist_created = loadTag(tag, taglist_created);
    }
}

function onAddTagButton() {
    var dlg = window.open("chrome://pictag/content/addTag.xul",
			  "add-tag-dialog",
			  "chrome,centerscreen");
    dlg.addTag = addTag;
}

function addTag(label) {
    var taglist = getTagList();
    loadTag(label, taglist);
    addTagToPrefs(label);
}

function loadTag(label, taglist) {
    var grid = document.getElementById("grid-rows");
    var rows = grid.childNodes;
    if (rows.length == 0) {
	grid.appendChild(createRowElem());
    }

    var last_row = rows[rows.length - 1];

    var cols_num = 5;

    // insert new row when last row filled up
    if (last_row.childNodes.length == cols_num) {
	grid.appendChild(createRowElem());
	last_row = rows[rows.length - 1];
    }

    taglist.push(label);

    var tag = createTagElem(taglist.length, label);
    last_row.appendChild(tag);

    return taglist;
}
