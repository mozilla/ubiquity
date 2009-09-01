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

var {push} = Array.prototype;

function recursiveParse(unusedWords, filledArgs, objYet, prepsYet) {
  // First, the termination conditions of the recursion:
  if (!unusedWords.length)
    // We've used the whole sentence; no more words. Return what we have.
    return [filledArgs];

  NO_MORE_PREPS: {
    for (let key in prepsYet) break NO_MORE_PREPS;
    if (objYet) {
      // If only direct object remains, give it all and we're done.
      let filled = {object: unusedWords};
      for (let key in filledArgs) filled[key] = filledArgs[key];
      return [filled];
    }
    // We've used up all arguments, so we can't continue parsing, but
    // there are still unused words.  This was a bad parsing; don't use it.
    return [];
  }

  var completions = [];
  var len = unusedWords.length;
  for (let i = 0, to = objYet ? len - 1 : 1; i < to; ++i) {
    let word = unusedWords[i];
    for (let name in prepsYet) {
      if (word !== prepsYet[name]) continue;
      // Found a prep
      let objNext = objYet && !i; // next only if we're at leftmost
      for (let j = i + 2; j <= len; ++j) {
        let prepsNext = {};
        for (let key in prepsYet) prepsNext[key] = prepsYet[key];
        delete prepsNext[name];
        let filled = {};
        for (let key in filledArgs) filled[key] = filledArgs[key];
        if (i) filled.object = unusedWords.slice(0, i);
        filled[name] = unusedWords.slice(i + 1, j);
        push.apply(completions, recursiveParse(unusedWords.slice(j), filled,
                                               objNext, prepsNext));
      }
      break;
    }
  }
  ONLY_OBJ: if (objYet) {
    for (var key in filledArgs) break ONLY_OBJ;
    completions.push({object: unusedWords});
  }
  return completions;
}

function parseSentence(inputString, verbList, selObj, makePPS) {
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
    // Recursively parse to assign arguments
    let preps = {}; // {source: "to", goal: "from", ...}
    let args = verb._arguments;
    for (let key in args) preps[key] = args[key].flag;
    delete preps.object;
    let argStringsList = recursiveParse(inputArgs, {},
                                        "object" in args, preps);
    for each (let argStrings in argStringsList)
      parsings.push(makePPS(verb, argStrings, selObj, matchScore));
  }
  return parsings;
}
