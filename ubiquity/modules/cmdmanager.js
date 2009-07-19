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
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Maria Emerson <memerson@mozilla.com>
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

var EXPORTED_SYMBOLS = ["CommandManager"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Application = (Cc["@mozilla.org/fuel/application;1"]
                     .getService(Ci.fuelIApplication));

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/preview_browser.js");

const DEFAULT_PREVIEW_URL = "chrome://ubiquity/content/preview.html";
const MIN_MAX_SUGGS = 1;
const MAX_MAX_SUGGS = 42;

CommandManager.DEFAULT_MAX_SUGGESTIONS = 5;
CommandManager.MAX_SUGGESTIONS_PREF = "extensions.ubiquity.maxSuggestions";
CommandManager.__defineGetter__("maxSuggestions", function () {
  return Application.prefs.getValue(this.MAX_SUGGESTIONS_PREF,
                                    this.DEFAULT_MAX_SUGGESTIONS);
});
CommandManager.__defineSetter__("maxSuggestions", function (value) {
  var num = Math.max(MIN_MAX_SUGGS, Math.min(value | 0, MAX_MAX_SUGGS));
  Application.prefs.setValue(this.MAX_SUGGESTIONS_PREF, num);
});

function CommandManager(cmdSource, msgService, parser, suggsNode,
                        previewPaneNode, helpNode) {
  this.__cmdSource = cmdSource;
  this.__msgService = msgService;
  this.__hilitedSuggestion = 0;
  this.__lastInput = "";
  this.__nlParser = parser;
  this.__activeQuery = null;
  this.__domNodes = {
    suggs: suggsNode,
    suggsIframe: suggsNode.getElementsByTagName("iframe")[0],
    preview: previewPaneNode,
    help: helpNode};
  this._previewer = new PreviewBrowser(
    previewPaneNode.getElementsByTagNameNS(
      "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
      "browser")[0],
    DEFAULT_PREVIEW_URL);

  var self = this;

  function onCommandsReloaded() {
    parser.setCommandList(cmdSource.getAllCommands());
  }

  cmdSource.addListener("feeds-reloaded", onCommandsReloaded);
  onCommandsReloaded();

  this.setPreviewState("no-suggestions");

  this.finalize = function CM_finalize() {
    cmdSource.removeListener("feeds-reloaded", onCommandsReloaded);
    for (let key in this) delete this[key];
  };

  this.__domNodes.suggsIframe.addEventListener(
    "click",
    function onSuggClick(ev) {
      var cb = self.__lastAsyncSuggestionCb;
      if (!cb) return;
      var {target} = ev;
      while (!target.hasAttribute("index"))
        if (!(target = target.parentNode)) return;
      self.__hilitedSuggestion = +target.getAttribute("index");
      cb();
      ev.preventDefault();
      ev.stopPropagation();
    },
    true);
}

CommandManager.prototype = {
  setPreviewState: function CM_setPreviewState(state) {
    var nodes = this.__domNodes;
    switch (state) {
    case "computing-suggestions":
    case "with-suggestions":
      nodes.suggs.style.display = "block";
      nodes.preview.style.display = "block";
      nodes.help.style.display = "none";
      break;
    case "no-suggestions":
      nodes.suggs.style.display = "none";
      nodes.preview.style.display = "none";
      nodes.help.style.display = "block";
      if (this._previewer.isActive)
        this._previewer.queuePreview(
          null,
          0,
          function(pblock) { pblock.innerHTML = ""; }
        );
      break;
    default:
      throw new Error("Unknown state: " + state);
    }
  },

  refresh: function CM_refresh() {
    this.__cmdSource.refresh();
    this.__hilitedSuggestion = 0;
    this.__lastInput = "";
  },

  moveIndicationUp: function CM_moveIndicationUp(context) {
    var index = --this.__hilitedSuggestion;
    if (index < 0) {
      this.__hilitedSuggestion = this.__activeQuery.suggestionList.length - 1;
    }
    this._previewAndSuggest(context, true);
  },

  moveIndicationDown: function CM_moveIndicationDown(context) {
    var index = ++this.__hilitedSuggestion;
    if (index >= this.__activeQuery.suggestionList.length) {
      this.__hilitedSuggestion = 0;
    }
    this._previewAndSuggest(context, true);
  },

  _renderSuggestions: function CM__renderSuggestions() {
    var content = "";
    var {suggestionList} = this.__activeQuery;
    for (let x = 0, l = suggestionList.length; x < l; ++x) {
      let suggText = suggestionList[x].displayText;
      let suggIconUrl = suggestionList[x].icon;
      let suggIcon = "";
      if (suggIconUrl)
        suggIcon = '<img src="' + Utils.escapeHtml(suggIconUrl) + '"/>';
      suggText = '<div class="cmdicon">' + suggIcon + "</div>" + suggText;
      content += ('<div class="suggested' +
                  (x === this.__hilitedSuggestion ? " hilited" : "") +
                  '" index="' + x + '">' + suggText + "</div>");
    }
    this.__domNodes.suggsIframe.contentDocument.body.innerHTML = content;
  },

  _renderPreview: function CM__renderPreview(context) {
    var activeSugg =
      this.__activeQuery.suggestionList[this.__hilitedSuggestion];
    if (activeSugg) {
      var self = this;
      this._previewer.queuePreview(
        activeSugg.previewUrl,
        activeSugg.previewDelay,
        function queuedPreview(pblock) {
          try { activeSugg.preview(context, pblock); }
          catch (e) {
            let verb = activeSugg._verb;
            self.__msgService.displayMessage({
              text: ('An exception occurred while previewing the command "' +
                     (verb.cmd || verb).name + '".'),
              exception: e,
            });
          }
        });
    }
  },

  _previewAndSuggest: function CM__previewAndSuggest(context) {
    this._renderSuggestions();

    return this._renderPreview(context);
  },

  reset: function CM_reset() {
    var query = this.__activeQuery;
    if (query && !query.finished) query.cancel();
  },

  updateInput: function CM_updateInput(input, context, asyncSuggestionCb) {
    this.reset();
    this.__lastInput = input;

    var query = this.__activeQuery =
      this.__nlParser.newQuery(input, context, this.maxSuggestions, true);
    query.onResults = asyncSuggestionCb || this.__lastAsyncSuggestionCb;

    if (asyncSuggestionCb)
      this.__lastAsyncSuggestionCb = asyncSuggestionCb;

    this.__hilitedSuggestion = 0;
    if ("run" in query)
      query.run();
    else
      this.onSuggestionsUpdated(input, context);
  },

  getLastInput: function CM_getLastInput() {
    return this.__lastInput;
  },

  onSuggestionsUpdated: function CM_onSuggestionsUpdated(input, context) {
    Utils.dump("rendering",
               this.__activeQuery.suggestionList.length,
               "suggestions");

    var previewState = "no-suggestions";
    if (this.__activeQuery.suggestionList.length > 0)
      previewState = "with-suggestions";

    if (!this.__activeQuery.finished)
      previewState = "computing-suggestions";

    this.setPreviewState(previewState);
    this._previewAndSuggest(context);
  },

  execute: function CM_execute(context) {
    let suggestionList = this.__activeQuery.suggestionList;
    var parsedSentence = suggestionList[this.__hilitedSuggestion];
    if (!parsedSentence)
      this.__msgService.displayMessage('No command called "' +
                                       this.__lastInput + '".');
    else
      try {
        this.__nlParser.strengthenMemory(this.__lastInput, parsedSentence);
        parsedSentence.execute(context);
      } catch (e) {
        let verb = parsedSentence._verb;
        this.__msgService.displayMessage({
          text: ('An exception occurred while running the command "' +
                 (verb.cmd || verb).name + '".'),
          exception: e,
        });
      }
  },

  hasSuggestions: function CM_hasSuggestions() {
    let query = this.__activeQuery;
    return !!(query && query.suggestionList.length);
  },

  getSuggestionListNoInput: function CM_getSuggListNoInput(context,
                                                           asyncSuggestionCb) {
    let noInputQuery = this.__nlParser.newQuery("", context, 20);
    noInputQuery.onResults = function onResultsNoInput() {
      asyncSuggestionCb(noInputQuery.suggestionList);
    };
  },

  getHilitedSuggestionText: function CM_getHilitedSuggestionText(context) {
    return (this.hasSuggestions()
            ? (this.__activeQuery
               .suggestionList[this.__hilitedSuggestion]
               .completionText)
            : "");
  },

  getHilitedSuggestionDisplayName: function CM_getHilitedSuggDisplayName() {
    if(!this.hasSuggestions())
      return "";
    var sugg = this.__activeQuery.suggestionList[this.__hilitedSuggestion];
    return sugg.displayText;
  },

  makeCommandSuggester: function CM_makeCommandSuggester() {
    var self = this;
    return function getAvailableCommands(context, popupCb) {
      self.refresh();
      self.getSuggestionListNoInput(context, popupCb);
    };
  },

  get maxSuggestions() CommandManager.maxSuggestions,
  get previewBrowser() this._previewer,
};
