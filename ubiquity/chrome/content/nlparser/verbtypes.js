const SELECTION_PRONOUNS = [ "this", "that", "it", "selection", "him", "her", "them"];

Components.utils.import("resource://ubiquity-modules/globals.js");

// util functions to make it easier to use objects as fake dictionaries
function dictDeepCopy( dict ) {
  var newDict = {};
  for (var i in dict ) {
    newDict[i] = dict[i];
  }
  return newDict;
};

function dictKeys( dict ) {
  return [ key for ( key in dict ) ];
}


function ParsedSentence( verb, DO, modifiers ) {
  this._init( verb, DO, modifiers );
}
ParsedSentence.prototype = {
  _init: function( verb, DO, modifiers ) {
    /* modifiers is dictionary of preposition: noun */
    this._verb = verb;
    this._DO = DO;
    this._modifiers = modifiers;
  },

  getCompletionText: function() {
    // return plain text that we should set the input box to if user hits
    // space bar on this sentence.
    var sentence = this._verb._name;
    if ( this._DO ) {
      sentence = sentence + " " + this._DO;
    }
    for ( var x in this._modifiers ) {
      if ( this._modifiers[x] ) {
	sentence = sentence + " " + x + " " + this._modifiers[x];
      }
    }
    return sentence;
  },

  getDisplayText: function() {
    // returns html formatted sentence for display in suggestion list
    var sentence = this._verb._name;
    if ( this._verb._DOType ) {
      if ( this._DO ) {
	sentence = sentence + " " + this._DO;
      } else {
	sentence = sentence + " <span class=\"needarg\">(" + this._verb._DOLabel + ")</span>";
      }
    }

    for ( var x in this._verb._modifiers ) {  // was this._verb._modifiers
      if ( this._modifiers[ x ] ) {
	sentence = sentence + " <b>" +  x + " " + this._modifiers[x] + "</b>";
      } else {
	sentence = sentence + " <span class=\"needarg\">(" + x + " " + this._verb._modifiers[x]._name + ")</span>";
      }
    }
    return sentence;
  },

  getDescription: function() {
    // returns a string describing what the sentence will do if executed
    return this._verb.getDescription( this._DO, this._modifiers );
  },

  execute: function(context) {
    return this._verb.execute( context, this._DO, this._modifiers );
  },

  preview: function(context, previewBlock) {
    this._verb.preview( context, this._DO, this._modifiers, previewBlock );
  }

};


