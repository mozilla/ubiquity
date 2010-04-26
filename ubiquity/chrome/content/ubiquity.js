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

// = Ubiquity =

// == Ubiquity(panel, textBox, cmdManager) ==
// Creates a Ubiquity interface and binds it to the given panel and text box.
// * {{{panel}}} should be a <xul:panel/>.
// * {{{textBox}}} should be a <input type="text"/>.
// * {{{cmdManager}}} is a {{{CommandManager}}} instance.

function Ubiquity(panel, textBox, cmdManager) {
  Cu.import("resource://ubiquity/modules/utils.js", this);
  Cu.import("resource://ubiquity/modules/cmdhistory.js", this);

  this.__panel = panel;
  this.__textBox = textBox;
  this.__cmdManager = cmdManager;
  this.__needsToExecute = false;
  this.__lastValue = "";
  this.__previewTimerID = -1;
  this.__lastKeyEvent = {};
  this.__prefs = this.Utils.prefs;

  window.addEventListener("mousemove", this, false);

  textBox.addEventListener("keydown", this, false);
  textBox.addEventListener("keypress", this, false);
  textBox.addEventListener("keyup", this, false);
  textBox.addEventListener("focus", this, false);
  textBox.addEventListener("blur", this, false);
  textBox.addEventListener("DOMMouseScroll", this, false);

  panel.addEventListener("popupshowing", this, false);
  panel.addEventListener("popupshown", this, false);
  panel.addEventListener("popuphidden", this, false);
  panel.addEventListener("click", this, false);

  var self = this;
  self.__onSuggestionsUpdated = function U__onSuggestionsUpdated() {
    cmdManager.onSuggestionsUpdated(textBox.value, self.__makeContext());
  };
}

