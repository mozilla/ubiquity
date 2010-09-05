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

addEventListener("load", function ubiquityBoot() {
  removeEventListener("load", ubiquityBoot, false);

  var jsm = {};
  Cu.import("resource://ubiquity/modules/utils.js", jsm);
  Cu.import("resource://ubiquity/modules/setup.js", jsm);
  Cu.import("resource://ubiquity/modules/cmdmanager.js", jsm);
  Cu.import("resource://ubiquity/modules/msgservice.js", jsm);
  Cu.import("resource://ubiquity/modules/prefkeys.js", jsm);

  const {Utils, UbiquitySetup, PrefKeys} = jsm;
  const {prefs} = Utils;

  function ubiquitySetup() {
    var services = UbiquitySetup.createServices();

    UbiquitySetup.setupWindow(window);

    var cmdMan = new jsm.CommandManager(
      services.commandSource,
      services.messageService,
      null,
      document.getElementById("ubiquity-suggest-container"),
      document.getElementById("ubiquity-preview-container"),
      document.getElementById("ubiquity-help"));

    var panel = document.getElementById("ubiquity-transparent-panel");

    cmdMan.refresh();
    addEventListener("command", function refreshUbiquityOnReload(evt) {
      if (evt.target.id === "Browser:Reload") cmdMan.refresh();
    }, false);
    Utils.listenOnce(window, "unload", function ubiquityTeardown() {
      cmdMan.finalize();
    });

    var suggFrame = document.getElementById("ubiquity-suggest");
    suggFrame.contentDocument.addEventListener(
      "DOMSubtreeModified",
      function resizeSuggs() {
        clearTimeout(resizeSuggs.tid);
        resizeSuggs.tid = setTimeout(resizeSuggsDelayed, 99, this);
      },
      false);
    function resizeSuggsDelayed(doc) {
      suggFrame.height = (doc.body || doc.documentElement).clientHeight;
    }

    // Hack to get the default skin to work on Linux, which we don't
    // support per-pixel alpha transparency on.
    if (Utils.OS === "Linux") panel.style.backgroundColor = "#444";

    gUbiquity = new Ubiquity(panel,
                             document.getElementById("ubiquity-entry"),
                             cmdMan);

    UbiquityPopupMenu(
      document.getElementById("contentAreaContextMenu"),
      document.getElementById("ubiquity-menu"),
      document.getElementById("ubiquity-separator"),
      cmdMan.makeCommandSuggester());

    if (prefs.getValue("extensions.ubiquity.enableUbiquityLoadHandlers", true))
      services.commandSource.onUbiquityLoad(window);
  }

  var toggleKeys = new PrefKeys;
  var repeatKeys = new PrefKeys("repeat");
  function ubiquityKey(event) {
    if (toggleKeys.match(event)) return gUbiquity.toggleWindow();
    if (repeatKeys.match(event)) return gUbiquity.execute("");
  }

  UbiquitySetup.preload(function ubiquitySetupWrapper() {
    try { ubiquitySetup() } catch (e) {
      Utils.reportError(e);
      Utils.reportInfo(
        "Setup: " + e + "\n" + jsm.ExceptionUtils.stackTrace(e));
      new jsm.AlertMessageService().displayMessage({
        text: "Setup failed. See Error Console for details.",
        onfinished: window.toErrorConsole || window.toJavaScriptConsole,
      });
    }
    if (!gUbiquity) return;
    addEventListener("keydown",  ubiquityKey, true);
    addEventListener("keypress", ubiquityKey, true);
  });
}, false);
