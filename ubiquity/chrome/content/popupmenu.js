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
    
    var context = {
      screenX: 0,
      screenY: 0,
      lastCmdResult: null
    };

    if (gContextMenu.isContentSelection() || gContextMenu.onTextInput) {
      context.focusedWindow = document.commandDispatcher.focusedWindow;
      context.focusedElement = document.commandDispatcher.focusedElement;
    }

    function callback(results){
      /* Sort the results by their scores in descending order */
      if(results && results.length)
        results.sort(byScoreDescending);
      /* Remove previously added submenus */
      for(let i=popupElement.childNodes.length - 1; i >= 0; i--) {
	popupElement.removeChild(popupElement.childNodes.item(i));
      }

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

    if (context.focusedWindow) {
      cmdSuggester(context, callback);
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

function byScoreDescending(a, b) b.score - a.score;
