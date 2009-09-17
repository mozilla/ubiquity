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

var gUbiquity = null;

window.addEventListener("load", function onload() {
  window.removeEventListener("load", onload, false);

  const Cu = Components.utils;
  const {prefs} = Application;

  var jsm = {};
  Cu.import("resource://ubiquity/modules/utils.js", jsm);
  Cu.import("resource://ubiquity/modules/setup.js", jsm);
  Cu.import("resource://ubiquity/modules/cmdmanager.js", jsm);
  Cu.import("resource://ubiquity/modules/msgservice.js", jsm);

  function ubiquitySetup() {
    var services = jsm.UbiquitySetup.createServices();

    jsm.UbiquitySetup.setupWindow(window);

    var cmdMan = new jsm.CommandManager(
      services.commandSource,
      services.messageService,
      null,
      document.getElementById("ubiquity-suggest-container"),
      document.getElementById("ubiquity-preview-container"),
      document.getElementById("ubiquity-help"));

    var panel = document.getElementById("ubiquity-transparent-panel");

    gUbiquity = new Ubiquity(panel,
                             document.getElementById("ubiquity-entry"),
                             cmdMan);

    window.addEventListener("command", function refreshUbiquityOnReload(evt) {
      if (evt.target.id === "Browser:Reload")
        cmdMan.refresh();
    }, false);

    window.addEventListener("unload", function ubiquityTeardown() {
      window.removeEventListener("unload", ubiquityTeardown, false);
      cmdMan.finalize();
    }, false);

    var suggFrame = document.getElementById("ubiquity-suggest");
    suggFrame.contentDocument.addEventListener(
      "DOMSubtreeModified",
      function resizeSuggs() {
        suggFrame.height = this.height;
      },
      false);

    // Hack to get the default skin to work on Linux, which we don't
    // support per-pixel alpha transparency on.
    if (jsm.Utils.OS === "Linux") panel.style.backgroundColor = "#444";

    UbiquityPopupMenu(
      document.getElementById("contentAreaContextMenu"),
      document.getElementById("ubiquity-menu"),
      document.getElementById("ubiquity-separator"),
      cmdMan.makeCommandSuggester());

    if (prefs.getValue("extensions.ubiquity.enableUbiquityLoadHandlers", true))
      services.commandSource.onUbiquityLoad(window);
  }

  function ubiquityKey(aEvent) {
    var keyCode = prefs.getValue("extensions.ubiquity.keycode",
                                 KeyEvent.DOM_VK_SPACE);
    // Toggle Ubiquity if the key pressed matches the shortcut key
    if (aEvent.keyCode === keyCode && ubiquityEventMatchesModifier(aEvent)) {
      gUbiquity.toggleWindow();
      aEvent.preventDefault();
      aEvent.stopPropagation();
    }
  }

  const DEFAULT_KEY_MODIFIER = jsm.Utils.OS === "WINNT" ? "CTRL" : "ALT";
  function ubiquityEventMatchesModifier(aEvent) {
    var keyModifier = prefs.getValue("extensions.ubiquity.keymodifier",
                                     DEFAULT_KEY_MODIFIER);
    // Match only if the user is holding down the modifier key set for
    // Ubiquity AND NO OTHER modifier keys.
    return (aEvent.shiftKey === (keyModifier === "SHIFT") &&
            aEvent.ctrlKey  === (keyModifier === "CTRL" ) &&
            aEvent.altKey   === (keyModifier === "ALT"  ) &&
            aEvent.metaKey  === (keyModifier === "META" ));
  }

  jsm.UbiquitySetup.preload(function ubiquitySetupWrapper() {
    try { ubiquitySetup() } catch (e) {
      //errorToLocalize
      var msg = "Setup: " + e + "\n" + jsm.ExceptionUtils.stackTrace(e);
      Cu.reportError("Ubiquity " + msg);
      // in case it doesn't show up in the error console
      jsm.Utils.reportInfo(msg);
      //errorToLocalize
      new jsm.AlertMessageService().displayMessage("Setup failed.");
    }
    if (gUbiquity) window.addEventListener("keydown", ubiquityKey, true);
  });
}, false);
