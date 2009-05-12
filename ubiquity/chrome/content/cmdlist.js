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

Components.utils.import("resource://ubiquity/modules/setup.js");
Components.utils.import("resource://ubiquity/modules/utils.js");

var escapeHtml = Utils.escapeHtml;

function linkToHtml(text, url, className) {
  var linkToHtml = document.createElement("a");
  $(linkToHtml).text(text);
  if (className)
    $(linkToHtml).addClass(className);
  linkToHtml.href = url;
  return linkToHtml;
}

function linkToAction(text, action) {
  var linkToAction = document.createElement("span");
  $(linkToAction).text(text);
  $(linkToAction).click(action);
  $(linkToAction).css({cursor: "pointer", color: "#aaa"});
  return linkToAction;
}

function fillTableCellForFeed( cell, feed, sortMode) {
  cell.html(linkToHtml( feed.title, feed.uri.spec));
  cell.append("<br/>");
  // add unsubscribe link (but not for built-in feeds)
  if (!feed.isBuiltIn)
    cell.append(linkToAction("[unsubscribe]", function() {
                               feed.remove();
                               cell.slideUp(rebuildTable);
                             }));

  // Add link to source (auto-updated or not)
  let sourceName = feed.canAutoUpdate?"auto-updated source":"source";
  cell.append(" ");
  cell.append(linkToHtml("[view " + sourceName + "]",
                             "view-source:" + feed.viewSourceUri.spec,
                             "feed-action"));
  // If not auto-updating, display link to any updates found
  feed.checkForManualUpdate(
      function(isAvailable, href) {
        if (isAvailable)
          $(cell).append('<br/><a class="feed-updated" href="' + href +
                         '">An update for this feed is available.</a>');
      });

  // if sorting by feed, make feed name large and put a borderline
  if (sortMode == "feed") {
    cell.addClass("topcell");
    cell.addClass("command-feed-name");
  }
}

function formatCommandAuthor(authorData) {
  if(!authorData) return "";

  if(typeof authorData == "string") return authorData;

  var authorMarkup = '';
  if(authorData.name && !authorData.email) {
    authorMarkup += escapeHtml(authorData.name) + " ";
  } else if(authorData.name && authorData.email) {
    authorMarkup += ('<a href="mailto:' + escapeHtml(authorData.email) +
                     '">' + escapeHtml(authorData.name) + '</a> ');
  } else if(!authorData.name && authorData.email) {
    authorMarkup += ('<a href="mailto:' + escapeHtml(authorData.email) +
                     '">' + escapeHtml(authorData.email) + '</a> ');
  }

  if(authorData.homepage) {
    authorMarkup += ('[<a href="' + escapeHtml(authorData.homepage) +
                     '">Homepage</a>]');
  }

  if(authorMarkup.length == 0)
    return '';

  return 'by ' + authorMarkup;
}

