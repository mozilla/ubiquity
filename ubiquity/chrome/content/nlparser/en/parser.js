
NLParser.EN_SELECTION_PRONOUNS =  [ "this", "that", "it", "selection",
				    "him", "her", "them"];

NLParser.EnInputData = function( text, html, data ) {
  this.text = text;
  this.html = html;
  this.data = data;

  // try to fill in missing fields:
  if (this.data && !this.text)
    this.text = this.data.toString();
  if (this.text && !this.html)
    this.html = this.text;

  if (text.length > 80)
    this.summary = "your selection (\"" + text.slice(0,50) + "...\")";
  else
    this.summary = this.text;
};

NLParser.inputObjectFromSelection = function(context) {
  return new NLParser.EnInputData(getTextSelection(context),
				  getHtmlSelection(context));
};


NLParser.EnParser = function(verbList, nounList) {
  if (verbList) {
    this._init(verbList, nounList);
  }
}
NLParser.EnParser.prototype = {
  _init: function(commandList, nounList) {
    this.setCommandList( commandList );
    this._nounTypeList = nounList;
    this._lockedInSentence = null;
    this._suggestionList = []; // a list of ParsedSentences.
  },

  nounFirstSuggestions: function( input, context ) {
    //Treats input as a noun, figures out what nounTypes it could be,
    //figures out what verbTypes can take that nounType as input
    //(either for directObject or for modifiers) and returns a list of
    //suggestions based on giving the input to those verbs.
    var suggs = [];
    var x, y, nounType, verb, words;

    for each (nounType in this._nounTypeList) {
      if (nounType.suggest(input).length > 0){
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

  setPreviewAndSuggestions: function( context, previewBlock, hilitedSuggestion ) {
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
      if ( x == hilitedSuggestion ) {
	content += "<div class=\"hilited\"><div class=\"hilited-text\">" + suggText + "</div>";
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
    this._verbList = [ new NLParser.EnVerb( commandList[x] ) for (x in commandList) ];
  },

  setNounList: function( nounList ) {
    this._nounTypeList = nounList;
  }
};
