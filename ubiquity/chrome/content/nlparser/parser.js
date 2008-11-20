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
 *   Jono DiCarlo <jdicarlo@mozilla.com>
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
Components.utils.import("resource://ubiquity-modules/suggestion_memory.js");

var NLParser = { MAX_SUGGESTIONS: 5};

NLParser.makeParserForLanguage = function(languageCode, verbList, nounList,
                                          ContextUtils) {
  let parserPlugin = null;
  if (languageCode == "en") {
    parserPlugin = EnParser;
  }
  if (languageCode == "jp") {
    parserPlugin = JpParser;
  }

  NLParser.SELECTION_PRONOUNS = parserPlugin.PRONOUNS;

  return new NLParser.Parser(verbList, nounList, parserPlugin, ContextUtils);
};

NLParser.Parser = function(verbList, nounList, languagePlugin,
                           ContextUtils) {
  this._init(verbList, nounList, languagePlugin);
  if (!ContextUtils) {
    var ctu = {};
    Components.utils.import("resource://ubiquity-modules/contextutils.js",
                            ctu);
    ContextUtils = ctu.ContextUtils;
  }
  this._ContextUtils = ContextUtils;
}
NLParser.Parser.prototype = {
  _init: function(commandList, nounList, languagePlugin) {
    this.setCommandList( commandList );
    this._nounTypeList = nounList;
    this._suggestionList = []; // a list of ParsedSentences.
    this._parsingsList = []; // a list of PartiallyParsedSentences.
    this._pronouns = languagePlugin.PRONOUNS;
    this._languageSpecificParse = languagePlugin.parseSentence;
    this._suggestionMemory = new SuggestionMemory("main_parser");
    this._queuedPreview = null;
  },

  getSelectionObject: function(context) {
    var selection = this._ContextUtils.getSelection(context);
    if (!selection && UbiquityGlobals.lastCmdResult)
      selection = UbiquityGlobals.lastCmdResult;
    var htmlSelection = this._ContextUtils.getHtmlSelection(context);
    if (!htmlSelection && selection)
      htmlSelection = selection;
    return {
      text: selection,
      html: htmlSelection
    };
  },

  nounFirstSuggestions: function( selObj ) {
    /*Treats input as a noun, figures out what nounTypes it could be,
    figures out what verbTypes can take that nounType as input
    (either for directObject or for modifiers) and returns a list of
    suggestions based on giving the input to those verbs.*/
    let suggs = [];
// TODO: We're commenting out this code for now because it's quite
// processor-intensive and doesn't currently provide a useful list
// of suggestions. See #343 for more information.
//     let matchingNouns = [];
//     let matchingVerbs = [];
//     let verb;
//     let noun;

//     for each(noun in this._nounTypeList) {
//       if (noun.suggest(selObj.text, selObj.html,
//                        function dummy() {}).length > 0 )
// 	matchingNouns.push(noun);
//       // TODO: nouns can now suggest asynchronously,
//       // meaning that this is false at first but may become true later.
//       // What to do then?
//       // We can pass a real callback to the above...
//     }
//     for each(verb in this._verbList) {
//       for each(noun in matchingNouns) {
// 	if (verb.usesNounType(noun)) {
//           matchingVerbs.push(verb);
//           continue;
// 	}
//       }
//     }
//     for each(verb in matchingVerbs) {
//       suggs.push( new NLParser.PartiallyParsedSentence(verb,
//                                                        {},
//                                                        selObj,
//                                                        0));
//     }
    return suggs;
  },

  _sortSuggestionList: function(query) {
    // TODO the following is no good, it's English-specific:
    let inputVerb = query.split(" ")[0];
    /* Each suggestion in the suggestion list should already have a matchScore
       assigned by Verb.getCompletions.  Give them also a frequencyScore based
       on the suggestionMemory:*/
    for each( let sugg in this._suggestionList) {
      let suggVerb = sugg._verb._name;
      let freqScore = this._suggestionMemory.getScore(inputVerb, suggVerb);
      sugg.setFrequencyScore(freqScore);
    }

    this._suggestionList.sort( function( x, y ) {
				 let xMatchScores = x.getMatchScores();
				 let yMatchScores = y.getMatchScores();
				 for (let z in xMatchScores) {
				   if (xMatchScores[z] > yMatchScores[z]) {
				     return -1;
				   }
				   else if (yMatchScores[z] > xMatchScores[z]) {
				     return 1;
				   }
				   /* if they are equal, then continue on to the
				    * next loop iteration to compare them based on
				    * the next most important score. */
				 }
				 // Got all the way through the lists and found
				 // no tiebreaker... they are truly tied.
                                 return 0;
			       });
  },

  strengthenMemory: function(query, chosenSuggestion) {
    // query is the whole input, chosenSuggestion is a parsedSentence.
    // This parser only cares about the verb name.
    let chosenVerb = chosenSuggestion._verb._name;
    let inputVerb = query.split(" ")[0];
    /* TODO not neccessarily accurate!  Also English-specific!
     * Input might have just been nouns,
    // if this was noun-first completion, which means we're remembering
    // an association from noun input to verb completion, which might be
    // problematic.  Discuss. */
    this._suggestionMemory.remember(inputVerb, chosenVerb);
  },

  updateSuggestionList: function( query, context ) {
    var nounType, verb;
    var newSuggs = [];
    var selObj = this.getSelectionObject(context);
    // selection, no input, noun-first suggestion on selection
    if (!query || query.length == 0) {
      if (selObj.text || selObj.html) {
	newSuggs = newSuggs.concat( this.nounFirstSuggestions(selObj));
      }
    } else {
      // Language-specific full-sentence suggestions:
      newSuggs = this._languageSpecificParse(
	query,
	this._nounTypeList,
	this._verbList,
	selObj
      );
      // noun-first matches on input
      if (newSuggs.length == 0 ){
	selObj = {
	  text: query, html: query
	};
	newSuggs = newSuggs.concat( this.nounFirstSuggestions( selObj ));
      }
    }
    // partials is now a list of PartiallyParsedSentences; if there's a
    // selection, try using it for any missing arguments...
    if (selObj.text || selObj.html) {
      let partialsWithSelection = [];
      for each(part in newSuggs) {
        let withSel = part.getAlternateSelectionInterpolations();
        partialsWithSelection = partialsWithSelection.concat( withSel );
      }
      this._parsingsList = partialsWithSelection;
    } else {
      this._parsingsList = newSuggs;
    }

    this.refreshSuggestionList( query, context );
  },

  refreshSuggestionList: function( query ) {
    // get completions from parsings -- the completions may have changed
    // since the parsing list was first generated.
    this._suggestionList = [];
    for each (let parsing in this._parsingsList) {
      let newSuggs = parsing.getParsedSentences();
      this._suggestionList = this._suggestionList.concat(newSuggs);
    }
    this._sortSuggestionList(query);
  },

  getSuggestionList: function() {
    return this._suggestionList;
  },

  getNumSuggestions: function() {
    return Math.min(NLParser.MAX_SUGGESTIONS, this._suggestionList.length);
  },

  getSentence: function(index) {
    if (this._suggestionList.length == 0 )
      return null;
    return this._suggestionList[index];
  },

  setPreviewAndSuggestions: function(context, previewBlock, hilitedSuggestion){
    // can set previewBlock as a callback in case we need to update
    // asynchronously.

    // Note: it might be better for us to decouple the generation of
    // suggestions from the preview display so that they can
    // be updated independently, which would allow previews to
    // only be displayed (and potentially costly Ajax requests
    // to be made) after some amount of time has passed since
    // the user's last keypress.  This might be done with a
    // XUL:textbox whose 'type' is set to 'timed'.

    var doc = previewBlock.ownerDocument;
    if (!doc.getElementById("suggestions")) {
      // Set the initial contents of the preview block.
      previewBlock.innerHTML = ('<div id="suggestions"></div>' +
                                '<div id="preview-pane"></div>');
    }

    // Set suggestions content.
    var content = "";
    var numToDisplay = this.getNumSuggestions();
    for (var x=0; x < numToDisplay; x++) {
      var suggText = this._suggestionList[x].getDisplayText();
      var suggIconUrl = this._suggestionList[x].getIcon();
      var suggIcon = "";
      if(suggIconUrl) {
        suggIcon = "<img src=\"" + suggIconUrl + "\"/>";
      }
      suggText = "<div class=\"cmdicon\">" + suggIcon + "</div>&nbsp;" +
	suggText;
      if ( x == hilitedSuggestion ) {
        content += "<div class=\"hilited\"><div class=\"hilited-text\">" +
	  suggText + "</div>";
        content += "</div>";
      } else {
        content += "<div class=\"suggested\">" + suggText + "</div>";
      }
    }

    doc.getElementById("suggestions").innerHTML = content;

    var activeSugg = this.getSentence(hilitedSuggestion);
    if ( activeSugg ) {
      var self = this;
      function queuedPreview() {
        // Set the preview contents.
        if (self._queuedPreview == queuedPreview)
          activeSugg.preview(context, doc.getElementById("preview-pane"));
      };
      this._queuedPreview = queuedPreview;
      Utils.setTimeout(this._queuedPreview, activeSugg.previewDelay);
    }

    var evt = doc.createEvent("HTMLEvents");
    evt.initEvent("preview-change", false, false);
    doc.getElementById("preview-pane").dispatchEvent(evt);

    return true;
  },

  setCommandList: function( commandList ) {
    this._verbList = [ new NLParser.Verb( commandList[x] )
                       for (x in commandList) ];
  },

  setNounList: function( nounList ) {
    this._nounTypeList = nounList;
  }
};
