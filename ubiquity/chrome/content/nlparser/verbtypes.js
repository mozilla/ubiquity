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

  execute: function() {
    return this._verb.execute( this._DO, this._modifiers );
  }

};


function Verb( cmdFunction ) {
  this._init( cmdFunction );
}
Verb.prototype = {
  _init: function( cmdFunction ) {
    this._cmdFunction = cmdFunction;
    this._name = cmdFunction.name;
    this._DOLabel = cmdFunction.DOLabel;
    this._DOType = cmdFunction.DOType; // must be a NounType.
    this._modifiers = cmdFunction.modifiers;
    // modifiers should be a dictionary
    // keys are prepositions
    // values are NounTypes.
    // example:  { "from" : City, "to" : City, "on" : Day }
  },

  execute: function( directObject, modifiers ) {
    return this._cmdFunction( directObject, modifiers );
  },

  getDescription: function( directObject, prepositionPhrases ) {
    // returns a string describing what the sentence will do if executed
    var desc = "Hit enter to do " + this._name + " with direct object " + directObject;
    for ( var x in prepositionPhrases ) {
      desc = desc + ", " + x + " " + prepositionPhrases[x];
    }
    return desc;
  },

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

  getCompletions: function( words ) {
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
    var subbedWords = words.slice();
    var selectionUsed = false;
    var selection = getSelection();
    if ( selection ) {
      for ( var x in wordsThatReferToSelection ) {
	var index = subbedWords.indexOf( wordsThatReferToSelection[x] );
	if ( index > -1 ) {
	  subbedWords.splice( index, 1, selection );
	  // Notice the above line doesn't do what I want if selection
	  // is more than one word.
	  selectionUsed = true;
	}
      }
    }
    if ( selectionUsed ) {
      completions = this.recursiveParse( subbedWords, {}, this._modifiers );
    }

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
