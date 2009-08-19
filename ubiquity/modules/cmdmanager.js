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

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/preview_browser.js");
Cu.import("resource://ubiquity/modules/localization_utils.js");

var L = LocalizationUtils.propertySelector(
  "chrome://ubiquity/locale/coreubiquity.properties");

const {prefs} = Utils.Application;
const DEFAULT_PREVIEW_URL = "chrome://ubiquity/content/preview.html";
const MIN_MAX_SUGGS = 1;
const MAX_MAX_SUGGS = 42;

const DEFAULT_HELP = (
  '<div class="default" xmlns="http://www.w3.org/1999/xhtml">' +
  L("ubiquity.cmdmanager.defaulthelp") + '</div>');

var gDomNodes = {};

CommandManager.DEFAULT_MAX_SUGGESTIONS = 5;
CommandManager.MAX_SUGGESTIONS_PREF = "extensions.ubiquity.maxSuggestions";
CommandManager.__defineGetter__(
  "maxSuggestions", function CM_getMaxSuggestions() {
    return prefs.getValue(this.MAX_SUGGESTIONS_PREF,
                          this.DEFAULT_MAX_SUGGESTIONS);
  });
CommandManager.__defineSetter__(
  "maxSuggestions", function CM_setMaxSuggestions(value) {
    var num = Math.max(MIN_MAX_SUGGS, Math.min(value | 0, MAX_MAX_SUGGS));
    prefs.setValue(this.MAX_SUGGESTIONS_PREF, num);
  });

function CommandManager(cmdSource, msgService, parser,
                        suggsNode, previewPaneNode, helpNode) {
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

  this.__domNodes.suggsIframe.contentDocument
    .addEventListener("click", this, true);
}

CommandManager.prototype = {
  handleEvent: function CM_handleEvent(event) {
    switch (event.type) {
      case "click": {
        let {target} = event;
        do {
          if (!("hasAttribute" in target)) return;
          if (target.hasAttribute("index")) break;
        } while ((target = target.parentNode));
        let index = +target.getAttribute("index");
        if (this.__hilitedIndex === index) return;
        this.__hilitedIndex = index;
        this.__lastAsyncSuggestionCb();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
  },

  setPreviewState: function CM_setPreviewState(state) {
    var {suggs, preview, help} = this.__domNodes;
    switch (state) {
      case "computing-suggestions":
      case "with-suggestions": {
        suggs.style.display = "block";
        preview.style.display = "block";
        help.style.display = "none";
        break;
      }
      case "no-suggestions": {
        suggs.style.display = "none";
        preview.style.display = "none";
        this._setHelp();
        help.style.display = "block";
        if (this.__previewer.isActive)
          this.__previewer.queuePreview(
            null,
            0,
            function clearPreview(pblock) { pblock.innerHTML = ""; });
        break;
      }
      //errorToLocalize
      default: throw new Error("Unknown state: " + state);
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

  _setHelp: function CM__setHelp() {
    var {help} = this.__domNodes;
    var doc = help.ownerDocument;
    function createFragment(html) {
      var range = doc.createRange();
      var fragment = range.createContextualFragment(html);
      range.detach();
      return fragment;
    }
    if (!("defaultHelp" in gDomNodes))
      gDomNodes.defaultHelp = createFragment(DEFAULT_HELP).firstChild;
    if (!("feedUpdates" in gDomNodes)) {
      gDomNodes.feedUpdates = doc.createElement("box");
      let {feedManager} = (
        Cu.import("resource://ubiquity/modules/setup.js", null)
        .UbiquitySetup.createServices());
      let count = 0;
      feedManager.getSubscribedFeeds().forEach(
        function eachFeed(feed, i, feeds) {
          feed.checkForManualUpdate(function check(updated, confirmUrl) {
            feeds[i] = updated && {title: feed.title, url: confirmUrl};
            if (++count === feeds.length &&
                (feeds = feeds.filter(Boolean)).length)
              gDomNodes.feedUpdates.appendChild(createFragment(
                <div class="feed-updates" xmlns="http://www.w3.org/1999/xhtml">
                <h3>The following feeds have updates:</h3>
                </div>.appendChild(
                  feeds.reduce(
                    function accList(list, feed, i) (
                      list.appendChild(
                        <li><a href={feed.url} accesskey={(i + 1).toString(36)}
                        >{feed.title}</a></li>)),
                    <ol/>))));
          });
        });
    }
    for (let c; c = help.lastChild;) help.removeChild(c);
    help.appendChild(gDomNodes.defaultHelp);
    help.appendChild(gDomNodes.feedUpdates);
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
            //errorToLocalize
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

  onSuggestionsUpdated: function CM_onSuggestionsUpdated(input, context) {
    if (input !== this.__lastInput) return;

    var {suggestionList} = this.__activeQuery;
    //errorToLocalize
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
      //errorToLocalize
      this.__msgService.displayMessage('No command called "' +
                                       this.__lastInput + '".');
    else
      try {
        this.__nlParser.strengthenMemory(this.__lastInput, activeSugg);
        activeSugg.execute(context);
      } catch (e) {
        let verb = activeSugg._verb;
        this.__msgService.displayMessage({
          //errorToLocalize
          text: ('An exception occurred while running the command "' +
                 (verb.cmd || verb).name + '".'),
          exception: e,
        });
      }
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

  makeCommandSuggester: function CM_makeCommandSuggester() {
    var self = this;
    return function getAvailableCommands(context, popupCb) {
      self.refresh();
      self.getSuggestionListNoInput(context, popupCb);
    };
  },

  get parser CM_parser() this.__nlParser,
  get lastInput CM_getLastInput() this.__lastInput,
  get previewBrowser CM_previewBrowser() this.__previewer,

  get maxSuggestions CM_maxSuggestions() CommandManager.maxSuggestions,
  get hasSuggestions CM_hasSuggestions()
    !!(this.__activeQuery || 0).hasResults,

  get hilitedSuggestion CM_hilitedSuggestion() (
    this.__activeQuery &&
    this.__activeQuery.suggestionList[this.__hilitedIndex]),
};
