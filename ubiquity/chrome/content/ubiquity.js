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
  this.__lastValue = "";
  this.__previewTimerID = -1;
  this.__lastKeyEvent = {};

  Components.utils.import("resource://ubiquity/modules/utils.js", this);

  var self = this;

  msgPanel.addEventListener("popupshown",
                            function() { self.__onShown(); },
                            false);
  msgPanel.addEventListener("popuphidden",
                            function() { self.__onHidden(); },
                            false);
  window.addEventListener("mousemove",
                          function(event) { self.__onMouseMove(event); },
                          false);
  textBox.addEventListener("keydown",
                           function(event) { self.__onKeydown(event); },
                           true);
  textBox.addEventListener("keyup",
                           function(event) { self.__onKeyup(event); },
                           true);
  textBox.addEventListener("keypress",
                           function(event) { self.__onKeyPress(event); },
                           true);

  if (this.Utils.OS === "WINNT") {
    textBox.addEventListener("blur",
                             function(event) { self.__onBlur(event); },
                             false);
  }

  // middle: open link, right: close panel, left: both
  msgPanel.addEventListener("click", function clickPanel(ev) {
    var {button, target} = ev;
    if (button !== 2) {
      do var {href} = target;
      while (!href && (target = target.parentNode));
      if (!href || /^(?:javascript:|#)/.test(href)) return;
      if (/^\w+:/.test(href)) self.Utils.openUrlInBrowser(href);
    }
    if (button !== 1) self.closeWindow();
    ev.preventDefault();
  }, true);
}

Ubiquity.prototype = {
  __PROCESS_INPUT_DELAY: 50,
  __MIN_CMD_PREVIEW_LENGTH: 0,

  __KEYCODE_ENTER: KeyEvent.DOM_VK_RETURN,
  __KEYCODE_UP   : KeyEvent.DOM_VK_UP,
  __KEYCODE_DOWN : KeyEvent.DOM_VK_DOWN,
  __KEYCODE_TAB  : KeyEvent.DOM_VK_TAB,

  get textBox() {
    return this.__textBox;
  },

  get msgPanel() {
    return this.__msgPanel;
  },

  get cmdManager() {
    return this.__cmdManager;
  },

  get lastKeyEvent() {
    return this.__lastKeyEvent;
  },

  __onBlur: function __onBlur() {
    // Hackish fix for #330.
    this.Utils.setTimeout(function refocusTextbox(self) {
      if (self.isWindowOpen) self.__textBox.focus();
    }, 100, this);
  },

  __onMouseMove: function __onMouseMove(event) {
    this.__x = event.screenX;
    this.__y = event.screenY;
  },

  __onKeydown: function __onKeyDown(event) {
    var {keyCode} = this.__lastKeyEvent = event;

    if (keyCode === this.__KEYCODE_UP) {
      event.preventDefault();
      this.__cmdManager.moveIndicationUp(this.__makeContext());
    } else if (keyCode === this.__KEYCODE_DOWN) {
      event.preventDefault();
      this.__cmdManager.moveIndicationDown(this.__makeContext());
    } else if (keyCode === this.__KEYCODE_TAB) {
      event.preventDefault();
      var suggestionText =
        this.__cmdManager.getHilitedSuggestionText(this.__makeContext());
      if (suggestionText)
        this.__textBox.value = suggestionText;
    }
  },

  __onKeyup: function __onKeyup(event) {
    var {keyCode} = this.__lastKeyEvent = event;

    if (keyCode !== this.__KEYCODE_UP &&
        keyCode !== this.__KEYCODE_DOWN &&
        keyCode !== this.__KEYCODE_TAB)
      this.__processInput();
  },

   __onKeyPress: function(event) {
     if (event.keyCode === this.__KEYCODE_ENTER) {
       this.__processInput(true);
       if (this.__cmdManager.hasSuggestions()) {
         this.__needsToExecute = true;
       }
       this.__msgPanel.hidePopup();
     } else if (event.ctrlKey && event.altKey) {
       this.__cmdManager.activateAccessKey(event.which);
       event.preventDefault();
       event.stopPropagation();
     }
   },

  __onSuggestionsUpdated: function __onSuggestionsUpdated() {
    var input = this.__textBox.value;
    this.__cmdManager.onSuggestionsUpdated(input, this.__makeContext());
  },

  __delayedProcessInput: function __delayedProcessInput() {
    var self = this;
    var input = this.__textBox.value;
    if (input !== this.__lastValue) {
      this.__lastValue = input;
      if (input.length >= this.__MIN_CMD_PREVIEW_LENGTH)
        this.__cmdManager.updateInput(
          input,
          this.__makeContext(),
          function() { self.__onSuggestionsUpdated(); });
    }
  },

  __processInput: function __processInput(forcing) {
    this.Utils.clearTimeout(this.__previewTimerID);
    if (forcing)
      this.__delayedProcessInput();
    else
      this.__previewTimerID = this.Utils.setTimeout(function(self) {
        self.__delayedProcessInput();
      }, this.__PROCESS_INPUT_DELAY, this);
  },

  __makeContext: function __makeContext() {
    return {
      screenX: this.__x,
      screenY: this.__y,
      chromeWindow: window,
      focusedWindow : this.__focusedWindow,
      focusedElement: this.__focusedElement,
    };
  },

  __onHidden: function __onHidden() {
    if (this.__needsToExecute) {
      this.__needsToExecute = false;
      this.__cmdManager.execute(this.__makeContext());
    }
    var unfocused = this.__focusedElement || this.__focusedWindow;
    if (unfocused) unfocused.focus();

    this.__focusedWindow = null;
    this.__focusedElement = null;
    this.__cmdManager.reset();
  },

  __onShown: function __onShown() {
    this.__lastValue = "";
    this.__textBox.focus();
    this.__textBox.select();
    this.__cmdManager.refresh();
    this.__processInput();
  },

  setLocalizedDefaults: function setLocalizedDefaults(langCode) {
  },

  openWindow: function openWindow() {
    this.__focusedWindow = document.commandDispatcher.focusedWindow;
    this.__focusedElement = document.commandDispatcher.focusedElement;

    // This is a temporary workaround for #43.
    var anchor = document.getElementById("content").selectedBrowser;
    this.__msgPanel.openPopup(anchor, "overlap", 0, 0, false, true);
  },

  closeWindow: function closeWindow() {
    this.__msgPanel.hidePopup();
  },

  toggleWindow: function toggleWindow() {
    switch (this.__msgPanel.state) {
      case "open":
      case "hiding":
      case "showing":
      this.closeWindow();
      return;
    }
    this.openWindow();
  },

  get isWindowOpen() {
    return this.__msgPanel.state === "open";
  }
};