function fillTableRowForCmd( row, cmd, className ) {
  // TODO bug here: when displaying sorted by feed, the check boxes
  // are all checked even if the command should be disabled.  When
  // displaying sorted by cmd, the check boxes all appear correctly.

  // re-checking a box for a disabled command doesn't seem to re-enable it.

  // un-checking a box when you're in sort-by-feed mode does disable it.
  // (But then the box appears correctly unchecked in sort-by-cmd and
  // incorrectly checked in sort-by-feed).

  //               check      uncheck     display
  // sort by feed   no          yes         no
  // sort by cmd    no          yes         yes

  // Difference has to be because of the command objects getting passed
  // in are different...

  var isEnabled = !cmd.disabled;
  var checkBoxCell = jQuery(
    '<td><input type="checkbox" class="activebox"' +
      (isEnabled ? ' checked="checked"' : '')+'/></td>'
  );

  // For all commands in the table, unbind any 'change' method, bind to
  // onDisableOrEnableCmd.
  //checkBoxCell.unbind('change');
  checkBoxCell.bind('change', onDisableOrEnableCmd);


  var cmdElement = jQuery(
    '<td class="command">' +
    '<a><img class="favicon"></a>' +
    '<span class="name">' + escapeHtml(cmd.name) + '</span>' +
    '<span class="description"/>' +
    '<div class="synonyms-container light">also called ' +
    '<span class="synonyms"/></div>' +
    '<div class="light"><span class="author"/>' +
    '<span class="license"/></div>' +
    '<div class="homepage light"/>' +
    '<div class="help"/>' +
    '</td>'
  );

  cmdElement.find("a").attr("name", escapeHtml(cmd.name));

  if (cmd.icon) {
    cmdElement.find(".favicon").attr("src", escapeHtml(cmd.icon) );
  } else {
    cmdElement.find(".favicon").empty();
  }
  if (cmd.homepage) {
    cmdElement.find(".homepage").html(
      ('View more information at <a href="' +
       escapeHtml(cmd.homepage) + '">' +
       escapeHtml(cmd.homepage) + '</a>.')
    );
  } else cmdElement.find(".homepage").empty();

  if (cmd.synonyms){
    cmdElement.find(".synonyms").html(
      escapeHtml(cmd.synonyms.join(", "))
    );
  } else cmdElement.find(".synonyms-container").empty();

  if (cmd.description) {
    cmdElement.find(".description").html(
      cmd.description
    );
  } else cmdElement.find(".description").empty();

  if (cmd.author) {
    cmdElement.find(".author").html(
      formatCommandAuthor(cmd.author)
    );
  } else cmdElement.find(".author").empty();

  if(cmd.license) {
    cmdElement.find(".license").html(
      escapeHtml(' - licensed as ' + cmd.license)
    );
  } else cmdElement.find(".license").empty();

  if(cmd.help) {
    cmdElement.find(".help").html(cmd.help);
  } else {
    cmdElement.find(".help").empty();
  }

  if (className) {
    checkBoxCell.addClass(className);
    cmdElement.addClass(className);
  }

  row.append( checkBoxCell );
  row.append( cmdElement );
}

function populateYeTable(feedMgr, cmdSource) {
  let table = $("#commands-and-feeds-table");
  let sortField = getSortMode();

  // TODO bug here: number of commands shown seems to include those from
  // unsubscribed feeds.
  $("#num-commands").html( cmdSource.commandNames.length );
  $("#num-subscribed-feeds").html( feedMgr.getSubscribedFeeds().length );

  function addFeedToTable(feed) {
    if (feed.isBuiltIn)
      return; //handle these differently

    let cmdNames = [];
    for (let name in feed.commands) {
      cmdNames.push(name);
    }

    let feedCell = $("<td></td>");
    if (cmdNames.length > 1 )
      feedCell.attr("rowspan", cmdNames.length);
    fillTableCellForFeed( feedCell, feed, sortField );

    let firstRow = $("<tr></tr>");
    firstRow.append( feedCell );
    if (cmdNames.length > 0) {
      fillTableRowForCmd(firstRow, feed.commands[cmdNames[0]], "topcell");
    } else {
      firstRow.append($("<td class='topcell'></td><td class='topcell'></td>"));
    }
    table.append(firstRow);

    if (cmdNames.length > 1 ) {
      for (let i = 1; i < cmdNames.length; i++ ) {
        // starting from 1 is on purpose
        let aRow = $("<tr></tr>");
        fillTableRowForCmd(aRow, feed.commands[cmdNames[i]]);
        table.append(aRow);
      }
    }
  }

  function addCmdToTable(cmd) {
    let aRow = $("<tr></tr>");
    let feedCell = $("<td></td>");
    let feed = getFeedForCommand(feedMgr, cmd);
    if (feed) {
      fillTableCellForFeed( feedCell, feed );
    }
    aRow.append( feedCell );
    fillTableRowForCmd(aRow, cmd);
    table.append(aRow);
  }

  if (sortField == "feed") {
    feedMgr.getSubscribedFeeds().forEach(addFeedToTable);
  } else if (sortField == "cmd") {
    let cmds = cmdSource.commandNames.slice();
    cmds = sortCmdListBy(cmds, "name");
    for (let i=0; i < cmds.length; i++) {
      let cmd = cmdSource.getCommand(cmds[i].name);
      addCmdToTable(cmd);
    }
  }
}

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
  function checksort(a, b) {
    var aKey = !a.disabled,
        bKey = !b.disabled;
    if (aKey===bKey)
      return 0;
    if(aKey)
      return -1;
    return 1;
  }
  if (key == "active") {
    cmdList.sort(checksort);
  } else {
    cmdList.sort(alphasort);
  }
  return cmdList;
}


