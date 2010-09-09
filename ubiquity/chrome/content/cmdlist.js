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
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Maria Emerson <memerson@mozilla.com>
 *   Blair McBride <unfocused@gmail.com>
 *   Satoshi Murakami <murky.satyr@gmail.com>
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

// Broken features to fix:
//  -- sort by whatever (needs more options)
//  -- margins, for readability

// New features to add:
// show/hide help at top of page
// show/hide help for individual command
// sort by enabledness
// Cool sliding animation

// Sort modes to implement:
// sort feeds-first or cmnds-first
// if feeds-first, feeds by name or by recently subscribed?
// if cmds-first, by name, author, homepage, licence, or enabledness?

Cu.import("resource://ubiquity/modules/setup.js");
Cu.import("resource://ubiquity/modules/utils.js");

const SORT_MODE_PREF = "extensions.ubiquity.commandList.sortMode";
const SHOW_L10N_TEMPLATE = !(
  LocalizationUtils.isLocalizableLang(UbiquitySetup.languageCode));

var {escapeHtml} = Utils;
var {feedManager, commandSource, messageService} = (
  UbiquitySetup.createServices());

function getFeeds(type) [
  feed for each (feed in feedManager["get" + type + "Feeds"]())
  if ("commands" in feed)];

function A(url, text, className, attrs) {
  var a = document.createElement("a");
  a.href = url;
  a.textContent = text || url;
  if (className) a.className = className;
  for (let attr in attrs) a.setAttribute(attr, attrs[attr]);
  return a;
}

function actionLink(text, action)(
  $("<span></span>")
  .text(text)
  .click(action)
  .addClass("action"));

function fillTableCellForFeed(cell, feed, sortMode) {
  var feedUrl  = feed.uri.spec;
  var feedData = feed.metaData || {}
  cell.append(
    A(feed.pageUri.spec, feedData.title || feed.title, "", {name: feedUrl}),
    "<br/>");
  cell.append(formatMetaData(feedData));
  if (+feed.date)
    cell.append('<span class="feed-date">' +
                feed.date.toLocaleString() +
                '</span><br/>');
  // add unsubscribe link (but not for built-in feeds)
  if (!feed.isBuiltIn)
    cell.append(actionLink(
      L("ubiquity.cmdlist.unsubscribefeed"),
      function unsubscribe() {
        feed.remove();
        cell.slideUp(function onUnsubscribe() {
          $(".id").filter(function() ~this.name.lastIndexOf(feedUrl, 0))
            .closest("tr").remove();
          updateSubscribedCount();
          buildUnsubscribedFeeds();
        });
      }));
  // Add link to source (auto-updated or not)
  cell.append(" ", viewSourceLink(feed));

  if (SHOW_L10N_TEMPLATE && LocalizationUtils.isLocalizableFeed(feedUrl))
    cell.append(" ", viewLocalizationTemplate(feed));

  // If not auto-updating, display link to any updates found
  feed.checkForManualUpdate(function onCheck(isAvailable, href) {
    if (isAvailable)
      cell.append("<br/>", A(href,
                             L("ubiquity.cmdlist.feedupdated"),
                             "feed-updated"));
  });
  // if sorting by feed, make feed name large and put a borderline
  if (/^feed/.test(sortMode)) {
    cell.addClass("topcell command-feed");
  }
}

function formatMetaData(md) {
  var authors = md.authors || md.author;
  var contributors = md.contributors || md.contributor;
  var {license, homepage} = md;
  function div(data, format, klass, lkey) !data ? "" : (
    '<div class="' + klass + '">' +
    L("ubiquity.cmdlist." + lkey, format(data)) +
    '</div>');
  return (
    '<div class="meta">' +
    div(authors, formatAuthors, "author", "createdby") +
    div(license, escapeHtml, "license", "license") +
    div(contributors, formatAuthors, "contributors", "contributions") +
    div(homepage, formatUrl, "homepage", "viewmoreinfo") +
    '</div>');
}

function formatAuthors(authors) (
  [formatAuthor(a) for each (a in [].concat(authors))].join(", "));

