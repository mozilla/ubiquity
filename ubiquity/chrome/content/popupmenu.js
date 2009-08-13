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
 *   Abimanyu Raja <abimanyuraja@gmail.com>
 *   Blair McBride <unfocused@gmail.com>
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

function UbiquityPopupMenu(contextMenu, ubiquityMenu, ubiquitySeparator,
                           cmdSuggester) {
  var maxSuggs = 10;

  function contextPopupShowing(event) {
    var {menupopup} = ubiquityMenu;
    if (event.target !== menupopup || !selected()) return;

    var context = menupopup.context = {
      screenX: event.screenX,
      screenY: event.screenY,
      chromeWindow: window,
      focusedWindow: document.commandDispatcher.focusedWindow,
      focusedElement: document.commandDispatcher.focusedElement,
    };

    removeChildren(menupopup);
    cmdSuggester(context, function onSuggest(suggestions) {
      removeChildren(menupopup);
      var suggsToDisplay = suggestions.filter(objectOnly).slice(0, maxSuggs);
      for each (var sugg in suggsToDisplay) {
        let {_verb} = sugg, {icon} = _verb.cmd || _verb;
        let menuItem = document.createElement("menuitem");
        menuItem.setAttribute("label", sugg.displayText);
        if (icon) {
          menuItem.setAttribute("class", "menuitem-iconic");
          menuItem.setAttribute("image", icon);
        }
        menuItem.suggestion = sugg;
        menupopup.appendChild(menuItem);
      }
    });
    event.stopPropagation();
  }
  function toggleUbiquityMenu(event) {
    ubiquityMenu.hidden = ubiquitySeparator.hidden = !selected();
  }
  function openUbiquity(event) {
    if (event.target !== this) return;
    gContextMenu.menu.hidePopup();
    gUbiquity.openWindow();
  }
  function executeMenuCommand(event) {
    event.target.suggestion.execute(this.context);
  }
  function removeChildren(menupopup) {
    for (var c; c = menupopup.lastChild;) menupopup.removeChild(c);
  }
  function objectOnly(sugg) {
    if (sugg.args) {
      let arg = sugg.args.object;
      return !!(arg && (arg[0] || 0).text);
    }
    if (sugg._argSuggs)
      return !!(sugg._argSuggs.direct_object || 0).text;
    return false;
  }
  function selected() (gContextMenu.isContentSelection() ||
                       gContextMenu.onTextInput);

  ubiquityMenu.addEventListener("popupshowing", contextPopupShowing, false);
  ubiquityMenu.addEventListener("command", executeMenuCommand, false);
  contextMenu.addEventListener("popupshowing", toggleUbiquityMenu, false);
  ubiquityMenu.addEventListener("click", openUbiquity, false);
}
