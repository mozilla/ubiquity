function NLParser(verbList) {
  // NOUN_LIST is a const array defined in nountypes.js.
  this._init(verbList, NOUN_LIST);
}
NLParser.prototype = {
  _init: function(commandList, nounList) {
    this.setCommandList( commandList );
    this._nounTypeList = nounList;
    this._lockedInSentence = null;
    this._hilitedSuggestion = 0;
    this._suggestionList = []; // a list of ParsedSentences.
  },

  updateSuggestionList: function( query, context ) {
    this._suggestionList = [];
    var completions = [];
    var x, y;
    var nounType, verb;
    var words = query.split( " " );
    // verb-first matches
    for ( x in this._verbList ) {
      verb = this._verbList[x];
      if ( verb.match( words[0] ) ) {
	completions = verb.getCompletions( words.slice(1), context );
	this._suggestionList = this._suggestionList.concat(completions);
      }
    }
    // noun-first matches
    if (this._suggestionList.length == 0 ){
      for (x in this._nounTypeList) {
	nounType = this._nounTypeList[x];
	if (nounType.match( words[0] ) ){
	  for (y in this._verbList) {
	    verb = this._verbList[y];
	    var prefix = verb.canPossiblyUseNounType(nounType);
	    if (prefix) {
	      var betterSentence = prefix + " " + query;
	      words = betterSentence.split( " " );
	      completions = verb.getCompletions(words.slice(1), context);
	      this._suggestionList = this._suggestionList.concat(completions);
	    }
	  }
	}
      }
    }

    // TODO sort in order of match quality
    this._hilitedSuggestion = 1; // hilight the first suggestion by default
  },

  // Obsolete
  getSuggestionsAsHtml : function() {
    return [ this._suggestionList[x].getDisplayText()
	     for ( x in this._suggestionList ) ];
  },

  // Obsolete
  getDescriptionText: function() {
    if ( this._suggestionList.length == 0 ) {
      return "You got the magic stick. Type some commands!";
    }
    var h = this._hilitedSuggestion;
    if ( h == 0 ) {
      return "Executes your input literally, with no autocompletion.";
    } else {
      h = h - 1;
    }
    var sentence = this._suggestionList[h];
    return sentence.getDescription();
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
    for (var x in this._suggestionList ) {
      var suggText = this._suggestionList[x].getDisplayText();
      if ( x == this._hilitedSuggestion - 1 ) {
	var descText = this._suggestionList[x].getDescription();
	content += "<div class=\"hilited\">" + descText + "<br/>";
	content += suggText + "<br/><div id=\"preview-pane\">" + oldPreviewHTML + "</div></div>";
      } else {
	content += "<div>" + suggText + "</div>";
      }
    }
    previewBlock.innerHTML = content;
    if ( this._suggestionList.length > 0 && this._hilitedSuggestion > 0) {
      var doc = previewBlock.ownerDocument;
      var activeSugg = this._suggestionList[this._hilitedSuggestion -1];
      activeSugg.preview(context, doc.getElementById("preview-pane"));
    }
    return true;
  },

  setCommandList: function( commandList ) {
    this._verbList = [ new Verb( commandList[x] ) for (x in commandList) ];
  }
};