function Verb( cmd ) {
  this._init( cmd );
}
Verb.prototype = {
  _init: function( cmd ) {
    this._cmd = cmd;
    this._name = cmd.name;
    this._DOLabel = cmd.DOLabel;
    this._DOType = cmd.DOType; // must be a NounType.
    this._modifiers = cmd.modifiers;
    // modifiers should be a dictionary
    // keys are prepositions
    // values are NounTypes.
    // example:  { "from" : City, "to" : City, "on" : Day }
  },

  execute: function( context, directObject, modifiers ) {
    return this._cmd.execute( context, directObject, modifiers );
  },

  preview: function( context, directObject, modifiers, previewBlock ) {
    if (this._cmd.preview)
      this._cmd.preview( context, directObject, modifiers, previewBlock );
    else {
      // Command exists, but has no preview; provide a default one.
      var content = "Executes the <b>" + this._cmd.name + "</b> command.";
      previewBlock.innerHTML = content;
    }
  },

  getDescription: function( directObject, prepositionPhrases ) {
    // returns a string describing what the sentence will do if executed
    var desc = "Hit enter to do " + this._name + " with direct object " + directObject;
    for ( var x in prepositionPhrases ) {
      desc = desc + ", " + x + " " + prepositionPhrases[x];
    }
    return desc;
  },

  // RecursiveParse is huge and complicated.  It really oughtta have some
  // unit tests written for it.
  recursiveParse: function( unusedWords, filledMods, unfilledMods ) {
    var x;
    var suggestions = [];
    var completions = [];
    var newFilledMods = {};
    var directObject = "";
    var newCompletions = [];
    if ( dictKeys( unfilledMods ).length == 0 ) {
      // Done with modifiers, try to parse direct object.
      if ( unusedWords.length == 0 || this._DOType == null ) {
	// No direct object, either because there are no words left,
	// to use, or because the verb can't take a direct object.
	// Try parsing sentence without them.
	return [ new ParsedSentence( this, "", filledMods ) ];
      } else {
	// Transitive verb, can have direct object.  Try to use the
	// remaining words in that slot.
	directObject = unusedWords.join( " " );
	if ( this._DOType.match( directObject ) ) {
	  // it's a valid direct object.  Make a sentence for each
	  // possible noun completion based on it; return them all.
	  suggestions = this._DOType.suggest( directObject );
	  for ( var x in suggestions ) {
	    completions.push( new ParsedSentence( this, suggestions[x],
						  filledMods ) );
	  }
	  return completions;
	} else {
	  // word is invalid direct object.  Fail!
	  return [];
	}
      }
    } else {
      // "pop" a preposition off of the properties of unfilledMods
      var preposition = dictKeys( unfilledMods )[0];
      // newUnfilledMods is the same as unfilledMods without preposition
      var newUnfilledMods = dictDeepCopy( unfilledMods );
      delete newUnfilledMods[preposition];

      // Look for a match for this preposition
      var nounType = unfilledMods[ preposition ];
      var matchIndices = [];
      for ( var x = 0; x < unusedWords.length - 1; x++ ) {
	if ( preposition.indexOf( unusedWords[x] ) == 0 ) {
	  if ( nounType.match( unusedWords[ x + 1 ] ) ) {
	    // Match for the preposition at index x followed by
	    // an appropriate noun at index x+1
	    matchIndices.push( x );
	  }
	}
      }
      if ( matchIndices.length > 0 ) {
	// Matches found for this preposition!  Add to the completions list
	// all sentences that can be formed using these matches for this
	// preposition.
	for ( x in matchIndices ) {
	  var noun = unusedWords[ matchIndices[x]+1 ];
	  var newUnusedWords = unusedWords.slice();
	  newUnusedWords.splice( matchIndices[x], 2 );
	  directObject = newUnusedWords.join( " " );

	  suggestions = nounType.suggest( noun );
	  for ( var y in suggestions ) {
	    newFilledMods = dictDeepCopy( filledMods );
	    newFilledMods[ preposition ] = suggestions[y];
	    newCompletions = this.recursiveParse( newUnusedWords,
						  newFilledMods,
						  newUnfilledMods );
	    completions = completions.concat( newCompletions );
	  }
	}
      }
      // If no match was found, all we'll return is one sentence formed by
      // leaving that preposition blank. But even if a match was found, we
      // still want to include this sentence as an additional possibility.
      newFilledMods = dictDeepCopy( filledMods );
      newFilledMods[preposition] = "";
      directObject = unusedWords.join( " " );
      newCompletions = this.recursiveParse( unusedWords,
					    newFilledMods,
					    newUnfilledMods );
      completions = completions.concat( newCompletions );

      return completions;
    }
  },

  substitutePronoun: function( words, context ) {
    var subbedWords = words.slice();
    var selectionUsed = false;

    var selection = getTextSelection(context);
    if (!selection) {
      selection = UbiquityGlobals.lastCmdResult;
    }
    var htmlSelection = getHtmlSelection(context);
    if (!htmlSelection)
      htmlSelection = selection;
    for ( var x in SELECTION_PRONOUNS ) {
      var index = subbedWords.indexOf( SELECTION_PRONOUNS[x] );
      if ( index > -1 ) {
	if (selection && this.canPossiblyUseNounType(arbText)) {
	  subbedWords.splice( index, 1, selection );
	  selectionUsed = true;
	} else if (htmlSelection && this.canPossiblyUseNounType(arbHtml)) {
	  subbedWords.splice( index, 1, htmlSelection );
	  selectionUsed = true;
	}
      }
    }

    if ( selectionUsed )
      return subbedWords;
    else
      return false;
  },

  getCompletions: function( words, context ) {
    /* returns a list of ParsedSentences. */
    /* words is an array of words that were space-separated.
       The first word, which matched this verb, has already been removed.
       Everything after that is either:
       1. my direct object
       2. a preposition
       3. a noun following a preposition.
    */

    /* Look for words that refer to selection: */
    var completions = [];
    var wordsWithPronounSubstituted = this.substitutePronoun( words, context );

    if ( wordsWithPronounSubstituted )
      completions = this.recursiveParse( wordsWithPronounSubstituted,
					 {},
					 this._modifiers );

    /* Also parse without that substitution, return both ways: */
    var completionsNoSub = this.recursiveParse( words, {}, this._modifiers );
    completions = completions.concat( completionsNoSub );
    return completions;
  },

  canPossiblyUseNounType: function(nounType){
    //returns the words that would be implied before the noun could makes sense,
    //i.e. put these words before the noun and try again.
    if (this._DOType == nounType ) {
      return this._name;
    }
    for( var prep in this._modifiers ) {
      if (this._modifiers[prep] == nounType) {
	return this._name + " " + prep;
	// TODO returning multiple preps when more than one could use the
	// nountype
      }
    }
    return false;
  },

  match: function( sentence ) {
    // returns a float from 0 to 1 telling how good of a match the input
    // is to this verb.
    if ( this._name.indexOf( sentence ) == 0 ) {
      // verb starts with the sentence, i.e. you may be typing this
      // verb but haven't typed the full thing yet.
      return sentence.length / this._name.length;
    } else {
      return 0.0;
    }
  }
};
