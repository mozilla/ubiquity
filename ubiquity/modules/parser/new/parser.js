/***** BEGIN LICENSE BLOCK *****
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
 *   Michael Yoshitaka Erlewine <mitcho@mitcho.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Blair McBride <unfocused@gmail.com>
 *   Satoshi Murakami <murky.satyr@gmail.com>
 *   Brandon Pung <brandonpung@gmail.com>
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

var EXPORTED_SYMBOLS = ["Parser"];

const Cu = Components.utils;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/msgservice.js");
Cu.import("resource://ubiquity/modules/contextutils.js");
Cu.import("resource://ubiquity/modules/localization_utils.js");

// = Ubiquity Parser: The Next Generation =
//
// This file, {{{parser.js}}}, is part of the implementation of Ubiquity's
// new parser design,
// [[https://wiki.mozilla.org/Labs/Ubiquity/Parser_2]].
//
// In this file, we will set up three different classes:
// * {{{Parser}}}: each language parser will be an instance of this class
// * {{{Parser.Query}}}: this is a parser query class, as described in
//   [[http://ubiquity.mozilla.com/trac/ticket/532|trac #532]]
// * {{{Parser.Parse}}}: parses constructed and returned by parser queries
//   are of this class.

// == {{{Parser}}} ==
//
// {{{Parser}}} object initialization takes place in each individual language
// file--this, in turn, is controlled by a {{{makeXxParser}}} factory function;
// take a look at en.js for an example.

function Parser(props) {
  if (typeof props === "string")
    this.lang = props;
  else
    for (var key in props) this[key] = props[key];
}
Parser.prototype = {
  // ** {{{Parser#lang}}} **
  lang: "",

  // ** {{{Parser#branching}}} **
  //
  // The "branching" parameter refers to which direction arguments are found.
  // For example, English is a "right-braching" language. This is because the
  // noun phrases in arguments come //after// (or "right of") the delimiter
  // (in English, prepositions). It's called "branching" by analogy to a
  // tree: if at a particular node, most of the "content" goes to the right,
  // it's "right-branching". See also
  // [[http://en.wikipedia.org/wiki/Left-branching|branching on wikipedia]].
  branching: "left" || "right",
  usespaces: true,

  // ** {{{Parser#joindelimiter}}} **
  //
  // The {{{joindelimiter}}} parameter is the delimiter that gets inserted
  // when gluing arguments and their delimiters back together in display.
  // In the case of most languages, the space (' ') is fine.
  // See how it's used in {{{Parser.Parse.displayText}}}.
  //
  // TODO: {{{joindelimiter}}} and {{{usespaces}}} may or may not be
  // redundant.
  joindelimiter: " ",
  // ** {{{Parser#suggestedVerbOrder}}} **
  // For verb-final languages, this should be -1.
  // For languages where some verb forms are sentence-initial, some are
  // sentence-final (e.g. German, Dutch), suggestedVerbOrder can be a function
  // which takes the verb name and returns either 0 or -1.
  suggestedVerbOrder: 0,
  examples: [],
  clitics: [],
  anaphora: ["this"],

  // ** {{{Parser#roles}}} **
  //
  // a list of semantic roles and their delimiters
  roles: [{role: "object", delimiter: ""}],

  // ** {{{Parser#_rolesCache}}} **
  //
  // The {{{_rolesCache}}} is a cache of the different subsets of the
  // parser's roles (semantic roles and their associated delimiters)
  // are available for each verb. For example, {{{_rolesCache.add}}} will
  // give you the subset of semantic roles which are appropriate for the
  // {{{add}}} verb.
  _rolesCache: {},

  // ** {{{Parser#_patternCache}}} **
  //
  // The {{{_patternCache}}} keeps various regular expressions for use by the
  // parser. Most are created by {{{Parser#initializeCache()}}}, which is called
  // during parser creation. This way, commonly used regular expressions
  // need only be constructed once.
  _patternCache: {},

  // ** {{{Parser#_nounCache}}} **
  //
  // Perhaps this should be moved out into its own module in the future.
  // Nouns are cached in this cache in the {{{Parser#detectNounTypes}}} method
  // and associated methods. Later in the parse process elements of {{{_nounCache}}}
  // are accessed directly, assuming that the nouns were already cached
  // using {{{Parser#detectNounType}}}.
  //
  // TODO: better cleanup + management of {{{_nounCache}}}
  _nounCache: null,

  _verbList: null,
  _nounTypes: null,

  // ** {{{Parser#setCommandList()}}} **
  //
  // {{{setCommandList}}} takes the command list and filters it,
  // only registering those which have the property {{{.names}}}.
  // This is in order to filter out verbs which have not been made to
  // work with Parser 2.
  //
  // This function also now parses out all the nountypes used by each verb.
  // The nountypes registered go in the {{{Parser#_nounTypes}}} object, which
  // are used for nountype detection as well as the comparison later with the
  // nountypes specified in the verbs for argument suggestion and scoring.
  //
  // After the nountypes have been registered, {{{Parser#initializeCache()}}} is
  // called.
  setCommandList: function setCommandList(commandList) {
    // First we'll register the verbs themselves.
    this._verbList = [];
    var skippedSomeVerbs = false;
    for each (let verb in commandList) if (!verb.disabled) {
      if (verb.arguments)
        this._verbList.push(verb);
      else
        skippedSomeVerbs = true;
    }
    dump("loaded verbs:\n" +
         this._verbList.map(function(v) v.names[0]).join("\n") + "\n");

    if (skippedSomeVerbs) {
      var msgService = new AlertMessageService();
      msgService.displayMessage("Some verbs were not loaded " +
                                "as they are not compatible with Parser 2.");
    }

    for each (let verb in this._verbList) {
      if ((verb.feedUri || 0).scheme === "file") {
        let feedKey = LocalizationUtils.getLocalFeedKey(verb.feedUri.path);
        LocalizationUtils.loadLocalStringBundle(feedKey);
      }
    }

    // Scrape the noun types up here.
    this._nounTypes = {};
    for each (let verb in this._verbList) {
      for each (let arg in verb.arguments) {
        let {id} = arg.nountype;
        if (!(id in this._nounTypes)) {
          this._nounTypes[id] = arg.nountype;
        }
      }
    }
    dump("loaded nouns:\n" +
         [n.id + " " + n.name for each (n in this._nounTypes)].join("\n") +
         "\n");

    this.initializeCache();
  },

  // ** {{{Parser#initializeCache()}}} **
  //
  // This method is initialized when the language is loaded.
  // Caches a number of commonly used regex's into {{{this._patternCache}}}.
  initializeCache: function() {
    this._nounCache = {};

    var patternCache = this._patternCache = {};

    // creates a list of prefixs from a set of strings,
    // removing duplicates and sorting in descending order.
    function prefixes(strs) {
      var dic = {};
      for each (let s in strs) for (let i in s) dic[s.slice(0, +i + 1)] = 1;
      return [p for (p in dic)].sort(function(a, b) b.length - a.length);
    }
    // creates a regex fragment that matches a set of strings,
    // escaping them properly.
    function pipedFragment(strs)
      strs.map(function(s) s.replace(/\W/g, "\\$&")).join("|");
    function regexFromDelimeters(roles)
      RegExp("^(?:" +
             pipedFragment([role.delimiter for each (role in roles)]) +
             ")$",
             "i");

    // verbMatcher matches any active verb or prefix thereof
    patternCache.verbMatcher =
      pipedFragment(prefixes([n for each (verb in this._verbList)
                                for each (n in verb.names)]));

    // verbInitialTest matches a verb at the beginning
    patternCache.verbInitialTest =
      RegExp(("^\\s*(" + this._patternCache.verbMatcher + ")" +
              (this.usespaces ? "(\\s+.*$|$)" : "(.*$)")),
             'i');
    // verbFinalTest matches a verb at the end of the string
    patternCache.verbFinalTest =
      RegExp(((this.usespaces ? "(^.*\\s+|^)" : "(^.*)") +
              "(" + this._patternCache.verbMatcher + ")\\s*$"),
             "i");

    // anaphora matches any of the anaphora ("magic words")
    // if usespaces = true, it will only look for anaphora as whole words,
    // but if usespaces = false, it will look for anaphora in words as well.
    var boundary = this.usespaces ? "\\b" : "";
    patternCache.anaphora =
      RegExp(boundary + "(?:" + pipedFragment(this.anaphora) + ")" + boundary);

    // cache the roles used in each verb and a regex
    // which recognizes the delimiters appropriate for each verb
    var rolesCache = this._rolesCache = {};
    var delimPatterns = patternCache.delimiters = {};
    for (let verbId in this._verbList) {
      // _rolesCache[verbId] is the subset of roles such that
      // there is at least one argument in verb which matches that role
      rolesCache[verbId] =
        [role for each (role in this.roles)
         if (this._verbList[verbId].arguments
             .some(function(arg) arg.role === role.role))];
      delimPatterns[verbId] = regexFromDelimeters(rolesCache[verbId]);
    }

    // this is the RegExp to recognize delimiters for an as yet unspecified
    // verb... in other words, it's just a RegExp to recognize every
    // possible delimiter.
    delimPatterns[""] = regexFromDelimeters(this.roles);
  },

  // ** {{{Parser#newQuery()}}} **
  //
  // This method returns a new {{{Parser.Query}}} object, as detailed in
  // [[http://ubiquity.mozilla.com/trac/ticket/532|trac #532]]
  newQuery: function(queryString, context, maxSuggestions,
                     dontRunImmediately) {
    var selObj = ContextUtils.getSelectionObject(context);
    var theNewQuery = new Parser.Query(this,
                                       queryString,
                                       context,
                                       maxSuggestions,
                                       dontRunImmediately);
    theNewQuery.selObj = selObj;
    return theNewQuery;
  },

  // ** {{{Parser#wordBreaker()}}} **
  //
  // Takes an input string and returns a string with some words split up
  // by default only spaces in the input are presevered, but this method
  // can be overridden by individual language parses to deal with languages
  // with no spaces and languages with strong case marking.
  //
  // see the Japanese {{{ja.wordBreaker()}}} for an example.
  wordBreaker: function(input) {
    return input;
  },

  // ** {{{Parser#verbFinder()}}} **
  //
  // Takes an input string and returns an array of pairs of verbs and
  // argument strings, in the form of {{{{_verb:..., argString:...}}}}.
  // It will return at least one possible pair, the trivial pair, which is
  // {{{{_verb: null, argString: input}}}}.
  //
  // The verb in {{{_verb}}} is actually a copy of the verb object with
  // some useful parse-specific additions:
  // * {{{_verb.id}}} is the verb's canonical name
  // * {{{_verb.text}}} is the text in the input that was matched
  // * {{{_verb._order}}} is a reference to where in the input string the verb
  //   was found: 0 if it was sentence-initial, -1 if sentence-final
  // {{{argString}}} is a string with the rest of the input.
  verbFinder: function(input) {
    // initialize the returnArray with the trivial pair.
    var returnArray = [{
      _verb: {
        id: "",
        text: null,
        _order: null,
        input: null,
      },
      argString: Utils.trim(input),
    }];

    // The match will only give us the prefix that it matched. For example,
    // if we have a verb "shoot" and had input "sho Fred", verbPrefix = "sho"
    // and now we must figure out which verb that corresponded to.
    // Keep in mind there may be multiple verbs which match the verbPrefix
    // that matched.
    //
    // TODO: write a unit test for this possibility.
    var verbs = this._verbList;
    function addParses(verbPrefix, argString, order) {
      for (var verbId in verbs) {
        var verb = verbs[verbId];
        // check each verb synonym in this language
        for each (let name in verb.names) {
          if (RegExp("^" + verbPrefix, "i").test(name)) {
            returnArray.push({
              _verb: {
                id: verbId,
                text: name,
                _order: order,
                input: verbPrefix,
                __proto__: verb,
              },
              argString: argString,
            });
            break;
          }
        }
      }
    }

    // We'll keep the initial match with no args, which we will rule out
    // in the final match.
    var verbOnlyMatch;
    // let's see if there's a verb at the beginning of the string
    var initialMatches = input.match(this._patternCache.verbInitialTest);
    if (initialMatches) {
      let [, verbPrefix, argString] = initialMatches;
      if (/^\s*$/.test(argString))
        verbOnlyMatch = verbPrefix;
      addParses(verbPrefix, argString, 0);
    }

    // let's see if there's a verb at the end of the string
    var finalMatches = input.match(this._patternCache.verbFinalTest);
    if (finalMatches) {
      let [, argString, verbPrefix] = finalMatches;
      if (argString || verbOnlyMatch !== verbPrefix)
        // we didn't already see this prefix
        // as a sentence-initial verb-only match
        addParses(verbPrefix, argString, -1);
    }

    return returnArray;
  },

  // ** {{{Parser#splitWords()}}} **
  //
  // Takes an input string and returns an object with the words and their
  // delimiters. Words are returned in left to right order, split using
  // \s and \u200b (the no-width space) as delimiters.
  //
  // The return object is of the form {{{{ words: [], delimiters: [], all: [] }}}} .
  // {{{words}}} and {{{delimiters}}} are just a copy of every other word in
  // {{{allWords}}}.
  //
  // Used by {{{Parser#argFinder()}}}
  splitWords: function(input) {
    var returnObj = { words: [], delimiters: [], allWords: [],
                      beforeSpace: '', afterSpace: '' };

    // if there is no non-space character, just return nothing.
    // (note that \S doesn't include \u200b)
    if (!/\S/.test(input))
      return returnObj;

    // take all whitespace that is not of the very special no-width variety
    // (\u200b) nor a East Asian full-width space (\u3000) and
    // replace them with regular spaces.
    input = input.replace(/[^\S\u200b\u3000]/g, ' ');

    // this regexp with the () in it matches words but also non-words
    // (delimiters). The even numbered elements will be words and the odd
    // numbered ones are delimiters.
    let splitWithWords = input.split(/(\S+)/);
    returnObj.afterSpace  = splitWithWords.pop();
    returnObj.beforeSpace = splitWithWords.shift();
    returnObj.allWords    = splitWithWords;

    for (let i in splitWithWords) {
      if (i % 2)
        returnObj.delimiters.push(splitWithWords[i]);
      else
        returnObj.words.push(splitWithWords[i]);
    }
    return returnObj;
  },

  // ** {{{Parser#hasDelimiter()}}} **
  //
  // Checks to see whether a certain delimiter is compatible with a certain
  // verb, i.e., whether that verb has a role which takes that delimiter.
  // This is done using the regex of delimiters of all roles of {{{verb}}} in
  // {{{_patternCache.delimiters[verbId]}}}. Returns true/false.
  //
  // Used by {{{Parser#argFinder()}}}
  hasDelimiter: function(delimiter, verbId) {
    return this._patternCache.delimiters[verbId].test(delimiter);
  },

  // ** {{{Parser#getRoleByDelimiter()}}} **
  //
  // Returns all semantic roles which may be represented by a given delimiter.
  //
  // Used by {{{Parser#argFinder()}}}
  getRoleByDelimiter: function(delimiter, roles) {
    delimiter = delimiter.toLowerCase();
    return [role.role for each (role in roles)
                      if (role.delimiter.toLowerCase() == delimiter) ];
  },

  // ** {{{Parser#argFinder()}}} **
  //
  // {{{argFinder()}}} takes an {{{argString}}} and a verb object (ie. each
  // pair of outputs from {{{verbFinder()}}} and attempts to find all of the
  // delimiters in the {{{argString}}} and then find different parse
  // combinations of arguments in different roles. It returns an array of
  // {{{Parser.Parse}}} objects with its arguments and verb set.
  //
  // If the {{{verb}}} argument is set, it will only look for delimiters which
  // are appropriate for the given verb (using {{{_patternCache.delimiters}}}),
  // speeding things up a little bit.
  //
  // {{{argFinder()}}} is where the {{{branching}}} parameter is incredibly
  // important. It also uses {{{Parser#splitWords()}}} to split the words up
  // in the beginning.
  //
  // ** //A high level overview of {{{Parser#argFinder()}}}// **
  //
  // Since {{{Parser#argFinder()}}} is arguably the //meat// of the parser,
  // here's a high level overview of the code in this method.
  //
  // First take a look at an example of what is being done here:
  // [[https://wiki.mozilla.org/Labs/Ubiquity/Parser_2#step_4:_group_into_arguments]].
  //
  // {{{argFinder}}} first finds all the indices of the words in the string
  // which look like a possible delimiter ({{{possibleDelimiterIndices}}}). It
  // then creates every possible combination of these positions which are
  // delimiters using a power set.
  //
  // For each of these possible delimiter positions ({{{delimiterIndices}}}),
  // it does the following:
  //
  // # If there are extra words at the beginning or end which won't be a target
  //    of any of the delimiters, throw it in the {{{object}}} role.
  // # Look at each delimiter position in {{{delimiterIndices}}}. Pick every
  //    possible substring (along word boundaries) of the argument to the
  //    delimiter's left (if left-branching) or right (if right-branching).
  //    Put that word in any of the possible roles for that delimiter.
  //    Put any extra words not picked up by that argument in {{{object}}}.
  // # Rinse and repeat.
  //
  // Since at every substep (every delimiter) in step 2 above there are
  // multiple possible role-argument assignments to be made, all the parses up
  // to the current delimiter is kept in {{{theseParses}}}. Any role-argument
  // assignment is done to a copy of every member of {{{theseParses}}} (each
  // individually called {{{thisParse}}} and these new copies are kept in
  // {{{newParses}}}. At the end of the loop, {{{newParses}}} becomes the new
  // {{{theseParses}}} to become the basis for the next loop. It's //intense//.
  //
  // Each argument that's set gets a property called {{{_order}}}. This is used
  // by {{{Parser.Parse.displayText}}} in order to reconstruct the input
  // for display. The _order values become left-to-right placement values.
  // Each argument gets one _order value for both the argument and the delimiter
  // as we can reconstruct the order of the delimiter wrt the argument using
  // the branching preference.
  //
  // TODO: add better explanation/examples of {{{_order}}} in a blog post or
  // inline.
  //
  // The {{{scoreMultiplier}}} parameter is set at this point, making
  // {{{maxScore}}} valid for all returned parses.

  argFinder: function(argString, verb, input) {
    // initialize possibleParses. This is the array that we're going to return.
    var possibleParses = [];

    // if the argString is empty, return a parse with no args.
    if (!argString) {
      let defaultParse = new Parser.Parse(this,
                                          input,
                                          verb,
                                          argString);
      if (defaultParse._verb.id) {
        defaultParse.scoreMultiplier = 1;
      } else {
        defaultParse.scoreMultiplier = 0.3;
        defaultParse._suggested = true;
      }

      // start score off with one point for the verb.
      defaultParse._score = defaultParse.scoreMultiplier;

      defaultParse.args = {};
      return [defaultParse];
    }

    // if the verb doesn't take any arguments but the argString is not empty,
    // kill this parse.
    if (verb.id && !(verb.arguments || 0).length)
      return [];

    // split words using the splitWords() method
    let splitInput = this.splitWords(argString);
    // for example, if the input is "rar rar   rar"
    // then words = ['rar','rar','rar']
    // delimiters = [' ','   ']
    // allWords = ['rar',' ','rar','   ','rar']
    let {words, delimiters, allWords} = splitInput;

    // let's find all the possible delimiters
    let possibleDelimiterIndices =
      [+i for (i in words) if (this.hasDelimiter(words[i], verb.id))];

    // if the verb is set, only look for delimiters which are available
    let roles = verb.id ? this._rolesCache[verb.id] : this.roles;

    // this is a cache of the possible roles for each delimiter word encountered
    let rolesForEachDelimiterCache = {};

    // Find all the possible combinations of delimiters.
    // This method uses .reduce to return a power set. The "power set" of a set
    // is a set of all the subsets of the original set.
    // For example: a power set of [1,2] is [[],[1],[2],[1,2]]
    //
    // This works by a reduce operation... it starts by setting last = [[]],
    // then recursively looking through all of the elements of the original
    // set. For each element e_n (current), it takes each set in the power set
    // of e_{n-1} and makes a copy of each with e_n added in (that's the
    // .concat[current]). It then adds those copies to last (hence last.concat)
    // It starts with last = [[]] because the power set of [] is [[]]. ^^
    //
    // code from http://twitter.com/mitchoyoshitaka/status/1489386225
    var possibleDelimiterCombinations = possibleDelimiterIndices.reduce(
      function(last, current) last.concat([a.concat(current)
                                           for each (a in last)]),
      [[]]);

    // for each set of delimiterIndices which are possible...
    // Note that the values in the delimiterIndices for each delimiter are the
    // indices which correspond to those delimiters.
    EACH_DI:
    for each (var delimiterIndices in possibleDelimiterCombinations) {
      // don't process invalid delimiter combinations
      // (where two delimiters are back to back)
      for (let i = delimiterIndices.length; --i > 0;) {
        if (delimiterIndices[i - 1] + 1 === delimiterIndices[i])
          continue EACH_DI;
      }

      // theseParses will be the set of new parses based on this delimiter
      // index combination. We'll seed it with a Parser.Parse which doesn't
      // have any arguments set.
      var seedParse = new Parser.Parse(this,
                                       input,
                                       verb,
                                       argString);
      // get all parses started off with their scoreMultipier values
      if (verb.id) {
        seedParse.scoreMultiplier = 1;
      } else {
        seedParse.scoreMultiplier = 0.3;
        seedParse._suggested = true;
      }
      // if there are no delimiters at all, put it all in the direct object
      if (!delimiterIndices.length) {
        seedParse.setArgumentSuggestion(
          "object",
          { _order: 1,
            input: allWords.join(""),
            modifier: ""});
        possibleParses.push(seedParse);
        continue;
      }

      let lastIndex = delimiterIndices[delimiterIndices.length - 1];
      // Check for a delimiter at the end (if right-
      // branching) or at the beginning (if left-branching)
      // These are bad because then they will never find an associated
      // argument.
      if (this.branching === "right" && lastIndex === words.length - 1 ||
          this.branching === "left" && delimiterIndices[0] === 0)
        dump('maybe this is why I\'m dead.\n');
      // TODO check if this breaks things and, if it does, kill these
      // delimiter combinations right here.

      // if there are extra words at the beginning or end, make them a
      // direct object
      if (this.branching === "left") {
        if (lastIndex < words.length - 1) {
          seedParse.setArgumentSuggestion(
            "object",
            { _order: 2 * delimiterIndices.length + 2,
              input: allWords.slice(2 * lastIndex + 2).join(''),
              modifier: ""}
            );
        }
      } else {
        if (delimiterIndices[0] > 0) {
          seedParse.setArgumentSuggestion(
            "object",
            { _order: 1,
              input: (allWords.slice(0, 2 * delimiterIndices[0] - 1)
                      .join('')),
              modifier: ""});
        }
      }

      var theseParses = [seedParse];

      // If we're right branching, we'll just go through left to right.
      // If we're left branching, however, we want to reverse the order of
      // the delimiterIndices in order to go through the arguments right to left.
      //
      // (It actually doesn't matter and could be done the other way, but this
      // is the way I set it up and set the _order based on this.)
      if (this.branching === "left") delimiterIndices.reverse();

      // Loop over each delimiter
      //
      // In each pass through this loop, we'll add new arguments to the copies
      // of the parses in theseParses and put them in newParses. Then, at the
      // end of the loop, we'll set theseParses = newParses. This way, at any
      // point throughout the loop, theseParses will be all the possible
      // parses of the arguments *up to* this point.
      for (let i = 0, l = delimiterIndices.length; i < l; ++i) {
        let newParses = [];

        // j will be used as an iterator for how far out from the delimiter we
        // want to reach to get an argument. For example, if we have
        //
        //   DELIMITER WORD1 WORD2 WORD3
        //
        // we want j to be the position of WORD1, WORD2, and WORD3 one after
        // the other. Thus we set jmin to be the position of WORD1 and jmax
        // to be the position of WORD3. (And inside out and vice versa for
        // left-branching languages, but you get the idea.)
        if (this.branching === "left") {// find args right to left
          var jmin = ((delimiterIndices[i + 1] == null) ?
                      0 : delimiterIndices[i + 1] + 1);
          var jmax = delimiterIndices[i] - 1;
        } else {
          var jmin = delimiterIndices[i] + 1;
          var jmax = ((delimiterIndices[i + 1] == null) ?
                      words.length - 1 : delimiterIndices[i + 1] - 1);
        }

        // Compute the possible roles for this delimiter
        // We'll keep these in a cache so we don't have to look it up
        // using Parser.getRoleByDelimiter() each time.
        let delim = words[delimiterIndices[i]];
        if (!rolesForEachDelimiterCache[delim])
          rolesForEachDelimiterCache[delim] =
            this.getRoleByDelimiter(delim, roles);

        // For each scope of arguments... for example,
        // WORD1, WORD1 WORD2, or WORD1 WORD2 WORD3...
        for (var j = jmin; j <= jmax; j++) {
          // for each delimiter's possible role
          for each (var role in rolesForEachDelimiterCache[delim]) {
            // for each of the current parses
            for (var k in theseParses) {
              // thisParse is our local copy. We'll mess with it and
              // add it into newParses.
              let thisParse = theseParses[k].copy();

              if (this.branching === "left") {// find args right to left
                // our argument is words (j)...(jmax)
                // note that Array.slice(i,k) returns *up to* k
                var argument = allWords.slice(2 * j, (2 * jmax) + 1).join('');
                // our modifier, including the space after
                var modifier = words[delimiterIndices[i]];
                var innerSpace = delimiters[delimiterIndices[i] - 1];
                var outerSpace = delimiters[delimiterIndices[i]];

                // put the selected argument in its proper role
                thisParse.setArgumentSuggestion(role,
                  { _order: 1 + 2*(delimiterIndices.length - i),
                    input: argument,
                    modifier: modifier,
                    innerSpace: innerSpace,
                    outerSpace: outerSpace
                  });

                // put the extra words between the earlier delimiter and our
                // arguments into the object role
                if (j != jmin) {

                  // our argument is words (jmin)...(j-1)
                  // note that Array.slice(i,j) returns *up to* j
                  var argument = allWords.slice(2 * jmin, 2 * (j - 1) + 1)
                                         .join('');
                  var outerSpace = (2 * (j - 1) + 1 < allWords.length ?
                                    allWords[2 * (j - 1) + 1] : '');

                  // push it!
                  thisParse.setArgumentSuggestion('object',
                    { _order: 2*(delimiterIndices.length - i),
                      input:argument,
                      modifier:'',
                      innerSpace: '',
                      outerSpace: outerSpace
                    });

                }
              } else {
                // our argument is words (jmin)...(j)
                // note that Array.slice(i,j) returns *up to* j
                var argument = allWords.slice(2 * jmin, (2 * j) + 1)
                                    .join('');

                // our delimiter
                var modifier = words[delimiterIndices[i]];
                var innerSpace = delimiters[delimiterIndices[i]];
                var outerSpace = delimiters[delimiterIndices[i] - 1];

                // put the selected argument in its proper role
                thisParse.setArgumentSuggestion(role,
                  { _order: 1 + 2*(i)+2 - 1,
                    input: argument,
                    modifier: modifier,
                    innerSpace: innerSpace,
                    outerSpace: outerSpace
                  });

                // put the extra words between this delimiter and the next
                // into the object role
                if (j != jmax) {

                  // our argument is words (j+1)...(jmax)
                  // note that Array.slice(i,j) returns *up to* j
                  var argument = allWords.slice(2 * (j + 1),(2 * jmax) + 1)
                                         .join('');
                  var outerSpace = (2 * (j + 1) - 1 >= 0 ?
                                    allWords[2 * (j + 1) - 1] : '');

                  // push it!
                  thisParse.setArgumentSuggestion('object',
                    { _order: 1 + 2*(i)+2,
                      input: argument,
                      modifier: '',
                      innerSpace: '',
                      outerSpace: outerSpace
                    });
                }
              }

              // add thisParse to newParses
              newParses.push(thisParse);
            }
          }
        }
        // we went through the loop once (through one delimiter) so
        // now we'll make theseParses = parses of all arguments through the
        // current delimiter and use it as the basis for the next delimiter's
        // argument assignments.
        theseParses = newParses;
      }
      // Put all of the different delimiterIndices combinations' parses into
      // possibleParses to return it.
      possibleParses = possibleParses.concat(theseParses);
    }
    for each (let parse in possibleParses) {
      for (let role in parse.args) {
        // if there are multiple arguments of any role, mark this parse down.
        if (parse.args[role].length > 1) {
          parse.scoreMultiplier *= Math.pow(0.5,
                                            parse.args[role].length - 1);
        }
      }
      // start score off with one point for the verb.
      parse._score = parse.scoreMultiplier;
    }

    return possibleParses;
  },

  // ** {{{Parser#cleanArgument()}}} **
  //
  // {{{cleanArgument}}} is run on each argument when being assigned to a role.
  // {{{cleanArgument}}} is the place to do things like strip off articles like
  // "the" or "a" if that is appropriate for your language.
  cleanArgument: function(word) {
    return word;
  },

  // ** {{{Parser#substituteSelection()}}} **
  //
  // {{{substituteSelection()}}} takes a parse and a selection string. It
  // should only be called if the {{{selection}}} is not empty. It looks for
  // any of the anaphora set in {{{Parser#anaphora}}} and creates a copy of
  // that parse where that anaphor has been substituted with the selection
  // string.
  //
  // The new string with the substitution is assigned to each arg's
  // {{{input}}} property.
  //
  // An array of //new// parses is returned, so it should then be
  // {{{concat}}}'ed to the current running list of parses.
  substituteSelection: function(parse, selection) {
    var returnArr = [];

    for (let role in parse.args) {
      let args = parse.args[role];
      for (let i in args) {
        let oldArg = args[i].input;
        let newArg = oldArg.replace(this._patternCache.anaphora, selection);

        if (newArg != oldArg) {
          let parseCopy = parse.copy();
          parseCopy.args[role][i].input = newArg;
          returnArr.push(parseCopy);
        }
      }
    }

    return returnArr;
  },

  // ** {{{Parser#substituteNormalizedArgs()}}} **
  //
  // {{{substituteNormalizedArgs()}}} takes a parse. It runs each argument's
  // {{{input}}} through {{{normalizeArg}}}. If {{{normalizeArg}}} returns
  // matches, it is substituted into the parse.
  //
  // An array of //new// parses is returned, so it should then be
  // {{{concat}}}'ed to the current running list of parses.
  substituteNormalizedArgs: function(parse) {
    var returnArr = [];

    for (let role in parse.args) {
      let args = parse.args[role];
      for (let i in args) {
        let arg = args[i].input;

        let baseParses = [parse].concat(returnArr);

        for each (let substitute in this.normalizeArgument(arg)) {
          for each (let baseParse in baseParses) {
            let parseCopy = baseParse.copy();
            parseCopy.args[role][i].inactivePrefix = substitute.prefix;
            parseCopy.args[role][i].input = substitute.newInput;
            parseCopy.args[role][i].inactiveSuffix = substitute.suffix;
            returnArr.push(parseCopy);
          }
        }
      }
    }

    return returnArr;
  },

  // ** {{{Parser#normalizeArg}}} **
  //
  // Returns an array of arrays of the form
  // [[arg,prefix,new argument,suffix]]
  //
  // For example, if this is Catalan, we may strip off the article "el"
  // so we'd return, on input "el google",
  // [['el google','el ','google','']]
  //
  // The easiest way to do this is to just use a String.match(), like
  // {{{return [input.match(/(el\s+|la\s+)(.+)()/i)]}}}

  normalizeArgument: function(input) {
    return [];
  },

  // ** {{{Parser#suggestVerb()}}} **
  //
  // {{{suggestVerb()}}} takes a parse and, if it doesn't yet have a verb,
  // suggests one based on its arguments. If one of the parse's argument's
  // roles is not used by a verb, that verb is not suggested.
  //
  // If a verb was suggested, {{{_suggested}}} is set to true.
  //
  // An array of //new// parses is returned, so it should replace the original
  // list of parses (which may include parses without any verbs). If none of
  // the verbs match the arguments' roles in the parse, it will return [].
  //
  // All returning parses also get their {{{scoreMultiplier}}} property set
  // here as well.
  suggestVerb: function(parse) {
    // for parses which already have a verb
    if (parse._verb.id) return [parse];

    // for parses WITHOUT a set verb:
    var returnArray = [];
    VERBS:
    for (let verbId in this._verbList) {
      let verb = this._verbList[verbId];
      // Check each role in our parse.
      // If none of the role is used by the arguments of the verb,
      // skip to next verb.
      for (let role in parse.args)
        if (!verb.arguments.some(function(arg) arg.role === role))
          continue VERBS;

      let parseCopy = parse.copy();
      // same as before: the verb is copied from the verblist but also
      // gets some extra properties (id, text, _order) assigned.
      parseCopy._verb = {
        __proto__: verb,
        id: verbId,
        text: verb.names[0],
        _order: (typeof this.suggestedVerbOrder === "function"
                 ? this.suggestedVerbOrder(verb.names[0])
                 : this.suggestedVerbOrder),
      };
      returnArray.push(parseCopy);
    }
    return returnArray;
  },

  // ** {{{Parser#suggestArgs()}}} **
  //
  // {{{suggestArgs()}}} returns an array of copies of the given parse by
  // replacing each of the arguments' text with the each nountype's suggestion.
  // This suggested result goes in the argument's {{{text}}}, {{{html}}},
  // and {{{data}}} properties. We'll also take this
  // opportunity to set each arg's {{{score}}} property, also coming from
  // the nountype's {{{suggest()}}} result, to be used in computing the
  // parse's overall score.
  //
  // If, along the way, we find that the verb does not take one of the
  // parsed arguments (nountype mismatch), we set {{{thisVerbTakesThisRole}}} =
  //  false and [] is returned.
  //
  // There may be multiple returned as each argument may have multiple possible
  // nountypes or multiple suggestions for each nountype.
  //
  // This function *also* takes care of filling in unfilled arguments with
  // the nountypes' and verbs' default values (if available).

  suggestArgs: function suggestArgs(parse) {
    //Utils.log('verb:'+parse._verb.name);

    // make sure we keep the anaphor-substituted input intact... we're
    // going to make changes to text, html, score, and nountype
    let returnArr = [parse.copy()];

    for (let role in parse.args) {
      //Utils.log(role);
      let thisVerbTakesThisRole = false;

      for each (let verbArg in parse._verb.arguments) {
        if (role == verbArg.role) {
          // for each argument of this role...
          for (let i in parse.args[role]) {
            // this is the argText to check
            let argText = parse.args[role][i].input;

            // At this point we assume that all of these values have already
            // been cached in Parser._nounCache.

            let newreturn = [];
            // make a copy using each of the suggestions in the nounCache
            // as the replaced suggestion, and put all of the replacement
            // parses into newreturn.

            // BEGIN NEW NOUNCACHE STRUCTURE
            /*let nountypeId = verbArg.nountype.id;
            if (nountypeId in this._nounCache[argText]) {
              
              for each (let suggestion in this._nounCache[argText][nountypeId]) {
                for each (let parse in returnArr) {
                  let parseCopy = parse.copy();
                  // copy the attributes we want to copy from the nounCache
                  let newSugg = parseCopy.args[role][i];
                  for(let key in suggestion)
                    newSugg[key] = suggestion[key];
                  newreturn.push(parseCopy);
                }
              }
            } else {
              returnArr = newreturn;
              thisVerbTakesThisRole = true;
            }*/
            // END NEW NOUNCACHE STRUCTURE

            // BEGIN OLD NOUNCACHE STRUCTURE
            let thereWasASuggestionWithTheRightNounType = false;
            for each (let suggestion in this._nounCache[argText]) {
              if (suggestion.nountypeId === verbArg.nountype.id) {
                thereWasASuggestionWithTheRightNounType = true;

                for each (let parse in returnArr) {
                  let parseCopy = parse.copy();
                  // copy the attributes we want to copy from the nounCache
                  let newSugg = parseCopy.args[role][i];
                  for(let key in suggestion)
                    newSugg[key] = suggestion[key];
                  newreturn.push(parseCopy);
                }
              }
            }
            if (thereWasASuggestionWithTheRightNounType) {
              returnArr = newreturn;
              thisVerbTakesThisRole = true;
            }
            // END OLD NOUNCACHE STRUCTURE
            
          }

          // If thisVerbTakesThisRole, it means that we've already found the
          // appropriate argument for this role and thus we do not have to
          // keep looking. The continue statement means we move onto the next
          // role.
          if (thisVerbTakesThisRole)
            continue;
        }
      }
      //Utils.log('finished role');
      if (!thisVerbTakesThisRole)
        return [];
    }

    // now check for unfilled arguments so we can fill them with defaults
    let {unfilledRoles} = parse;
    let defaultsCache = {};

    for each (let role in unfilledRoles) {
      let defaultValue;
      let missingArg;
      for each (let arg in parse._verb.arguments) {
        if (arg.role === role) {
          missingArg = arg;
          break;
        }
      }
      if (missingArg.default) {
        defaultValue = missingArg.default;
      } else {
        let noun = missingArg.nountype;
        defaultValue = (noun.default
                        ? (typeof noun.default === "function"
                           ? noun.default()
                           : noun.default)
                        : {text: "", html: "", data: null, summary: ""});
      }

      // default-suggested arguments should be ranked lower
      defaultValue.score = (defaultValue.score || 1) / 2;

      // if a default value was set, let's make sure it has its modifier.
      if (defaultValue.text) {
        defaultValue.outerSpace = this.joindelimiter;

        for each (let roleDesc in this.roles) {
          if (roleDesc.role == role) {
            defaultValue.modifier = roleDesc.delimiter;
            if (roleDesc.delimiter == '')
              defaultValue.innerSpace = '';
            else
              defaultValue.innerSpace = this.joindelimiter;
            break;
          }
        }
      }

      defaultsCache[role] = (Utils.isArray(defaultValue)
                             ? defaultValue
                             : [defaultValue]);
    }

    for each (let role in unfilledRoles) {
      let newreturn = [];
      for each (let defaultValue in defaultsCache[role]) {
        for each (let parseToReturn in returnArr) {
          let newParse = parseToReturn.copy();
          newParse.setArgumentSuggestion(role, defaultValue);
          newreturn.push(newParse);
        }
      }
      returnArr = newreturn;
    }

    for each (let parse in returnArr) {
      // for each of the roles parsed in the parse
      for (let role in parse.args) {
        // multiply the score by each role's first argument's nountype match score
        parse._score += (parse.args[role][0].score || 0) * parse.scoreMultiplier;
      }
    }

    return returnArr;
  },

  // == Noun Type utilities ==
  //
  // In the future these methods of {{{Parser}}} probably ought to
  // go into a separate class or something.
  //
  // ** {{{Parser#detectNounType()}}} **
  //
  // This method does the nountype detecting.
  // It takes an argument string and runs through all of the noun types in
  // {{{Parser#_nounTypes}}} and gets their suggestions (via their
  // {{{.suggest()}}} methods). It then takes each of those suggestions,
  // marks them with which noun type it came from (in {{{.nountype}}})
  // and puts all of those suggestions in an object (hash) keyed by
  // noun type name.
  detectNounType: function detectNounType(x,callback) {
    //Utils.log('detecting '+x+'\n');
    if (x in this._nounCache) {
      if (typeof callback == 'function')
        callback(x,this._nounCache[x], []);
    } else {
      
      var handleSuggs = function detectNounType_handleSuggs(suggs, id) {
        if (!suggs && !suggs.length)
          return [];
        if (!Utils.isArray(suggs)) suggs = [suggs];
        for each (let s in suggs) s.nountypeId = id;
        return suggs;
      }

      var thisParser = this;
      var myCallback = function detectNounType_myCallback(suggestions, ajaxRequests) {

        // BEGIN NEW NOUNCACHE STRUCTURE
        /*if (!(x in thisParser._nounCache))
          thisParser._nounCache[x] = {};
        for each (let newSugg in suggestions) {
          let nountypeId = newSugg.nountypeId;
          if (!(nountypeId in thisParser._nounCache[x]))
            thisParser._nounCache[x][nountypeId] = [];
          thisParser._nounCache[x][nountypeId].push(newSugg);
        }*/
        // END NEW NOUNCACHE STRUCTURE
        
        // BEGIN OLD NOUNCACHE STRUCTURE
        if (!(x in thisParser._nounCache))
          thisParser._nounCache[x] = [];
        thisParser._nounCache[x] = thisParser._nounCache[x].concat(suggestions);
        // END OLD NOUNCACHE STRUCTURE

        if (typeof callback == 'function')
          callback(x,thisParser._nounCache[x], ajaxRequests);
      };
      var activeNounTypes = this._nounTypes;

      Utils.setTimeout(function detectNounType_asyncDetect(){
        var returnArray = [];
        var ajaxRequests = [];
      
        dump("detecting: " + x + "\n");
      
        for (let thisNounTypeId in activeNounTypes) {
          let id = thisNounTypeId;
          let completeAsyncSuggest = function completeAsyncSuggest(suggs) {
            suggs = handleSuggs(suggs, id);
            if(ajaxRequests.indexOf(activeNounTypes[id].ajaxRequest) != -1)
              ajaxRequests.splice(ajaxRequests.indexOf(activeNounTypes[id].ajaxRequest), 1);
            if (suggs.length) myCallback(suggs, ajaxRequests);
          }
          returnArray.push.apply(
            returnArray,
            handleSuggs(
              activeNounTypes[id].suggest(x, x, completeAsyncSuggest), id));
      
          if(activeNounTypes[id].ajaxRequest)
            ajaxRequests.push(activeNounTypes[id].ajaxRequest);
        }
      
        myCallback(returnArray, ajaxRequests);
      },0);
    }
  },
  // ** {{{Parser#strengthenMemory}}} **
  //
  // This is a dummy function stub in order to match the interface that
  // cmdmanager expects. TODO: rethink this.
  strengthenMemory: function() {}
}

