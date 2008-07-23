// -----------------------------------------------------------------
// TAGGING COMMANDS
// -----------------------------------------------------------------

// http://blog.stevenlevithan.com/archives/faster-trim-javascript
function trim (str) {
  var str = str.replace(/^\s\s*/, ''),
    ws = /\s/,
    i = str.length;
  while (ws.test(str.charAt(--i)));
  return str.slice(0, i + 1);
}

// command to tag the currently loaded URI via the humane prompt
function cmd_tag() {
  humanePrompt("Tag the current page:", function(aTagsString) {
    var Cc = Components.classes;
    var Ci = Components.interfaces;
    var doc = getDocumentInsecure();

    var currentURI = url(doc.location);
    var bookmarks = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].
                    getService(Ci.nsINavBookmarksService);

    if (!bookmarks.isBookmarked(currentURI)) {
      // create unfiled bookmark
      bookmarks.insertBookmark(bookmarks.unfiledBookmarksFolder, currentURI,
                               bookmarks.DEFAULT_INDEX, doc.title);
    }

    // if there's a comma, split on commas, otherwise use spaces
    var splitChar = " ";
    if (aTagsString.indexOf(",") == -1)
      splitChar = ",";
    tags = aTagsString.split(splitChar);

    // trim leading/trailing spaces
    tags = tags.map(function(a) { return trim(a) });
    
    var tagging = Cc["@mozilla.org/browser/tagging-service;1"].
                  getService(Ci.nsITaggingService);
    tagging.tagURI(currentURI, tags);
  });
}
cmd_tag.preview = function(aEl) { aEl.innerHTML = "Add tags for the current location"; };
cmd_tag.icon = "chrome://mozapps/skin/places/tagContainerIcon.png";
