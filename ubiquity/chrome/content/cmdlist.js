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

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://ubiquity/modules/setup.js");
Cu.import("resource://ubiquity/modules/utils.js");

var escapeHtml = Utils.escapeHtml;

const SORT_MODE_PREF = "extensions.ubiquity.commandList.sortMode";

function A(url, text, className) {
  var a = document.createElement("a");
  a.href = url;
  a.textContent = text || url;
  a.className = className || "";
  return a;
}

function linkToAction(text, action)(
  $("<span></span>")
  .text(text)
  .click(action)
  .addClass("action"));

function fillTableCellForFeed(cell, feed, sortMode) {
  cell.append(A(feed.uri.spec, feed.title),
              "<br/>");
  if (+feed.date)
    cell.append('<span class="feed-date">' +
                feed.date.toLocaleString() +
                '</span><br/>');
  // add unsubscribe link (but not for built-in feeds)
  if (!feed.isBuiltIn)
    cell.append(linkToAction("[unsubscribe]",
                             function() {
                               feed.remove();
                               cell.slideUp(rebuildTable);
                             }));
  // Add link to source (auto-updated or not)
  cell.append(" ", viewSourceLink(feed));

  // if it's one of the builtin or standard feeds, add l10n template link
  if (/(builtin|standard)-feeds/.test(feed.srcUri.spec) && feed.srcUri.scheme == 'file')
    cell.append(" ", viewLocalizationTemplate(feed));

  // If not auto-updating, display link to any updates found
  feed.checkForManualUpdate(
    function(isAvailable, href) {
      if (isAvailable)
        cell.append("<br/>",
                    A(href,
                      "An update for this feed is available.",
                      "feed-updated"));
    });
  // if sorting by feed, make feed name large and put a borderline
  if (/^feed/.test(sortMode)) {
    cell.addClass("topcell command-feed-name");
  }
}

function formatAuthors(authors)(
  [formatCommandAuthor(a)
   for each (a in [].concat(authors))].join(", "));

function formatCommandAuthor(authorData) {
  if (!authorData) return "";

  if (typeof authorData === "string") return authorData;

  var authorMarkup = "";
  if ("name" in authorData && !("email" in authorData)) {
    authorMarkup += escapeHtml(authorData.name) + " ";
  } else if ("email" in authorData) {
    var ee = escapeHtml(authorData.email);
    authorMarkup += (
      '<a href="mailto:' + ee + '">' +
      ("name" in authorData ? escapeHtml(authorData.name) : ee) +
      '</a> ');
  }

  if ("homepage" in authorData) {
    authorMarkup += ('[<a href="' + escapeHtml(authorData.homepage) +
                     '">Homepage</a>]');
  }

  return authorMarkup;
}