// == {{{Parser.Query}}} ==
//
// The {{{Parser.Query}}} interface is described in
// [[http://ubiquity.mozilla.com/trac/ticket/532|trac #532]].
//
// The constructor takes the Parser that's being used, the {{{queryString}}},
// {{{context}}} object, and {{{maxSuggestions}}}. Useful if you want to
// set some more parameters or watches on the query.
//
// The {{{Parser#newQuery()}}} method is used to initiate
// a query instead of calling {{{new Parser.Query()}}} directly.
//
Parser.Query = function(parser, queryString, context, maxSuggestions,
                        dontRunImmediately) {
  this._date = new Date();
  this._idTime = this._date.getTime();
  this.parser = parser;
  this.input = queryString;
  this.context = context;
  this.maxSuggestions = maxSuggestions;
  this.selObj = { text: '', html: '' };

  //_oustandingRequests are open ajax calls that have not yet returned
  this._outstandingRequests = [];

  // code flow control stuff
  // used in async faux-thread contrl
  this.finished = false;
  this._keepworking = true;

  // ** {{{Parser.Query#_times}}} **
  //
  // {{{_times}}} is an array of post-UNIX epoch timestamps for each step
  // of the derivation. You can check it later to see how long different
  // steps took.
  this._times = [];

  // ** {{{Parser.Query#_step}}} **
  //
  // This {{{_step}}} property is increased throughout {{{_yieldParse()}}}
  // so you can check later to see how far the query went.
  this._step = 0;

  // TODO: Think about putting some components into
  // [[https://developer.mozilla.org/En/DOM/Worker|Worker threads]].

  // Internal variables
  // These are filled in one by one as we go along.
  this._input = '';
  this._verbArgPairs = [];
  this._possibleParses = [];
  this._verbedParses = [];
  this._suggestedParses = [];
  this._scoredParses = [];
  this._topScores = [];

  this.dump("Making a new parser2 query: " + queryString);

  if (!dontRunImmediately)
    this.run();
}