function getFeedForCommand( feedMgr, cmd ) {
  // This is a really hacky implementation -- it involves going through
  // all feeds looking for one containing a command with a matching name.
  let feeds = feedMgr.getSubscribedFeeds();
  for each (let feed in feeds) {
    if (!feed.commands) {
      continue;
    }
    if (feed.commands[ cmd.name ]) {
      return feed;
    }
  }
  return null;
}

function onDisableOrEnableCmd() {
  // update the preferences, when the user toggles the active
  // status of a command.
  // Bind this to checkbox 'change'.

  var name=$(this).parents('tr').find('span.name').text();
  var cmdSource = UbiquitySetup.createServices().commandSource;
  var cmd = cmdSource.getCommand(name);

  // TODO: this.checked is ALWAYS UNDEFINED.  So re-enabling does not work!
  alert("this.checked is " + this.hasAttribute("checked") );
  //alert("cmd name is " + name);
  if (this.checked)
    // user has just made this command active.
    cmd.disabled = false;
  else
    // user has just made this command inactive.
    cmd.disabled = true;
}

// this was to make both subscribed and unsubscribed list entries, but is
// now used only for unsubscribed ones.
function makeUnsubscribedFeedListElement(info, sortMode) {
  var li = document.createElement("li");
  $(li).append(linkToHtml(info.title, info.uri.spec));

  var commandList = $("<ul></ul>");
  for (var name in info.commands)
    $(commandList).append($("<li></li>").text(name));
  $(li).append(commandList);

  $(li).append(linkToAction("[resubscribe]", function() {
                              info.unremove();
                              $(li).slideUp(rebuildTable);
                            }));

  $(li).append(" ");
  $(li).append(linkToAction("[purge]",
                  function() { $(li).slideUp("slow");
                               info.purge(); }));

  var sourceUrl;
  var sourceName;

  if (info.canAutoUpdate)
    sourceName = "auto-updated source";
  else
    sourceName = "source";

  $(li).append(" ");
  $(li).append(linkToHtml("[view " + sourceName + "]",
                          "view-source:" + info.viewSourceUri.spec,
                          "feed-action"));
  return li;
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

  // If there are URL GET arguments, jump to the right place
  let mainURL = window.location.search;
  let arguments = mainURL.split("?")[1].split("&");
  for (let i in arguments) {
    let pair = arguments[i].split("=");
    if (pair[0] == "cmdname") {
      window.location.hash = pair[1];
      break;
    }
  }
}

function setSortMode( newSortMode ) {
  Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefBranch).setCharPref(
      "extensions.ubiquity.commandList.sortMode",
      newSortMode);
}

function getSortMode() {
  return Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefBranch).getCharPref(
      "extensions.ubiquity.commandList.sortMode");
}

function changeSortMode( newSortMode ) {
  setSortMode( newSortMode );
  rebuildTable();
}

function showCmdListHelp( enabled ) {
  if (enabled) {
    $("#cmdlist-help-div").slideDown();
  } else {
    $("#cmdlist-help-div").slideUp();
  }
}

$(document).ready(rebuildTable);



// OK, resubscribing works, but the commands do not appear in the list on
// the first try IFF you're in sort-by-command-name mode.  Everything
// works fine if you're in sort-by-feed mode.
// How odd.

