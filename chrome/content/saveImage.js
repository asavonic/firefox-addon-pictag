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
