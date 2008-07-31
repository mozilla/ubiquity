function NLParser(verbList, nounList) {
  if (verbList) {
    this._init(verbList, nounList);
  }
}
NLParser.prototype = {
  _init: function(commandList, nounList) {
    this.setCommandList( commandList );
    this._nounTypeList = nounList;
    this._lockedInSentence = null;
    this._hilitedSuggestion = 0;
    this._suggestionList = []; // a list of ParsedSentences.
  },

  nounFirstSuggestions: function( input, context ) {
    //Treats input as a noun, figures out what nounTypes it could be,
    //figures out what verbTypes can take that nounType as input
    //(either for directObject or for modifiers) and returns a list of
    //suggestions based on giving the input to those verbs.
    var suggs = [];
    var x, y, nounType, verb, words;

    for (x in this._nounTypeList) {
      nounType = this._nounTypeList[x];
      if (nounType.match(input)){
	for (y in this._verbList) {
	  verb = this._verbList[y];
	  var prefix = verb.canPossiblyUseNounType(nounType);
	  if (prefix) {
	    var betterSentence = prefix + " " + input;
	    words = betterSentence.split( " " ).slice(1);
	    var moreSuggs = verb.getCompletions(words, context);
	    suggs = suggs.concat( moreSuggs );
	  }
	}
      }
    }
    return suggs;
  },

  updateSuggestionList: function( query, context ) {
    var nounType, verb, x;
    var newSuggs = [];

    // selection, no input, noun-first suggestion
    if (!query || query.length == 0) {
      var sel = getTextSelection(context);
      if (sel) {
	newSuggs = newSuggs.concat( this.nounFirstSuggestions(sel, context));
      }
    } else {
      var words = query.split( " " );
      // verb-first matches
      for ( x in this._verbList ) {
	verb = this._verbList[x];
	if ( verb.match( words[0] ) ) {
	  newSuggs = newSuggs.concat(verb.getCompletions( words.slice(1), context ));
	}
      }
      // noun-first matches
      if (newSuggs.length == 0 ){
	newSuggs = newSuggs.concat( this.nounFirstSuggestions( query, context ));
      }
    }
    // TODO sort in order of match quality!!
    this._suggestionList = newSuggs;
    if ( this._suggestionList.length > 0 )
      this._hilitedSuggestion = 1; // hilight the first suggestion by default
    else
      this._hilitedSuggestion = 0;
  },

  indicationDown: function(context, previewBlock) {
    this._hilitedSuggestion ++;
    if ( this._hilitedSuggestion > this._suggestionList.length ) {
      this._hilitedSuggestion = 0;
      }
    this.setPreviewAndSuggestions(context, previewBlock);
  },

  indicationUp: function(context, previewBlock) {
    this._hilitedSuggestion --;
    if ( this._hilitedSuggestion < 0 ) {
      this._hilitedSuggestion = this._suggestionList.length;
      }
    this.setPreviewAndSuggestions(context, previewBlock);
  },

  getHilitedSuggestion: function() {
    return this._hilitedSuggestion - 1; // because 0 means no hilite
    // and the suggestion list starts at 1... fencepost!
  },

  // Not currently used, but might be in the future...
  // Autocompletes the input text based on the hilighted suggestion.
  autocomplete: function( query ) {
    var newText;
    var hilited = this.getHilitedSuggestion();
    if ( hilited > -1 ) {
      newText = this._suggestionList[ hilited ].getCompletionText() + " ";
    } else {
      newText = query;
    }
    return newText;
  },

  // Not currently used, but might be in the future...
  clear: function() {
    this._suggestionList = [];
    this._hilitedSuggestion = 0;
    this._lockedInSentence = null;
  },

  getHilitedSentence: function() {
    if (this._suggestionList.length == 0) {
      return null;
    }
    var hilited = this.getHilitedSuggestion();
    return this._suggestionList[hilited];
  },

  getSuggestionList: function() {
    return this._suggestionList;
  },

  setPreviewAndSuggestions: function( context, previewBlock ) {
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
    var numToDisplay = Math.min(5, this._suggestionList.length);
    for (var x=0; x < numToDisplay; x++) {
      var suggText = this._suggestionList[x].getDisplayText();
      if ( x == this._hilitedSuggestion - 1 ) {
	content += "<div class=\"hilited\"><div class=\"hilited-text\">" + suggText + "</div>";
	content += "</div>";
      } else {
	content += "<div class=\"suggested\">" + suggText + "</div>";
      }
    }
    content += "<div id=\"preview-pane\">" + oldPreviewHTML + "</div>";
    
   previewBlock.innerHTML = content;
    
    if ( this._suggestionList.length > 0 && this._hilitedSuggestion > 0) {
      doc = previewBlock.ownerDocument;
      var activeSugg = this._suggestionList[this._hilitedSuggestion -1];
      activeSugg.preview(context, doc.getElementById("preview-pane"));
      
    }
    return true;
  },

  setCommandList: function( commandList ) {
    this._verbList = [ new Verb( commandList[x] ) for (x in commandList) ];
  }
};