Parser.Query.prototype = {
  dump: function PQ_dump(msg) {
    var it = this._idTime;
    dump(it + ":" + (new Date - it) + " " + msg + "\n");
  },

  // ** {{{Parser.Query#run()}}} **
  //
  // {{{run()}}} actually starts the query. As a {{{yield}}}-ing model
  // of faux-threads is used right now, the code looks a little bizarre.
  //
  // Basically in every run of {{{doAsyncParse()}}}, it will move the
  // {{{parseGenerator = Parser.Query._yieldingParse()}}} generator
  // one step, meaning we progress in the parse from one {{{yield}}}
  // breakpoint to the next.
  //
  // Most of this async code is by Blair.
  run: function PQ_run() {
    this._keepworking = true;
    this._next();

    this._input = this.parser.wordBreaker(this.input);
    this._next();

    var parseGenerator = this._yieldingParse();
    var self = this;

    function doAsyncParse() {
      try {
        var ok = parseGenerator.next();
      } catch(e) {
        if (e !== StopIteration) {
          Cu.reportError(e);
          Cu.reportError("Traceback for last exception:\n" +
                         ExceptionUtils.stackTrace(e));
        }
        return;
      }
      if (ok && !self.finished && self._keepworking)
        Utils.setTimeout(doAsyncParse, 0);
    }
    this.dump("I have initiated the async query.");
    Utils.setTimeout(doAsyncParse, 0);

    return true;
  },

  _next: function() {
    this._times[this._step++] = new Date;
  },

  // ** {{{Parser.Query#_yieldingParse()}}} **
  //
  // {{{_yieldingParse()}}} is not really a normal function but
  // a [[https://developer.mozilla.org/en/New_in_JavaScript_1.7|generator]].
  // This has to do with the {{{doAsyncParse()}}} asynchronous parsing
  // system described above in {{{Parser.Query#run()}}}.
  //
  // The bottom line, though, is that this function defines the flow of the
  // parse derivation with {{{yield true}}} thrown in at different points
  // where the asynchronous query would stop and check in with the outside
  // world.
  //
  // The steps here are as described in
  // [[https://wiki.mozilla.org/Labs/Ubiquity/Parser_2|the ParserTNG proposal]].
  // Notes that the first two steps are actually done outside of
  // {{{_yieldingParse()}}}.
  //
  // # split words/arguments + case markers
  // # pick possible verbs
  // # pick possible clitics
  // # group into arguments
  // # substitute anaphora (aka "magic words")
  // # suggest normalized arguments
  // # suggest verbs for parses without them
  // # do nountype detection + cache
  // # replace arguments with their nountype suggestions
  // # score + rank
  // # done!
  _yieldingParse: function() {

    // STEP 2: pick possible verbs
    this._verbArgPairs = this.parser.verbFinder(this._input);
    yield true;
    this._next();

    // STEP 3: pick possible clitics
    // TODO: find clitics
    yield true;
    this._next();

    // STEP 4: group into arguments
    for each (var pair in this._verbArgPairs) {
      let argParses = this.parser.argFinder(pair.argString,
                                            pair._verb,
                                            this.input);
      this._possibleParses = this._possibleParses.concat(argParses);
      yield true;
    }
    this._next();

    // STEP 5: substitute anaphora
    // set selection with the text in the selection context
    if (this.selObj.text || this.selObj.html) {
      let selection = this.selObj.html;
      for each (let parse in this._possibleParses) {
        // if there is a selection and if we find some anaphora in the entire
        // input...
        if (selection.length &&
            this.parser._patternCache.anaphora.test(this._input)) {
          let newParses = this.parser.substituteSelection(parse, selection);
          if (newParses.length)
            this._possibleParses = this._possibleParses.concat(newParses);
        }
        yield true;
      }
    }
    this._next();

    // STEP 6: substitute normalized forms
    // check every parse for arguments that could be normalized.
    for each (let parse in this._possibleParses) {
      let newParses = this.parser.substituteNormalizedArgs(parse);
      if (newParses.length)
        this._possibleParses = this._possibleParses.concat(newParses);
      yield true;
    }
    this._next();

    // STEP 7: suggest verbs for parses which don't have one
    for each (let parse in this._possibleParses) {
      let newVerbedParses = this.parser.suggestVerb(parse);
      for each (let newVerbedParse in newVerbedParses) {
        this._verbedParses = this.addIfGoodEnough(this._verbedParses,
                                                  newVerbedParse);
        yield true;
      }
    }
    this._next();

    // STEP 8: do nountype detection + cache
    // STEP 9: suggest arguments with nountype suggestions
    // STEP 10: score

    // Set up tryToCompleteParses()
    // This function will be called at the end of each nountype detection.
    // If it finds some parse that that is ready for scoring, it will then
    // handle the scoring.
    var thisQuery = this;
    function completeParse(thisParse, ajaxRequests) {
      if(ajaxRequests.length == 0) {
        //dump("parse completed\n");
        thisParse.complete = true;
      }
      
      // go through all the arguments in thisParse and suggest args
      // based on the nountype suggestions.
      // If they're good enough, add them to _scoredParses.
      var suggestions = thisQuery.parser.suggestArgs(thisParse);
      //Utils.log(suggestions);
      for each (let newParse in suggestions)
        thisQuery._scoredParses =
          thisQuery.addIfGoodEnough(thisQuery._scoredParses, newParse);

      if (thisQuery._verbedParses.every(function(parse) parse.complete))
        thisQuery.finishQuery();
    }
    
    // TODO: looks like suggestions isn't actually being used in this callback.
    // Maybe we could/should take it out?
    function tryToCompleteParses(argText, suggestions, ajaxRequests) {
      thisQuery.dump('finished detecting nountypes for ' + argText);
      //Utils.log([argText,suggestions]);

      thisQuery._outstandingRequests = ajaxRequests;

      if (thisQuery.finished) {
        thisQuery.dump('this query has already finished');
        return;
      }

      for each (let parseId in thisQuery._parsesThatIncludeThisArg[argText]) {
        let thisParse = thisQuery._verbedParses[parseId];

        if (thisParse.allNounTypesDetectionHasCompleted() && !thisParse.complete) {
          //thisQuery.dump('completing parse '+parseId+' now');
          completeParse(thisParse, ajaxRequests);
        }
      }

      if (thisQuery._scoredParses.length > 0)
        thisQuery.onResults();
    }

    // first create a map from arg's to parses that use them.
    this._parsesThatIncludeThisArg = {};
    // and also a list of arguments we need to cache
    this._argsToCache = {};
    for (let parseId in this._verbedParses) {
      let parse = this._verbedParses[parseId];
      parse._verbedParseId = parseId;

      if (!parse.args.__count__)
        // This parse doesn't have any arguments. Complete it now.
        Utils.setTimeout(completeParse, 0, parse, []);
      else for each (let arg in parse.args) {
        for each (let x in arg) {
          // this is the text we're going to cache
          let argText = x.input;

          if (!(argText in this._argsToCache)) {
            this._argsToCache[argText] = 1;
            this._parsesThatIncludeThisArg[argText] = [];
          }
          this._parsesThatIncludeThisArg[argText].push(parseId);
        }
      }
    }

    // now that we have a list of args to cache, let's go through and cache them.
    for (let argText in this._argsToCache) {
      this.parser.detectNounType(argText, tryToCompleteParses);
      yield true;
    }
  },
  finishQuery: function() {
    this._next();
    this.finished = true;
    this.dump("done!!!");
    /*
    var steps = this._step;
    for (let i = 1; i < steps; ++i)
      this.dump("step " + i + ": " +
                (this._times[i] - this._times[i-1]) + " ms");
    this.dump("total: " +
              (this._times[steps-1] - this._times[0]) + " ms");
    this.dump("There were " + this._scoredParses.length + " completed parses");
    */
    this.onResults();
  },

  // ** {{{Parser.Query#hasResults}}} (read-only) **
  //
  // A getter for whether there are any results yet or not.
  get hasResults() { return this._scoredParses.length > 0; },

  // ** {{{Parser.Query#suggestionList}}} (read-only) **
  //
  // A getter for the suggestion list.
  get suggestionList() {
    return (this._scoredParses
            .slice()
            .sort(function(a,b) b.score - a.score)
            .slice(0, this.maxSuggestions));
  },

  // ** {{{Parser.Query#cancel()}}} **
  //
  // If the query is running in async mode, the query will stop at the next
  // {{{yield}}} point when {{{cancel()}}} is called.
  cancel: function() {
    //Utils.log(this);
    this.dump("cancelled! " + this._outstandingRequests.length +
              " outstanding request(s) being canceled\n");
    //abort any ajax requests that are running
    for each (let ajaxReq in this._outstandingRequests)
      ajaxReq.abort();
    //reset outstanding requests
    this._outstandingRequests = [];

    this._keepworking = false;
  },

  // ** {{{Parser.Query#onResults()}}} **
  //
  // A handler for the endgame. To be overridden.
  onResults: function() {},

  // ** {{{Parser.Query#addIfGoodEnough()}}} **
  //
  // Takes a {{{parseCollection}}} (Array) and a {{{newParse}}}.
  //
  // Looking at the {{{maxSuggestions}}} value (= m), defines "the bar" (the
  // lowest current score of the top m parses in the {{{parseCollection}}}).
  // Adds the {{{newParse}}} to the {{{parseCollection}}} if it has a chance
  // at besting "the bar" in the future ({{{newParse.maxScore > theBar}}}).
  // If {{{newParse}}} was added and that "raised the bar", it will go through
  // all parses in the {{{parseCollection}}} and kill off those which have
  // no chance in hell of overtaking the new bar.
  //
  // A longer explanation of "Rising Sun" optimization strategy (and why it is
  // applicable here, and with what caveats) can be found in the article
  // [[http://mitcho.com/blog/observation/scoring-for-optimization/|Scoring for Optimization]].
  addIfGoodEnough: function(parseCollection,newParse) {

    if (parseCollection.length < this.maxSuggestions)
      return parseCollection.concat(newParse);

    // reorder parseCollection so that it's in decreasing current score order
    parseCollection.sort(function(a, b) b.score - a.score);

    // "the bar" is the lowest current score among the top candidates
    // New candidates must exhibit the *potential* (via maxScore) to beat
    // this bar in order to get added.
    let theBar = parseCollection[this.maxSuggestions - 1].score;
    //Utils.log('theBar = '+theBar);

    // at this point we can already assume that there are enough suggestions
    // (because if we had less, we would have already returned with newParse
    // added). Thus, if the new parse's maxScore is less than the current bar
    // we will not return it (effectively killing the parse).

    if (newParse.maxScore < theBar) {
      //Utils.log(['not good enough:',newParse,newParse.maxScore]);
      return parseCollection;
    }

    // add the new parse into the parse collection
    parseCollection = parseCollection.concat([newParse]);
    // sort again
    parseCollection.sort( function(a,b) b.score - a.score );

    // if the bar changed...
    if (parseCollection[this.maxSuggestions - 1].score > theBar) {
      theBar = parseCollection[this.maxSuggestions - 1].score;
      //Utils.log('theBar is now '+theBar);

      // sort by ascending maxScore order
      parseCollection.sort(function(a, b) a.maxScore - b.maxScore);

      while (parseCollection[0].maxScore < theBar
             && parseCollection.length > this.maxSuggestions) {
        let throwAway = parseCollection.shift();
        //Utils.log(['throwing away:',throwAway,throwAway.maxScore,parseCollection.length+' remaining']);
      }
    }

    return parseCollection;
  }
};