function formatAuthor(authorData) {
  if (!authorData) return "";

  if (typeof authorData === "string") return escapeHtml(authorData);

  var authorMarkup = "";
  if ("name" in authorData && !("email" in authorData)) {
    authorMarkup += escapeHtml(authorData.name) + " ";
  }
  else if ("email" in authorData) {
    var ee = escapeHtml(authorData.email);
    authorMarkup += (
      '<a href="mailto:' + ee + '">' +
      ("name" in authorData ? escapeHtml(authorData.name) : ee) +
      '</a> ');
  }

  if ("homepage" in authorData) {
    authorMarkup += ('[<a href="' + escapeHtml(authorData.homepage) +
                     '">' + L("ubiquity.cmdlist.homepage") + '</a>]');
  }

  return authorMarkup;
}

function formatUrl(url) let (hu = escapeHtml(url)) hu.link(hu);

function fillTableRowForCmd(row, cmd, className) {
  var checkBoxCell = $('<td><input type="checkbox"/></td>');
  (checkBoxCell.find("input")
   .val(cmd.id)
   .bind("change", onDisableOrEnableCmd)
   [cmd.disabled ? "removeAttr" : "attr"]("checked", "checked"));

  var {name, names} = cmd;
  var cmdElement = $(
    '<td class="command">' +
    (!("icon" in cmd) ? "" :
     '<img class="favicon" src="' + escapeHtml(cmd.icon) + '"/>') +
    ('<a class="id" name="' + escapeHtml(cmd.id) + '"/>' +
     '<span class="name">' + escapeHtml(name) + '</span>') +
    '<span class="description"></span>' +
    (names.length < 2 ? "" :
     ('<div class="synonyms-container light">' +
      L("ubiquity.cmdlist.synonyms",
        ('<span class="synonyms">' +
         escapeHtml(names.slice(1).join(", ")) +
         '</span>')) +
      '</div>')) +
    formatMetaData(cmd) +
    '<div class="help"></div>' +
    '</td>');

  if (cmd.oldAPI) {
    cmdElement.addClass("old-api").prepend(
      A("https://wiki.mozilla.org/Labs/Ubiquity/" +
        "Parser_2_API_Conversion_Tutorial", "OLD API", "badge"));
    if (UbiquitySetup.parserVersion === 2)
      cmdElement.addClass("not-loaded").find(".name")
        .attr("title", L("ubiquity.cmdlist.oldparsertitle"));
  }

  if (className) {
    checkBoxCell.addClass(className);
    cmdElement.addClass(className);
  }

  for each (let key in ["description", "help"]) if (key in cmd) {
    let node = cmdElement[0].getElementsByClassName(key)[0];
    try { node.innerHTML = cmd[key] }
    catch (e) {
      let msg = 'XML error in "' + key + '" of [ ' + cmd.name + ' ]';
      messageService.displayMessage({
        text: msg, onclick: function go2cmd() { jump(cmd.id) }});
      Cu.reportError(e);
    }
  }

  return row.append(checkBoxCell, cmdElement);
}

function updateSubscribedCount() {
  $("#num-commands").html(commandSource.commandNames.length);
  $("#num-subscribed-feeds").text(getFeeds("Subscribed").length);
}

function updateUnsubscribedCount() {
  $("#num-unsubscribed-feeds").text(getFeeds("Unsubscribed").length);
}

function buildTable() {
  let table = $("#commands-and-feeds-table").empty();
  let sortMode = getSortMode();
  let commands = commandSource.getAllCommands();

  function addFeedToTable(feed) {
    let cmdIds = [id for (id in feed.commands)];
    let feedCell = $("<td></td>");
    let {length} = cmdIds;
    if (length > 1) feedCell.attr("rowspan", length);
    fillTableCellForFeed(feedCell, feed, sortMode);

    let firstRow = $("<tr></tr>");
    firstRow.append(feedCell);
    if (length)
      fillTableRowForCmd(firstRow, commands[cmdIds[0]], "topcell");
    else
      firstRow.append($('<td class="topcell"></td><td class="topcell"></td>'));
    table.append(firstRow);

    for (let i = 1; i < length; ++i) { // starting from 1 is on purpose
      table.append(fillTableRowForCmd($("<tr></tr>"), commands[cmdIds[i]]));
    }
  }

  function addCmdToTable(cmd) {
    let aRow = $("<tr></tr>");
    let feedCell = $("<td></td>");
    let feed = feedManager.getFeedForUrl(cmd.feedUri);
    if (feed) fillTableCellForFeed(feedCell, feed);
    aRow.append(feedCell);
    fillTableRowForCmd(aRow, cmd);
    table.append(aRow);
  }

  updateSubscribedCount();

  if (/^feed/.test(sortMode))
    (getFeeds("Subscribed")
     .sort(/date$/.test(sortMode) ? byDate : byTitle)
     .forEach(addFeedToTable));
  else
    (sortCmdListBy([cmd for each (cmd in commandSource.getAllCommands())],
                   sortMode === "cmd" ? "name" : "enabled")
     .forEach(addCmdToTable));
}

