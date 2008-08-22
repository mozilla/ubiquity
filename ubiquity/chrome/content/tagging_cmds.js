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
CmdUtils.CreateCommand({
  name: "tag",
  homepage: "http://autonome.wordpress.com/",
  author: { name: "Dietrich Ayala", email: "dietrich@mozilla.com"},
  license: "MPL/GPL/LGPL",
  takes : {"text" : noun_arb_text},
  icon: "chrome://mozapps/skin/places/tagContainerIcon.png",
  description: "Adds a tag to describe the current page",
  preview: function(aEl, aTagsString) {
    aEl.innerHTML = "Describe the current page with tags";
    aEl.innerHTML += aTagsString.text.length ? " (" + aTagsString.text + ")" : ".";
  },
  execute: function(aTagsString) {
    var Cc = Components.classes;
    var Ci = Components.interfaces;
    var doc = CmdUtils.getDocumentInsecure();

    var iosvc = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    var currentURI = iosvc.newURI(doc.location, null, null);

    var bookmarks = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].
                    getService(Ci.nsINavBookmarksService);
    if (!bookmarks.isBookmarked(currentURI)) {
      // create unfiled bookmark
      bookmarks.insertBookmark(bookmarks.unfiledBookmarksFolder, currentURI,
                               bookmarks.DEFAULT_INDEX, doc.title);
    }

    // if there's a comma, split on commas, otherwise use spaces
    var splitChar = " ";
    if (aTagsString.text.indexOf(",") == -1)
      splitChar = ",";
    var tags = aTagsString.text.split(splitChar);

    // trim leading/trailing spaces
    tags = tags.map(function(a) { return trim(a) });

    var tagging = Cc["@mozilla.org/browser/tagging-service;1"].
                  getService(Ci.nsITaggingService);
    tagging.tagURI(currentURI, tags);
  }
});
