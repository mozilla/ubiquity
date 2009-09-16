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
 *   Satoshi Murakami <murky.satyr@gmail.com>
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

var EXPORTED_SYMBOLS = ["EnParser"];

var EnParser = {
  parseSentence: parseSentence,
  PRONOUNS: ["this", "that", "it", "selection", "him", "her", "them"],
};

Components.utils.import("resource://ubiquity/modules/utils.js");

var {isEmpty} = Utils;
var {push} = Array.prototype;

function shallowCopy(dic) {
  var dup = {};
  for (var key in dic) dup[key] = dic[key];
  return dup;
}

function recursiveParse(unusedWords, filledArgs, objYet, prepDict) {
  var len = unusedWords.length;
  if (!len) return [filledArgs]; // no more words; return what we have

  var completions = [];
  for (var prepYet in prepDict) break;
  if (prepYet) for (let i = 0, z = objYet ? len : 1; i < z; ++i) {
    let word = unusedWords[i];
    for (let name in prepDict) if (prepDict[name].indexOf(word) === 0) {
      // found a preposition
      let objNext = objYet && !i;  // next only if we're at leftmost
      // +1 loop to allow a preposition at last if we're at rightmost
      for (let j = i + 2, z = len + (i + 1 === len); j <= z; ++j) {
        let prepNext = shallowCopy(prepDict);
        delete prepNext[name];
        let filled = shallowCopy(filledArgs);
        if (i) filled.object = unusedWords.slice(0, i);
        filled[name] = unusedWords.slice(i + 1, j);
        push.apply(completions, recursiveParse(unusedWords.slice(j), filled,
                                               objNext, prepNext));
      }
      break;
    }
  }
  if (objYet) {
    let filled = shallowCopy(filledArgs);
    filled.object = unusedWords;
    completions.push(filled);
  }
  return completions;
}

function parseSentence(inputString, verbList, makePPS) {
  // Returns a list of PartiallyParsedSentences.
  let parsings = [];
  // English uses spaces between words:
  // If input is "dostuff " (note space) then splitting on space will
  //  produce ["dostuff", ""].  We don't want the empty string, so drop
  //  all zero-length strings:
  let words = [word for each (word in inputString.split(" ")) if (word)];
  if (!words.length) return parsings;

  // English puts verb at the beginning of the sentence:
  let inputVerb = words.shift().toLowerCase(); // Verb#match() uses lower-case
  // And the arguments after it:
  let inputArgs = words;
  // Try matching the verb against all the words we know:
  for each (let verb in verbList) if (!verb.disabled) {
    let matchScore = verb.match(inputVerb);
    if (!matchScore) continue;
    let {args} = verb;
    if (isEmpty(args)) {
      parsings.push(makePPS(verb, {}, matchScore));
      continue;
    }
    // Recursively parse to assign arguments
    let preps = {}; // {source: "to", goal: "from", ...}
    for (let key in args) preps[key] = args[key].preposition;
    delete preps.object;
    let hasObj = "object" in args;
    let argStringsList = recursiveParse(inputArgs, {}, hasObj , preps);
    for each (let argStrings in argStringsList)
      parsings.push(makePPS(verb, argStrings, matchScore));
    if (!argStringsList.length && !hasObj)
      // manual interpolations for required prepositions
      for (let arg in args) {
        let argStr = {};
        argStr[arg] = inputArgs;
        parsings.push(makePPS(verb, argStr, matchScore));
      }
  }
  return parsings;
}
