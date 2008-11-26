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

Components.utils.import("resource://ubiquity-modules/utils.js");

function CommandManager(cmdSource, msgService, parser) {
  this.__cmdSource = cmdSource;
  this.__msgService = msgService;
  this.__hilitedSuggestion = 0;
  this.__lastInput = "";
  this.__nlParser = parser;
  this.__nlParser.setCommandList(cmdSource.getAllCommands());
  this.__nlParser.setNounList(cmdSource.getAllNounTypes());
  this.__cmdSource.parser = this.__nlParser;
  this.__queuedPreview = null;
}

CommandManager.prototype = {
  refresh : function CM_refresh() {
    this.__cmdSource.refresh();
    this.__hilitedSuggestion = 0;
    this.__lastInput = "";
  },

  moveIndicationUp : function CM_moveIndicationUp(context, previewBlock) {
    this.__hilitedSuggestion -= 1;
    if (this.__hilitedSuggestion < 0) {
      this.__hilitedSuggestion = this.__nlParser.getNumSuggestions() - 1;
    }
    this._previewAndSuggest(context, previewBlock);
  },

  moveIndicationDown : function CM_moveIndicationDown(context, previewBlock) {
    this.__hilitedSuggestion += 1;
    if (this.__hilitedSuggestion > this.__nlParser.getNumSuggestions() - 1) {
      this.__hilitedSuggestion = 0;
    }
    this._previewAndSuggest(context, previewBlock);
  },

  _renderSuggestions : function CMD__renderSuggestions(elem) {
    var content = "";
    var suggList = this.__nlParser.getSuggestionList();
    var suggNumber = this.__nlParser.getNumSuggestions();


    for (var x = 0; x < suggNumber; x++) {
      var suggText = suggList[x].getDisplayText();
      var suggIconUrl = suggList[x].getIcon();
      var suggIcon = "";
      if(suggIconUrl) {
        suggIcon = "<img src=\"" + suggIconUrl + "\"/>";
      }
      suggText = "<div class=\"cmdicon\">" + suggIcon + "</div>&nbsp;" +
	suggText;
      if ( x == this.__hilitedSuggestion ) {
        content += "<div class=\"hilited\"><div class=\"hilited-text\">" +
	  suggText + "</div>";
        content += "</div>";
      } else {
        content += "<div class=\"suggested\">" + suggText + "</div>";
      }
    }
    elem.innerHTML = content;
  },

  _renderPreview : function CM__renderPreview(context, previewBlock) {
    var doc = previewBlock.ownerDocument;
    var wasPreviewShown = false;

    try {
      var activeSugg = this.__nlParser.getSentence(this.__hilitedSuggestion);
      if ( activeSugg ) {
        var self = this;
        function queuedPreview() {
          // Set the preview contents.
          if (self.__queuedPreview == queuedPreview)
            activeSugg.preview(context, doc.getElementById("preview-pane"));
        };
        this.__queuedPreview = queuedPreview;
        Utils.setTimeout(this.__queuedPreview, activeSugg.previewDelay);
      }

      var evt = doc.createEvent("HTMLEvents");
      evt.initEvent("preview-change", false, false);
      doc.getElementById("preview-pane").dispatchEvent(evt);

      wasPreviewShown = true;
    } catch (e) {
      this.__msgService.displayMessage(
        {text: ("An exception occurred while previewing the command '" +
                this.__lastInput + "'."),
         exception: e}
        );
    }
    return wasPreviewShown;
  },

  _previewAndSuggest : function CM__previewAndSuggest(context, previewBlock) {
    var doc = previewBlock.ownerDocument;
    if (!doc.getElementById("suggestions")) {
      // Set the initial contents of the preview block.
      previewBlock.innerHTML = ('<div id="suggestions"></div>' +
                                '<div id="preview-pane"></div>');
    }

    this._renderSuggestions(doc.getElementById("suggestions"));
    return this._renderPreview(context, previewBlock);
  },

  updateInput : function CM_updateInput(input, context, previewBlock,
                                        asyncSuggestionCb) {
    /* Return true if we created any suggestions, false if we didn't
     * or if we had nowhere to put them.
     */
    this.__lastInput = input;
    this.__nlParser.updateSuggestionList(input, context, asyncSuggestionCb);
    this.__hilitedSuggestion = 0;
    if ( this.__nlParser.getNumSuggestions() == 0 )
      return false;
    if (previewBlock)
      return this._previewAndSuggest(context, previewBlock);
    else
      return false;
  },

  onSuggestionsUpdated : function CM_onSuggestionsUpdated(input,
                                                          context,
                                                          previewBlock) {
    // Called when we're notified of a newly incoming suggestion
    this.__nlParser.refreshSuggestionList(input);
    if (previewBlock)
      this._previewAndSuggest(context, previewBlock);
  },

  execute : function CM_execute(context) {
    var parsedSentence = this.__nlParser.getSentence(this.__hilitedSuggestion);
    if (!parsedSentence)
      this.__msgService.displayMessage("No command called " + this.__lastInput + ".");
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

  copySuggestionToInput : function CM_copySuggestionToInput(context,
                                                            previewBlock,
                                                            textbox) {
    if(this.hasSuggestions()) {

      var selObj = this.__nlParser.getSelectionObject(context);
      var suggText = this.__nlParser.getSentence(this.__hilitedSuggestion)
                                    .getCompletionText(selObj);
      this.updateInput(suggText,
                       context,
                       previewBlock);

      //Update the textbox value. This may be better done by returning the
      //suggestion value so not to expose the text box.
      textbox.value = suggText;
    }
  },

  setDisabledStatus : function CM_setDisabledStatus(){
    return this.__cmdSource.setDisabledStatus();
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