function fillTableRowForCmd(row, cmd, className) {
  var checkBoxCell = jQuery(
    '<td><input type="checkbox" class="activebox"' +
    (cmd.disabled ? '' : ' checked="checked"') + '/></td>'
  );

  checkBoxCell.find("input").bind("change", onDisableOrEnableCmd);

  var {name, names, nameArg, homepage} = cmd;
  if (nameArg)
    // TODO: we need some sort of flag to check whether the nameArg
    // was a prefix or a suffix.
    name += " " + nameArg;

  var authors = cmd.authors || cmd.author;
  var contributors = cmd.contributors || cmd.contributor;

  var cmdElement = jQuery(
    '<td class="command">' +
    ("icon" in cmd ?
     <img class="favicon" src={cmd.icon}/>.toXMLString() : "") +
    (<><a class={cmd.id}/><span class="name">{name}</span></>) +
    ("description" in cmd ?
     '<span class="description">' + cmd.description + '</span>' : "") +
    (names.length > 1 ?
     (<div class="synonyms-container light"
      >also called <span class="synonyms">{names.slice(1).join(", ")}
      </span></div>) : "") +
    '<div class="light">' +
    (authors ?
     '<span class="autor">by ' + formatAuthors(authors) + '</span>' : "") +
    ("license" in cmd ?
     ('<span class="license"> - licensed as ' +
      escapeHtml(cmd.license) + '</span>') : "") +
    '</div>' +
    (contributors ?
     ('<div class="contributors light">contributed by ' +
      formatAuthors(contributors) + '</div>') : "") +
    (homepage ?
     (<div class="homepage">View more information at
      <a href={homepage}>{homepage}</a></div>) : "") +
    ("help" in cmd ? '<div class="help">' + cmd.help + '</div>' : "") +
    '</td>');

  if (UbiquitySetup.parserVersion === 2) {
    if (!("arguments" in cmd)) {
      cmdElement.addClass("not-loaded").find(".name").attr(
        "title",
        "This command was not loaded as it is incompatible with Parser 2.");
    }
    if (cmd.oldAPI) {
      cmdElement.addClass("oldAPI").prepend(
        '<span class="badge"><a href="https://wiki.mozilla.org/Labs/Ubiquity/' +
        'Parser_2_API_Conversion_Tutorial" target="new">' +
        '<img src="resource://ubiquity/chrome/skin/icons/oldapi.png">' +
        '</a></span>');
    }
  }
/*
  if (cmd.icon)
    cmdElement.find(".favicon").attr("src", cmd.icon);
  else
    cmdElement.find(".favicon").remove();

  var {homepage} = cmd;
  if (homepage)
    cmdElement.find(".homepage")[0].innerHTML =
      <>View more information at <a href={homepage}>{homepage}</a></>;

  var synonyms = Utils.isArray(cmd.names) ? cmd.names.slice(1) : cmd.synonyms;

  if ((synonyms || 0).length)
    cmdElement.find(".synonyms")
      .before("also called ").text(synonyms.join(", "));

  if (cmd.description)
    cmdElement.find(".description")[0].innerHTML = cmd.description;

  var authors = cmd.authors || cmd.author;
  if (authors)
    cmdElement.find(".author")
      .append("by ",
              [formatCommandAuthor(a)
               for each (a in [].concat(authors))].join(", "));

  var contributors = cmd.contributors || cmd.contributor;
  if (contributors)
    cmdElement.find(".contributors")
      .append("contributed by ",
              [formatCommandAuthor(c)
               for each (c in [].concat(contributors))].join(", "));

  if(cmd.license)
    cmdElement.find(".license").text(" - licensed as " + cmd.license);

  if(cmd.help)
    cmdElement.find(".help")[0].innerHTML = cmd.help;
*/
  if (className) {
    checkBoxCell.addClass(className);
    cmdElement.addClass(className);
  }

  row.append(checkBoxCell, cmdElement);
}

