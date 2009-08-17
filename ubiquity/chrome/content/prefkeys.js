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

var PrefKeys = {
  KEYCODE_PREF : "extensions.ubiquity.keycode",
  KEYMODIFIER_PREF : "extensions.ubiquity.keymodifier",
  KEYCODE_DEFAULT: KeyEvent.DOM_VK_SPACE,
  KEYMODIFIER_DEFAULT: Utils.OS === "WINNT" ? "CTRL" : "ALT",
  CODE2TEXT: {
    9: "TAB", 13: "ENTER", 32: "SPACE",
  },

  _convertToText: function PK__convertToText(keyCode) (
    48 <= keyCode && keyCode <= 90
    ? String.fromCharCode(keyCode) :
    112 <= keyCode && keyCode <= 123
    ? "F" + keyCode % 111
    : this.CODE2TEXT[keyCode] || "[" + keyCode + "]"),

  isModifier: function PK_isModifier(keyCode)
    // Shift, Ctrl, Alt, Meta
    !!~[16, 17, 18, 224].indexOf(keyCode),

  onLoad: function PK_onLoad() {
    var [mod, key] = this.getKeyCombo();
    $("#keyInputBox").val(
      mod + "+" + key + " (" + L("ubiquity.prefkeys.clickhere") + ")");
  },

  onKeyChange: function PK_onKeyChange(aEvent) {
    aEvent.preventDefault();
    aEvent.stopPropagation();

    var {keyCode} = aEvent;
    var keyModifier = (aEvent.altKey   ? "ALT"   :
                       aEvent.ctrlKey  ? "CTRL"  :
                       aEvent.shiftKey ? "SHIFT" :
                       aEvent.metaKey  ? "META"  :
                       "");
    if (!keyModifier) {
      PrefKeys.isModifier(keyCode) ||
        $("#keyNotify").text(L("ubiquity.prefkeys.notifybadmodifier"));
      return;
    }

    // Only alphanumeric/function keys are allowed as shortcuts because
    // it does not seem to possible to get keycodes properly for
    // combinations like "shift+]". In this case, pressing "shift+]"
    // will set the keycode to be that of "}" and displaying "shift+}"
    // when the user intended "shift+]" is non-intuitive. Besides,
    // different keyboard layouts might cause problems. SPACE(32) is
    // allowed as a special case below.
    var keyText = PrefKeys._convertToText(keyCode);
    if (keyText[0] === "[") {
      $("#keyNotify").text(
        PrefKeys.isModifier(keyCode)
        ? ""
        : L("ubiquity.prefkeys.notifyalphanumeric"));
      return;
    }

    Application.prefs.setValue(this.KEYCODE_PREF, keyCode);
    Application.prefs.setValue(this.KEYMODIFIER_PREF, keyModifier);

    var comboText = keyModifier + "+" + keyText;
    $("#keyInputBox").blur().val(
      comboText + " (" + L("ubiquity.prefkeys.clickhere") + ")");
    $("#keyNotify").html(
      L("ubiquity.prefkeys.confirmchange") + " " + comboText.bold());
  },

  getKeyCombo: function PK_getKeyCombo() {
    var keyCode = Application.prefs.getValue(this.KEYCODE_PREF,
                                             this.KEYCODE_DEFAULT);
    var keyModifier = Application.prefs.getValue(this.KEYMODIFIER_PREF,
                                                 this.KEYMODIFIER_DEFAULT);
    return [keyModifier, this._convertToText(keyCode)];
  }
}
