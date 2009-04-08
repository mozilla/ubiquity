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

function UbiquityPopupMenu(contextMenu, popupElement, ubiquityMenu, ubiquitySeparator, cmdSuggester) {
  function contextPopupShowing(event) {
    
    if (event.target.id != popupElement.id)
      return;
      
    /* Remove previously added submenus */
    for(let i=popupElement.childNodes.length - 1; i >= 0; i--) {
      // TODO: openURL() isn't defined... Is this code ever called?
      popupElement.removeEventListener("command", openURL, true);
      // popupElement.removeEventListener("click", executeClick, true);
      popupElement.removeChild(popupElement.childNodes.item(i));
    }
    
    var context = {
      screenX: 0,
      screenY: 0,
      lastCmdResult: null
    };

    if (gContextMenu.isContentSelection() || gContextMenu.onTextInput) {
      context.focusedWindow = document.commandDispatcher.focusedWindow;
      context.focusedElement = document.commandDispatcher.focusedElement;
    }

    if (context.focusedWindow) {
      
      var results = cmdSuggester(context);
      for (var i in results) {
        var tempMenu = document.createElement("menuitem");
		tempMenu.setAttribute("label", i);
		if(results[i].icon) {
			tempMenu.setAttribute("class", "menuitem-iconic");
			tempMenu.setAttribute("image", results[i].icon);
		}
        tempMenu.addEventListener("command", results[i], true);
        event.target.appendChild(tempMenu);
      }
    }
  }
  function toggleUbiquityMenu(event){
    var isHidden = ! (gContextMenu.isContentSelection() || gContextMenu.onTextInput);
    ubiquityMenu.hidden = isHidden;
    ubiquitySeparator.hidden = isHidden;
  }
  
  contextMenu.addEventListener("popupshowing", toggleUbiquityMenu, false);
  popupElement.addEventListener("popupshowing", contextPopupShowing, false);
}
