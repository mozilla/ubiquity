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

  const Cu = Components.utils;
  Cu.import("resource://ubiquity/modules/utils.js", this);
  Cu.import("resource://ubiquity/modules/contextutils.js", this);

  window.addEventListener("mousemove", this, false);

  textBox.addEventListener("keydown", this, true);
  textBox.addEventListener("keyup", this, true);
  textBox.addEventListener("keypress", this, true);
  if (this.Utils.OS === "WINNT")
    textBox.addEventListener("blur", this, false);

  msgPanel.addEventListener("popupshown", this, false);
  msgPanel.addEventListener("popuphidden", this, false);
  msgPanel.addEventListener("click", this, true);
}

Ubiquity.prototype = {
  __DEFAULT_INPUT_DELAY: 50,
  __MIN_CMD_PREVIEW_LENGTH: 0,

  __KEYCODE_ENTER: KeyEvent.DOM_VK_RETURN,
  __KEYCODE_TAB  : KeyEvent.DOM_VK_TAB,

  __KEYMAP_MOVE_INDICATION: {
    38: "moveIndicationUp",
    40: "moveIndicationDown",
  },
  __KEYMAP_SCROLL_RATE: {
    33: -.8, // page up
    34: +.8, // page dn
  },

  handleEvent: function U_handleEvent(event) {
    this["__on" + event.type](event);
  },

  get textBox() this.__textBox,
  get msgPanel() this.__msgPanel,
  get cmdManager() this.__cmdManager,
  get lastKeyEvent() this.__lastKeyEvent,
  get isWindowOpen() this.__msgPanel.state === "open",
  get inputDelay() Application.prefs.getValue("extensions.ubiquity.inputDelay",
                                              this.__DEFAULT_INPUT_DELAY),

  __onblur: function U__onBlur() {
    // Hackish fix for #330.
    this.Utils.setTimeout(function refocusTextbox(self) {
      if (self.isWindowOpen) self.__textBox.focus();
    }, 100, this);
  },

  __onmousemove: function U__onMouseMove(event) {
    this.__x = event.screenX;
    this.__y = event.screenY;
  },

  __onkeydown: function U__onKeyDown(event) {
    var {keyCode} = this.__lastKeyEvent = event;

    var move = this.__KEYMAP_MOVE_INDICATION[keyCode];
    if (move) {
      this.__cmdManager[move](this.__makeContext());
      event.preventDefault();
    }
    else if (keyCode === this.__KEYCODE_TAB) {
      var suggestionText =
        this.__cmdManager.getHilitedSuggestionText(this.__makeContext());
      if (suggestionText)
        this.__textBox.value = suggestionText;
      event.preventDefault();
    }
  },

  __onkeyup: function U__onKeyup(event) {
    var {keyCode} = this.__lastKeyEvent = event;

    if (event.ctrlKey && event.altKey &&
        KeyEvent.DOM_VK_0 <= keyCode && keyCode <= KeyEvent.DOM_VK_Z) {
      this.__cmdManager.previewBrowser.activateAccessKey(keyCode);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (keyCode >= KeyEvent.DOM_VK_DELETE ||
        keyCode === KeyEvent.DOM_VK_SPACE ||
        keyCode === KeyEvent.DOM_VK_BACK_SPACE ||
        keyCode === KeyEvent.DOM_VK_RETURN && !this.__needsToExecute)
      // Keys that would change input. RETURN is for IME.
      // https://developer.mozilla.org/En/DOM/Event/UIEvent/KeyEvent
      this.__processInput();
  },

  __onkeypress: function U__onKeyPress(event) {
    var {keyCode} = event;
    if (keyCode === this.__KEYCODE_ENTER) {
      this.__processInput(true);
      this.__needsToExecute = this.__cmdManager.hasSuggestions();
      this.__msgPanel.hidePopup();
      return;
    }
    var rate = this.__KEYMAP_SCROLL_RATE[keyCode];
    if (rate) {
      let [x, y] = event.shiftKey ? [rate, 0] : [0, rate];
      this.__cmdManager.previewBrowser.scroll(x, y);
      return;
    }
  },

  __onSuggestionsUpdated: function U__onSuggestionsUpdated() {
    var input = this.__textBox.value;
    this.__cmdManager.onSuggestionsUpdated(input, this.__makeContext());
  },

  __delayedProcessInput: function U__delayedProcessInput() {
    var input = this.__textBox.value;
    if (input.length < this.__MIN_CMD_PREVIEW_LENGTH) return;

    var context = this.__makeContext();
    if (input !== this.__lastValue ||
        !input && this.ContextUtils.getSelection(context)) {
      var self = this;
      this.__cmdManager.updateInput(
        this.__lastValue = input,
        context,
        function U___onSU() { self.__onSuggestionsUpdated(); });
    }
  },

  __processInput: function U__processInput(forcing) {
    this.Utils.clearTimeout(this.__previewTimerID);
    if (forcing)
      this.__delayedProcessInput();
    else
      this.__previewTimerID = this.Utils.setTimeout(
        function U___delayedPI(self) { self.__delayedProcessInput(); },
        this.inputDelay,
        this);
  },

  __makeContext: function U__makeContext() {
    return {
      screenX: this.__x,
      screenY: this.__y,
      chromeWindow: window,
      focusedWindow : this.__focusedWindow,
      focusedElement: this.__focusedElement,
    };
  },

  __onpopuphidden: function U__onHidden() {
    if (this.__needsToExecute) {
      this.__needsToExecute = false;
      this.execute();
    }
    var unfocused = this.__focusedElement || this.__focusedWindow;
    if (unfocused) unfocused.focus(); // focus() === unblair()

    this.__focusedWindow = this.__focusedElement = null;
    this.__cmdManager.reset();
  },

  __onpopupshown: function U__onShown() {
    this.__lastValue = "";
    this.__textBox.focus();
    this.__textBox.select();
    this.__cmdManager.refresh();
    this.__processInput();
  },

  __onclick: function U__onClick(event) {
    // middle: open link, right: close panel, left: both
    var {button, target} = event;
    if (button !== 2) {
      do var {href} = target;
      while (!href && (target = target.parentNode));
      if (!href || /^(?=javascript:|#)/.test(href)) return;
      if (/^\w+:/.test(href)) this.Utils.openUrlInBrowser(href);
    }
    if (button !== 1) this.closeWindow();
    event.preventDefault();
  },

  setLocalizedDefaults: function U_setLocalizedDefaults(langCode) {
  },

  execute: function U_execute(input) {
    if (input) {
      this.__textBox.value = input;
      this.__processInput(true);
    }
    this.__cmdManager.execute(this.__makeContext());
  },

  preview: function U_preview(input) {
    if (input) this.__textBox.value = input;
    if (this.isWindowOpen)
      this.__processInput(true);
    else
      this.openWindow();
  },

  openWindow: function U_openWindow() {
    ({focusedWindow : this.__focusedWindow,
      focusedElement: this.__focusedElement}) = document.commandDispatcher;
    // This is a temporary workaround for #43.
    var anchor = document.getElementById("content").selectedBrowser;
    this.__msgPanel.openPopup(anchor, "overlap", 0, 0, false, true);
  },

  closeWindow: function U_closeWindow() {
    this.__msgPanel.hidePopup();
  },

  toggleWindow: function U_toggleWindow() {
    if (/^open$|^(?:hid|show)ing$/.test(this.__msgPanel.state))
      this.closeWindow();
    else
      this.openWindow();
  },
};
