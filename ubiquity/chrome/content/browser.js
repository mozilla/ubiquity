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

function ubiquitySetup()
{

  var jsm = {};
  Components.utils.import("resource://ubiquity/modules/setup.js",
                          jsm);
  Components.utils.import("resource://ubiquity/modules/parser/parser.js",
                          jsm);
  Components.utils.import("resource://ubiquity/modules/cmdmanager.js",
                          jsm);
  var services = jsm.UbiquitySetup.createServices();
  jsm.UbiquitySetup.setupWindow(window);

  var NLParser = jsm.NLParserMaker(jsm.UbiquitySetup.parserVersion);
  var nlParser = NLParser.makeParserForLanguage(
    jsm.UbiquitySetup.languageCode,
    [],
    []
  );

  var suggsNode = document.getElementById("ubiquity-suggest-container");
  var previewNode = document.getElementById("ubiquity-preview-container");
  var helpNode = document.getElementById("ubiquity-help");

  var cmdMan = new jsm.CommandManager(services.commandSource,
                                      services.messageService,
                                      nlParser,
                                      suggsNode,
                                      previewNode,
                                      helpNode);

  var suggsIframe = document.getElementById("ubiquity-suggest");

  suggsIframe.contentDocument.addEventListener(
    "DOMSubtreeModified",
    function resizeSuggs() {
      suggsIframe.height = this.height;
    },
    false);

  var popupMenu = UbiquityPopupMenu(
    document.getElementById("contentAreaContextMenu"),
    document.getElementById("ubiquity-menupopup"),
    document.getElementById("ubiquity-menu"),
    document.getElementById("ubiquity-separator"),
    cmdMan.makeCommandSuggester()
  );

  var panel = document.getElementById("ubiquity-transparent-panel");

  gUbiquity = new Ubiquity(
    panel,
    document.getElementById("ubiquity-entry"),
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
    panel.style.backgroundColor = "#444";

  function ubiquityTeardown() {
    window.removeEventListener("unload", ubiquityTeardown, false);
    cmdMan.finalize();
  }

  window.addEventListener("unload", ubiquityTeardown, false);

  const MAIN_LOAD_PREF = "extensions.ubiquity.enableMainLoadHandlers";
  if (Application.prefs.getValue(MAIN_LOAD_PREF, true))
    services.commandSource.onUbiquityLoad(window);
}

function ubiquityKeydown(aEvent)
{
  const KEYCODE_PREF ="extensions.ubiquity.keycode";
  const KEYMODIFIER_PREF = "extensions.ubiquity.keymodifier";
  var UBIQUITY_KEYMODIFIER = null;
  var UBIQUITY_KEYCODE = null;

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
  //Toggle Ubiquity if the key pressed matches the shortcut key
  if (aEvent.keyCode == UBIQUITY_KEYCODE &&
      ubiquityEventMatchesModifier(aEvent, UBIQUITY_KEYMODIFIER)) {
    gUbiquity.toggleWindow();
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
  function onload() {
    window.removeEventListener("load", onload, false);
    var jsm = {};
    Components.utils.import("resource://ubiquity/modules/setup.js",
                            jsm);
    jsm.UbiquitySetup.preload(ubiquitySetup);
    window.addEventListener("keydown", ubiquityKeydown, true);
  },
  false
);
