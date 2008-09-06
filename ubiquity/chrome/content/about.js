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
 *   Atul Varma <atul@mozilla.com>
 *   Aza Raskin <aza@mozilla.com>
 *   Abimanyu Raja <abimanyuraja@gmail.com>
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

function makeRemover(element, uri) {
  function onHidden() {
    $(element).remove();
    if (!$("#command-feeds").text())
      $("#commands-feeds-div").slideUp();
  }
  function remove() {
    LinkRelCodeSource.removeMarkedPage(uri);
    $(element).slideUp(onHidden);
  }
  return remove;
}

function showBugRelatedAlerts() {
  // Show a warning for bug #146.
  var sanitizeOnShutdown = Application.prefs.getValue(
    "privacy.sanitize.sanitizeOnShutdown",
    false
  );
  var clearHistory = Application.prefs.getValue(
    "privacy.item.history",
    false
  );

  if (sanitizeOnShutdown && clearHistory)
    $("#sanitizeOnShutdown-alert").slideDown();
}

function onReady() {
  PrefKeys.onLoad();
  showBugRelatedAlerts();
  let markedPages = LinkRelCodeSource.getMarkedPages();
  for (let i = 0; i < markedPages.length; i++) {
    let info = markedPages[i];
    var li = document.createElement("li");

    function addLink(text, url, className) {
      var linkToHtml = document.createElement("a");
      $(linkToHtml).text(text);
      if (className)
        $(linkToHtml).addClass(className);
      linkToHtml.href = url;
      $(li).append(linkToHtml);
    }

    addLink(info.title, info.htmlUri.spec);

    $(li).append("<br/>");

    var linkToUnsubscribe = document.createElement("span");
    $(linkToUnsubscribe).text("[unsubscribe]");
    $(linkToUnsubscribe).click(makeRemover(li, info.htmlUri));
    $(linkToUnsubscribe).css({cursor: "pointer", color: "#aaa"});
    $(li).append(linkToUnsubscribe);

    var sourceUrl;
    var sourceName;

    if (info.canUpdate) {
      sourceUrl = info.jsUri.spec;
      sourceName = "auto-updated source";
    } else {
      sourceUrl = "data:application/x-javascript," + escape(info.getCode());
      sourceName = "source";
    }

    $(li).append(" ");
    addLink("[view " + sourceName + "]", sourceUrl, "feed-action");

    $("#command-feeds").append(li);
  }
  if (!$("#command-feeds").text())
    $("#commands-feeds-div").hide();

  jQuery.get( "http://hg.toolness.com/ubiquity-firefox/rss-log", loadNews);
}

function loadNews( data ) {
  $("item", data).each(function(){
    var p = document.createElement("p");
    var a = document.createElement("a");


    $(a).attr("href", $("link", this).text() )
        .text( $("title", this).text() +"..." );

    var author = $("author", this).text();

    $(p).append(a).append("<span class='light'><br/>by " + author + "</span>");
    $("#news").append(p);
  });
}

$(window).ready(onReady);
