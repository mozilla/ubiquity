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

  getIcon: function() {
    return this._verb._icon;
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
    this._icon = cmd.icon;
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

  _makeNothingSugg: function() {
    return { text:"", html:null, data:null, summary:"" };
  },

  _newSentence: function( directObjSugg, modifierSuggs ) {
    /* Add in nothing-suggestion objects for any missing arguments.*/
    if (this._DOType && !directObjSugg)
      directObjSugg = this._makeNothingSugg();
    for (let x in this._modifiers)
      if (!modifierSuggs[x])
	modifierSuggs[x] = this._makeNothingSugg();
    return new NLParser.EnParsedSentence(this, directObjSugg, modifierSuggs);
  },

  _newSubParsing: function() {
    let parsing = {};
    if (this._DOType)
      parsing.direct = "";
    for (let x in this._modifiers)
      parsing[x] = "";
    return parsing;
  },

  moreBetterParse: function(unusedWords, subParsing) {
    if (unusedWords.length == 0) {
      return [subParsing];
    }

    let firstWord = unusedWords[0];
    let restWords = unusedWords.slice(1);

    let someParsings = [];
    for (let pronoun in this._modifiers) {
      if (firstWord == pronoun ) {
	if (typeof subParsing[pronoun] != "string") {
          let newSubParsing = dictDeepCopy(subParsing);
          newSubParsing[pronoun] = "";
          let moreParsings = this.moreBetterParse(restWords,
		                                  newSubParsing);
	  someParsings = someParsings.concat(moreParsings);
          break;
	}
      }
    }

    for (let key in subParsing) {
      let newSubParsing = dictDeepCopy(subParsing);
      newSubParsing[key] = newSubParsing[key] + " " + firstWord;
      let moreParsings = this.moreBetterParse(restWords, newSubParsing);
      someParsings = someParsings.concat(moreParsings);
    }

    return someParsings;
  },

  startMoreBetterParse: function( words ) {
    let subParsing = {direct:""};
    let parsings = this.moreBetterParse(words, subParsing);
    return parsings;
  },

  // RecursiveParse is huge and complicated.
  // I think it should probably be moved from Verb to NLParser.
  recursiveParse: function(unusedWords, filledMods, unfilledMods, selObj) {
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
        // Make a sentence for each
	// possible noun completion based on it; return them all.
	suggestions = this._suggestForNoun( this._DOType,
					    this._DOLabel,
					    unusedWords,
					    selObj);
	for each ( let sugg in suggestions ) {
	  if (sugg)
	    completions.push( this._newSentence(sugg, filledMods ));
	}
	return completions;
      }
    } else {
      // "pop" a preposition off of the properties of unfilledMods
      var preposition = dictKeys( unfilledMods )[0];
      // newUnfilledMods is the same as unfilledMods without preposition
      var newUnfilledMods = dictDeepCopy( unfilledMods );
      delete newUnfilledMods[preposition];

      // Look for a match for this preposition
      var nounType = unfilledMods[ preposition ];
      for ( x = 0; x < unusedWords.length - 1; x++ ) {
	if ( preposition.indexOf( unusedWords[x] ) == 0 ) {
	  // a match for the preposition is found!
	  // assume noun is first word following it.
          // TODO this should be able to match a multi-word modifier, not
	 // just a single word at x+1.
	  let noun = unusedWords[ x+1 ];
	  let newUnusedWords = unusedWords.slice();
	  // remove preposition and following noun from the unused words list
	  newUnusedWords.splice( x, 2 );

	  // Add the suggestions that can be produced by substituting
	  // selection for pronoun:
          suggestions = this._suggestForNoun( nounType,
					      preposition,
					      [noun],
  					      selObj);
	  // Turn each suggestion into a sentence, after recursively
	  // parsing the leftover words.
	  for each( let sugg in suggestions ) {
	    if (sugg) {
              newFilledMods = dictDeepCopy( filledMods );
              newFilledMods[ preposition ] = sugg;
              newCompletions = this.recursiveParse( newUnusedWords,
						  newFilledMods,
						  newUnfilledMods,
						  selObj);
	      // Add results to the ever-growing completion list...
	      completions = completions.concat( newCompletions );
	    }
	  }
	}
      }
      // If no match was found, all we'll return is one sentence formed by
      // leaving that preposition blank. But even if a match was found, we
      // still want to include this sentence as an additional possibility.
      newFilledMods = dictDeepCopy( filledMods );
      newFilledMods[preposition] = this._makeNothingSugg;
      newCompletions = this.recursiveParse( unusedWords,
					    newFilledMods,
					    newUnfilledMods,
					    selObj);
      completions = completions.concat( newCompletions );
      return completions;
    }
  },

  suggestWithPronounSub: function( nounType, words, selObj ) {
    var suggestions = [];
    /* No selection to interpolate. */
    if ((!selObj.text) && (!selObj.html))
      return [];

    let selection = selObj.text;
    let htmlSelection = selObj.html;
    for each ( pronoun in NLParser.EN_SELECTION_PRONOUNS ) {
      let index = words.indexOf( pronoun );
      if ( index > -1 ) {
        if (selection) {
          let wordsCopy = words.slice();
          wordsCopy[index] = selection;
          selection = wordsCopy.join(" ");
            }
        if (htmlSelection) {
          let wordsCopy = words.slice();
          wordsCopy[index] = htmlSelection;
          htmlSelection = wordsCopy.join(" ");
        }
        try {
          let moreSuggs = nounType.suggest(selection, htmlSelection);
          suggestions = suggestions.concat( moreSuggs );
        } catch(e) {
          Components.utils.reportError("Exception occured while getting suggestions for: " + this._name);
        }
      }
    }
    return suggestions;
  },

  _suggestForNoun: function(nounType, nounLabel, words, selObj) {
    var	suggestions = this.suggestWithPronounSub( nounType, words, selObj);
    try {
      let moreSuggestions = nounType.suggest(words.join(" "));
      suggestions = suggestions.concat(moreSuggestions);
    } catch(e) {
      Components.utils.reportError(
          'Exception occured while getting suggestions for "' + this._name +
          '" with noun "' + nounLabel + '"'
          );
    }
    return suggestions;
  },

  getCompletions: function( words, selObj ) {
    /* returns a list of ParsedSentences. */
    /* words is an array of words that were space-separated.
       The first word, which matched this verb, has already been removed.
       Everything after that is either:
       1. my direct object
       2. a preposition
       3. a noun following a preposition.

       selObj is a selectionObject, wrapping both the text and html
       selections.
    */
    if (words.length == 0) {
      let completions;
      // make suggestions by using selection as arguments...
      completions = this.getCompletionsFromNounOnly(selObj.text, selObj.html);
      // also, try a completion with all empty arguments
      completions.push( this._newSentence( null, {} ) );
      return completions;
    }
    else {
      return this.recursiveParse( words, {}, this._modifiers, selObj );
    }

  },

  getCompletionsFromNounOnly: function(text, html) {
    // Try to complete sentence based just on given noun, no input arguments.
    let completions = [];

    if ((!text) && (!html))
      return [];

    // Try selection as direct object...
    if (this._DOType) {
      try {
      let suggs = this._DOType.suggest(text, html);
      for each (let sugg in suggs) {
        if (sugg)
          completions.push( this._newSentence( sugg, {}) );
        }
      } catch(e) {
        Components.utils.reportError(
          'Exception occured while getting suggestions for "' + this._name +
          '" with noun "' + this._DOLabel + '"'
          );      }
    }

    // Try it as each modifier....
    for (let x in this._modifiers) {
      try {
        let suggs = this._modifiers[x].suggest(text, html);
        for each (let sugg in suggs) {
          if (sugg) {
            let mods = {};
            mods[x] = sugg;
            completions.push( this._newSentence(null, mods) );
          }
        }
      } catch(e) {
        Components.utils.reportError(
          'Exception occured while getting suggestions for "' + this._name +
          '" with preposition "' + x + '"'
          );      }
    }
    return completions;
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
