function NLParser(verbList, nounList) {
  this._init(verbList, nounList);
}
NLParser.prototype = {
  _init: function(verbList, nounList) {
    this._verbList = verbList; //arrayof Verb objects to use for completions
    this._nounTypeList = nounList;
    this._lockedInSentence = null;
    this._hilitedSuggestion = 0;
    this._suggestionList = []; // a list of ParsedSentences.
  },

  updateSuggestionList: function( query ) {
    this._suggestionList = [];
    var completions = [];
    var x, y;
    var nounType, verb;
    var words = query.split( " " );
    // verb-first matches
    for ( x in this._verbList ) {
      verb = this._verbList[x];
      if ( verb.match( words[0] ) ) {
	completions = verb.getCompletions( words.slice(1) );
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
	      completions = verb.getCompletions(words.slice(1));
	      this._suggestionList = this._suggestionList.concat(completions);
	    }
	  }
	}
      }
    }

    // TODO sort in order of match quality
    this._hilitedSuggestion = 1; // hilight the first suggestion by default
  },

  getSuggestionsAsHtml : function() {
    return [ this._suggestionList[x].getDisplayText()
	     for ( x in this._suggestionList ) ];
  },

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

  indicationDown: function( ) {
    this._hilitedSuggestion ++;
    if ( this._hilitedSuggestion > this._suggestionList.length ) {
      this._hilitedSuggestion = 0;
      }
  },

  indicationUp: function() {
    this._hilitedSuggestion --;
    if ( this._hilitedSuggestion < 0 ) {
      this._hilitedSuggestion = this._suggestionList.length;
      }
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
  }
};
