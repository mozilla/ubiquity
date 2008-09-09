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
 *   Atul Varma <atul@mozilla.com>
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
  _init: function( verb, argumentSuggestions) {
    /* modifiers is dictionary of preposition: noun */
    if (verb){
      this._verb = verb;
      this._argSuggs = argumentSuggestions;
    }
    this.matchScore = 0;
    this.frequencyScore = 0;
  },

  getCompletionText: function() {
    /* return plain text that we should set the input box to if user hits
     autocompletes to this sentence.  Currently unused! */
    var sentence = this._verb._name;
    for ( var x in this._argSuggs ) {
      if ( this._argSuggs[x] ) {
	sentence = sentence + " " + x + " " + this._argSuggs[x].text;
      }
    }
    return sentence;
  },

  getDisplayText: function() {
    // returns html formatted sentence for display in suggestion list
    let sentence = this._verb._name;
    let label;
    for ( var x in this._verb._arguments ) {
      if ( this._argSuggs[ x ] ) {
	if (x == "direct_object")
	  label = "";
	else
	  label = x;
	sentence = sentence + " <b>" + label + " " + this._argSuggs[x].summary +
		   "</b>";
      } else {
	if (this._verb._arguments[x].label) {
	  label = this._verb._arguments[x].label;
	} else {
	  label = this._verb._arguments[x].type._name;
        }
	sentence = sentence + " <span class=\"needarg\">(" + x + " " +
	  label + ")</span>";
      }
    }
    return sentence;
  },

  getIcon: function() {
    return this._verb._icon;
  },

  execute: function(context) {
    return this._verb.execute( context, this._argSuggs );
  },

  preview: function(context, previewBlock) {
    this._verb.preview( context, this._argSuggs, previewBlock );
  }
};

