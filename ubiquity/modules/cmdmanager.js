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

var EXPORTED_SYMBOLS = ["CommandManager"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/preview_browser.js");

const {prefs} = Utils.Application;
const DEFAULT_PREVIEW_URL = "chrome://ubiquity/content/preview.html";
const MIN_MAX_SUGGS = 1;
const MAX_MAX_SUGGS = 42;

CommandManager.DEFAULT_MAX_SUGGESTIONS = 5;
CommandManager.MAX_SUGGESTIONS_PREF = "extensions.ubiquity.maxSuggestions";
CommandManager.__defineGetter__("maxSuggestions", function () {
  return prefs.getValue(this.MAX_SUGGESTIONS_PREF,
                        this.DEFAULT_MAX_SUGGESTIONS);
});
CommandManager.__defineSetter__("maxSuggestions", function (value) {
  var num = Math.max(MIN_MAX_SUGGS, Math.min(value | 0, MAX_MAX_SUGGS));
  prefs.setValue(this.MAX_SUGGESTIONS_PREF, num);
});

function CommandManager(cmdSource, msgService, parser, suggsNode,
                        previewPaneNode, helpNode) {
  this.__cmdSource = cmdSource;
  this.__msgService = msgService;
  this.__hilitedIndex = 0;
  this.__lastInput = "";
  this.__lastHilitedIndex = -1;
  this.__lastAsyncSuggestionCb = Boolean;
  this.__nlParser = parser;
  this.__activeQuery = null;
  this.__domNodes = {
    suggs: suggsNode,
    suggsIframe: suggsNode.getElementsByTagName("iframe")[0],
    preview: previewPaneNode,
    help: helpNode};
  this.__previewer = new PreviewBrowser(
    previewPaneNode.getElementsByTagNameNS(
      "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
      "browser")[0],
    DEFAULT_PREVIEW_URL);
  this.__commandsByServiceDomain = null;

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

  this.__domNodes.suggsIframe.contentDocument.addEventListener(
    "click",
    function onSuggClick(ev) {
      var {target} = ev;
      if (target === this) return;
      while (!target.hasAttribute("index"))
        if (!(target = target.parentNode)) return;
      self.__hilitedIndex = +target.getAttribute("index");
      self.__lastAsyncSuggestionCb();
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
      if (this.__previewer.isActive)
        this.__previewer.queuePreview(
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
    this.reset();
  },

  moveIndicationUp: function CM_moveIndicationUp(context) {
    if (--this.__hilitedIndex < 0)
      this.__hilitedIndex = this.__activeQuery.suggestionList.length - 1;
    this._renderAll(context);
  },

  moveIndicationDown: function CM_moveIndicationDown(context) {
    if (++this.__hilitedIndex >= this.__activeQuery.suggestionList.length)
      this.__hilitedIndex = 0;
    this._renderAll(context);
  },

  _renderSuggestions: function CM__renderSuggestions() {
    var content = "";
    var {suggestionList} = this.__activeQuery;
    for (let x = 0, l = suggestionList.length; x < l; ++x) {
      let suggText = suggestionList[x].displayHtml;
      let suggIconUrl = suggestionList[x].icon;
      let suggIcon = "";
      if (suggIconUrl)
        suggIcon = '<img src="' + Utils.escapeHtml(suggIconUrl) + '"/>';
      suggText = '<div class="cmdicon">' + suggIcon + "</div>" + suggText;
      content += ('<div class="suggested' +
                  (x === this.__hilitedIndex ? " hilited" : "") +
                  '" index="' + x + '">' + suggText + "</div>");
    }
    this.__domNodes.suggsIframe.contentDocument.body.innerHTML = content;
  },

  _renderPreview: function CM__renderPreview(context) {
    var hindex = this.__hilitedIndex;
    if (hindex === this.__lastHilitedIndex) return;

    var activeSugg = this.hilitedSuggestion;
    if (!activeSugg) return;
    this.__lastHilitedIndex = hindex;

    var self = this;
    this.__previewer.queuePreview(
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
  },

  _renderAll: function CM__renderAll(context) {
    this._renderSuggestions();
    this._renderPreview(context);
  },

  reset: function CM_reset() {
    var query = this.__activeQuery;
    if (query && !query.finished) query.cancel();
    this.__hilitedIndex = 0;
    this.__lastInput = "";
    this.__lastHilitedIndex = -1;
  },

  updateInput: function CM_updateInput(input, context, asyncSuggestionCb) {
    this.reset();
    this.__lastInput = input;

    var query = this.__activeQuery =
      this.__nlParser.newQuery(input, context, this.maxSuggestions, true);
    query.onResults = asyncSuggestionCb || this.__lastAsyncSuggestionCb;

    if (asyncSuggestionCb)
      this.__lastAsyncSuggestionCb = asyncSuggestionCb;

    query.run();
  },

  getLastInput: function CM_getLastInput() {
    return this.__lastInput;
  },

  onSuggestionsUpdated: function CM_onSuggestionsUpdated(input, context) {
    if (input !== this.__lastInput) return;

    var {suggestionList} = this.__activeQuery;
    Utils.dump("rendering", suggestionList.length, "suggestions");

    this.setPreviewState(this.__activeQuery.finished
                         ? (suggestionList.length > 0
                            ? "with-suggestions"
                            : "no-suggestions")
                         : "computing-suggestions");
    this._renderAll(context);
  },

  execute: function CM_execute(context) {
    var activeSugg = this.hilitedSuggestion;
    if (!activeSugg)
      this.__msgService.displayMessage('No command called "' +
                                       this.__lastInput + '".');
    else
      try {
        this.__nlParser.strengthenMemory(this.__lastInput, activeSugg);
        activeSugg.execute(context);
      } catch (e) {
        let verb = activeSugg._verb;
        this.__msgService.displayMessage({
          text: ('An exception occurred while running the command "' +
                 (verb.cmd || verb).name + '".'),
          exception: e,
        });
      }
  },

  hasSuggestions: function CM_hasSuggestions() {
    return !!(this.__activeQuery || 0).hasResults;
  },

  getSuggestionListNoInput: function CM_getSuggListNoInput(context,
                                                           asyncSuggestionCb,
                                                           noAsyncUpdates){
    let noInputQuery = this.__nlParser.newQuery("", context, 20);
    noInputQuery.onResults = function onResultsNoInput() {
      if (noAsyncUpdates || noInputQuery.finished)
        asyncSuggestionCb(noInputQuery.suggestionList);
    };
  },

  getHilitedSuggestionText: function CM_getHilitedSuggestionText() {
    var sugg = this.hilitedSuggestion;
    return sugg ? sugg.completionText : "";
  },

  getHilitedSuggestionDisplayName: function CM_getHilitedSuggDisplayName() {
    var sugg = this.hilitedSuggestion;
    return sugg ? sugg.displayHtml : "";
  },

  makeCommandSuggester: function CM_makeCommandSuggester() {
    var self = this;
    return function getAvailableCommands(context, popupCb) {
      self.refresh();
      self.getSuggestionListNoInput(context, popupCb);
    };
  },

  get maxSuggestions() CommandManager.maxSuggestions,
  get previewBrowser() this.__previewer,
  get hilitedSuggestion() (
    this.__activeQuery &&
    this.__activeQuery.suggestionList[this.__hilitedIndex]),
  
  getCommandsByServiceDomain: function() {
    if (this.__commandsByServiceDomain)
      return this.__commandsByServiceDomain;
    let commands = this.__cmdSource.getAllCommands();
    this.__commandsByServiceDomain = {};
    for each (let cmd in commands) {
      if (cmd.serviceDomain) {
        if (!(cmd.serviceDomain in this.__commandsByServiceDomain))
          this.__commandsByServiceDomain[cmd.serviceDomain] = [];
        this.__commandsByServiceDomain[cmd.serviceDomain].push(
          {name:cmd.name, names:cmd.names, id: cmd.id});
      }
    }
    return this.__commandsByServiceDomain;
  }
};
