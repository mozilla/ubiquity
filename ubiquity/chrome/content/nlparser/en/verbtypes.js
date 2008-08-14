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


NLParser.EnParsedSentence = function( verb, DO, modifiers ) {
  /* DO and the values of modifiers should be NLParser.EnInputData
   * objects.
   */
  this._init( verb, DO, modifiers );
}
NLParser.EnParsedSentence.prototype = {
  _init: function( verb, DO, modifiers) {
    /* modifiers is dictionary of preposition: noun */
    if (verb){
      this._verb = verb;
      this._DO = DO;
      this._modifiers = modifiers;
    }
  },

  getCompletionText: function() {
    /* return plain text that we should set the input box to if user hits
     autocompletes to this sentence.  Currently unused! */
    var sentence = this._verb._name;
    if ( this._DO ) {
      sentence = sentence + " " + this._DO.text;
    }
    for ( var x in this._modifiers ) {
      if ( this._modifiers[x] ) {
	sentence = sentence + " " + x + " " + this._modifiers[x].text;
      }
    }
    return sentence;
  },

  getDisplayText: function() {
    // returns html formatted sentence for display in suggestion list
    let sentence = this._verb._name;
    if ( this._verb._DOType ) {
      if ( this._DO.summary ) {
	sentence = sentence + " " + this._DO.summary;
      } else {
	//var arg = this._verb._DOLabel.substring
	sentence = sentence + " <span class=\"needarg\">(" + this._verb._DOLabel + ")</span>";
      }
    }

    for ( var x in this._verb._modifiers ) {
      if ( this._modifiers[ x ].summary ) {
	sentence = sentence + " <b>" +  x + " " + this._modifiers[x].summary +
		   "</b>";
      } else {
	sentence = sentence + " <span class=\"needarg\">(" + x + " " +
	  this._verb._modifiers[x]._name + ")</span>";
      }
    }
    return sentence;
  },

  execute: function(context) {
    return this._verb.execute( context, this._DO, this._modifiers );
  },

  preview: function(context, previewBlock) {
    this._verb.preview( context, this._DO, this._modifiers, previewBlock );
  }
};

NLParser.EnVerb = function( cmd ) {
  if (cmd)
    this._init( cmd );
}
NLParser.EnVerb.prototype = {
  _init: function( cmd ) {
    this._execute = cmd.execute;
    this._preview = cmd.preview;
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
    return this._execute( context, directObject, modifiers );
  },

  preview: function( context, directObject, modifiers, previewBlock ) {
    if (this._preview)
      this._preview( context, directObject, modifiers, previewBlock );
    else {
      // Command exists, but has no preview; provide a default one.
      var content = "Executes the <b>" + this._name + "</b> command.";
      previewBlock.innerHTML = content;
    }
  },

  _newSentence: function( directObj, modifiersText ) {
    let modifiersObjects= {};
    let text = null;
    let data = null;
    // TODO THIS IS HACK
    if (typeof directObj == "string") {
      text = directObj;
    } else {
      data = directObj;
    }
    for (let x in modifiersText) {
      modifiersObjects[x] = new NLParser.EnInputData( modifiersText[x] );
    }
    let directObject = new NLParser.EnInputData(text, null, data);
    return new NLParser.EnParsedSentence(this, directObject, modifiersObjects);
  },

  // RecursiveParse is huge and complicated.
  // I think it should probably be moved from Verb to NLParser.
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
	return [ this._newSentence("", filledMods ) ];
      } else {
	// Transitive verb, can have direct object.  Try to use the
	// remaining words in that slot.
	directObject = unusedWords.join( " " );
	if ( this._DOType.match( directObject ) ) {
	  // it's a valid direct object.  Make a sentence for each
	  // possible noun completion based on it; return them all.
	  suggestions = this._DOType.suggest( directObject );
	  for each ( let sugg in suggestions ) {
	    completions.push( this._newSentence(sugg, filledMods ));
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

  canPossiblyUseSelection: function( textSel, htmlSel ) {
    if (this._DOType) {
      if (this._DOType.expectsHtmlSelection) {
	if (this._DOType.match(htmlSel))
	  return "html";
      } else {
	if (this._DOType.match(textSel))
	  return "text";
      }
    }
    for each( type in this._modifiers) {
      if (type.expectsHtmlSelection) {
	if (type.match(htmlSel))
	  return "html";
      } else {
	if (type.match(textSel))
	  return "text";
      }
    }
    return false;
  },

  substitutePronoun: function( words, context ) {
    /* TODO will need to refactor so that substitutePronoun is called from
     * inside recursiveParse to interpolate the selection (by calling
     * NLParser.inputObjectFromSelection) right before checking for noun
     * validity and making a parsedSentence out of it.
     */
    var subbedWords = words.slice();
    var selectionUsed = false;

    var selection = getTextSelection(context);
    if (!selection) {
      selection = UbiquityGlobals.lastCmdResult;
    }
    var htmlSelection = getHtmlSelection(context);
    if (!htmlSelection)
      htmlSelection = selection;

    /* No selection to interpolate. */
    if ((!selection) && (!htmlSelection))
      return false;

    selectionUsed = this.canPossiblyUseSelection( selection,
						  htmlSelection);
    /* There's a selection but no argument that can use it.*/
    if (!selectionUsed)
      return false;

    /* There's no arguments or pronouns given... pretend we've got a
     * "this" so we can interpolate the selection there and see what we get.*/
    if (subbedWords.length == 0) {
     subbedWords = ["this"];
    }

    for each ( pronoun in NLParser.EN_SELECTION_PRONOUNS ) {
      var index = subbedWords.indexOf( pronoun );
      if ( index > -1 ) {
	if (selectionUsed == "text")
	  subbedWords.splice(index, 1, selection);
	else if (selectionUsed == "html")
	  subbedWords.splice(index, 1, htmlSelection);
	return subbedWords;
      }
    }
    /* Note that the above will stop looking when it hits the first
     * pronoun that can take the selection as substitution.  TODO is
     * if there are more pronouns later in the input that could take it,
     * offer each one of them as a suggestion.
     */
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
    var wordsWithPronounSubstituted = this.substitutePronoun( words,
							      context);

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
    if (this._DOType)
      if (this._DOType._name == nounType._name ) {
	return this._name;
      }
    for( let prep in this._modifiers ) {
      if (this._modifiers[prep]._name == nounType._name) {
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
