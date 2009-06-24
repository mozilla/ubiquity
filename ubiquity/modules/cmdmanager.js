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
    function suggClick(ev) {
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

  refresh : function CM_refresh() {
    this.__cmdSource.refresh();
    this.__hilitedSuggestion = 0;
    this.__lastInput = "";
  },

  moveIndicationUp : function CM_moveIndicationUp(context) {
    this.__hilitedSuggestion -= 1;
    if (this.__hilitedSuggestion < 0) {
      this.__hilitedSuggestion = this.__activeQuery.suggestionList.length - 1;
    }
    this._previewAndSuggest(context, true);
  },

  moveIndicationDown : function CM_moveIndicationDown(context) {
    this.__hilitedSuggestion += 1;
    if (this.__hilitedSuggestion > this.__activeQuery.suggestionList.length - 1) {
      this.__hilitedSuggestion = 0;
    }
    this._previewAndSuggest(context, true);
  },

  _renderSuggestions : function CMD__renderSuggestions() {
    var content = "";
    var suggestionList = this.__activeQuery.suggestionList;
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

  _renderPreview : function CM__renderPreview(context) {
    var wasPreviewShown = false;

    try {
      var activeSugg = this.__activeQuery.suggestionList[this.__hilitedSuggestion];

      if (activeSugg) {
        var self = this;
        var previewUrl = activeSugg.previewUrl;

        this._previewer.queuePreview(
          previewUrl,
          activeSugg.previewDelay,
          function(pblock) { activeSugg.preview(context, pblock); }
        );

        wasPreviewShown = true;
      }
    } catch (e) {
      this.__msgService.displayMessage(
        {text: ("An exception occurred while previewing the command '" +
                this.__lastInput + "'."),
         exception: e}
        );
    }
    return wasPreviewShown;
  },

  _previewAndSuggest : function CM__previewAndSuggest(context) {
    this._renderSuggestions();

    return this._renderPreview(context);
  },

  activateAccessKey: function CM_activateAccessKey(number) {
    this._previewer.activateAccessKey(number);
  },

  reset : function CM_reset() {
    // TODO: I think?
    if (this.__activeQuery && !this.__activeQuery.finished)
      this.__activeQuery.cancel();
  },

  updateInput : function CM_updateInput(input, context, asyncSuggestionCb) {
    this.__lastInput = input;

    if (this.__activeQuery) {
      if (!this.__activeQuery.finished) {
        dump("last query isn't done yet -- kill it!\n");
        this.reset();
      }
    }

    this.__activeQuery = this.__nlParser.newQuery(input, context,
                                                  this.maxSuggestions,true);

    this.__activeQuery.onResults = asyncSuggestionCb ||
                                     this.__lastAsyncSuggestionCb;

    if (asyncSuggestionCb)
      this.__lastAsyncSuggestionCb = asyncSuggestionCb;

    if ('run' in this.__activeQuery)
      this.__activeQuery.run();
    this.__hilitedSuggestion = 0;
    this.onSuggestionsUpdated(input, context);
  },

  getLastInput: function CM_getLastInput() {
    return this.__lastInput;
  },

  onSuggestionsUpdated : function CM_onSuggestionsUpdated(input,
                                                          context) {
    //dump('rendering suggestions now: '+this.__activeQuery.suggestionList.length+'\n');
    var previewState = "no-suggestions";
    if (this.__activeQuery.suggestionList.length > 0)// && this._previewAndSuggest(context)
      previewState = "with-suggestions";
    this.setPreviewState(previewState);
    this._previewAndSuggest(context);
  },

  execute : function CM_execute(context) {
    let suggestionList = this.__activeQuery.suggestionList;
    var parsedSentence = suggestionList[this.__hilitedSuggestion];
    if (!parsedSentence)
      this.__msgService.displayMessage("No command called " +
                                       this.__lastInput + ".");
    else
      try {
        this.__nlParser.strengthenMemory(this.__lastInput, parsedSentence);
        parsedSentence.execute(context);
      } catch (e) {
        this.__msgService.displayMessage(
          {text: ("An exception occurred while running the command '" +
                  this.__lastInput + "'."),
           exception: e}
        );
      }
  },

  hasSuggestions: function CM_hasSuggestions() {
    return (this.__activeQuery && this.__activeQuery.suggestionList.length > 0);
  },

  getSuggestionListNoInput: function CM_getSuggListNoInput(context,
                                                           asyncSuggestionCb) {
    let noInputQuery = this.__nlParser.newQuery("", context,
                                                20);
    noInputQuery.onResults = function() {
      if (noInputQuery.finished) {
        asyncSuggestionCb( noInputQuery.suggestionList );
      }
    };
    return;
  },

  getHilitedSuggestionText : function CM_getHilitedSuggestionText(context) {
    if(!this.hasSuggestions())
      return null;

    var suggText = (this.__activeQuery
                    .suggestionList[this.__hilitedSuggestion]
                    .completionText);
    // TODO why is this updating input???? the user's input hasn't changed,
    // all we've done is requested the hilighted suggestion -- this function
    // should not have side effects.  If it's part of the autocomplete
    // feature then it should not have a name starting with 'get'. (--Jono)
    this.updateInput(suggText, context);

    return suggText;
  },

  getHilitedSuggestionDisplayName: function CM_getHilitedSuggDisplayName() {
    if(!this.hasSuggestions())
      return "";
    var sugg = this.__activeQuery.suggestionList[this.__hilitedSuggestion];
    return sugg.displayText;
  },

  makeCommandSuggester: function CM_makeCommandSuggester() {
    // This needs to be completely rewritten to be asynchronous  -- must
    // pass callback into getSuggestionListNoInput.
    var self = this;
    return function getAvailableCommands(context, popupCb) {
      self.refresh();
      function cmdSuggCb (suggestions){
        let retVal = {};
        for each (var sugg in suggestions) {
          let parsedSentence = sugg;
          let name = parsedSentence._verb.name;
	  let titleCasedName = name[0].toUpperCase() + name.slice(1);
          retVal[titleCasedName] = function execute() {
            parsedSentence.execute(context);
          };
	  retVal[titleCasedName].score = parsedSentence.score;
          let suggestedCommand = sugg._verb;
          if (suggestedCommand.icon)
            retVal[titleCasedName].icon = suggestedCommand.icon;
        }
        popupCb(retVal);
      }
      self.getSuggestionListNoInput(context, cmdSuggCb);
      return;
    }
  },

  get maxSuggestions() CommandManager.maxSuggestions,
};
