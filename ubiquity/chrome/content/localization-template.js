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
 *   Michael Yoshitaka Erlewine <mitcho@mitcho.com>
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

Cu.import("resource://ubiquity/modules/setup.js");
Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/localization_utils.js");

var L = LocalizationUtils.propertySelector(
  "chrome://ubiquity/locale/aboutubiquity.properties");

function displayTemplate(feedUri) {
  var {feedManager} = UbiquitySetup.createServices();
  for each (let feed in feedManager.getSubscribedFeeds()) {
    if (feed.srcUri.asciiSpec !== feedUri) continue;
    // print header metadata
    var po = (
      "# " + feedUri.replace(/^.*\/(\w+)\.\w+$/g, "$1") + ".po\n" +
      "# \n" +
      "# Localizers:\n" +
      "# LOCALIZER <EMAIL>\n\n" +
      'msgid ""\n' +
      'msgstr ""\n' +
      '"Project-Id-Version: Ubiquity 0.5\\n"\n' +
      '"POT-Creation-Date: ' + potCreationDate(new Date) + '\\n"\n\n');

    for each (let cmd in feed.commands)
      po += cmdTemplate(cmd) + "\n";
    $("#template").val(po);
    break;
  }
}

var localizableProperties = ["names", "help", "description"];
var contexts = ["preview", "execute"];

function cmdTemplate(cmd) {
  var po = "#. " + cmd.referenceName + " command:\n";
  for each (let key in localizableProperties)
    po += cmdPropertyLine(cmd, key);
  for each (let key in contexts) {
    var fn = cmd.proto[key];
    if (typeof fn === "function")
      po += cmdInlineLine(cmd, fn + "", key);
  }
  return po;
}

function cmdPropertyLine(cmd, property) {
  if (!(property in cmd)) return "";
  var help = (property === "names"
              ? "#. use | to separate multiple name values:\n"
              : "");
  var value = cmd[property];
  if (typeof value.join === "function") value = value.join("|");
  return help + potMsgs(cmd.referenceName + "." + property, value);
}

function cmdInlineLine(cmd, cmdCode, context) {
  if (context === "preview" && "_previewString" in cmd)
    return cmdPreviewString(cmd);

  var inlineChecker = /\W_\(("[^\\\"]*(?:\\.[^\\\"]*)*")/g;
  inlineChecker.lastIndex = 0;
  var po = "";
  while (inlineChecker.test(cmdCode))
    po += potMsgs(cmd.referenceName + "." + context,
                  Utils.json.decode(RegExp.$1));
  return po;
}

function cmdPreviewString(cmd) potMsgs(cmd.referenceName + ".preview",
                                       cmd._previewString);

function potMsgs(context, id)(
  'msgctxt "' + quoteString(context) + '"\n' +
  'msgid "'+ quoteString(id).replace(/\n/g, '\\n"\n"') + '"\n' +
  'msgstr ""\n\n');

function quoteString(str) str.replace(/[\\\"]/g, "\\$&");

function potCreationDate(date) {
  var to = date.getTimezoneOffset(), ato = Math.abs(to);
  return (date.toLocaleFormat("%Y-%m-%d %H:%M") + (to < 0 ? "+" : "-") +
          zeroPadLeft(ato / 60 | 0, 2) + zeroPadLeft(ato % 60, 2));
}

function zeroPadLeft(str, num) (Array(num + 1).join(0) + str).slice(-num);

$(function ready() {
  setupHelp("#show-hide-help", "#help-div");
  var feedUri = location.hash.slice(1);
  if (feedUri) {
    $(".feedKey").text(feedUri.replace(/^.*\/(\w+)\.\w+$/g, "$1"));
    $(".localization-dir").text(
      feedUri.replace(/\b(?:standard|builtin)-feeds\/.*$/g,
                      "localization/XY/"));
    displayTemplate(feedUri);
  }
});
