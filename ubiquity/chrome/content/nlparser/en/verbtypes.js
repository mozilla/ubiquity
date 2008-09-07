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
    this.matchScore = 0;
    this.frequencyScore = 0;
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

  _newSentences: function( directObjSugg, modifierSuggs ) {
    /* Add in nothing-suggestion objects for any missing arguments.*/
    if (this._DOType && !directObjSugg)
      directObjSugg = this._makeNothingSugg();
    for (let x in this._modifiers)
      if (!modifierSuggs[x])
	modifierSuggs[x] = this._makeNothingSugg();
    return [new NLParser.EnParsedSentence(this, directObjSugg, modifierSuggs)];
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
	return this._newSentences("", filledMods );
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
	    completions = completions.concat( this._newSentences(sugg, filledMods ));
	}
	return completions;
      }
    } else {
      // "pop" a preposition off -- the LAST unfilled mod in the sentence:
      var preposition = dictKeys( unfilledMods ).reverse()[0];
      // newUnfilledMods is the same as unfilledMods without preposition
      var newUnfilledMods = dictDeepCopy( unfilledMods );
      delete newUnfilledMods[preposition];

      // Look for a match for this preposition
      var nounType = unfilledMods[ preposition ];
      for ( x = 0; x < unusedWords.length - 1; x++ ) {
	if ( preposition == unusedWords[x] ) {
	  /* a match for the preposition is found at position x!
	   (require exact matches for prepositions.)
	   Anything following this preposition could be part of the noun.
           Check every possibility starting from "all remaining words" and
	   working backwards down to "just the word after the preposition."
	   */
	  for (let lastWord = unusedWords.length - 1; lastWord > x; lastWord--) {
	    //copy the array, don't modify the original
            let newUnusedWords = unusedWords.slice();
	    // take out the preposition
	    newUnusedWords.splice(x, 1);
	    // pull out words from preposition up to lastWord, as nounWords:
            let nounWords = newUnusedWords.splice( x, lastWord - x );

            // Add all suggestions the nounType can produce for the noun words:
            suggestions = this._suggestForNoun( nounType,
		                                preposition,
					        nounWords,
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
    /* returns a list of ParsedSentences, each with a quality ranking.
       words is an array of all the words in the input (already split).
       selObj is a selectionObject, wrapping both the text and html
       selections.
    */
    let completions = [];
    let inputVerb = words[0];
    let matchScore = this.match( inputVerb );
    if (matchScore == 0) {
      // Not a match to this verb!
      return [];
    }

    let inputArguments = words.slice(1);
    if (inputArguments.length == 0) {
      // make suggestions by using selection as arguments...
      completions = this.getCompletionsFromNounOnly(selObj.text, selObj.html);
      // also, try a completion with all empty arguments
      completions = completions.concat(this._newSentences( null, {} ) );
    }
    else {
      completions = this.recursiveParse( inputArguments, {}, this._modifiers, selObj );
    }

    for each( let comp in completions) {
      comp.matchScore = matchScore;
    }
    return completions;
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
          if (sugg) {
	    let sentences = this._newSentences( sugg, {});
	    for each( let sentence in sentences) {
              sentence.matchScore = this._DOType.rankLast ? 0 : 1;
              completions.push(sentence);
	    }
	  }
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
	    let sentences = this._newSentences(null, mods);
	    for each( let sentence in sentences) {
              sentence.matchScore = this._modifiers[x].rankLast ? 0 : 1;
              completions.push( sentence );
	    }
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

  match: function( inputWord ) {
    /* returns a float from 0 to 1 telling how good of a match the input
       is to this verb.  Return value will be used for sorting.
       The current heuristic is extremely ad-hoc but produces the ordering
       we want... so far.*/

    if (this._name == inputWord)
      // Perfect match always gets maximum rating!
      return 1.0;

    let index = this._name.indexOf( inputWord );
    if ( index == 0 ) {
      // verb starts with the input! A good match.
      // The more letters of the verb that have been typed, the better the
      // match is. (Note this privileges short verbs over longer ones)
      return 0.5 + 0.5* (inputWord.length / this._name.length);
    } else if ( index > 0 ) {
      // The input matches the middle of the verb.  Not such a good match but
      // still a match.
      return 0.5 * (inputWord.length / this._name.length);
    } else {
      // Not a match at all!
      return 0.0;
    }

    // TODO: disjoint matches, e.g. matching "atc" to "add-to-calendar"
  }
};
