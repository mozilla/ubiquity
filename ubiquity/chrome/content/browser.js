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
 *   Maria Emerson <memerson@mozilla.com>
 *   Aza Raskin <aza@mozilla.com>
 *   Abimanyu Raja <abimanyuraja@gmail.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Dietrich Ayala <dietrich@mozilla.com>
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

var gUbiquity = null;

Components.utils.import("resource://ubiquity/modules/utils.js");

function ubiquitySetup()
{

  var jsm = {};
  Components.utils.import("resource://ubiquity/modules/setup.js",
                          jsm);
  Components.utils.import("resource://ubiquity/modules/parser/parser.js",
                          jsm);
  Components.utils.import("resource://ubiquity/modules/parser/locale_en.js",
                          jsm);
  Components.utils.import("resource://ubiquity/modules/parser/locale_jp.js",
                          jsm);
  Components.utils.import("resource://ubiquity/modules/cmdmanager.js",
                          jsm);
  Components.utils.import("resource://ubiquity/modules/skinsvc.js",
                          jsm);
  var services = jsm.UbiquitySetup.createServices();
  jsm.UbiquitySetup.setupWindow(window);

  var nlParser = jsm.NLParser.makeParserForLanguage(
    jsm.UbiquitySetup.languageCode,
    [],
    []
  );

  var previewIframe = document.getElementById("cmd-preview");
  var previewBlock = previewIframe.contentDocument
                     .getElementById("ubiquity-preview");

  var cmdMan = new jsm.CommandManager(services.commandSource,
                                      services.messageService,
                                      nlParser,
                                      previewBlock);

  //Install skin detector
  var skinService = new jsm.SkinSvc(window);
  skinService.installToWindow();
  skinService.updateAllSkins();

  //Load current skin
  var skinUrl = skinService.getCurrentSkin();
  var defaultSkinUrl = skinService.DEFAULT_SKIN;

  //For backwards compatibility since in 0.1.2
  //The pref was "default" or "old"
  //Now, we are storing the complete file path in the pref.
  if(skinUrl == "default" || skinUrl == "old"){
    skinUrl = defaultSkinUrl;
    skinService.setCurrentSkin(skinUrl);
  }
  try{
    skinService.loadSkin(skinUrl);
  }catch(e){
    //If there's any error loading the current skin,
    //load the default and tell the user about the failure
    skinService.loadSkin(defaultSkinUrl);
    services.messageService
            .displayMessage("Loading your current skin failed." +
                            "The default skin will be loaded.");
  }

  function resizePreview() {
    previewIframe.height = previewIframe.contentDocument.height;
    previewIframe.width = previewBlock.scrollWidth;
  }

  previewIframe.contentDocument.addEventListener(
    "DOMSubtreeModified",
    function() { resizePreview(); },
    false
  );

  previewIframe.contentDocument.addEventListener(
    "load",
    function(aEvt) {
      if (aEvt.originalTarget.nodeName == "IMG")
        resizePreview();
    },
    true
  );

  var popupMenu = UbiquityPopupMenu(
    document.getElementById("contentAreaContextMenu"),
    document.getElementById("ubiquity-menupopup"),
    document.getElementById("ubiquity-menu"),
    document.getElementById("ubiquity-separator"),
    cmdMan.makeCommandSuggester()
  );

  gUbiquity = new Ubiquity(
    document.getElementById("transparent-msg-panel"),
    document.getElementById("cmd-entry"),
    cmdMan
  );
  gUbiquity.setLocalizedDefaults(jsm.UbiquitySetup.languageCode);

  function refreshUbiquityOnReload(evt) {
    if (evt.target.id == "Browser:Reload")
      cmdMan.refresh();
  }

  window.addEventListener("command", refreshUbiquityOnReload, false);

  // Hack to get the default skin to work on Linux, which we don't
  // support per-pixel alpha transparency on.
  var xulr = Components.classes["@mozilla.org/xre/app-info;1"]
                     .getService(Components.interfaces.nsIXULRuntime);
  if (xulr.OS == "Linux")
    document.getElementById("transparent-msg-panel")
            .style.backgroundColor = "#444";
}

function ubiquityTeardown()
{
  /* TODO: Remove event listeners. */
}

function ubiquityKeydown(aEvent)
{
  const KEYCODE_PREF ="extensions.ubiquity.keycode";
  const KEYMODIFIER_PREF = "extensions.ubiquity.keymodifier";
  var UBIQUITY_KEYMODIFIER = null;
  var UBIQUITY_KEYCODE = null;

  // This is a temporary workaround for #43.
  var anchor = window.document.getElementById("content");

  //Default keys are different for diff platforms
  // Windows Vista, XP, 2000 & NT: CTRL+SPACE
  // Mac, Linux, Others : ALT+SPACE
  var defaultKeyModifier = "ALT";
  var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
                             .getService(Components.interfaces.nsIXULRuntime);
  if(xulRuntime.OS == "WINNT"){
    defaultKeyModifier = "CTRL";
  }

  //The space character
  UBIQUITY_KEYCODE = Application.prefs.getValue(KEYCODE_PREF, 32);
  UBIQUITY_KEYMODIFIER = Application.prefs.getValue(KEYMODIFIER_PREF,
                                                    defaultKeyModifier);
  anchor = anchor.selectedBrowser;

  //Open Ubiquity if the key pressed matches the shortcut key
  if (aEvent.keyCode == UBIQUITY_KEYCODE &&
      ubiquityEventMatchesModifier(aEvent, UBIQUITY_KEYMODIFIER)) {
    if(gUbiquity.isWindowOpen) {
      gUbiquity.openWindow(anchor);
    } else {
      gUbiquity.closeWindow();
    }
    aEvent.preventDefault();
  }
}

function ubiquityEventMatchesModifier(aEvent, aModifier) {
  /* Match only if the user is holding down the modifier key set for
   * ubiquity AND NO OTHER modifier keys.
   **/
  return ((aEvent.shiftKey == (aModifier == 'SHIFT')) &&
          (aEvent.ctrlKey == (aModifier == 'CTRL')) &&
          (aEvent.altKey == (aModifier == 'ALT')) &&
	  (aEvent.metaKey == (aModifier == 'META')));
}

window.addEventListener(
  "load",
  function() {
    var jsm = {};
    Components.utils.import("resource://ubiquity/modules/setup.js",
                            jsm);
    jsm.UbiquitySetup.preload(ubiquitySetup);
  },
  false
);

window.addEventListener("unload", ubiquityTeardown, false);
window.addEventListener("keydown", ubiquityKeydown, true);
