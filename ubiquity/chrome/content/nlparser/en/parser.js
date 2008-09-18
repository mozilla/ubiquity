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


NLParser.EN_SELECTION_PRONOUNS =  [ "this", "that", "it", "selection",
				    "him", "her", "them"];

function getSelectionObject(context) {
  var selection = getTextSelection(context);
  if (!selection && UbiquityGlobals.lastCmdResult)
      selection = UbiquityGlobals.lastCmdResult;
  var htmlSelection = getHtmlSelection(context);
  if (!htmlSelection && selection)
    htmlSelection = selection;
  return {
    text: selection,
    html: htmlSelection
  };
}

NLParser.EnParser = function(verbList, nounList) {
  if (verbList) {
    this._init(verbList, nounList);
  }
}
NLParser.EnParser.prototype = {
  _init: function(commandList, nounList) {
    this.setCommandList( commandList );
    this._nounTypeList = nounList;
    this._suggestionList = []; // a list of ParsedSentences.
    this._suggestionMemory = new SuggestionMemory("en_parser");
  },

  nounFirstSuggestions: function( text, html ) {
    //Treats input as a noun, figures out what nounTypes it could be,
    //figures out what verbTypes can take that nounType as input
    //(either for directObject or for modifiers) and returns a list of
    //suggestions based on giving the input to those verbs.
    let suggs = [];
    let verb;

    for each(verb in this._verbList) {
      suggs = suggs.concat( verb.getCompletionsFromNounOnly(text, html));
    }
    return suggs;
  },

  _sortSuggestionList: function(query) {
    let inputVerb = query.split(" ")[0];
    /* Each suggestion in the suggestion list should already have a matchScore
       assigned by Verb.getCompletions.  Give them also a frequencyScore based
       on the suggestionMemory: */
    for each( let sugg in this._suggestionList) {
      let suggVerb = sugg._verb_name;
      sugg.frequencyScore = this._suggestionMemory.getScore(inputVerb, suggVerb);
    }

    /* TODO: sort first by frequencyScore, then by matchScore (i.e. matchScore
     * breaks ties.  For now: ignore frequencyScore until we decide what the behavior
     * there should actually be.
     */
    this._suggestionList.sort( function( x, y ) {
				 if (x.matchScore > y.matchScore)
				   return -1;
				 else if (y.matchScore > x.matchScore)
				   return 1;
				 else
				   return 0;
			       });
  },

  strengthenMemory: function(query, chosenSuggestion) {
    // query is the whole input, chosenSuggestion is a parsedSentence.
    // This parser only cares about the verb name.
    let chosenVerb = chosenSuggestion._verb._name;
    let inputVerb = query.split(" ")[0];
    /* TODO not neccessarily accurate!  Input might have just been nouns,
    // if this was noun-first completion, which means we're remembering
    // an association from noun input to verb completion, which might be
    // problematic.  Discuss. */
    this._suggestionMemory.remember(inputVerb, chosenVerb);
  },

  updateSuggestionList: function( query, context ) {
    var nounType, verb;
    var newSuggs = [];
    var selObj = getSelectionObject(context);
    // selection, no input, noun-first suggestion on selection
    if (!query || query.length == 0) {
      if (selObj.text || selObj.html) {
	newSuggs = newSuggs.concat( this.nounFirstSuggestions(selObj.text,
                                                              selObj.html));
      }
    } else {
      var words = query.split( " " );
      /* If input is "dostuff " (note space) then splitting on space will
       *  produce ["dostuff", ""].  We don't want the empty string, so drop
       *  all zero-length strings: */
      let word;
      words = [ word for each(word in words) if (word.length > 0)];
      // verb-first matches on input
      for each ( verb in this._verbList ) {
	newSuggs = newSuggs.concat( verb.getCompletions( words, selObj ) );
      }
      // noun-first matches on input
      if (newSuggs.length == 0 ){
	newSuggs = newSuggs.concat( this.nounFirstSuggestions( query, query ));
      }
    }
    this._suggestionList = newSuggs;
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
    // set previewBlock.innerHtml and return true/false
    // can set previewBlock as a callback in case we need to update
    // asynchronously.

    // Here we'll get the contents of the current preview HTML, if
    // they exist, to use them in the new display so that a "flicker"
    // doesn't occur whereby the preview is momentarily empty (while
    // an ajax request occurs) and then is filled with content a
    // split-second later.
    //
    // While this prevents flicker, it's kind of a hack; it
    // might be better for us to decouple the generation of
    // suggestions from the preview display so that they can
    // be updated independently, which would allow previews to
    // only be displayed (and potentially costly Ajax requests
    // to be made) after some amount of time has passed since
    // the user's last keypress.  This might be done with a
    // XUL:textbox whose 'type' is set to 'timed'.

    var doc = previewBlock.ownerDocument;
    var oldPreview = doc.getElementById("preview-pane");
    var oldPreviewHTML = "";
    if (oldPreview)
      oldPreviewHTML = oldPreview.innerHTML;

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
    content += "<div id=\"preview-pane\">" + oldPreviewHTML + "</div>";

    previewBlock.innerHTML = content;

    var activeSugg = this.getSentence(hilitedSuggestion);
    if ( activeSugg ) {
      doc = previewBlock.ownerDocument;
      activeSugg.preview(context, doc.getElementById("preview-pane"));
    }
    return true;
  },

  setCommandList: function( commandList ) {
    this._verbList = [ new NLParser.EnVerb( commandList[x] )
                       for (x in commandList) ];
  },

  setNounList: function( nounList ) {
    this._nounTypeList = nounList;
  }
};
