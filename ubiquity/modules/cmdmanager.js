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

Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/preview_browser.js");

var DEFAULT_PREVIEW_URL = (
  ('data:text/html,' +
   encodeURI('<html><body class="ubiquity-preview-content" ' +
             'style="overflow: hidden; margin: 0; padding: 0;">' +
             '</body></html>'))
);

function CommandManager(cmdSource, msgService, parser, suggsNode,
                        previewPaneNode, helpNode) {
  this.__cmdSource = cmdSource;
  this.__msgService = msgService;
  this.__hilitedSuggestion = 0;
  this.__lastInput = "";
  this.__nlParser = parser;
  this.__domNodes = {suggs: suggsNode,
                     preview: previewPaneNode,
                     help: helpNode};
  this._previewer = new PreviewBrowser(previewPaneNode,
                                       DEFAULT_PREVIEW_URL);

  var self = this;

  function onCommandsReloaded() {
    parser.setCommandList(cmdSource.getAllCommands());
    parser.setNounList(cmdSource.getAllNounTypes());
  }

  cmdSource.addListener("feeds-reloaded", onCommandsReloaded);
  onCommandsReloaded();

  this.setPreviewState("no-suggestions");

  this.finalize = function CM_finalize() {
    cmdSource.removeListener("feeds-reloaded", onCommandsReloaded);
    this.__cmdSource = null;
    this.__msgService = null;
    this.__nlParser = null;
    this.__domNodes = null;
  };
}

CommandManager.prototype = {
  setPreviewState: function CM_setPreviewState(state) {
    switch (state) {
    case "with-suggestions":
      this.__domNodes.suggs.style.display = "block";
      this.__domNodes.preview.style.display = "block";
      this.__domNodes.help.style.display = "none";
      break;
    case "no-suggestions":
      this.__domNodes.suggs.style.display = "none";
      this.__domNodes.preview.style.display = "none";
      this.__domNodes.help.style.display = "block";
      if (this._previewer.isActive())
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
      this.__hilitedSuggestion = this.__nlParser.getNumSuggestions() - 1;
    }
    this._previewAndSuggest(context, true);
  },

  moveIndicationDown : function CM_moveIndicationDown(context) {
    this.__hilitedSuggestion += 1;
    if (this.__hilitedSuggestion > this.__nlParser.getNumSuggestions() - 1) {
      this.__hilitedSuggestion = 0;
    }
    this._previewAndSuggest(context, true);
  },

  _renderSuggestions : function CMD__renderSuggestions() {
    var content = "";
    var suggList = this.__nlParser.getSuggestionList();
    var suggNumber = this.__nlParser.getNumSuggestions();


    for (var x = 0; x < suggNumber; x++) {
      var suggText = suggList[x].getDisplayText();
      var suggIconUrl = suggList[x].getIcon();
      var suggIcon = "";
      if(suggIconUrl) {
        suggIcon = "<img src=\"" + Utils.escapeHtml(suggIconUrl) + "\"/>";
      }
      suggText = "<div class=\"cmdicon\">" + suggIcon + "</div>&nbsp;" + suggText;
      if ( x == this.__hilitedSuggestion ) {
        content += "<div class=\"hilited\"><div class=\"hilited-text\">" + suggText + "</div>";
        content += "</div>";
      } else {
        content += "<div class=\"suggested\">" + suggText + "</div>";
      }
    }
    this.__domNodes.suggs.innerHTML = content;
  },

  _renderPreview : function CM__renderPreview(context) {
    var wasPreviewShown = false;

    try {
      var activeSugg = this.__nlParser.getSentence(this.__hilitedSuggestion);

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
    this.__nlParser.reset();
  },

  updateInput : function CM_updateInput(input, context, asyncSuggestionCb) {
    this.__lastInput = input;
    this.__nlParser.updateSuggestionList(input, context, asyncSuggestionCb);
    this.__hilitedSuggestion = 0;
    var previewState = "no-suggestions";
    if (this.__nlParser.getNumSuggestions() > 0 &&
        this._previewAndSuggest(context))
      previewState = "with-suggestions";
    this.setPreviewState(previewState);
  },

  onSuggestionsUpdated : function CM_onSuggestionsUpdated(input,
                                                          context) {
    // Called when we're notified of a newly incoming suggestion
    this.__nlParser.refreshSuggestionList(input);
    this._previewAndSuggest(context);
  },

  execute : function CM_execute(context) {
    var parsedSentence = this.__nlParser.getSentence(this.__hilitedSuggestion);
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
    return (this.__nlParser.getNumSuggestions() > 0);
  },

  getSuggestionListNoInput: function CM_getSuggListNoInput(context,
                                                           asyncSuggestionCb) {
    this.__nlParser.updateSuggestionList("", context, asyncSuggestionCb);
    return this.__nlParser.getSuggestionList();
  },

  getHilitedSuggestionText : function CM_getHilitedSuggestionText(context) {
    if(!this.hasSuggestions())
      return null;

    var selObj = this.__nlParser.getSelectionObject(context);
    var suggText = this.__nlParser.getSentence(this.__hilitedSuggestion)
                                  .getCompletionText(selObj);
    this.updateInput(suggText,
                     context);

    return suggText;
  },

  makeCommandSuggester : function CM_makeCommandSuggester() {
    var self = this;

    function getAvailableCommands(context) {
      self.refresh();
      var suggestions = self.getSuggestionListNoInput( context );

      var retVal = {};
      for each (let parsedSentence in suggestions) {
        let sentenceClosure = parsedSentence;
        let titleCasedName = parsedSentence._verb._name;
        titleCasedName = (titleCasedName[0].toUpperCase() +
                          titleCasedName.slice(1));
        retVal[titleCasedName] = function execute() {
	  sentenceClosure.execute(context);
        };

        let suggestedCommand = self.__cmdSource.getCommand(
          parsedSentence._verb._name
        );
        if(suggestedCommand.icon)
          retVal[titleCasedName].icon = suggestedCommand.icon;
      }
      return retVal;
    }

    return getAvailableCommands;
  }
};