// Broken features to fix:
//  -- sort by whatever (needs more options)
//  -- unsubscribe / resubscribe (mostly fixed, one bug)
//  -- populate unsubscribed feeds area (done)
//  -- enable/disable command (mostly fixed, one bug)
//  -- Find feeds for commands so they can be displayed in cmd mode (done)
//  -- margins, fo readability

// New features to add:
// show/hide help at top of page  (done)
// sort by using links instead of drop-down (done)
// show/hide help for individual command
// jump directly to help for particular command (done, make help cmd use it)
// sort-by enabledness
// sort-by subscription date of feed (how to get this?)
// actually sort feeds alphabetically when sorting by feed

// So I guess I'm gonna need page-wide variables (url get args?)
// for:
// sort feeds-first or cmnds-first
// if feeds-first, feeds by name or by recently subscribed?
// if cmds-first, by name, author, homepage, licence, or enabledness?







/// Below this is ye old code.

/*
function onDocumentLoad() {

  function updateCommands() {
    var cmdSource = UbiquitySetup.createServices().commandSource;

    var cmdList = $('#command-list');

    for (var i = 0; i < cmdSource.commandNames.length; i++) {
      var cmd = cmdSource.getCommand(cmdSource.commandNames[i].name);
      var isEnabled = !cmd.disabled;

      var cmdElement = jQuery(
        '<li class="command">' +
          '<input type="checkbox" class="activebox"' +
          (isEnabled ? ' checked="checked"' : '')+'/>'+
          '<span class="name">' + escapeHtml(cmd.name) + '</span>' +
          '<span class="description"/>' +
          '<div class="synonyms-container light">also called ' +
          '<span class="synonyms"/></div>' +
          '<div class="light"><span class="author"/>' +
          '<span class="license"/></div>' +
          '<div class="homepage light"/>' +
          '<div class="help"/>' +
          '</li>'
      );

      if(cmd.icon) {
        // TODO: Is this how we escape inside a url() in CSS?
        cmdElement.css('list-style-image', "url('" +
                       escapeHtml(cmd.icon) + "')");
      } else {
        cmdElement.css('list-style-type', 'none');
      }
      if(cmd.homepage) {
        cmdElement.find(".homepage").html(
          ('View more information at <a href="' +
           escapeHtml(cmd.homepage) + '">' +
           escapeHtml(cmd.homepage) + '</a>.')
        );
      } else cmdElement.find(".homepage").empty();

      if(cmd.synonyms){
        cmdElement.find(".synonyms").html(
          escapeHtml(cmd.synonyms.join(", "))
        );
      } else cmdElement.find(".synonyms-container").empty();

      if(cmd.description) cmdElement.find(".description").html(
        cmd.description
      );
      else cmdElement.find(".description").empty();

      if(cmd.author) cmdElement.find(".author").html(
        formatCommandAuthor(cmd.author)
      );

      else cmdElement.find(".author").empty();

      if(cmd.license) cmdElement.find(".license").html(
        escapeHtml(' - licensed as ' + cmd.license)
      );
      else cmdElement.find(".license").empty();

      if(cmd.help) cmdElement.find(".help").html(cmd.help);

      else cmdElement.find(".help").empty();

      cmdList.append(cmdElement);
    }

  }

  var sortKey = $("#sortby").val();

  function doSort() {
    sortKey = $("#sortby").val();
    sortCommandsBy(sortKey);
  }

  $("#sortby").change(doSort);

  updateCommands();
  doSort();
}
*/



// ------- where the old division was
/*
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
*/

// TODO the following code needs to be applied to the subscribed feed
// elements in the big table:
/*
 *   if (label == "unsubscribe" && !info.canAutoUpdate) {
    info.checkForManualUpdate(
      function(isAvailable, href) {
        if (isAvailable)
          $(titleLink).after('<br><a class="feed-updated" href="' + href +
                             '">An update for this feed is available.</a>');
      });
  }

 */
