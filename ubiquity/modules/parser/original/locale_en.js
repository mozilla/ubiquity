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

EXPORTED_SYMBOLS = ["EnParser"];

Components.utils.import("resource://ubiquity/modules/parser/original/parser.js");

var EnParser = {};

EnParser.PRONOUNS = ["this", "that", "it", "selection", "him", "her", "them"];

function _recursiveParse(unusedWords,
                         filledArgs,
                         unfilledArgs,
                         creationCallback) {
  // First, the termination conditions of the recursion:
  if (!unusedWords.length) {
    // We've used the whole sentence; no more words. Return what we have.
    return [creationCallback(filledArgs)];
  }

  // separate names of prepositions and direct_object
  var unfilledNames = [], directName, name;
  for(var name in unfilledArgs) {
    if(unfilledArgs[name].flag === null) {
      directName = name;
    } else {
      unfilledNames.push(name);
    }
  }
  if (!name) {
    // We've used up all arguments, so we can't continue parsing, but
    // there are still unused words.  This was a bad parsing; don't use it.
    return [];
  }

  if(!unfilledNames.length && directName) {
    // If only direct_object remains, give it all and we're done.
    let newFilledArgs = {};
    newFilledArgs[directName] = unusedWords;
    for (let key in filledArgs) {
      newFilledArgs[key] = filledArgs[key];
    }
    return [creationCallback(newFilledArgs)];
  }

  // "pop" off the LAST unfilled argument in the sentence and try to fill it
  // newUnfilledArgs is the same as unfilledArgs without argName
  var argName, newUnfilledArgs = {};
  for (var argName in unfilledArgs)  {
    newUnfilledArgs[argName] = unfilledArgs[argName];
  }
  delete newUnfilledArgs[argName];

  // Get the completions with the argName left blank
  var completions = _recursiveParse(unusedWords,
                                    filledArgs,
                                    newUnfilledArgs,
                                    creationCallback);
  var preposition = unfilledArgs[argName].flag;
  // the last word can't be a preposition
  var x = unusedWords.length - 1;
  while (x --> 0) if (preposition === unusedWords[x]) {
      /* a match for the preposition is found at position x!
        (require exact matches for prepositions.)
        Things after modifiers which do not match the noun type are thrown out.
        Check every possibility starting from "all remaining words" and
        working backwards down to "just the word after the preposition."
      */
    let lastWordEnd = x + 1;
    for (let lastWord = unusedWords.length; lastWord > lastWordEnd; --lastWord) {
      let newFilledArgs = {};
      for (let key in filledArgs) newFilledArgs[key] = filledArgs[key];
      // copy words from preposition up to lastWord, as nounWords:
      newFilledArgs[argName] = unusedWords.slice(lastWordEnd, lastWord);
      // copy the array without the preposition and the remaining words.
      let newUnusedWords = unusedWords.slice(0, x);
      completions = completions.concat(_recursiveParse(newUnusedWords,
                                                       newFilledArgs,
                                                       newUnfilledArgs,
                                                       creationCallback));
    }
  } // end for each unused word that matches preposition

  return completions;
}

EnParser.parseSentence = function(inputString, nounList, verbList, selObj ){
  // Returns a list of PartiallyParsedSentences.
  // Language-specific.  This one is for English.
  let parsings = [];

  // English uses spaces between words:
  let words = inputString.split(" ");
  /* If input is "dostuff " (note space) then splitting on space will
   *  produce ["dostuff", ""].  We don't want the empty string, so drop
   *  all zero-length strings: */
  words = [ word for each(word in words) if (word.length > 0)];
  // English puts verb at the beginning of the sentence:
  let inputVerb = words[0];
  // And the arguments after it:
  let inputArguments = words.slice(1);

  // Try matching the verb against all the words we know:
  for each (let verb in verbList) if (!verb.disabled) {
    let matchScore = verb.match( inputVerb );

    if (matchScore == 0)
      continue;
    let newParsings = [];
    if (inputArguments.length == 0) {
      // No arguments
      newParsings = [new NLParser1.PartiallyParsedSentence(verb,
                                                          {},
                                                          selObj,
                                                          matchScore,
                                                          EnParser)];
    } else {
      // Recursively parse to assign arguments
      let makeNewParsing = function( argStrings ) {
        return new NLParser1.PartiallyParsedSentence(verb,
                                                    argStrings,
                                                    selObj,
                                                    matchScore,
                                                    EnParser);
      };
      newParsings = _recursiveParse( inputArguments,
                                     {},
                                     verb._arguments,
                                     makeNewParsing);
    }
    parsings = parsings.concat( newParsings );
  }

  return parsings;
}

NLParser1.registerPluginForLanguage("en", EnParser);