NLParser.EnVerb = function( cmd ) {
  if (cmd)
    this._init( cmd );
}
NLParser.EnVerb.prototype = {
  _init: function( cmd ) {
    /* cmd.DOType must be a NounType, if provided.
       cmd.modifiers should be a dictionary
       keys are prepositions
       values are NounTypes.
       example:  { "from" : City, "to" : City, "on" : Day } */
    this._execute = cmd.execute;
    this._preview = cmd.preview;
    this._name = cmd.name;
    this._icon = cmd.icon;
    this._arguments = {};

    // New-style API: command defines arguments dictionary
    if (cmd.arguments) {
      this._arguments = cmd.arguments;
    }

    /* Old-style API for backwards compatibility: command
       defines DirectObject and modifiers dictionary.  Convert
       this to argument dictionary. */
    if (cmd.DOType) {
      this._arguments.direct_object = {
	type: cmd.DOType,
	label: cmd.DOLabel,
	flag: null,
        default: cmd.DODefault
      };
    }

    if (cmd.modifiers) {
      for (let x in cmd.modifiers) {
	this._arguments[x] = {
	  type: cmd.modifiers[x],
	  label: x,
	  flag: x
	};
	if (cmd.modifierDefaults) {
	  this._arguments[x].default = cmd.modifierDefaults[x];
	}
      }
    }
  },

  execute: function( context, argumentValues ) {
    /* Once we convert all commands to using an arguments dictionary,
     * this can just pass argumentValues to _execut().  But for now,
     * commands expect the direct object to be separate, so pull it out
     * to pass it in separately.
     */
    let directObjectVal = null;
    if (argumentValues && argumentValues.direct_object) {
      // TODO: when direct obj is not specified, we should use a
      // nothingSugg, so argumentValues.direct_object should never be false.
      directObjectVal = argumentValues.direct_object;
    }
    return this._execute( context, directObjectVal, argumentValues );
  },

  preview: function( context, argumentValues, previewBlock ) {
    // Same logic as the execute command -- see comment above.
    if (this._preview) {
      let directObjectVal = null;
      if (argumentValues && argumentValues.direct_object)
        directObjectVal = argumentValues.direct_object;
      this._preview( context, directObjectVal, argumentValues, previewBlock );
    } else {
      // Command exists, but has no preview; provide a default one.
      var content = "Executes the <b>" + this._name + "</b> command.";
      previewBlock.innerHTML = content;
    }
  },

  _makeNothingSugg: function() {
    return { text:"", html:null, data:null, summary:"" };
  },

  _newSentences: function( argumentSuggestions ) {
    /* Fill in missing arguments with defaults, or with nothing-suggestions if
     * no default is available.*/
    for (let x in this._arguments) {
      if (!argumentSuggestions[x]) {
        if (this._arguments[x].default) { // Argument value from verb argument default
	  argumentSuggestions[x] = CmdUtils.makeSugg(this._arguments[x].default);
	} else if (this._arguments[x].type.default) { // Argument value from nountype default
          argumentSuggestions[x] = this._arguments[x].type.default();
	} else { // No argument
	  argumentSuggestions[x] = this._makeNothingSugg();
	}
      }
    }
    return [new NLParser.EnParsedSentence(this, argumentSuggestions)];
  },

  // RecursiveParse is huge and complicated.
  // I think it should probably be moved from Verb to NLParser.
  recursiveParse: function(unusedWords, filledArgs, unfilledArgs, selObj) {
    var x;
    var suggestions = [];
    var completions = [];
    var newFilledArgs = {};
    var newCompletions = [];
    // First, the termination conditions of the recursion:
    if (unusedWords.length == 0) {
      // We've used the whole sentence; no more words. Return what we have.
      return this._newSentences(filledArgs);
    } else if ( dictKeys( unfilledArgs ).length == 0 ) {
      // We've used up all arguments, so we can't continue parsing, but
      // there are still unused words.  This was a bad parsing; don't use it.
      return [];
    } else {
      // "pop" off the LAST unfilled argument in the sentence and try to fill it
      var argName = dictKeys( unfilledArgs ).reverse()[0];
      // newUnfilledArgs is the same as unfilledArgs without argName
      var newUnfilledArgs = dictDeepCopy( unfilledArgs );
      delete newUnfilledArgs[argName];

      // Look for a match for this preposition
      var nounType = unfilledArgs[argName].type;
      var nounLabel = unfilledArgs[argName].label;
      var preposition = unfilledArgs[argName].flag;
      for ( x = 0; x < unusedWords.length; x++ ) {
	if ( preposition == null || preposition == unusedWords[x] ) {
	  /* a match for the preposition is found at position x!
	   (require exact matches for prepositions.)
	   Anything following this preposition could be part of the noun.
           Check every possibility starting from "all remaining words" and
	   working backwards down to "just the word after the preposition."
	   */
	  let lastWordEnd = (preposition == null)? x : x +1;
	  let lastWordStart = (preposition == null)? unusedWords.length : unusedWords.length -1;
	  for (let lastWord = lastWordStart; lastWord >= lastWordEnd; lastWord--) {
	    //copy the array, don't modify the original
            let newUnusedWords = unusedWords.slice();
	    if (preposition != null) {
              // take out the preposition
	      newUnusedWords.splice(x, 1);
	    }
	    // pull out words from preposition up to lastWord, as nounWords:
            let nounWords = newUnusedWords.splice( x, lastWord - x );

            // Add all suggestions the nounType can produce for the noun words:
            suggestions = this._suggestForNoun( nounType,
		                                nounLabel,
					        nounWords,
  					        selObj);
	    // Turn each suggestion into a sentence, after recursively
	    // parsing the leftover words.
	    for each( let sugg in suggestions ) {
	      if (sugg) {
                newFilledArgs = dictDeepCopy( filledArgs );
                newFilledArgs[ argName ] = sugg;
                newCompletions = this.recursiveParse( newUnusedWords,
		    				      newFilledArgs,
						      newUnfilledArgs,
						      selObj);
	        // Add results to the ever-growing completion list...
	        completions = completions.concat( newCompletions );
	      }
	    }
	  }
	} // end if preposition matches
      } // end for each unsed word
      // Try adding a completion where the argument is left blank.
      newFilledArgs = dictDeepCopy( filledArgs );
      newFilledArgs[argName] = this._makeNothingSugg;
      newCompletions = this.recursiveParse( unusedWords,
       					    newFilledArgs,
       					    newUnfilledArgs,
       					    selObj);
      completions = completions.concat( newCompletions );
      return completions;
    } // end if there are still arguments
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
    var suggestions = this.suggestWithPronounSub( nounType, words, selObj);
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
      completions = completions.concat(this._newSentences( {} ) );
    }
    else {
      completions = this.recursiveParse( inputArguments, {}, this._arguments, selObj );
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

    // Try it as each argument...
    for (let x in this._arguments) {
      try {
        let suggs = this._arguments[x].type.suggest(text, html);
        for each (let sugg in suggs) {
          if (sugg) {
            let argVals = {};
            argVals[x] = sugg;
	    let sentences = this._newSentences(argVals);
	    for each( let sentence in sentences) {
              sentence.matchScore = this._arguments[x].type.rankLast ? 0 : 1;
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
