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
 *   Abimanyu Raja <abimanyuraja@gmail.com>
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

// = PrefKeys =

var EXPORTED_SYMBOLS = ["PrefKeys"];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/localization_utils.js");

var gPrefs = Utils.prefs;
var L = LocalizationUtils.propertySelector(
  "chrome://ubiquity/locale/aboutubiquity.properties");

function PrefKeys(path, defaultKey, defaultMod) {
  var pref = "extensions.ubiquity." + (path ? path + "." : "");
  return {
    __proto__: PrefKeysProto,
    KEYCODE_PREF: pref + "keycode",
    KEYCODE_DEFAULT:
    defaultKey || (path ? "" : PrefKeys.KeyEvent.DOM_VK_SPACE),
    KEYMODIFIER_PREF: pref + "keymodifier",
    KEYMODIFIER_DEFAULT:
    defaultMod || (path ? "" : Utils.OS === "WINNT" ? "CTRL" : "ALT"),
  };
}
Utils.defineLazyProperty(PrefKeys, function KeyEvent() {
  return Utils.currentChromeWindow.KeyEvent;
});
Utils.defineLazyProperty(PrefKeys, function CODE2TEXT() {
  var {KeyEvent} = this, dic = {__proto__: null};
  for (var key in KeyEvent)
    dic[KeyEvent[key]] = key.slice(7); // strip DOM_VK_
  return dic;
});
PrefKeys.MODIFIER2TEXT = {16: "SHIFT", 17: "CTRL", 18: "ALT", 224: "META"};

var PrefKeysProto = {
  constructor: PrefKeys,

  registerUI: function PK_registerUI(textInput, notifier) {
    var pk = this;
    function prompt() {
      var {keyComboText} = pk;
      textInput.value = (
        keyComboText.length > 1
        ? keyComboText + " (" + L("ubiquity.prefkeys.clickhere") + ")"
        : "");
    }
    prompt();
    textInput.addEventListener("blur", prompt, false);
    textInput.addEventListener("focus", onInputFocus, false);
    textInput.addEventListener("keydown", haltEvent, true);
    textInput.addEventListener("keyup", function onInputKeyUp(ev) {
      haltEvent(ev);

      var {keyCode} = ev;
      if (isModifier(keyCode)) return;

      var keyModifier = (
        ev.altKey   ? "ALT"   :
        ev.ctrlKey  ? "CTRL"  :
        ev.metaKey  ? "META"  :
        ev.shiftKey ? "SHIFT" :
        "");
      if (!keyModifier) {
        notifier.textContent = L("ubiquity.prefkeys.notifybadmodifier");
        return;
      }

      gPrefs.setValue(pk.KEYCODE_PREF, keyCode);
      gPrefs.setValue(pk.KEYMODIFIER_PREF, keyModifier);
      textInput.blur();
      notifier.innerHTML =
        L("ubiquity.prefkeys.confirmchange", pk.keyComboText.bold());
    }, true);
  },

  match: function PK_match(event) {
    if (event.type !== "keydown") {
      if (this._lastKeysOk) haltEvent(event);
      return false;
    }
    this._lastKeysOk = false;

    var code = gPrefs.getValue(this.KEYCODE_PREF,
                               this.KEYCODE_DEFAULT);
    if (code !== event.keyCode) return false;

    var mod = gPrefs.getValue(this.KEYMODIFIER_PREF,
                              this.KEYMODIFIER_DEFAULT);
    // Match only if the user is holding down the modifier key set for
    // Ubiquity AND NO OTHER modifier keys.
    if (event.shiftKey !== (mod === "SHIFT") ||
        event.ctrlKey  !== (mod === "CTRL" ) ||
        event.altKey   !== (mod === "ALT"  ) ||
        event.metaKey  !== (mod === "META" )) return false;

    haltEvent(event);
    return this._lastKeysOk = true;
  },

  get keyCombo() {
    var keyCode = gPrefs.getValue(this.KEYCODE_PREF,
                                  this.KEYCODE_DEFAULT);
    return [
      gPrefs.getValue(this.KEYMODIFIER_PREF,
                      this.KEYMODIFIER_DEFAULT),
      keyCode
      ? PrefKeys.CODE2TEXT[keyCode] || "[" + keyCode + "]"
      : ""];
  },

  get keyComboText() this.keyCombo.join("+"),
}

function isModifier(keyCode) keyCode in PrefKeys.MODIFIER2TEXT;

function onInputFocus() {
  this.value = L("ubiquity.prefkeys.pressyourcombo");
}

function haltEvent(event) {
  event.preventDefault();
  event.stopPropagation();
}