function populateYeTable(feedMgr, cmdSource) {
  let table = $("#commands-and-feeds-table");
  let sortField = getSortMode();
  let commands = cmdSource.getAllCommands();

  // TODO bug here: number of commands shown seems to include those from
  // unsubscribed feeds.
  $("#num-commands").html(cmdSource.commandNames.length);
  $("#num-subscribed-feeds").html(feedMgr.getSubscribedFeeds().length);

  function addFeedToTable(feed) {
    let cmdNames = [name for (name in feed.commands)];
    let feedCell = $("<td></td>");
    if (cmdNames.length > 1)
      feedCell.attr("rowspan", cmdNames.length);
    fillTableCellForFeed(feedCell, feed, sortField);

    let firstRow = $("<tr></tr>");
    firstRow.append(feedCell);
    if (cmdNames.length > 0) {
      fillTableRowForCmd(firstRow, commands[cmdNames[0]], "topcell");
    } else {
      firstRow.append($("<td class='topcell'></td><td class='topcell'></td>"));
    }
    table.append(firstRow);

    if (cmdNames.length > 1) {
      for (let i = 1; i < cmdNames.length; i++) {
        // starting from 1 is on purpose
        let aRow = $("<tr></tr>");
        fillTableRowForCmd(aRow, commands[cmdNames[i]]);
        table.append(aRow);
      }
    }
  }

  function addCmdToTable(cmd) {
    let aRow = $("<tr></tr>");
    let feedCell = $("<td></td>");
    let feed = getFeedForCommand(feedMgr, cmd);
    if (feed) {
      fillTableCellForFeed(feedCell, feed);
    }
    aRow.append(feedCell);
    fillTableRowForCmd(aRow, cmd);
    table.append(aRow);
  }

  if (/^feed/.test(sortField))
    (feedMgr.getSubscribedFeeds()
     .sort(/date$/.test(sortField) ? byDate : byTitle)
     .forEach(addFeedToTable));
  else
    (sortCmdListBy([cmd for each (cmd in cmdSource.getAllCommands())],
                   sortField === "cmd" ? "name" : "enabled")
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

function getFeedForCommand(feedMgr, cmd) {
  // This is a really hacky implementation -- it involves going through
  // all feeds looking for one containing a command with a matching name.
  for each (let feed in feedMgr.getSubscribedFeeds())
    if (cmd.id in (feed.commands || {})) return feed;
  return null;
}

// Bind this to checkbox "change".
function onDisableOrEnableCmd() {
  // update the preferences, when the user toggles the active
  // status of a command.
  var id = $(this).closest("tr").find(".id").attr("name");
  var {commandSource} = UbiquitySetup.createServices();

  commandSource.getCommand(id).disabled = !this.checked;
}

// this was to make both subscribed and unsubscribed list entries, but is
// now used only for unsubscribed ones.
function makeUnsubscribedFeedListElement(info, sortMode) {
  var $li = $("<li></li>").append(
    A(info.uri.spec, info.title),
    ("<ul>" +
     ["<li>" + escapeHtml(id.split("#").pop()) + "</li>"
      for (id in info.commands)].join("") +
     "</ul>"),
    linkToAction("[resubscribe]",
                 function resubscribe() {
                   info.unremove();
                   $li.slideUp(function onHidden(){
                     rebuildTable();
                     location.hash = "graveyard";
                   });
                 }),
    " ",
    linkToAction("[purge]",
                 function purge() {
                   info.purge();
                   $li.slideUp("slow");
                 }),
    " ",
    viewSourceLink(info));
  return $li[0];
}

function addAllUnsubscribedFeeds(feedMgr) {
  let sortMode = getSortMode();
  let unscrFeeds = feedMgr.getUnsubscribedFeeds();

  // TODO sortMode could also be used to order the unsubscribed feeds?
  function addUnsubscribedFeed(feed) {
    $("#command-feed-graveyard").append(
      makeUnsubscribedFeedListElement(feed, sortMode));
  }

  if (unscrFeeds.length == 0) {
    $("#command-feed-graveyard-div").hide();
    $("#unsubscribed-feeds-help").hide();
  } else {
    $("#command-feed-graveyard-div").show();
    $("#unsubscribed-feeds-help").show();
    $("#num-unsubscribed-feeds").html(unscrFeeds.length);
    unscrFeeds.forEach(addUnsubscribedFeed);
  }
}

// TODO the following code needs to make its way onto any page that has
// a version string:
//  $(".version").text(UbiquitySetup.version);


function rebuildTable() {
  let svc = UbiquitySetup.createServices();
  let feedMgr = svc.feedManager;
  let cmdSource = svc.commandSource;
  $("#commands-and-feeds-table").empty();
  populateYeTable(feedMgr, cmdSource);
  $("#command-feed-graveyard").empty();
  addAllUnsubscribedFeeds(feedMgr);
}

function setSortMode(newSortMode) {
  Application.prefs.setValue(SORT_MODE_PREF, newSortMode);
}

function getSortMode()(
  Application.prefs.getValue(SORT_MODE_PREF, "feed"));

function changeSortMode(newSortMode) {
  setSortMode(newSortMode);
  rebuildTable();
}

function viewSourceLink(feed)(
  A("view-source:" + feed.viewSourceUri.spec,
    ("[view " +
     (feed.canAutoUpdate ? "auto-updated " : "") +
     "source]"),
    "feed-action"));

function viewLocalizationTemplate(feed)(
  A("chrome://ubiquity/content/localization-template.html#" + feed.viewSourceUri.spec,
    ("[get localization template]"),
    "feed-action"));

function setupHelp() {
  var [toggler] = $("#show-hide-cmdlist-help").click(function toggleHelp() {
    $("#cmdlist-help-div")[(this.off ^= 1) ? "slideUp" : "slideDown"]();
    [this.textContent, this.bin] = [this.bin, this.textContent];
  });
  toggler.textContent = "Learn How to Use This Page";
  toggler.bin = "Hide Help";
  toggler.off = true;
}

$(function(){
  setupHelp();
  rebuildTable();
  // jump to the right anchor
  if (location.hash) location.hash += "";
});