Ubiquity.prototype = {
  constructor: Ubiquity,
  toString: function U_toString() "[object Ubiquity]",

  __KEYCODE_EXECUTE : KeyEvent.DOM_VK_RETURN,
  __KEYCODE_COMPLETE: KeyEvent.DOM_VK_TAB,

  __KEYMAP_MOVE_INDICATION: {
    38: "moveIndicationUp",
    40: "moveIndicationDown",
  },
  __KEYMAP_SCROLL_RATE: {
    33: -.8, // page up
    34: +.8, // page dn
  },

  handleEvent: function U_handleEvent(event) {
    if (this["__on" + event.type](event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  },

  // == Read Only Properties ==

  // === {{{ Ubiquity#panel }}} ===
  get panel() this.__panel,
  get msgPanel() this.__panel,

  // === {{{ Ubiquity#textBox }}} ===
  get textBox() this.__textBox,

  // === {{{ Ubiquity#cmdManager }}} ===
  get cmdManager() this.__cmdManager,

  // === {{{ Ubiquity#lastKeyEvent }}} ===
  // The last captured key event on the {{{textBox}}}.
  get lastKeyEvent() this.__lastKeyEvent,

  // === {{{ Ubiquity#isWindowOpen }}} ===
  get isWindowOpen()
    this.__panel.state in this.__STATES_OPEN,
  __STATES_OPEN: {open: 1, showing: 1},

  // === {{{ Ubiquity#inputDelay }}} ===
  // Delay between the user's last keyup and parsing in milliseconds.
  get inputDelay()
    this.__prefs.get("extensions.ubiquity.inputDelay"),

  // === {{{ Ubiquity#inputLimit }}} ===
  // Input length where Ubiquity starts to hesitate parsing. See #507.
  get inputLimit()
    this.__prefs.get("extensions.ubiquity.inputLimit"),

  __onmousemove: function U__onMouseMove(event) {
    this.__x = event.screenX;
    this.__y = event.screenY;
  },

  __onkeydown: function U__onKeyDown(event) {
    this.__lastKeyEvent = event;
  },
  __onkeyup: function U__onKeyup(event) {
    var {keyCode} = this.__lastKeyEvent = event;

    if (keyCode >=  KeyEvent.DOM_VK_DELETE ||
        keyCode === KeyEvent.DOM_VK_SPACE ||
        keyCode === KeyEvent.DOM_VK_BACK_SPACE ||
        keyCode === KeyEvent.DOM_VK_RETURN && !this.__needsToExecute)
      // Keys that would change input. RETURN is for IME.
      // https://developer.mozilla.org/En/DOM/Event/UIEvent/KeyEvent
      this.__processInput();
  },
  __onkeypress: function U__onKeyPress(event) {
    var {keyCode, which, ctrlKey, altKey} = event;

    if (ctrlKey && altKey && which &&
        this.__cmdManager.previewer.activateAccessKey(which)) return true;

    if (keyCode === this.__KEYCODE_EXECUTE) {
      this.__needsToExecute = true;
      this.__panel.hidePopup();
      return true;
    }

    if (altKey || event.metaKey) return;

    if (keyCode === this.__KEYCODE_COMPLETE) {
      if (ctrlKey) this.CommandHistory.complete(event.shiftKey, this);
      else {
        let {completionText} = this.__cmdManager.hilitedSuggestion || 0;
        if (completionText)
          this.__textBox.value = this.__lastValue = completionText;
      }
      return true;
    }
    var move = this.__KEYMAP_MOVE_INDICATION[keyCode];
    if (move) {
      if (ctrlKey) this.CommandHistory.go(keyCode - 39, this);
      else this.__cmdManager[move](this.__makeContext());
      return true;
    }

    if (ctrlKey) return;

    var rate = this.__KEYMAP_SCROLL_RATE[keyCode];
    if (rate) {
      let [x, y] = event.shiftKey ? [rate, 0] : [0, rate];
      this.__cmdManager.previewer.scroll(x, y);
      return true;
    }
  },

  __onfocus: function U__onFocus() {
    // prevent the tabbox from capturing our ctrl+tab
    gBrowser.mTabBox.handleCtrlTab = false;
  },
  __onblur: function U__onBlur() {
    gBrowser.mTabBox.handleCtrlTab =
      !this.__prefs.get("browser.ctrlTab.previews", false);

    this.CommandHistory.add(this.__textBox.value);
  },

  __onDOMMouseScroll: function U__onMouseScroll(event) {
    this.CommandHistory.go(event.detail > 0 ? 1 : -1, this);
  },

  __delayedProcessInput: function U__delayedProcessInput(self, context) {
    var input = self.__textBox.value;
    if (input.length > self.inputLimit ||
        input && input === self.__lastValue) return;

    self.__cmdManager.updateInput(
      self.__lastValue = input,
      context || self.__makeContext(),
      self.__onSuggestionsUpdated);
  },
  __processInput: function U__processInput(immediate, context) {
    clearTimeout(this.__previewTimerID);
    if (immediate)
      this.__delayedProcessInput(this, context);
    else
      this.__previewTimerID = setTimeout(
        this.__delayedProcessInput, this.inputDelay, this, context);
  },

  __makeContext: function U__makeContext(ensureFocus) {
    return {
      screenX: this.__x,
      screenY: this.__y,
      chromeWindow: window,
      focusedWindow : this.__focusedWindow  ||
        (ensureFocus ? document.commandDispatcher.focusedWindow  : null),
      focusedElement: this.__focusedElement ||
        (ensureFocus ? document.commandDispatcher.focusedElement : null),
    }
  },

  __onpopuphidden: function U__onHidden() {
    clearTimeout(this.__previewTimerID);
    this.__cmdManager.remember();
    if (this.__needsToExecute) {
      this.__needsToExecute = false;
      this.execute();
    }
    else this.__cmdManager.reset();

    var unfocused = this.__focusedWindow;
    if (unfocused) unfocused.focus();
    this.__focusedWindow = this.__focusedElement = null;

    this.CommandHistory.cursor = -1;
  },
  __onpopupshowing: function U__onShowing() {
    this.__cmdManager.refresh();
    this.__lastValue = "";
    this.__processInput(true);
  },
  __onpopupshown: function U__onShown() {
    var {__textBox} = this;
    __textBox.focus();
    __textBox.select();
  },

  __onclick: function U__onClick(event) {
    // left: open link / execute; middle: same but without closing panel
    var {button, target, view} = event;
    if (button === 2) return;
    if (view.location.href === "chrome://ubiquity/content/suggest.html") {
      for (let lm = target, hilited = /\bhilited\b/;; lm = lm.parentNode) {
        if (!lm || !("className" in lm)) return;
        if (hilited.test(lm.className)) break;
      }
      this.execute();
    }
    else {
      target.accessKey && setTimeout(function U_refocusTextBox(self) {
        if (self.isWindowOpen) self.__textBox.focus();
      }, 99, this);
      do var {href} = target; while (!href && (target = target.parentNode));
      if (!href ||
          ~href.lastIndexOf("javascript:", 0) ||
          ~href.lastIndexOf("resource://ubiquity/preview.html#", 0)) return;
      this.Utils.openUrlInBrowser(href);
    }
    if (button === 0) this.closeWindow();
    return true;
  },

  // == Public Methods ==

  // === {{{ Ubiquity#execute(input) }}} ===
  // Executes {{{input}}} or the highlighted suggestion.
  // If {{{input}}} is provided but empty, the current entry is used instead.

  execute: function U_execute(input) {
    var cmdMan = this.__cmdManager;
    var external = input != null;
    if (external) {
      if (input) this.__textBox.value = input;
      this.__lastValue = "";
      cmdMan.hilitedIndex = 0;
    }
    var context = this.__makeContext(external);
    if (cmdMan.hilitedIndex < 1) this.__processInput(true, context);
    cmdMan.execute(context);
  },

  // === {{{ Ubiquity#preview(input, immediate) }}} ===
  // Previews {{{input}}} or the highlighted suggestion,
  // skipping the input delay if {{{immediate}}} evaluates to {{{true}}}
  // and opening Ubiquity if it's closed.

  preview: function U_preview(input, immediate) {
    if (input != null) this.__textBox.value = input;
    if (this.isWindowOpen)
      this.__processInput(immediate);
    else
      this.openWindow();
  },

  // === {{{ Ubiquity#openWindow() }}} ===

  openWindow: function U_openWindow() {
    ({focusedWindow : this.__focusedWindow,
      focusedElement: this.__focusedElement}) = document.commandDispatcher;
    var xy = this.__prefs.get("extensions.ubiquity.openAt", "");
    if (xy) {
      let [x, y] = xy.split(",");
      this.__panel.openPopupAtScreen(x, y);
    }
    else {
      // This is a temporary workaround for #43.
      var anchor = document.getElementById("content").selectedBrowser;
      this.__panel.openPopup(anchor, "overlap", 0, 0, false, true);
    }
  },

  // === {{{ Ubiquity#closeWindow() }}} ===

  closeWindow: function U_closeWindow() {
    this.__panel.hidePopup();
  },

  // === {{{ Ubiquity#toggleWindow() }}} ===

  toggleWindow: function U_toggleWindow() {
    if (this.isWindowOpen)
      this.closeWindow();
    else
      this.openWindow();
  },
};
