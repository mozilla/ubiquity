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

var EXPORTED_SYMBOLS = ['QuickLaunch'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/desktop.js");

var windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"].
                     getService(Ci.nsIWindowMediator);

var gInstalled = false;

var QuickLaunch = {
  installHotkeyListener: function installHotkeyListener() {
    if (!gInstalled) {
      Desktop.addListener("hotkey-pressed", onHotkeyPressed);
      gInstalled = true;
    }
  },
  onWindowReady: function onWindowReady(window) {
    Utils.setTimeout(
      function() { Desktop.clickAt(window.screenX, window.screenY); },
      100
    );
  },
  onWindowClose: function onWindowClose(window) {
    Desktop.switchToLastApp();
    Utils.setTimeout(
      function() { window.close(); },
      300
    );
  }
};

function showDesktopWindow() {
  // TODO: Where do we get window from if there's no
  // browser window available?
  var win = windowMediator.getMostRecentWindow("navigator:browser");
  if (win)
    win.open("chrome://ubiquity/content/desktop-window.xul",
             "ubiquity-desktop-window",
             "chrome,titlebar=no,close=no,width=800,height=480");
  else
    Components.utils.reportError("No browser window!");
}

function onHotkeyPressed() {
  if (!Desktop.isAppActive()) {
    showDesktopWindow();
  } else {
    var win = windowMediator.getMostRecentWindow("navigator:browser");
    if (win) {
      // TODO: This duplicates logic from browser.js.
      var anchor = win.document.getElementById("content");
      anchor = anchor.selectedBrowser;
      win.gUbiquity.openWindow(anchor);
    } else
      showDesktopWindow();
  }
}
