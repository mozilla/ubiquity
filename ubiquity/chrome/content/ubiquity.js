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
// panel and text box.
//
// The message panel should be a xul:panel instance, and the text box
// should be a xul:textbox instance.

function Ubiquity(msgPanel, textBox, cmdManager) {
  this.__msgPanel = msgPanel;
  this.__textBox = textBox;
  this.__cmdManager = cmdManager;
  this.__needsToExecute = false;
  this.__showCount = 0;
  this.__lastValue = null;
  this.__previewTimerID = -1;

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
  textBox.addEventListener("keypress",
                           function(event) { self.__onKeyPress(event); },
                           true);

  var xulr = Components.classes["@mozilla.org/xre/app-info;1"]
                   .getService(Components.interfaces.nsIXULRuntime);

  if(xulr.OS === "WINNT"){
     textBox.addEventListener("blur",
                           function(event) { self.__onBlur(event); },
                           false);
   }
}

Ubiquity.prototype = {
  __PROCESS_INPUT_DELAY: 50,
  __KEYCODE_ENTER: 13,
  __KEYCODE_UP: 38,
  __KEYCODE_DOWN: 40,
  __KEYCODE_TAB:  9,
  __MIN_CMD_PREVIEW_LENGTH: 0,
  __KEYCODE_1: 49,

  __onBlur: function __onBlur() {
    // Hackish fix for #330.
    var self = this;

    function refocusTextbox() {
      if (self.__showCount) {
        var isTextBoxFocused = (document.commandDispatcher.focusedElement ==
                                self.__textBox);
        if (!isTextBoxFocused)
          self.__textBox.focus();
      }
    }

    Utils.setTimeout(refocusTextbox, 100);
   },

  __onMouseMove: function __onMouseMove(event) {
    this.__x = event.screenX;
    this.__y = event.screenY;
  },

  __onKeydown: function __onKeyDown(event) {
    if (event.keyCode == this.__KEYCODE_UP) {
      event.preventDefault();
      this.__cmdManager.moveIndicationUp(this.__makeContext());
    } else if (event.keyCode == this.__KEYCODE_DOWN) {
      event.preventDefault();
      this.__cmdManager.moveIndicationDown(this.__makeContext());
    } else if (event.keyCode == this.__KEYCODE_TAB) {
      event.preventDefault();
      var suggestionText = this.__cmdManager.getHilitedSuggestionText(
        this.__makeContext()
      );
      if(suggestionText)
        this.__textBox.value = suggestionText;
    }
  },

  __onInput: function __onInput(event) {
    if (this.__showCount == 0)
      return;

    var keyCode = event.keyCode;

    if (keyCode == this.__KEYCODE_UP ||
               keyCode == this.__KEYCODE_DOWN ||
               keyCode == this.__KEYCODE_TAB) {
    } else if (keyCode >= this.__KEYCODE_1 &&
               keyCode < this.__KEYCODE_1 + 10 &&
               event.altKey && event.ctrlKey) {
      this.__cmdManager.activateAccessKey(keyCode - this.__KEYCODE_1 + 1);
    } else
      this.__processInput();
  },

   __onKeyPress: function(event) {
     var keyCode = event.keyCode;

     if (keyCode == this.__KEYCODE_ENTER) {
       this.__forceProcessInput();
       if (this.__cmdManager.hasSuggestions()) {
         this.__needsToExecute = true;
       }
       this.__msgPanel.hidePopup();
     }
   },

  __onSuggestionsUpdated: function __onSuggestionsUpdated() {
    var input = this.__textBox.value;
    this.__cmdManager.onSuggestionsUpdated(input, this.__makeContext());
  },

  __delayedProcessInput: function __delayedProcessInput() {
    this.__previewTimerID = -1;
    var self = this;

    var input = this.__textBox.value;
    if (input != this.__lastValue) {

      this.__lastValue = input;

      if (input.length >= this.__MIN_CMD_PREVIEW_LENGTH)
        this.__cmdManager.updateInput(
          input,
          this.__makeContext(),
          function() {self.__onSuggestionsUpdated();}
        );
    }
  },

  __forceProcessInput: function __forceProcessInput() {
    if (this.__previewTimerID != -1) {
      Utils.clearTimeout(this.__previewTimerID);
      this.__delayedProcessInput();
    }
  },

  __processInput: function __processInput() {
    if (this.__previewTimerID != -1)
      Utils.clearTimeout(this.__previewTimerID);

    var self = this;
    this.__previewTimerID = Utils.setTimeout(
      function() { self.__delayedProcessInput(); },
      this.__PROCESS_INPUT_DELAY
    );
  },

  __makeContext: function __makeContext() {
    var context = {focusedWindow : this.__focusedWindow,
                   focusedElement : this.__focusedElement,
                   chromeWindow : window,
                   screenX : this.__x,
                   screenY : this.__y};
    return context;
  },

  __onHidden: function __onHidden() {
    this.__showCount -= 1;

    if (this.__showCount > 0)
      return;

    this.__msgPanel.hidden = true;
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
    this.__cmdManager.reset();
  },

  __onShown: function __onShown() {
    if (this.__showCount == 0) {
      this.__lastValue = null;
      this.__textBox.focus();
      this.__textBox.select();
      this.__cmdManager.refresh();
      this.__processInput();
    }
    this.__showCount += 1;
  },

  setLocalizedDefaults: function setLocalizedDefaults( langCode ) {
    if (langCode == "jp") {
      this.__DEFAULT_PREVIEW = jpGetDefaultPreview();
      this.__KEYCODE_ENTER = 39;
    }
  },

  openWindow: function openWindow(anchor) {
    this.__focusedWindow = document.commandDispatcher.focusedWindow;
    this.__focusedElement = document.commandDispatcher.focusedElement;

    this.__msgPanel.hidden = false;
    this.__msgPanel.openPopup(anchor, "overlap", 0, 0, false, true);
  },

  closeWindow: function closeWindow(){
    this.__msgPanel.hidePopup();
  },

  get isWindowOpen() {
    return this.__msgPanel.hidden;
  }
};
