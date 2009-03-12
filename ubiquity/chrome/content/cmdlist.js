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

function onDocumentLoad() {
  function updateCommands() {
    var cmdSource = UbiquitySetup.createServices().commandSource;

    // Dynamically generate entries for undocumented commands.
    var cmdsChanged = false;
    var cmdList = $('#command-list');
    cmdList.find('.activebox').unbind('change');
    for (var i = 0; i < cmdSource.commandNames.length; i++) {
      var cmd = cmdSource.getCommand(cmdSource.commandNames[i].name);
      var cmdId = cmdSource.commandNames[i].id.replace(/ /g, "_");
      cmdId = escapeHtml(cmdId);
      var isEnabled = !cmd.disabled;

      if (cmdList.find('#' + cmdId).length == 0) {
        cmdsChanged = true;
        cmdList.append(
          '<li class="command" id="' + cmdId + '">' +
           '<input type="checkbox" class="activebox"' +
           (isEnabled ? ' checked="checked"' : '')+'/>'+
           '<span class="name">' + escapeHtml(cmd.name) + '</span>' +
           '<span class="description"/>' +
           '<div class="synonyms-container light">also called <span class="synonyms"/></div>' +
           '<div class="light"><span class="author"/><span class="license"/></div>' +
           '<div class="homepage light"/>' +
           '<div class="help"/>' +
           '</li>'
        );

        var cmdElement = cmdList.find('#' + cmdId);

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

      }
    }

    // TODO: Remove any entries that no longer exist.

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

function sortCommandsBy(key) {
  function alphasort(a, b) {
    var aKey = $(a).find(key).text().toLowerCase();
    var bKey = $(b).find(key).text().toLowerCase();

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
    var aKey = $(':checkbox',a).attr('checked'),
        bKey = $(':checkbox',b).attr('checked');
    if (aKey===bKey)
      return 0;
    if(aKey)
      return -1;
    return 1;
  }
  var cmdList = $("#command-list");
  var allCommands = cmdList.find(".command").get();
  allCommands.sort( (key==='.active') ? checksort : alphasort);

  $.each(allCommands, function(cmdIndex, cmd) {
    cmdList.append(cmd);
  });
}

$(document).ready(onDocumentLoad);
