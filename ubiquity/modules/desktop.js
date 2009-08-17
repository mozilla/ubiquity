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

let EXPORTED_SYMBOLS = ['Desktop'];

Components.utils.import("resource://ubiquity/modules/eventhub.js");

const Cc = Components.classes;
const Ci = Components.interfaces;

var gHotkeyObserver = null;
var gCurrentHotkey = null;
var gUdi = Cc["@labs.mozilla.com/ubiquitydi;1"].
           createInstance(Ci.nsIUbiquityDesktopIntegration);

var Desktop = {
  KEYCODE_SPACE: 49,
  MODIFIER_OPTION: (1 << 11),
  registerGlobalHotkey: function registerGlobalHotkey(options) {
    if (gCurrentHotkey)
      this.uninstallHotkey();
    gUdi.registerGlobalHotkey(options.keycode, options.modifiers);
    if (!gHotkeyObserver)
      gHotkeyObserver = new HotkeyObserver(this.__eventHub);
    gCurrentHotkey = {keycode: options.keycode,
                      modifiers: options.modifiers};
  },
  unregisterGlobalHotkey: function unregisterGlobalHotkey() {
    if (!gCurrentHotkey)
      //errorToLocalize
      throw new Error("No hotkey registered.");
    gUdi.unregisterGlobalHotkey();
    gCurrentHotkey = null;
  },
  getGlobalHotkey: function getGlobalHotkey() {
    if (gCurrentHotkey)
      return {keycode: gCurrentHotkey.keycode,
              modifiers: gCurrentHotkey.modifiers};
    else
      return null;
  },
  isAppActive: function isAppActive() {
    var isActive = {};
    gUdi.isAppActive(isActive);
    return isActive.value;
  },
  __eventHub: new EventHub()
};

Desktop.__eventHub.attachMethods(Desktop);
Desktop.__proto__ = gUdi;

function HotkeyObserver(eventHub)
{
  this.eventHub = eventHub;
  this.register();
}

HotkeyObserver.prototype = {
  observe: function(subject, topic, data) {
    this.eventHub.notifyListeners("hotkey-pressed", null);
  },
  register: function() {
    var observerService = Cc["@mozilla.org/observer-service;1"].
                          getService(Ci.nsIObserverService);
    observerService.addObserver(this, "ubiquity:hotkey", false);
  },
  unregister: function() {
    var observerService = Cc["@mozilla.org/observer-service;1"].
                          getService(Ci.nsIObserverService);
    observerService.removeObserver(this, "ubiquity:hotkey");
  }
};