// == {{{Parser.Parse}}} ==
//
// {{{Parser.Parse}}} is the class for all of the parses which will be returned
// in an array by the {{{Parser.Query#suggestionList}}}. It is also used
// throughout the parse process.
//
// The constructor takes the {{{branching}}} and {{{joindelimiter}}} parameters
// from the {{{Parser}}} (which are used for the {{{displayText}}}
// method) and the {{{verb}}} and {{{argString}}}. Individual arguments in
// the property {{{args}}} should be set individually afterwards.

Parser.Parse = function(parser, input, verb, argString, parentId) {
  this._parser = parser;
  this.input = input;
  this._verb = verb;
  this.argString = argString;
  this.args = {};
  // this is the internal score variable--use the score property
  this._score = 0;
  this.scoreMultiplier = 0;
  // !complete means we're still parsing or waiting for async nountypes
  this.complete = false;
  this._id = Math.random();
  if (parentId)
    this._parentId = parentId;
}

Parser.Parse.prototype = {
  // ** {{{Parser.Parse#displayText}}} **
  //
  // {{{displayText}}} prints the verb and arguments in the parse by
  // ordering all of the arguments (and verb) by their {{{_order}}} properties
  // and displaying them with nice {{{<span class='...'></span>}}} wrappers.
  get displayText() {
    // This is the main string to be returned.
    let display = '';
    // This string is built in case there's a verb at the end of the sentence,
    // in which case we slap this on at the end.
    let displayFinal = '';

    // If the verb has _order = -1, it means it was at the end of the input.
    if (this._verb._order != -1)
      display = "<span class='verb' title='"
        + (this._verb.id || 'null') + "'>" + (this._verb.text || '<i>null</i>')
        + "</span>" + this._parser.joindelimiter;
    else
      displayFinal = this._parser.joindelimiter + "<span class='verb' title='"
      + this._verb.id + "'>" + (this._verb.text || '<i>null</i>') + "</span>";

    // Copy all of the arguments into an ordered array called argsArray.
    // This will then be in the right order for display.
    let argsArray = [];
    let unfilledArgs = []; // unfilled args are displayed at the end
    for (let role in this.args) {
      for each (let argument in this.args[role]) {
        if (argument.text) {
          if ("_order" in argument) {
            argsArray[argument._order] = argument;
            argsArray[argument._order].role = role;
          } else
            unfilledArgs.push(argument);
        }
      }
    }

    argsArray = argsArray.concat(unfilledArgs);

    for each (let arg in argsArray) {
      let className = 'argument';
      if (!arg.modifier)
        className = 'object';

      // Depending on the _branching parameter, the delimiter goes on a
      // different side of the argument.
      if (this._parser.branching == 'right')
        display += (arg.outerSpace || '') + (arg.modifier ? "<span class='prefix' title='"
          + arg.role+"'>" + arg.modifier + arg.innerSpace
          + "</span>":'') + "<span class='" + className + "' title=''>"
          + (arg.inactivePrefix ?
             "<span class='inactive'>" + arg.inactivePrefix + "</span>" : '')
          + (arg.summary || arg.input)
          + (arg.inactiveSuffix ?
             "<span class='inactive'>" + arg.inactiveSuffix + "</span>" : '')
          + "</span>";
      else
        display += "<span class='" + className
          + "' title=''>"
          + (arg.inactivePrefix ?
             "<span class='inactive'>" + arg.inactivePrefix + "</span>" : '')
          + (arg.summary || arg.input)
          + (arg.inactiveSuffix ?
             "<span class='inactive'>" + arg.inactiveSuffix + "</span>" : '')
          + "</span>" + (arg.modifier ? "<span class='prefix' title='" + arg.role + "'>"
          + arg.innerSpace + arg.modifier + "</span>" : '') + (arg.outerSpace || '');

    }

    for each (let neededArg in this._verb.arguments) {
      if (!this.args[neededArg.role]
          || !this.args[neededArg.role][0]
          || !this.args[neededArg.role][0].text) {
        let {label} = neededArg;
        if (!label) {
          let nt = neededArg.nountype;
          label = nt.name || nt._name || "?";
        }
        for each (let parserRole in this._parser.roles) {
          if (parserRole.role == neededArg.role) {
            if (this._parser.branching == 'left')
              label += this._parser.joindelimiter
                        + parserRole.delimiter;
            else
              label = parserRole.delimiter
                       + this._parser.joindelimiter + label;
            break;
          }
        }

        display += ' <span class="needarg">' + label + '</span>';
      }
    }

    return display + displayFinal;
  },

  get displayTextDebug()(
    this.displayText + " (" +
    ((this.score * 100 | 0) / 100 || "<i>no score</i>") +
    ")"),

  get completionText() {
    var {lastNode} = this;
    var originalText = lastNode.input;
    var newText = lastNode.text;
    var findOriginal = new RegExp(originalText+'$');
    if (findOriginal.test(this.input))
      return this.input.replace(findOriginal,newText) + this._parser.joindelimiter;

    return this.input;
  },

  // **{{{Parser.Parse#icon}}}**
  //
  // Gets the verb's icon.
  get icon() this._verb.icon,

  // **{{{Parser.Parse#execute()}}}**
  //
  // Execute the verb. Only the first argument in each role is returned.
  // The others are thrown out.
  execute: function(context) {
    return this._verb.execute(context, this.firstArgs);
  },

  // **{{{Parser.Parse#preview()}}}**
  //
  // Returns the verb preview.
  preview: function(context, previewBlock) {
    if (typeof this._verb.preview === "function")
      return this._verb.preview(context, previewBlock, this.firstArgs);
    else {
      dump(this._verb.names[0] + " didn't have a preview!");
      return false;
    }
  },

  // **{{{Parser.Parse#previewDelay}}} (read-only)**
  //
  // Return the verb's {{{previewDelay}}} value.
  get previewDelay() {
    return this._verb.previewDelay;
  },

  // **{{{Parser.Parse#previewUrl}}} (read-only)**
  //
  // Return the verb's {{{previewUrl}}} value.
  get previewUrl() {
    return this._verb.previewUrl;
  },

  // **{{{Parser.Parse#firstArgs}}} (read-only)**
  get firstArgs() {
    let firstArgs = {};
    for (let role in this.args) {
      firstArgs[role] = this.args[role][0];
    }
    return firstArgs;
  },

  // **{{{Parser.Parse#lastNode}}}**
  //
  // Return the parse's last node, whether a verb or an argument.
  // This can be used to power something like tab-completion, by replacing
  // {{{parse.lastNode.input}}} with {{{parse.lastNode.text}}}.
  get lastNode() {
    // default value if there are no arguments
    let lastNode = this._verb;
    if (this._verb._order != -1) {
      for (let role in this.args) {
        for each (let arg in this.args[role]) {
          if (arg.text != '') {
            if (arg._order == undefined) // if it was a default, it's last
              lastNode = arg;
            else if (arg._order > lastNode._order)
              lastNode = arg;
          }
        }
      }
    }
    return lastNode;
  },

  // **{{{Parser.Parse#allNounTypesDetectionHasCompleted()}}} (read-only)**
  //
  // If all of the arguments' nountype detection has completed, returns true.
  // This means this parse can move onto Step 8
  // 
  // TODO: This may not actually be correct... it may return true before some
  // ajax requests complete. Needs testing.
  allNounTypesDetectionHasCompleted: function() {
    for (let role in this.args) {
      // for each argument of this role...
      for each (let arg in this.args[role]) {
        // this is the argText to check
        let argText = arg.input;

        if (!(argText in this._parser._nounCache))
          return false;
      }
    }

    // if all the argText's are in the nounCache
    return true;
  },

  // ** {{{Parser.Parse#maxScore}}} **
  //
  // {{{maxScore}}} computes the maximum possible score which a partial
  // parse could possibly yield. It's used in cases where an async nountype
  // has yet to return the nountype score for one or more arguments.
  get maxScore() {
    if (this.complete)
      return this.score;

    if (!this._verb.text)
      return 0; // we still cannot determine the maxScore

    // get one point for the verb
    var score = this.scoreMultiplier;

    for each (let verbArg in this._verb.arguments) {
      if (!this.args[verbArg.role])
        // in this case, no argument has been set for this role and never will.
        continue;
      // in this case, we've already received the score from the nountype.
      // or, the arg text was set for this role, but we haven't
      // yet received an async score. Wait for it and assume good faith.
      score += (this.args[verbArg.role][0].score || 1) * this.scoreMultiplier;
    }

    return score;
  },

  // ** {{{Parser.Parse#score}}} **
  //
  // {{{score}}} returns the current value of {{{_score}}}.
  get score() this._score,

  // ** {{{Parser.Parse#setArgumentSuggestion()}}} **
  //
  // Accepts a {{{role}}} and a suggestion and sets that argument properly.
  // If there is already an argument for that role, this method will *not*
  // overwrite it, but rather add an additional argument for that role.
  setArgumentSuggestion: function PP_setArgumentSuggestion( role, sugg ) {
    (this.args[role] || (this.args[role] = [])).push(sugg);
  },

  // ** {{{Parser.Parse#unfilledRoles}}} **
  //
  // Gets a list of roles which the parse's verb accepts but
  get unfilledRoles()(this._verb.id
                      ? [verbArg.role
                         for each (verbArg in this._verb.arguments)
                         if (!(verbArg.role in this.args))]
                      : []),

  // ** {{{Parser.Parse#copy()}}} **
  //
  // Returns a copy of this parse.
  copy: function PP_copy() {
    var ret = new Parser.Parse(this._parser,
                               this.input,
                               this._verb,
                               this.argString,
                               this._id);
    // NOTE: at one point we copied these args by
    // ret.args = {__proto__: this.args}
    // This, however, created duplicate parses (or, rather, the prototype copies
    // got touched) when substituteNormalizedArgs is enacted. We must prototype
    // each actual argument, not the collection of arguments, so this is what
    // we did.
    for (let role in this.args)
      ret.args[role] = [{__proto__: sugg}
                        for each (sugg in this.args[role])];
    ret.complete = this.complete;
    ret._suggested = this._suggested;
    ret.scoreMultiplier = this.scoreMultiplier;
    ret._score = this._score;
    return ret;
  }
}
