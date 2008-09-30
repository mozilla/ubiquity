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
 *   Maria Emerson <memerson@mozilla.com>
 *   Abimanyu Raja <abimanyu@gmail.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Blair McBride <blair@theunfocused.net>
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
// SYSTEM COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  name: "help",
  icon: "chrome://ubiquity/skin/icons/help.png",
  preview: "Provides help on using Ubiquity, as well as access to preferences, etc.",
  description: "Takes you to the Ubiquity <a href=\"about:ubiquity\">main help page</a>.",
  execute: function(){
    Utils.openUrlInBrowser("about:ubiquity");
  }
});

CmdUtils.CreateCommand({
  name: "command-editor",
  icon : "chrome://ubiquity/skin/icons/plugin_edit.png",
  preview: "Opens the editor for writing Ubiquity commands",
  description: "Takes you to the Ubiquity <a href=\"chrome://ubiquity/content/editor.html\">command editor</a> page.",
  execute: function(){
    Utils.openUrlInBrowser("chrome://ubiquity/content/editor.html");
  }
});

CmdUtils.CreateCommand({
  name: "command-list",
  icon : "chrome://ubiquity/skin/icons/application_view_list.png",
  preview: "Opens the list of all Ubiquity commands available and what they all do.",
  description: "Takes you to the page you're on right now.",
  execute: function(){
    Utils.openUrlInBrowser("chrome://ubiquity/content/cmdlist.html");
  }
});

// Commented out since skins functionality is not completely done.
// //TODO: update this
// CmdUtils.CreateCommand({
//   name: "skin",
//   preview: "Changes your current Ubiquity skin.",
//   description: "Changes what skin you're using for Ubiquity.",
//   takes: {"skin name": noun_arb_text},
//   execute: function(directObj){
//     if(!directObj.text) {
//       Utils.openUrlInBrowser("chrome://ubiquity/content/skinlist.html");
//       return;
//     }
//
//     //TODO style guide
//     //TODO: preview doesn't change
//     //TODO: changes affect web page
//
//     var newSkinName = directObj.text;
//
//     try {
//       var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
//         .getService(Components.interfaces.nsIStyleSheetService);
//
//       var oldSkinName = Application.prefs.getValue("extensions.ubiquity.skin", "default");
//       var skinFolderUrl = "chrome://ubiquity/skin/skins/";
//       var oldBrowserCss = Utils.url(skinFolderUrl + oldSkinName + "/browser.css");
//       var oldPreviewCss = Utils.url(skinFolderUrl + oldSkinName + "/preview.css");
//
//       var browserCss = Utils.url(skinFolderUrl + newSkinName + "/browser.css");
//       var previewCss = Utils.url(skinFolderUrl + newSkinName + "/preview.css");
//
//       sss.loadAndRegisterSheet(browserCss, sss.USER_SHEET);
//       sss.loadAndRegisterSheet(previewCss, sss.USER_SHEET);
//
//       try {
//         // this can fail and the rest still work
//         if(sss.sheetRegistered(oldBrowserCss, sss.USER_SHEET))
//           sss.unregisterSheet(oldBrowserCss, sss.USER_SHEET);
//         if(sss.sheetRegistered(oldPreviewCss, sss.USER_SHEET))
//           sss.unregisterSheet(oldPreviewCss, sss.USER_SHEET);
//       } catch(e) {
//         // do nothing
//       }
//
//       Application.prefs.setValue("extensions.ubiquity.skin", newSkinName);
//     } catch(e) {
//       displayMessage("Error applying skin: " + e);
//     }
//   }
// });

function startup_openUbiquityWelcomePage()
{
  const VERSION_PREF ="extensions.ubiquity.lastversion";

  // Compare the version in our preferences from our version in the
  // install.rdf.
  var ext = Application.extensions.get("ubiquity@labs.mozilla.com");
  var currVersion = Application.prefs.getValue(VERSION_PREF, "firstrun");
  if (currVersion != ext.version) {
    Application.prefs.setValue(VERSION_PREF, ext.version);
    cmd_help();
  }
}
