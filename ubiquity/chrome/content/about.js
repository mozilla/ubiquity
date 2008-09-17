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

function makeRemover(element, info) {
  function onSlideDown() {
    var newElement = makeFeedListElement(info,
                                         "resubscribe",
                                         makeUnremover);
    $(newElement).hide();
    $("#command-feed-graveyard").append(newElement);
    $(newElement).fadeIn();
  }
  function onHidden() {
    $(element).remove();
    if (!$("#command-feeds").text())
      $("#command-feeds-div").slideUp();
    $("#command-feed-graveyard-div").slideDown("normal", onSlideDown);
  }
  function remove() {
    info.remove();
    $(element).slideUp(onHidden);
  }
  return remove;
}

function makeUnremover(element, info) {
  function onSlideDown() {
    var newElement = makeFeedListElement(info,
                                         "unsubscribe",
                                         makeRemover);
    $(newElement).hide();
    $("#command-feeds").append(newElement);
    $(newElement).fadeIn();
  }
  function onHidden() {
    $(element).remove();
    if (!$("#command-feed-graveyard").text())
      $("#command-feed-graveyard-div").slideUp();
    $("#command-feeds-div").slideDown("normal", onSlideDown);
  }
  function unremove() {
    info.unremove();
    $(element).slideUp(onHidden);
  }
  return unremove;
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

function checkForManualUpdate(info, elem) {
  function onSuccess(data) {
    if (data != info.getCode()) {
      var confirmUrl = (CONFIRM_URL + "?url=" +
                        encodeURIComponent(info.htmlUri.spec) + "&sourceUrl=" +
                        encodeURIComponent(info.jsUri.spec) + "&updateCode=" +
                        encodeURIComponent(data));

      $(elem).after('<br><a class="feed-updated" href="' + confirmUrl +
                    '">An update for this feed is available.</a>');
    }
  }

  jQuery.ajax({url: info.jsUri.spec,
               dataType: "text",
               success: onSuccess});
}

function makeFeedListElement(info, label, clickMaker) {
  var li = document.createElement("li");

  function addLink(text, url, className) {
    var linkToHtml = document.createElement("a");
    $(linkToHtml).text(text);
    if (className)
      $(linkToHtml).addClass(className);
    linkToHtml.href = url;
    $(li).append(linkToHtml);
    return linkToHtml;
  }

  var titleLink = addLink(info.title, info.htmlUri.spec);

  $(li).append("<br/>");

  // TODO: This is confusing to read b/c info.canUpdate should
  // really be called 'info.canAutoUpdate'.
  if (label == "unsubscribe" && !info.canUpdate)
    checkForManualUpdate(info, titleLink);

  var linkToAction = document.createElement("span");
  $(linkToAction).text("[" + label + "]");
  $(linkToAction).click(clickMaker(li, info));
  $(linkToAction).css({cursor: "pointer", color: "#aaa"});
  $(li).append(linkToAction);

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

  return li;
}

function onReady() {
  PrefKeys.onLoad();
  Editor.onLoad();
  showBugRelatedAlerts();

  let markedPages = LinkRelCodeSource.getMarkedPages();
  for (let i = 0; i < markedPages.length; i++)
    $("#command-feeds").append(makeFeedListElement(markedPages[i],
                                                   "unsubscribe",
                                                   makeRemover));
  if (!$("#command-feeds").text())
    $("#command-feeds-div").hide();

  let removedPages = LinkRelCodeSource.getRemovedPages();
  for (i = 0; i < removedPages.length; i++)
    $("#command-feed-graveyard").append(makeFeedListElement(removedPages[i],
                                                            "resubscribe",
                                                            makeUnremover));
  if (!$("#command-feed-graveyard").text())
    $("#command-feed-graveyard-div").hide();

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
