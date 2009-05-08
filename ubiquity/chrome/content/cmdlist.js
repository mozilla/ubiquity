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

function fillTableCellForFeed( cell, feed ) {
  cell.html(linkToHtml( feed.title, feed.uri.spec));
  cell.append("<br/>");
  // TODO do not add unsubscribe link if it's a built-in

  cell.append(linkToAction("[unsubscribe]", makeRemover(cell, feed) ));
  // makeRemover needs to be modified so that it slides out the row or
  // rows and not just the cell.

  let sourceName = feed.canAutoUpdate?"auto-updated source":"source";
  cell.append(" ");
  cell.append(linkToHtml("[view " + sourceName + "]",
                             "view-source:" + feed.viewSourceUri.spec,
                             "feed-action"));
  cell.addClass("topcell");
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

  var isEnabled = !cmd.disabled;
  var checkBoxCell = jQuery(
    '<td><input type="checkbox" class="activebox"' +
      (isEnabled ? ' checked="checked"' : '')+'/></td>'
  );

  var cmdElement = jQuery(
    '<td class="command">' +
    '<img class="favicon">' +
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

function populateYeTable( sortField ) {
  let table = $("#commands-and-feeds-table");
  let svc = UbiquitySetup.createServices();
  let feedMgr = svc.feedManager;
  let cmdSource = svc.commandSource;

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
    fillTableCellForFeed( feedCell, feed );

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

function getFeedForCommand( feedMgr, cmd ) {
  // This is a really hacky implementation -- it involves going through
  // all feeds looking for one containing a command with a matching name.
  let feeds = feedMgr.getSubscribedFeeds();
  for (let feed in feeds) {
    // TODO is buggy here: these feeds seem to not have commands!
    if (!feed.commands) {
      continue;
    }
    if (feed.commands[ cmd.name ]) {
      return feed;
    }
  }
  return null;
}

// Broken features to fix:
//  -- sort by whatever
//  -- unsubscribe / resubscribe
//  -- populate unsubscribed feeds area
//  -- enable/disable command
//  -- margins, fo readability

// New features to add:
// show/hide help at top of page
// sort by using links instead of drop-down
// show/hide help for individual command
// jump directly to help for particular command

// So I guess I'm gonna need page-wide variables (url get args?)
// for:
// sort feeds-first or cmnds-first
// if feeds-first, feeds by name or by recently subscribed?
// if cmds-first, by name, author, homepage, licence, or enabledness?

/// Below this is ye old code.

function onDocumentLoad() {
  //onReady();

  function updateCommands() {
    var cmdSource = UbiquitySetup.createServices().commandSource;

    var cmdList = $('#command-list');
    cmdList.find('.activebox').unbind('change');
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

    // TODO: Remove any entries that no longer exist.
    // TODO: port onDisableOrEnableCmd up
    function onDisableOrEnableCmd() {
      // update the preferences, when the user toggles the active
      // status of a command

      var name=$(this).parents('li.command').find('span.name').text();
      var cmdSource = UbiquitySetup.createServices().commandSource;
      var cmd = cmdSource.getCommand(name);

      if (this.checked)
        // user has just made this command active.
        cmd.disabled = false;
      else
        // user has just made this command inactive.
        cmd.disabled = true;
    }

    cmdList.find('.activebox').bind('change', onDisableOrEnableCmd);
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


// ------- where the old division was

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

  function addLinkToAction(text, action) {
    var linkToAction = document.createElement("span");
    $(linkToAction).text(text);
    $(linkToAction).click(action);
    $(linkToAction).css({cursor: "pointer", color: "#aaa"});
    $(li).append(linkToAction);
  }

  var titleLink = addLink(info.title, info.uri.spec);

  if (label == "unsubscribe" && !info.canAutoUpdate) {
    info.checkForManualUpdate(
      function(isAvailable, href) {
        if (isAvailable)
          $(titleLink).after('<br><a class="feed-updated" href="' + href +
                             '">An update for this feed is available.</a>');
      });
  }

  var commandList = $("<ul></ul>");
  for (var name in info.commands)
    $(commandList).append($("<li></li>").text(name));
  $(li).append(commandList);

  addLinkToAction("[" + label + "]", clickMaker(li, info));

  if (label == "resubscribe") {
    $(li).append(" ");
    addLinkToAction("[purge]",
                    function() { $(li).slideUp("slow");
                                 info.purge(); });
  }

  var sourceUrl;
  var sourceName;

  if (info.canAutoUpdate)
    sourceName = "auto-updated source";
  else
    sourceName = "source";

  $(li).append(" ");
  addLink("[view " + sourceName + "]", "view-source:" + info.viewSourceUri.spec,
          "feed-action");

  return li;
}

function addAllUnsubscribedFeeds() {
  let svc = UbiquitySetup.createServices();
  let feedMgr = svc.feedManager;

  function addUnsubscribedFeed(feed) {
    $("#command-feed-graveyard").append(makeFeedListElement(feed,
                                                            "resubscribe",
                                                            makeUnremover));
  }
  feedMgr.getUnsubscribedFeeds().forEach(addUnsubscribedFeed);

  if (!$("#command-feed-graveyard").text())
    $("#command-feed-graveyard-div").hide();
}

// TODO the following code needs to make its way onto any page that has
// a version string:
//  $(".version").text(UbiquitySetup.version);


function startYeDocumentLoad() {
  populateYeTable("cmd");
  addAllUnsubscribedFeeds();
}

function changeSortMode( newSortMode ) {
  $("#commands-and-feeds-table").empty();
  populateYeTable(newSortMode);
}

$(document).ready(startYeDocumentLoad);
