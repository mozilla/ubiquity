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
 *   Michael Kaply <mozilla@kaply.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Maria Emerson <memerson@mozilla.com>
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

// Creates a Ubiquity interface and binds it to the given message
// panel, text box, and--optionally--preview block element.
//
// The message panel should be a xul:panel instance, and the text box
// should be a xul:textbox instance. The preview block, if supplied,
// should be a HTML block element (e.g., a DIV).

function Ubiquity(msgPanel, textBox, cmdManager, previewBlock) {
  this.__msgPanel = msgPanel;
  this.__textBox = textBox;
  this.__cmdManager = cmdManager;
  this.__previewBlock = previewBlock;
  this.__needsToExecute = false;
  this.__showCount = 0;
  this.__lastValue = null;

  var self = this;

  msgPanel.addEventListener( "popupshown",
                             function() { self.__onShown(); },
                             false );
  msgPanel.addEventListener( "popuphidden",
                             function() { self.__onHidden(); },
                             false );
  window.addEventListener("mousemove",
                          function(event) { self.__onMouseMove(event); },
                          false);
  textBox.addEventListener("keydown",
                           function(event) { self.__onKeydown(event); },
                           true);
  textBox.addEventListener("keyup",
                           function(event) { self.__onInput(event); },
                           true);

  Observers.add(function() {self.__onSuggestionsUpdated();},
		"ubiq-suggestions-updated");
  this.__resetPreview();
}

Ubiquity.prototype = {
  __DEFAULT_PREVIEW_LOCATION: "chrome://ubiquity/content/preview.html",
  __KEYCODE_ENTER: 13,
  __KEYCODE_UP: 38,
  __KEYCODE_DOWN: 40,
  __KEYCODE_TAB:  9,
  __MIN_CMD_PREVIEW_LENGTH: 0,
  __DEFAULT_PREVIEW: ("<div class=\"help\">" + "Type the name of a command and press enter to " +
                      "execute it, or <b>help</b> for assistance." + "</div>"),

  __onMouseMove: function(event) {
    this.__x = event.screenX;
    this.__y = event.screenY;
  },

  __onKeydown: function(event) {
    if (event.keyCode == this.__KEYCODE_UP) {
      event.preventDefault();
      this.__cmdManager.moveIndicationUp(this.__makeContext(),
                                         this.__previewBlock);
    } else if (event.keyCode == this.__KEYCODE_DOWN) {
      event.preventDefault();
      this.__cmdManager.moveIndicationDown(this.__makeContext(),
                                           this.__previewBlock);
    } else if (event.keyCode == this.__KEYCODE_TAB) {
       event.preventDefault();
       this.__cmdManager.copySuggestionToInput(this.__makeContext(),
                                               this.__previewBlock,
                                               this.__textBox);
    }
  },

  __onInput: function(event) {
    if (this.__showCount == 0)
      return;

    var keyCode = event.keyCode;

    if (keyCode == this.__KEYCODE_ENTER) {
      if (this.__cmdManager.hasSuggestions()) {
	      this.__needsToExecute = true;
      }
      this.__msgPanel.hidePopup();
    } else if (keyCode == this.__KEYCODE_UP ||
               keyCode == this.__KEYCODE_DOWN ||
               keyCode == this.__KEYCODE_TAB) {
    } else
      this.__updatePreview();
  },

  __onSuggestionsUpdated: function() {
    var input = this.__textBox.value;
    this.__cmdManager.onSuggestionsUpdated(input,
					   this.__makeContext(),
					   this.__previewBlock);
  },

  __updatePreview: function() {
    if (this.__previewBlock) {
      var input = this.__textBox.value;
      if (input != this.__lastValue) {

        this.__lastValue = input;
        var wasPreviewShown = false;

        if (input.length >= this.__MIN_CMD_PREVIEW_LENGTH)
          wasPreviewShown = this.__cmdManager.updateInput(
            input,
            this.__makeContext(),
            this.__previewBlock
          );
        if (!wasPreviewShown) {
	  this.__resetPreview();
	}
      }
    }
  },

  __resetPreview: function() {
    if (this.__previewBlock) {
        this.__previewBlock.innerHTML = this.__DEFAULT_PREVIEW;
    }
  },

  __makeContext: function() {
    var context = {focusedWindow : this.__focusedWindow,
                   focusedElement : this.__focusedElement,
                   screenX : this.__x,
                   screenY : this.__y,
		   lastCmdResult: null };
    return context;
  },

  __onHidden: function() {
    this.__showCount -= 1;

    if (this.__showCount > 0)
      return;

    var context = this.__makeContext();

    if (this.__focusedElement)
      this.__focusedElement.focus();
    else
      if (this.__focusedWindow)
        this.__focusedWindow.focus();

    this.__focusedWindow = null;
    this.__focusedElement = null;

    if (this.__needsToExecute) {
      this.__cmdManager.execute(context);
      this.__needsToExecute = false;
    }
  },

  __onShown: function() {
    if (this.__showCount == 0) {
      this.__lastValue = null;
      this.__textBox.focus();
      this.__textBox.select();
      this.__cmdManager.refresh();
      this.__updatePreview();
    }
    this.__showCount += 1;
  },

  setLocalizedDefaults: function( langCode ) {
    if (langCode == "jp") {
      this.__DEFAULT_PREVIEW = jpGetDefaultPreview();
      this.__KEYCODE_ENTER = 39;
    }
  },

  openWindow: function(anchor) {
    this.__focusedWindow = document.commandDispatcher.focusedWindow;
    this.__focusedElement = document.commandDispatcher.focusedElement;
    this.__resetPreview();

    this.__msgPanel.hidden = false;
    this.__msgPanel.openPopup(anchor, "", 0, 0, false, true);
  },

  closeWindow: function(){
    this.__msgPanel.hidePopup();
  }
};
