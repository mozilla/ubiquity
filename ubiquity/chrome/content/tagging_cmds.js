/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Ubiquity.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Dietrich Ayala <dietrich@mozilla.com>
 *   Atul Varma <atul@mozilla.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

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