function byTitle(a, b) !(a.title <= b.title);

function byDate(a, b) b.date - a.date;

function sortCmdListBy(cmdList, key) {
  function alphasort(a, b) {
    var aKey = a[key].toLowerCase();
    var bKey = b[key].toLowerCase();

    // ensure empty fields get given lower priority
    if(aKey.length > 0  && bKey.length == 0)
      return -1;
    if(aKey.length == 0  && bKey.length > 0)
      return 1;

    if(aKey < bKey)
      return -1;
    if(aKey > bKey)
      return 1;

    return 0;
  }
  function checksort(a, b) a.disabled - b.disabled;

  return cmdList.sort(key === "enabled" ? checksort : alphasort);
}

// Bind this to checkbox "change".
function onDisableOrEnableCmd() {
  // update the preferences, when the user toggles the active
  // status of a command.
  commandSource.getCommand(this.value).disabled = !this.checked;
}

// this was to make both subscribed and unsubscribed list entries, but is
// now used only for unsubscribed ones.
function makeUnsubscribedFeedListElement(info) {
  var $li = $("<li></li>").append(
    A(info.uri.spec, info.title),
    ("<ul>" +
     ["<li>" + escapeHtml(cmd.name) + "</li>"
      for each (cmd in info.commands)].join("") +
     "</ul>"),
    actionLink(L("ubiquity.cmdlist.resubscribe"), function resubscribe() {
      info.unremove();
      $li.slideUp(function onResubscribe() {
        updateUnsubscribedCount();
        buildTable();
        jump("graveyard");
      });
    }),
    " ",
    actionLink(L("ubiquity.cmdlist.purge"), function purge() {
      info.purge();
      $li.slideUp("slow");
    }),
    " ",
    viewSourceLink(info));
  return $li[0];
}

function buildUnsubscribedFeeds() {
  var unscrFeeds = feedManager.getUnsubscribedFeeds();
  var isEmpty = !unscrFeeds.length;

  updateUnsubscribedCount();
  $("#command-feed-graveyard-div, #unsubscribed-feeds-help")
    [isEmpty ? "hide" : "show"]();
  if (isEmpty) return;

  // TODO: sortMode could also be used to order the unsubscribed feeds?
  // let sortMode = getSortMode();
  var $graveyard = $("#command-feed-graveyard").empty();
  for each (let feed in unscrFeeds)
    $graveyard.append(makeUnsubscribedFeedListElement(feed));
}

function setSortMode(newSortMode) {
  Utils.prefs.setValue(SORT_MODE_PREF, newSortMode);
}

function getSortMode() (
  Utils.prefs.getValue(SORT_MODE_PREF, "feed"));

function changeSortMode(newSortMode) {
  setSortMode(newSortMode);
  buildTable();
}

function viewSourceLink(feed) (
  A("view-source:" + feed.viewSourceUri.spec,
    L("ubiquity.cmdlist." +
      (feed.canAutoUpdate ? "viewfeedsource" : "viewsource")),
    "action"));

function viewLocalizationTemplate(feed) (
  A(("chrome://ubiquity/content/localization-template.xhtml#" +
     feed.srcUri.spec),
    L("ubiquity.cmdlist.localetemplate"),
    "action"));

function setupSortSwitches() {
  var $switches = $(".sort-switch");
  var selected = "selected";
  function select(it) {
    $switches.removeClass(selected);
    $(it).addClass(selected);
  }
  ($switches
   .each(function initSwitch(mode) {
     if (this.getAttribute("value") === mode) {
       select(this);
       return false;
     }
   }, [getSortMode()])
   .click(function onSwitch() {
     var mode = this.getAttribute("value");
     if (mode === getSortMode()) return;
     select(this);
     setTimeout(changeSortMode, 0, mode);
   }));
}

// TODO: perform an inventory of similar effects found throughout and move
// them into a neatly packaged effects library later.
// Try and tag them for now. (slides/fades/etc).

$(function onReady() {
  setupHelp("#show-hide-help", "#cmdlist-help-div");
  setupSortSwitches();
  buildTable();
  buildUnsubscribedFeeds();
  jump();
});
