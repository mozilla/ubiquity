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

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://ubiquity/modules/setup.js");
Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/localization_utils.js");

var escapeHtml = Utils.escapeHtml;

function displayTemplate(feedUri) {
  $('#template').val('');
  let svc = UbiquitySetup.createServices();
  let feedMgr = svc.feedManager;
  let cmdSource = svc.commandSource;
  let commands = cmdSource.getAllCommands();
  
  let foundFeed = false;
  for each (let feed in feedMgr.getSubscribedFeeds()) {
    if (feed.srcUri.asciiSpec == feedUri) {
      foundFeed = true;
      
      // print header metadata
      $('#template').val('msgid ""\n'
                         + 'msgstr ""\n'
                         + '"Project-Id-Version: Ubiquity 0.5\\n"\n'
                         + '"POT-Creation-Date: '
                           + new Date().toLocaleFormat('%Y-%m-%d %H:%M%z')
                           +'\\n"\n'
                         + '\n');
      
      for (let cmdId in feed.commands) {
        addCmdTemplate(commands[cmdId],feed.commandCode[cmdId]);
        $('#template').val($('#template').val()+'\n');
      }
    }
  }
}

var localizableProperties = ['names','contributors','help','description'];

function addCmdTemplate(cmd,cmdCode) {
  let template = $('#template');
  let value = template.val();
  value += '#. '+cmd.referenceName+' command:\n';
  for each (let key in localizableProperties)  
    value += cmdPropertyLine(cmd,key) + '\n';
  value += cmdInlineLine(cmd,cmdCode,'preview');
  value += cmdInlineLine(cmd,cmdCode,'execute');
  template.val(value);
}

function cmdPropertyLine(cmd,property) {
  let ret  = 'msgid "'+cmd.referenceName+'.'+property+'"\n';
  let value = cmd[property];
  if (value) {
    if (value.join != undefined)
      value = value.join('|');
    ret += 'msgstr "' + value.replace(/\\/g,'\\\\')
                             .replace(/"/g,'\\"')
                             .replace(/\n/g,'\\n"\n"')+'"\n';
  } else 
    ret += 'msgstr ""\n';
  return ret;
}

var inlineChecker = /(?:_\()\s*("((?:[^\\"]|\\.)+?)"|'((?:[^\\']|\\.)+?)')[,)]/gim;
function cmdInlineLine(cmd,cmdCode,context) {

  if (context == 'preview' && cmd._previewString)
    return cmdPreviewString(cmd);

  let ret  = '';
  let script = cmdCode[context];
//  Utils.log(script.match(/_\(/g) && script.match(/_\(/g).length);
  let match;
  while (match = inlineChecker.exec(script)) {
//    Utils.log(match[2]);
//    Utils.log(inlineChecker.lastIndex);
    ret += 'msgctxt "'+cmd.referenceName+'.'+context+'"\n'
         + 'msgid "'+match[2].replace(/\\/g,'\\\\')
                             .replace(/"/g,'\\"')
                             .replace(/\n/g,'\\n"\n"')+'"\n'
         + 'msgstr ""\n\n';
  }
  return ret;
}

function cmdPreviewString(cmd) (
   'msgid "'+cmd.referenceName+'.preview"\n'
 + 'msgstr "'+cmd._previewString.replace(/\\/g,'\\\\')
                                .replace(/"/g,'\\"')
                                .replace(/\n/g,'\\n"\n"')+'"\n\n'
)

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
  if (window.location.hash) {
    feedUri = window.location.hash.slice(1);
    $('.feedKey').html(feedUri.replace(/^.*\/(\w+)\.\w+$/g,'$1'));
    $('.localization-dir').html(feedUri.replace(/^(.*ubiquity\/)(standard|builtin)-feeds\/.*$/g,'$1')+'standard-feeds/localization/');
    displayTemplate(feedUri);
  } else {
    // no feed was given.
  }
});
