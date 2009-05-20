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

var EXPORTED_SYMBOLS = ["Parser",'nounCache','sameObject'];

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
//
// At the end of the file is a {{{cloneObject}}} function which is used
// throughout the parsing process.

// ** {{{nounCache}}} **
//
// The noun cache is initialized here.
// Perhaps this should be moved out into its own module in the future.
// Nouns are cached in this cache in the {{{Parser.detectNounTypes}}} method
// and associated methods. Later in the parse process elements of {{{nounCache}}}
// are accessed directly, assuming that the nouns were already cached
// using {{{Parser.detectNounType}}}.
//
// TODO: better cleanup + management of {{{nounCache}}}

var nounCache = {};

// == {{{Parser}}} prototype ==
//
// {{{Parser}}} object initialization takes place in each individual language
// file--this, in turn, is controlled by a {{{makeXxParser}}} factory function;
// take a look at en.js for an example.

function Parser(lang) {
  this.lang = lang;
  var ctu = {};
  Components.utils.import("resource://ubiquity/modules/contextutils.js",
                          ctu);
  this._ContextUtils = ctu.ContextUtils;
}
Parser.prototype = {
  lang: '',

  // ** {{{Parser.branching}}} **
  //
  // The "branching" parameter refers to which direction arguments are found.
  // For example, English is a "right-braching" language. This is because the
  // noun phrases in arguments come //after// (or "right of") the delimiter
  // (in English, prepositions). It's called "branching" by analogy to a
  // tree: if at a particular node, most of the "content" goes to the right,
  // it's "right-branching". See also
  // [[http://en.wikipedia.org/wiki/Left-branching|branching on wikipedia]].
  branching: '', // left or right
  usespaces: true,

  // ** {{{Parser.joindelimiter}}} **
  //
  // The {{{joindelimiter}}} parameter is the delimiter that gets inserted
  // when gluing arguments and their delimiters back together in display.
  // In the case of most languages, the space (' ') is fine.
  // See how it's used in {{{Parser.Parse.getDisplayText()}}}.
  //
  // TODO: {{{joindelimiter}}} and {{{usespaces}}} may or may not be
  // redundant.
  joindelimiter: ' ',
  examples: [],
  clitics: [],
  anaphora: ['this'],

  // ** {{{Parser.roles}}} **
  //
  // a list of semantic roles and their delimiters
  roles: [{role: 'object', delimiter: ''}],


  // ** {{{Parser._rolesCache}}} **
  //
  // The {{{_rolesCache}}} is a cache of the different subsets of the
  // parser's roles (semantic roles and their associated delimiters)
  // are available for each verb. For example, {{{_rolesCache.add}}} will
  // give you the subset of semantic roles which are appropriate for the
  // {{{add}}} verb.
  _rolesCache: {},

  // ** {{{Parser._patternCache}}} **
  //
  // The {{{_patternCache}}} keeps various regular expressions for use by the
  // parser. Most are created by {{{Parser.initialCache()}}}, which is called
  // during parser creation. This way, commonly used regular expressions
  // need only be constructed once.
  _patternCache: {},

  _verbList: [],
  _nounTypes: [],

  // ** {{{Parser.setCommandList()}}} **
  //
  // {{{setCommandList}}} takes the command list and filters it,
  // only registering those which have the property {{{.names}}}.
  // This is in order to filter out verbs which have not been made to
  // work with Parser 2.
  //
  // This function also now parses out all the nountypes used by each verb.
  // The nountypes registered go in the {{{Parser._nounTypes}}} object, which
  // are used for nountype detection as well as the comparison later with the
  // nountypes specified in the verbs for argument suggestion and scoring.
  //
  // After the nountypes have been registered, {{{Parser.initialCache()}}} is
  // called.
  setCommandList: function( commandList ) {
    Components.utils.import("resource://ubiquity/modules/parser/new/active_noun_types.js");

    activeNounTypes = [];

    // First we'll register the verbs themselves.
    for (let verb in commandList) {
      if (commandList[verb].names != undefined
          && commandList[verb].arguments != undefined) {
        this._verbList.push(commandList[verb]);
        dump("loaded verb: "+verb+"\n");
      }
    }

    // Scrape the noun types up here.

    for each (let verb in this._verbList) {
      for each (let arg in verb.arguments) {

        let thisNounType = cloneObject(arg.nountype);

        if (arg.nountype.constructor.name == "RegExp") {
          // If a verb's target nountype is a regexp, we'll convert it to
          // the standard nountype form here when registering it.
          // We only need the NounUtils loaded in in chrome, as there are no regex
          // nountypes in the parser-demo.
          var nu = {};
          Components.utils.import("resource://ubiquity/modules/nounutils.js", nu);
          var nounTypeFromRegExp = nu.NounUtils.nounTypeFromRegExp;
          thisNounType = nounTypeFromRegExp(arg.nountype);

          // returning the converted version of the nountype back into the verb
          arg.nountype = thisNounType;
        }

        let thisNounTypeIsAlreadyRegistered = false;

        for each (let registeredNounType in this._nounTypes) {
          if (sameObject(arg.nountype,registeredNounType))
            thisNounTypeIsAlreadyRegistered = true;
        }

        // if this nountype has not been registered yet, let's do that now.
        if (!thisNounTypeIsAlreadyRegistered) {
          this._nounTypes.push(thisNounType);
          // activeNounTypes
          activeNounTypes.push(thisNounType);
        }

      }
    }

    this.initialCache();

  },


  // ** {{{Parser.setNounList()}}} **
  // This function is now a dummy function... its functionality has actually
  // been subsumed by {{{Parser.setCommandList()}}}.
  setNounList: function( nounList ) {
    return true;
  },

  // ** {{{Parser.initialCache()}}} **
  //
  // This method is initialized when the language is loaded.
  // Caches a number of commonly used regex's into {{{this._patternCache}}}.
  initialCache: function() {

    // Just a little utility generator to loop through all the names of
    // all the verbs for a given language. If a verb's name is not set for
    // the target language, it will fall back on English.
    function allNames(verbs,lang) {
      for each (verb in verbs) {
        for each (name in (verb.names[lang] || verb.names.en)) {
          yield name;
        }
      }
    }

    // a little utility function to create a RegExp which matches any prefix
    // of a set of strings
    // it was only being used in one place so I moved it here
    // TODO: order by descending order of length of prefixes
    function matchString(arr) {
      // construct a regexp to match the
      var prefixes = [];
      for each (var a in arr) {
        for (var i=1;i<=a.length;i++) {
          prefixes.push(a.slice(0,i));
        }
      }
      return prefixes.reverse().join('|');
    }

    // this._patternCache.verbMatcher matches any active verb or prefix
    // thereof.
    this._patternCache.verbMatcher = matchString(
      [name for (name in allNames(this._verbList,this.lang))]);

    // this._patternCache.verbInitialTest matches a verb at the beginning
    this._patternCache.verbInitialTest = new RegExp(
      '^\\s*('+this._patternCache.verbMatcher+')'+
        (this.usespaces?'(\\s+.*$|$)':'(.*$)'),'i');
    // this._patternCache.verbFinalTest matches a verb at the end of the string
    this._patternCache.verbFinalTest = new RegExp(
      (this.usespaces?'(^.*\\s+|^)':'(^.*)')+
        '('+this._patternCache.verbMatcher+')\\s*$','i');

    // this._patternCache.anaphora matches any of the anaphora ("magic words")
    // if usespaces = true, it will only look for anaphora as whole words,
    // but if usespaces = false, it will look for anaphora in words as well.
    this._patternCache.anaphora = new RegExp(
      (this.usespaces?'(^.*\\s+|^)':'(^.*)')+
        '('+(this.anaphora.join('|'))+')'+
        (this.usespaces?'(\\s+.*$|$)':'(.*$)'));

    // cache the roles used in each verb
    for (let verb in this._verbList) {
      // _rolesCache[verb] is the subset of roles such that
      // there is at least one argument in verb which matches that role
      this._rolesCache[verb] =
        [role for each (role in this.roles)
         if (this._verbList[verb].arguments.some(
               function(arg) arg.role == role.role ) ) ];
    }

    // also cache a regex for recognizing the delimiters appropriate for
    // each verb
    this._patternCache.delimiters = {};
    for (let verb in this._verbList) {
      // each of these is a RegExp of the form (to|from|as|toward|...)
      this._patternCache.delimiters[verb] = new RegExp('^('
        +[role.delimiter for each (role in this._rolesCache[verb]) ].join('|')
        +')$','i');
    }

    // this is the RegExp to recognize delimiters for an as yet unspecified
    // verb... in other words, it's just a RegExp to recognize every
    // possible delimiter.
    this._patternCache.delimiters[null] = new RegExp(
      '^('+[role.delimiter for each (role in this.roles) ].join('|')+')$','i');

  },

  // ** {{{Parser.newQuery()}}} **
  //
  // This method returns a new {{{Parser.Query}}} object, as detailed in
  // [[http://ubiquity.mozilla.com/trac/ticket/532|trac #532]]
  newQuery: function(queryString,context,maxSuggestions,dontRunImmediately) {
    var selObj = this._ContextUtils.getSelectionObject(context);
    //mylog(selObj);
    var theNewQuery = new Parser.Query(this,
                            queryString,
                            context,
                            maxSuggestions,
                            dontRunImmediately);
    theNewQuery.selObj = selObj;
    return theNewQuery;
  },

  // ** {{{Parser.wordBreaker()}}} **
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

  // ** {{{Parser.verbFinder()}}} **
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
    let returnArray = [
      { _verb: { id: null,
                 text: null,
                 _order: null,
                 input: null},
        argString: input.replace(/^\s*(.*?)\s*$/,'$1')
      }
    ];

    // just a little utility generator
    // Yields all the synonymous names of the verb in a given language
    // If no names for this language is specified, it falls back onto English.
    function names(verb,lang) {
      for each (name in (verb.names[lang] || verb.names.en)) {
        yield name;
      }
    }

    // We'll keep track of all the verb prefixes that we found as verb-only
    // matches. If we find them as an initial match, we will rule them out
    // in the final matches.
    let verbOnlyMatches = [];

    // let's see if there's a verb at the beginning of the string
    let initialMatches = input.match(this._patternCache.verbInitialTest);
    // if we found a match
    if (initialMatches != null) {

      // initialMatches will return an array of strings in the following order
      let [ ,verbPrefix,argString] = initialMatches;

      if (/^\s*$/.test(argString))
        verbOnlyMatches.push(verbPrefix);

      // The match will only give us the prefix that it matched. For example,
      // if we have a verb "shoot" and had input "sho Fred", verbPrefix = "sho"
      // and now we must figure out which verb that corresponded to.
      // Keep in mind there may be multiple verbs which match the verbPrefix
      // that matched.
      //
      // TODO: write a unit test for this possibility.

      for (verb in this._verbList) {
        // check each verb synonym in this language
        for (name in names(this._verbList[verb],this.lang)) {
          // if it matched...
          if (RegExp('^'+verbPrefix,'i').test(name)) {
            let thisParse = {_verb: cloneObject(this._verbList[verb]),
                             argString: argString};
            // add some extra information specific to this parse
            thisParse._verb.id = verb;
            thisParse._verb.text = name;
            thisParse._verb.input = verbPrefix;
            thisParse._verb._order = 0;
            returnArray.push(thisParse);
            break;
          }
        }
      }
    }

    // let's see if there's a verb at the end of the string
    let finalMatches = input.match(this._patternCache.verbFinalTest);
    // if we found a match
    if (finalMatches != null) {

      // finalMatches will return an array of strings in the following order
      let [ ,argString,verbPrefix] = finalMatches;

      // if we already saw this prefix as a sentence-initial verb-only match,
      // skip it.
      if (argString == '' && verbOnlyMatches.indexOf(verbPrefix) > -1)
        return returnArray;

      for (verb in this._verbList) {
        // check each verb synonym in this language
        for (name in names(this._verbList[verb],this.lang)) {
          // if it matched...
          if (RegExp('^'+verbPrefix,'i').test(name)) {
            let thisParse = {_verb: cloneObject(this._verbList[verb]),
                             argString: argString};
            // add some extra information specific to this parse
            thisParse._verb.id = verb;
            thisParse._verb.text = name;
            thisParse._verb.input = verbPrefix;
            thisParse._verb._order = -1;
            returnArray.push(thisParse);
            break;
          }
        }
      }
    }

    return returnArray;
  },

  // ** {{{Parser.splitWords()}}} **
  //
  // Takes an input string and returns an object with the words and their
  // delimiters. Words are returned in left to right order, split using
  // \s and \u200b (the no-width space) as delimiters.
  //
  // The return object is of the form {{{{ words: [], delimiters: [], all: [] }}}} .
  // {{{words}}} and {{{delimiters}}} are just a copy of every other word in
  // {{{all}}}.
  //
  // Used by {{{Parser.argFinder()}}}
  splitWords: function(input) {
    var returnObj = { words: [], delimiters: [], all: [],
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
    returnObj.all         = splitWithWords;

    for (let i in splitWithWords) {
      if (i % 2)
        returnObj.delimiters.push(splitWithWords[i]);
      else
        returnObj.words.push(splitWithWords[i]);
    }
    return returnObj;
  },

  // ** {{{Parser.hasDelimiter()}}} **
  //
  // Checks to see whether a certain delimiter is compatible with a certain
  // verb, i.e., whether that verb has a role which takes that delimiter.
  // This is done using the regex of delimiters of all roles of {{{verb}}} in
  // {{{Parser._patternCache.delimiters[verb]}}}. Returns true/false.
  //
  // Used by {{{Parser.argFinder()}}}
  hasDelimiter: function(delimiter,verb) {
    return this._patternCache.delimiters[verb].exec(delimiter);
  },

  // ** {{{Parser.getRoleByDelimiter()}}} **
  //
  // Returns all semantic roles which may be represented by a given delimiter.
  //
  // Used by {{{Parser.argFinder()}}}
  getRoleByDelimiter: function(delimiter,roles) {
    delimiter = delimiter.toLowerCase();
    return [role.role for each (role in roles)
                      if (role.delimiter.toLowerCase() == delimiter) ];
  },

  // ** {{{Parser.argFinder()}}} **
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
  // important. It also uses {{{Parser.splitWords()}}} to split the words up
  // in the beginning.
  //
  // ** //A high level overview of {{{Parser.argFinder()}}}// **
  //
  // Since {{{Parser.argFinder()}}} is arguably the //meat// of the parser,
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
  // by {{{Parser.Parse.getDisplayText()}}} in order to reconstruct the input
  // for display. The _order values become left-to-right placement values.
  // Each argument gets one _order value for both the argument and the delimiter
  // as we can reconstruct the order of the delimiter wrt the argument using
  // the branching preference.
  //
  // TODO: add better explanation/examples of {{{_order}}} in a blog post or
  // inline.
  //
  // The {{{scoreMultiplier}}} parameter is set at this point, making
  // {{{getMaxScore()}}} valid for all returned parses.

  argFinder: function(argString, verb, input) {

    // initialize possibleParses. This is the array that we're going to return.
    let possibleParses = [];

    // if the argString is empty, return a parse with no args.
    if (argString == '') {
      defaultParse = new Parser.Parse({ branching: this.branching,
                                        joindelimiter: this.joindelimiter,
                                        roles: this.roles},
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
      defaultParse.__score = defaultParse.scoreMultiplier;

      defaultParse.args = [];
      return [defaultParse];
    }

    // if the verb doesn't take any arguments but the argString is not empty,
    // kill this parse.
    if (this._verbList[verb] != undefined) {
      if (this._verbList[verb].arguments == undefined
             || this._verbList[verb].arguments.length == 0)
        return [];
    }

    // split words using the splitWords() method
    let splitInput = this.splitWords(argString);
    // for example, if the input is "rar rar   rar"
    // then words = ['rar','rar','rar']
    // delimiters = [' ','   ']
    // allWords = ['rar',' ','rar','   ','rar']
    let words = splitInput.words;
    let delimiters = splitInput.delimiters;
    let allWords = splitInput.all;

    // let's find all the possible delimiters
    let possibleDelimiterIndices = [];

    // if the verb is set, only look for delimiters which are available
    let roles = ( verb.id ? this._rolesCache[verb.id] : this.roles );

    for (var i=0; i < words.length; ++i) {
      if (this.hasDelimiter(words[i],verb.id))
        possibleDelimiterIndices.push(i);
    }

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
      function(last, current) last.concat([a.concat([current]) for each (a in last)])
      , [[]]
    );

    // for each set of delimiterIndices which are possible...
    // Note that the values in the delimiterIndices for each delimiter are the
    // indices which correspond to those delimiters.
    for each (var delimiterIndices in possibleDelimiterCombinations) {
      // don't process invalid delimiter combinations
      // (where two delimiters are back to back)
      var breaknow = false;
      for (var i=0; i < delimiterIndices.length - 1; ++i) {
        if (delimiterIndices[i] + 1 == delimiterIndices[i+1])
          breaknow = true;
      }
      if (breaknow) break;

      // Check for a delimiter at the end (if right-
      // branching) or at the beginning (if left-branching)
      // These are bad because then they will never find an associated
      // argument.
      if (this.branching == 'right' &&
        delimiterIndices[delimiterIndices.length - 1] == words.length-1)
        dump('maybe this is why I\'m dead.\n');
      if (this.branching == 'left' && delimiterIndices[0] == 0)
        dump('maybe this is why I\'m dead.\n');
      // TODO check if this breaks things and, if it does, kill these
      // delimiter combinations right here.

      // theseParses will be the set of new parses based on this delimiter
      // index combination. We'll seed it with a Parser.Parse which doesn't
      // have any arguments set.
      var seedParse = new Parser.Parse({ branching: this.branching,
                                         joindelimiter: this.joindelimiter,
                                         roles: this.roles},
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

      var theseParses = [seedParse];

      // if there are no delimiters at all, put it all in the direct object
      if (delimiterIndices.length == 0) {
        if (theseParses[0].args.object == undefined)
          theseParses[0].args.object = [];
        theseParses[0].args.object.push({ _order:1,
                                          input:allWords.join(''),
                                          modifier:'' });
      }

      // if there are extra words at the beginning or end, make them a
      // direct object
      if (this.branching == 'left') {
        if (delimiterIndices[delimiterIndices.length - 1] < words.length - 1 &&
            delimiterIndices[delimiterIndices.length - 1] != undefined) {

          if (theseParses[0].args.object == undefined)
            theseParses[0].args.object = [];
          theseParses[0].args.object.push(
            { _order: (2 * delimiterIndices.length + 2),
              input: allWords.slice(
                       2 * (delimiterIndices[delimiterIndices.length - 1] + 1)
                     ).join(''),
              modifier:'' }
          );

        }
      } else {
        if (delimiterIndices[0] > 0 && delimiterIndices[0] != undefined) {

          if (theseParses[0].args.object == undefined)
            theseParses[0].args.object = [];
          theseParses[0].args.object.push(
            {_order: 1,
             input: allWords.slice(0,
                      (2 * delimiterIndices[0]) - 1
                    ).join(''),
             modifier:'' });

        }
      }

      // If we're right branching, we'll just go through left to right.
      // If we're left branching, however, we want to reverse the order of
      // the delimiterIndices in order to go through the arguments right to left.
      //
      // (It actually doesn't matter and could be done the other way, but this
      // is the way I set it up and set the _order based on this.)
      if (this.branching == 'left')
        delimiterIndices = delimiterIndices.reverse();

      // Loop over each delimiter
      //
      // In each pass through this loop, we'll add new arguments to the copies
      // of the parses in theseParses and put them in newParses. Then, at the
      // end of the loop, we'll set theseParses = newParses. This way, at any
      // point throughout the loop, theseParses will be all the possible
      // parses of the arguments *up to* this point.
      for (let i=0; i<delimiterIndices.length; i++) {

        var newParses = [];

        // j will be used as an iterator for how far out from the delimiter we
        // want to reach to get an argument. For example, if we have
        //
        //   DELIMITER WORD1 WORD2 WORD3
        //
        // we want j to be the position of WORD1, WORD2, and WORD3 one after
        // the other. Thus we set jmin to be the position of WORD1 and jmax
        // to be the position of WORD3. (And inside out and vice versa for
        // left-branching languages, but you get the idea.)
        if (this.branching == 'left') {// find args right to left
          var jmin = ((delimiterIndices[(i*1) + 1] == undefined) ?
                      0 : delimiterIndices[(i*1) + 1] + 1);
          var jmax = delimiterIndices[(i*1)] - 1;
        } else {
          var jmin = delimiterIndices[i] + 1;
          var jmax = ((delimiterIndices[(i*1) + 1] == undefined) ?
                      words.length - 1 : delimiterIndices[(i*1)+1] - 1);
        }

        // Compute the possible roles for this delimiter
        // We'll keep these in a cache so we don't have to look it up
        // using Parser.getRoleByDelimiter() each time.
        if (rolesForEachDelimiterCache[words[delimiterIndices[i]]] == undefined)
          rolesForEachDelimiterCache[words[delimiterIndices[i]]] =
            this.getRoleByDelimiter(words[delimiterIndices[i]],roles);

        // For each scope of arguments... for example,
        // WORD1, WORD1 WORD2, or WORD1 WORD2 WORD3...
        for (var j = jmin; j <= jmax; j++) {

          // for each delimiter's possible role
          for each (var role in rolesForEachDelimiterCache[
                      words[delimiterIndices[i]]]) {

            // for each of the current parses
            for (var k in theseParses) {

              // thisParse is our local copy. We'll mess with it and
              // add it into newParses.
              let thisParse = cloneParse(theseParses[k]);

              if (this.branching == 'left') {// find args right to left

                // put the selected argument in its proper role

                if (thisParse.args[role] == undefined)
                  thisParse.args[role] = [];

                // our argument is words (j)...(jmax)
                // note that Array.slice(i,k) returns *up to* k
                var argument = allWords.slice(2 * j, (2 * jmax) + 1)
                                             .join('');
                // our modifier, including the space after
                var modifier = words[delimiterIndices[i]];
                var innerSpace = delimiters[delimiterIndices[i] - 1];
                var outerSpace = delimiters[delimiterIndices[i]];

                // push it!
                thisParse.args[role].push(
                  { _order: 1 + 2*(delimiterIndices.length - i),
                    input: argument,
                    modifier: modifier,
                    innerSpace: innerSpace,
                    outerSpace: outerSpace
                  });

                // put the extra words between the earlier delimiter and our
                // arguments into the object role
                if (j != jmin) {

                  if (thisParse.args.object == undefined)
                    thisParse.args.object = [];

                  // our argument is words (jmin)...(j-1)
                  // note that Array.slice(i,j) returns *up to* j
                  var argument = allWords.slice(2 * jmin, 2 * (j - 1) + 1)
                                         .join('');
                  var outerSpace = (2 * (j - 1) + 1 < allWords.length ?
                                    allWords[2 * (j - 1) + 1] : '');

                  // push it!
                  thisParse.args.object.push(
                    { _order: 2*(delimiterIndices.length - i),
                      input:argument,
                      modifier:'',
                      innerSpace: '',
                      outerSpace: outerSpace
                    });

                }
              } else {
                // put the selected argument in its proper role
                if (thisParse.args[role] == undefined)
                  thisParse.args[role] = [];

                // our argument is words (jmin)...(j)
                // note that Array.slice(i,j) returns *up to* j
                var argument = allWords.slice(2 * jmin, (2 * j) + 1)
                                    .join('');

                // our delimiter
                var modifier = words[delimiterIndices[i]];
                var innerSpace = delimiters[delimiterIndices[i]];
                var outerSpace = delimiters[delimiterIndices[i] - 1];

                // push it!
                thisParse.args[role].push(
                  { _order: 1 + 2*(i)+2 - 1,
                    input: argument,
                    modifier: modifier,
                    innerSpace: innerSpace,
                    outerSpace: outerSpace
                  });

                // put the extra words between this delimiter and the next
                // into the object role
                if (j != jmax) {

                  if (thisParse.args.object == undefined)
                    thisParse.args.object = [];

                  // our argument is words (j+1)...(jmax)
                  // note that Array.slice(i,j) returns *up to* j
                  var argument = allWords.slice(2 * (j + 1),(2 * jmax) + 1)
                                         .join('');
                  var outerSpace = (2 * (j + 1) - 1 >= 0 ?
                                    allWords[2 * (j + 1) - 1] : '');

                  // push it!
                  thisParse.args.object.push(
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
                                      (parse.args[role].length - 1));
        }
      }
      // start score off with one point for the verb.
      parse.__score = parse.scoreMultiplier;
    }

    return possibleParses;
  },

  // ** {{{Parser.cleanArgument()}}} **
  //
  // {{{cleanArgument}}} is run on each argument when being assigned to a role.
  // {{{cleanArgument}}} is the place to do things like strip off articles like
  // "the" or "a" if that is appropriate for your language.
  cleanArgument: function(word) {
    return word;
  },

  // ** {{{Parser.substituteSelection()}}} **
  //
  // {{{substituteSelection()}}} takes a parse and a selection string. It
  // should only be called if the {{{selection}}} is not empty. It looks for
  // any of the anaphora set in {{{Parser.anaphora}}} and creates a copy of
  // that parse where that anaphor has been substituted with the selection
  // string.
  //
  // The new string with the substitution is assigned to each arg's
  // {{{input}}} property.
  //
  // An array of //new// parses is returned, so it should then be
  // {{{concat}}}'ed to the current running list of parses.
  substituteSelection: function(parse,selection) {
    let returnArr = [];

    for (let role in parse.args) {
      let args = parse.args[role];
      for (let i in args) {
        let oldArg = args[i].input;
        let newArg = oldArg.replace(this._patternCache.anaphora,
                                           "$1"+selection+"$3");

        if (newArg != oldArg) {
          let parseCopy = cloneParse(parse);
          parseCopy.args[role][i].input = newArg;
          returnArr.push(parseCopy);
        }
      }
    }

    return returnArr;
  },

  // ** {{{Parser.substituteNormalizedArgs()}}} **
  //
  // {{{substituteNormalizedArgs()}}} takes a parse. It runs each argument's
  // {{{input}}} through {{{normalizeArg}}}. If {{{normalizeArg}}} returns
  // matches, it is substituted into the parse.
  //
  // An array of //new// parses is returned, so it should then be
  // {{{concat}}}'ed to the current running list of parses.
  substituteNormalizedArgs: function(parse) {

    let returnArr = [];

    for (let role in parse.args) {
      let args = parse.args[role];
      for (let i in args) {
        let arg = args[i].input;

        let baseParses = [parse];
        baseParses = baseParses.concat(returnArr);

        for each (substitute in this.normalizeArgument(arg)) {
          for each (baseParse in baseParses) {
            let parseCopy = cloneParse(baseParse);
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

  // ** {{{Parser.normalizeArg}}} **
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

  // ** {{{Parser.suggestVerb()}}} **
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
    if (parse._verb.id != null) {
      return [parse];
    }

    // for parses WITHOUT a set verb:
    var returnArray = [];
    for (let verb in this._verbList) {
      let suggestThisVerb = true;

      // Check each role in our parse.
      // If the role is used by at least one of the arguments of the verb,
      // set thisRoleIsUsed = true.
      // If none of the verb's arguments make thisRoleIsUsed true, we set
      // suggestThisVerb = false.
      for (let role in parse.args) {
        let thisRoleIsUsed = this._verbList[verb].arguments.some(
          function(arg) arg.role == role);
        if (!thisRoleIsUsed)
          suggestThisVerb = false;
      }
      if (suggestThisVerb) {
        let parseCopy = cloneObject(parse);
        // same as before: the verb is copied from the verblist but also
        // gets some extra properties (id, text, _order) assigned.
        parseCopy._verb = cloneObject(this._verbList[verb]);
        parseCopy._verb.id = verb;

        // by default, use the English name, or the verb's main name.
        parseCopy._verb.text = (this._verbList[verb].names[this.lang] ?
                                this._verbList[verb].names[this.lang][0]
                                : this._verbList[verb].names['en'][0] || verb);
        parseCopy._verb._order = 0;
        // TODO: for verb forms which clearly should be sentence-final,
        // change this value to -1

        returnArray.push(parseCopy);
      }
    }
    return returnArray;
  },

  // ** {{{Parser.suggestArgs()}}} **
  //
  // {{{suggestArgs()}}} returns an array of copies of the given parse by
  // replacing each of the arguments' text with
  // the each nountype's suggestion. This suggested result goes in the
  // argument's {{{text}}} and {{{html}}} properties. We'll also take this
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

  suggestArgs: function(parse) {

    //mylog('verb:'+parse._verb.name);

    // make sure we keep the anaphor-substituted input intact... we're
    // going to make changes to text, html, score, and nountype

    let initialCopy = cloneObject(parse);
    let returnArr = [initialCopy];

    for (let role in parse.args) {

      //mylog(role);

      let thisVerbTakesThisRole = false;

      for each (let verbArg in parse._verb.arguments) {
        if (role == verbArg.role) {

          // for each argument of this role...
          for (let i in parse.args[role]) {

            // this is the argText to check
            let argText = parse.args[role][i].input;

            // At this point we assume that all of these values have already
            // been cached in nounCache.

            let newreturn = [];
            // make a copy using each of the suggestions in the nounCache
            // as the replaced suggestion, and put all of the replacement
            // parses into newreturn.
            //
            // We'll loop through all of the suggestions for each text
            // and just use the ones that came from the right nountype.
            let thereWasASuggestionWithTheRightNounType = false;

            for each (suggestion in nounCache[argText]) {

              let targetNounType = verbArg.nountype;

              if (sameNounType(suggestion.nountype,targetNounType)) {

                thereWasASuggestionWithTheRightNounType = true;

                for each (let parse in returnArr) {
                  let parseCopy = cloneObject(parse);
                  // copy the attributes we want to copy from the nounCache
                  parseCopy.args[role][i].text = suggestion.text;
                  parseCopy.args[role][i].html = suggestion.html;
                  parseCopy.args[role][i].score = suggestion.score;
                  parseCopy.args[role][i].nountype = suggestion.nountype;

                  newreturn.push(parseCopy);
                }

              }
            }

            if (thereWasASuggestionWithTheRightNounType) {
              returnArr = newreturn;
              thisVerbTakesThisRole = true;
            }

          }

          // If thisVerbTakesThisRole, it means that we've already found the
          // appropriate argument for this role and thus we do not have to
          // keep looking. The continue statement means we move onto the next
          // role.
          if (thisVerbTakesThisRole)
            continue;
        }
      }

      //mylog('finished role');

      if (!thisVerbTakesThisRole)
        return [];

    }

    for each (parse in returnArr) {
      // for each of the roles parsed in the parse
      for (let role in parse.args) {
        // multiply the score by each role's first argument's nountype match score
        parse.__score += parse.args[role][0].score * parse.scoreMultiplier;
      }
    }

    return returnArr;
  },

  // == Noun Type utilities ==
  //
  // In the future these methods of {{{Parser}}} probably ought to
  // go into a separate class or something.
  //
  // ** {{{Parser.detectNounType()}}} **
  //
  // This method does the nountype detecting.
  // It takes an argument string and runs through all of the noun types in
  // {{{Parser._nounTypes}}} and gets their suggestions (via their
  // {{{.suggest()}}} methods). It then takes each of those suggestions,
  // marks them with which noun type it came from (in {{{.nountype}}})
  // and puts all of those suggestions in an object (hash) keyed by
  // noun type name.
  detectNounType: function (x,callback) {
    //mylog('detecting '+x+'\n');

    if (x in nounCache) {
      if (typeof callback == 'function')
        callback(x,nounCache[x]);
    } else {

      /*let nounWorker = new Worker('resource://ubiquity/modules/parser/new/noun_worker.js');

      mylog(nounWorker);
      nounWorker.onmessage = function(event) {
        mylog(event.data);

        // the callback gets returned the original argText and the array of
        // suggestions
        //if (typeof callback == 'function')
        //  callback(x,nounCache[x]);
      };

      mylog(this._nounTypes);
      var self = this;
      nounWorker.postMessage({self:self,input:x});*/

      var nounWorker = {};
      Components.utils.import(
        'resource://ubiquity/modules/parser/new/noun_worker.js',
        nounWorker);
      Components.utils.import(
        'resource://ubiquity/modules/utils.js');
      nounWorker.setNounTypes(this._nounTypes);
      var myCallback = function(suggestions) {
        nounCache[x] = suggestions;
        if (typeof callback == 'function')
          callback(x,nounCache[x]);
      };

      Utils.setTimeout(function(){
        nounWorker.detectNounType(x,myCallback);
      },0);

    }
  }
}

// == {{{Parser.Query}}} prototype ==
//
// The {{{Parser.Query}}} interface is described in
// [[http://ubiquity.mozilla.com/trac/ticket/532|trac #532]].
//
// The constructor takes the Parser that's being used, the {{{queryString}}},
// {{{context}}} object, {{{maxSuggestions}}}, and the {{{dontRunImmediately}}}
// flag. When {{{dontRunImmediately}}} = true, you have to execute
// {{{Parser.Query.run()}}} to actually start the query. Useful if you want to
// set some more parameters or watches on the query.
//
// The {{{Parser.newQuery()}}} method is used to initiate
// a query instead of calling {{{new Parser.Query()}}} directly.
//
Parser.Query = function(parser,queryString, context, maxSuggestions,
                        dontRunImmediately) {
  this.parser = parser;
  this.input = queryString;
  this.context = context;
  this.maxSuggestions = maxSuggestions;
  this.selObj = { text: '', html: '' };

  // code flow control stuff
  // used in async faux-thread contrl
  this.finished = false;
  this._keepworking = true;

  // ** {{{Parser.Query._step}}} **
  //
  // {{{_times}}} is an array of post-UNIX epoch timestamps for each step
  // of the derivation. You can check it later to see how long different
  // steps took.
  this._times = [];

  // ** {{{Parser.Query._step}}} **
  //
  // This {{{_step}}} property is increased throughout {{{_yieldParse()}}}
  // so you can check later to see how far the query went.
  this._step = 0;

  // ** {{{Parser.Query._async}}} **
  //
  // If {{{_async}}} is true, we will use {{{setTimeout}}} to make it
  // asynchronous and thus cancellable with {{{Parser.Query.cancel()}}},
  // as described in the
  // [[http://ubiquity.mozilla.com/trac/ticket/532|proposal (trac #532)]].
  //
  // TODO: Make async work in chrome.
  //
  // TODO: Think about putting some components into
  // [[https://developer.mozilla.org/En/DOM/Worker|Worker threads]].
  this._async = true;

  // Internal variables
  // These are filled in one by one as we go along.
  this._input = '';
  this._verbArgPairs = [];
  this._possibleParses = [];
  this._verbedParses = [];
  this._suggestedParses = [];
  this._scoredParses = [];
  this._topScores = [];

  dump("Making a new parser2 query.  String = " + queryString + "\n");

  if (!dontRunImmediately) {
    this._async = false;
    this.run();
  }
}

// ** {{{Parser.Query.run()}}} **
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
Parser.Query.prototype = {
  run: function() {

    dump("run: "+this.input+"\n");

    this._keepworking = true;

    this._times = [Date.now()];
    this._step++;

    this._input = this.parser.wordBreaker(this.input);

    this._times[this._step] = Date.now();
    this._step++;

    var parseGenerator = this._yieldingParse();
    var self = this;

    function doAsyncParse() {
      var done = false;
      var ok = true;
      try {
        ok = parseGenerator.next();
      } catch(e) {
        done = true;
      }
      //console.log("self: ", self);
      //console.log("ok: ", ok);
      //console.log("done: ", done);
      //console.log("keep working: ", self._keepworking);
      if (ok && !done && self._keepworking)
        if (self._async)
          window.setTimeout(doAsyncParse, 0);
        else
          doAsyncParse();
    }
    if (this._async)
      window.setTimeout(doAsyncParse, 0);
    else
      doAsyncParse();

    dump("I am done running query.\n");
    dump('step: '+this._step+"\n");
    dump('times:\n');
    for (let i in this._times) {
      if (i > 0)
        dump( 'step '+i+': '+(this._times[i] - this._times[i-1])+' ms\n' );
    }
    dump('total: '+(this._times[this._times.length-1] - this._times[0])+' ms\n' );
    dump("There were "+this._scoredParses.length+" completed parses\n");
    return true;
  },

  // ** {{{Parser.Query._yieldingParse()}}} **
  //
  // {{{_yieldingParse()}}} is not really a normal function but
  // a [[https://developer.mozilla.org/en/New_in_JavaScript_1.7|generator]].
  // This has to do with the {{{doAsyncParse()}}} asynchronous parsing
  // system described above in {{{Parser.Query.run()}}}.
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

    this._times[this._step] = Date.now();
    this._step++;

    // STEP 3: pick possible clitics
    // TODO: find clitics
    yield true;

    this._times[this._step] = Date.now();
    this._step++;

    // STEP 4: group into arguments
    for each (var pair in this._verbArgPairs) {
      let argParses = this.parser.argFinder(pair.argString,pair._verb,this.input);
      this._possibleParses = this._possibleParses.concat(argParses);
      yield true;
    }

    this._times[this._step] = Date.now();
    this._step++;

    // STEP 5: substitute anaphora
    // set selection with the text in the selection context
    let selection;
    
    if (!!this.selObj.text || !!this.selObj.html) {
      selection = this.selObj.html;
      for each (let parse in this._possibleParses) {
        // if there is a selection and if we find some anaphora in the entire
        // input...
        if (selection.length &&
            this.parser._patternCache.anaphora.test(this._input)) {
          let newParses = this.parser.substituteSelection(parse,selection);
          if (newParses.length)
            this._possibleParses = this._possibleParses.concat(newParses);
        }
        yield true;
      }
    }

    this._times[this._step] = Date.now();
    this._step++;

    // STEP 6: substitute normalized forms
    // check every parse for arguments that could be normalized.
    for each (let parse in this._possibleParses) {
      let newParses = this.parser.substituteNormalizedArgs(parse);
      if (newParses.length)
        this._possibleParses = this._possibleParses.concat(newParses);
      yield true;
    }

    this._times[this._step] = Date.now();
    this._step++;

    // STEP 7: suggest verbs for parses which don't have one
    for each (parse in this._possibleParses) {
      let newVerbedParses = this.parser.suggestVerb(parse);
      for each (newVerbedParse in newVerbedParses) {
        this._verbedParses = this.addIfGoodEnough(this._verbedParses,
                                                  newVerbedParse);
        yield true;
      }
    }

    this._times[this._step] = Date.now();
    this._step++;

    // STEP 8: do nountype detection + cache
    // STEP 9: suggest arguments with nountype suggestions
    // STEP 10: score

    // Set up tryToCompleteParses()
    // This function will be called at the end of each nountype detection.
    // If it finds some parse that that is ready for scoring, it will then
    // handle the scoring.
    var thisQuery = this;
    var completeParse = function(thisParse) {
      //mylog('completing parse '+parseId+' now');
      thisParse.complete = true;

      // go through all the arguments in thisParse and suggest args
      // based on the nountype suggestions.
      // If they're good enough, add them to _scoredParses.
      suggestions = thisQuery.parser.suggestArgs(thisParse);
      //mylog(suggestions);
      for each (let newParse in suggestions) {
        thisQuery._scoredParses = thisQuery.addIfGoodEnough(thisQuery._scoredParses,
                                                     newParse);
      }
    }
    var tryToCompleteParses = function(argText,suggestions) {
      dump('finished detecting nountypes for '+argText+'\n');
      //mylog([argText,suggestions]);

      if (thisQuery.finished) {
        dump('this query has already finished\n');
        return;
      }

      for each (parseId in thisQuery._parsesThatIncludeThisArg[argText]) {
        let thisParse = thisQuery._verbedParses[parseId];

        if (thisParse.allNounTypesDetectionHasCompleted() && !thisParse.complete) {
          completeParse(thisParse);
        }
      }

      var isComplete = function(parse) {return parse.complete};
      if (thisQuery._verbedParses.every(isComplete)) {
        thisQuery._times[this._step] = Date.now();
        thisQuery._step++;
        thisQuery.finished = true;
        dump('done!!!\n');
        thisQuery.onResults();
      }
    }

    // first create a map from arg's to parses that use them.
    this._parsesThatIncludeThisArg = {};
    // and also a list of arguments we need to cache
    this._argsToCache = {};
    for (let parseId in this._verbedParses) {
      let parse = this._verbedParses[parseId];
      parse._verbedParseId = parseId;

      let foundArgs = false;
      for each (let arg in parse.args) {
        foundArgs = true;
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

      // if this parse doesn't have any arguments, complete it now.
      if (!foundArgs) {
        completeParse(parse);
      }
    }

    // now that we have a list of args to cache, let's go through and cache them.
    for (let argText in this._argsToCache) {

      this.parser.detectNounType(argText,tryToCompleteParses);
      yield true;
    }

  },

  // ** {{{Parser.Query.hasResults}}} (read-only) **
  //
  // A getter for whether there are any results yet or not.
  get hasResults() { return this._scoredParses.length > 0; },

  // ** {{{Parser.Query.suggestionList}}} (read-only) **
  //
  // A getter for the suggestion list.
  get suggestionList() {
    // We clone because we're going to sort the results but we don't want this
    // to interfere with any sorting being done in the addIfGoodEnough
    // routine.
    //
    // in other words...
    //
    // "We clone because we care." (TM)
    let returnParses = cloneObject(this._scoredParses);
    // order the scored parses here.
    returnParses.sort( function(a,b) b.getScore() - a.getScore() );
    return returnParses.slice(0,this.maxSuggestions);
  },

  // ** {{{Parser.Query.cancel()}}} **
  //
  // If the query is running in async mode, the query will stop at the next
  // {{{yield}}} point when {{{cancel()}}} is called.
  cancel: function() {
    dump("cancelled!\n");
    this._keepworking = false;
  },

  // ** {{{Parser.Query.onResults()}}} **
  //
  // A handler for the endgame. To be overridden.
  onResults: function() {},

  // ** {{{Parser.Query.addIfGoodEnough()}}} **
  //
  // Takes a {{{parseCollection}}} (Array) and a {{{newParse}}}.
  //
  // Looking at the {{{maxSuggestions}}} value (= m), defines "the bar" (the
  // lowest current score of the top m parses in the {{{parseCollection}}}).
  // Adds the {{{newParse}}} to the {{{parseCollection}}} if it has a chance
  // at besting "the bar" in the future ({{{newParse.getMaxScore() > theBar}}}).
  // If {{{newParse}}} was added and that "raised the bar", it will go through
  // all parses in the {{{parseCollection}}} and kill off those which have
  // no chance in hell of overtaking the new bar.
  //
  // A longer explanation of "Rising Sun" optimization strategy (and why it is
  // applicable here, and with what caveats) can be found in the article
  // [[http://mitcho.com/blog/observation/scoring-for-optimization/|Scoring for Optimization]].
  addIfGoodEnough: function(parseCollection,newParse) {

    if (parseCollection.length < this.maxSuggestions)
      return parseCollection.concat([newParse]);

    // reorder parseCollection so that it's in decreasing current score order
    parseCollection.sort( function(a,b) b.getScore() - a.getScore() );

    // "the bar" is the lowest current score among the top candidates
    // New candidates must exhibit the *potential* (via maxScore) to beat
    // this bar in order to get added.
    let theBar = parseCollection[this.maxSuggestions - 1].getScore();
    //mylog('theBar = '+theBar);

    // at this point we can already assume that there are enough suggestions
    // (because if we had less, we would have already returned with newParse
    // added). Thus, if the new parse's maxScore is less than the current bar
    // we will not return it (effectively killing the parse).

    if (newParse.getMaxScore() < theBar) {
      //mylog(['not good enough:',newParse,newParse.getMaxScore()]);
      return parseCollection;
    }

    // add the new parse into the parse collection
    parseCollection = parseCollection.concat([newParse]);
    // sort again
    parseCollection.sort( function(a,b) b.getScore() - a.getScore() );

    // if the bar changed...
    if (parseCollection[this.maxSuggestions - 1].getScore() > theBar) {
      theBar = parseCollection[this.maxSuggestions - 1].getScore();
      //mylog('theBar is now '+theBar);

      // sort by ascending maxScore order
      parseCollection.sort( function(a,b) a.getMaxScore() - b.getMaxScore() );

      while (parseCollection[0].getMaxScore() < theBar
             && parseCollection.length > this.maxSuggestions) {
        let throwAway = parseCollection.shift();
        //mylog(['throwing away:',throwAway,throwAway.getMaxScore(),parseCollection.length+' remaining']);
      }
    }

    return parseCollection;

  }


};

// == {{{Parser.Parse}}} prototype ==
//
// {{{Parser.Parse}}} is the class for all of the parses which will be returned
// in an array by the {{{Parser.Query.suggestionList}}}. It is also used
// throughout the parse process.
//
// The constructor takes the {{{branching}}} and {{{joindelimiter}}} parameters
// from the {{{Parser}}} (which are used for the {{{getDisplayText()}}}
// method) and the {{{verb}}} and {{{argString}}}. Individual arguments in
// the property {{{args}}} should be set individually afterwards.

Parser.Parse = function(parser, input, verb, argString) {
  this._partialParser = parser;
  this.input = input;
  this._verb = verb;
  this.argString = argString;
  this.args = {};
  // this is the internal score variable--use the getScore method
  this.__score = 0;
  this.scoreMultiplier = 0;
  // complete == false means we're still parsing or waiting for async nountypes
  this.complete = false;
}

// ** {{{Parser.Parse.getDisplayText()}}} **
//
// {{{getDisplayText()}}} prints the verb and arguments in the parse by
// ordering all of the arguments (and verb) by their {{{_order}}} properties
// and displaying them with nice {{{<span class='...'></span>}}} wrappers.
Parser.Parse.prototype = {
  getDisplayText: function() {
    // This is the main string to be returned.
    let display = '';
    // This string is built in case there's a verb at the end of the sentence,
    // in which case we slap this on at the end.
    let displayFinal = '';

    // If the verb has _order = -1, it means it was at the end of the input.
    if (this._verb._order != -1)
      display = "<span class='verb' title='"
        + (this._verb.id || 'null') + "'>" + (this._verb.text || '<i>null</i>')
        + "</span>" + this._partialParser.joindelimiter;
    else
      displayFinal = this._partialParser.joindelimiter + "<span class='verb' title='"
      + this._verb.id + "'>" + (this._verb.text || '<i>null</i>') + "</span>";

    // Copy all of the arguments into an ordered array called argsArray.
    // This will then be in the right order for display.
    let argsArray = [];
    for (let role in this.args) {
      for each (let argument in this.args[role]) {
        argsArray[argument._order] = argument;
        argsArray[argument._order].role = role;
      }
    }

    for each (let arg in argsArray) {
      let className = 'argument';
      if (!arg.modifier)
        className = 'object';

      // Depending on the _branching parameter, the delimiter goes on a
      // different side of the argument.
      if (this._partialParser.branching == 'right')
        display += (arg.outerSpace || '') + (arg.modifier ? "<span class='prefix' title='"
          + arg.role+"'>" + arg.modifier + arg.innerSpace
          + "</span>":'') + "<span class='" + className + "' title=''>"
          + (arg.inactivePrefix ?
             "<span class='inactive'>" + arg.inactivePrefix + "</span>" : '')
          + (arg.text || arg.input)
          + (arg.inactiveSuffix ?
             "<span class='inactive'>" + arg.inactiveSuffix + "</span>" : '')
          + "</span>";
      else
        display += "<span class='" + className
          + "' title=''>"
          + (arg.inactivePrefix ?
             "<span class='inactive'>" + arg.inactivePrefix + "</span>" : '')
          + (arg.text || arg.input)
          + (arg.inactiveSuffix ?
             "<span class='inactive'>" + arg.inactiveSuffix + "</span>" : '')
          + "</span>" + (arg.modifier ? "<span class='prefix' title='" + arg.role + "'>"
          + arg.innerSpace + arg.modifier + "</span>" : '') + (arg.outerSpace || '');

    }

    for each (let neededArg in this._verb.arguments) {
      if (!(neededArg.role in this.args)) {
        let label;
        label = neededArg.label || neededArg.nountype._name;

        for each (let parserRole in this._partialParser.roles) {
          if (parserRole.role == neededArg.role) {
            if (this._partialParser.branching == 'left')
              label = label + this._partialParser.joindelimiter
                            + parserRole.delimiter;
            else
              label = parserRole.delimiter
                       + this._partialParser.joindelimiter + label;
            break;
          }
        }

        display += ' <span class="needarg">('+label+')</span>';
      }
    }

    // return with score for the time being
    // DEBUG: score is being displayed here.
    return display + displayFinal + ' ('
           + (Math.floor(this.getScore() * 100)/100 || '<i>no score</i>')
//           + ', '
//           + (Math.floor(this.getMaxScore() * 100)/100 || '<i>no maxScore</i>')
//           + ', '
//           + (Math.floor(this.scoreMultiplier*100)/100 || '<i>no multiplier</i>')
           + ')';

  },
  getCompletionText: function() {
    var originalText = this.getLastNode().input;
    var newText = this.getLastNode().text;
    var findOriginal = new RegExp(originalText+'$');
    if (findOriginal.test(this.input))
      return this.input.replace(findOriginal,newText) + this._partialParser.joindelimiter;

    return this.input;
  },
  // **{{{Parser.Parse.getIcon()}}}**
  //
  // Return the verb's icon.
  getIcon: function() {
    return this._verb.icon;
  },
  // **{{{Parser.Parse.execute()}}}**
  //
  // Execute the verb. Only the first argument in each role is returned.
  // The others are thrown out.
  execute: function(context) {
    let firstArgs = {};
    for (let role in this.args) {
      firstArgs[role] = this.args[role][0];
    }
    return this._verb.execute( context, firstArgs );
  },
  // **{{{Parser.Parse.preview()}}}**
  //
  // Returns the verb preview.
  preview: function(context, previewBlock) {

    let firstArgs = {};
    for (let role in this.args) {
      firstArgs[role] = this.args[role][0];
    }

    if (typeof this._verb.preview == 'function')
      return this._verb.preview( context, previewBlock, firstArgs );
    else {
      dump(this._verb.names.en[0]+' didn\'t have a preview!\n');
      return false;
    }
  },
  // **{{{Parser.Parse.previewDelay}}} (read-only)**
  //
  // Return the verb's {{{previewDelay}}} value.
  get previewDelay() {
    return this._verb.previewDelay;
  },
  // **{{{Parser.Parse.previewUrl}}} (read-only)**
  //
  // Return the verb's {{{previewUrl}}} value.
  get previewUrl() {
    return this._verb.previewUrl;
  },
  // **{{{Parser.Parse.getLastNode()}}}**
  //
  // Return the parse's last node, whether a verb or an argument.
  // This can be used to power something like tab-completion, by replacing
  // {{{Parse.getLastNode().input}}} with {{{Parse.getLastNode().text}}}.
  getLastNode: function() {
    // default value if there are no arguments
    let lastNode = this._verb;
    if (this._verb._order != -1) {
      for (let role in this.args) {
        for each (let arg in this.args[role]) {
          if (arg._order > lastNode._order)
            lastNode = arg;
        }
      }
    }
    return lastNode;
  },
  // **{{{Parser.Parse.allNounTypesDetectionHasCompleted()}}} (read-only)**
  //
  // If all of the arguments' nountype detection has completed, returns true.
  // This means this parse can move onto Step 8
  allNounTypesDetectionHasCompleted: function() {
    i=0;
    for (let role in this.args) {
      // for each argument of this role...
      for each (let arg in this.args[role]) {
        // this is the argText to check
        let argText = arg.input;

        if (!(argText in nounCache))
          return false;
      }
    }

    // if all the argText's are in the nounCache
    return true;
  },
  // ** {{{Parser.Parse.getMaxScore()}}} **
  //
  // {{{getMaxScore()}}} computes the maximum possible score which a partial
  // parse could possibly yield. It's used in cases where an async nountype
  // has yet to return the nountype score for one or more arguments.
  getMaxScore: function() {

    if (this.complete)
      return this.getScore();

    let score = 0;

    // get one point for the verb
    score += this.scoreMultiplier;

    if (!this._verb.text)
      return false; // we still cannot determine the maxScore

    for each (let verbArg in this._verb.arguments) {
      if (this.args[verbArg.role] == undefined)
        // in this case, no argument has been set for this role and never will.
        score += 0;
      else if (this.args[verbArg.role][0].score == undefined)
        // in this case, the arg text was set for this role, but we haven't
        // yet received an async score. Wait for it and assume good faith.
        score += this.scoreMultiplier;
      else
        // in this case, we've already received the score from the nountype
        score += this.args[verbArg.role][0].score
                 * this.scoreMultiplier;
    }

    return score;
  },
  // ** {{{Parser.Parse.getScore()}}} **
  //
  // {{{getScore()}}} returns the current value of {{{__score}}}.
  getScore: function() {
    return this.__score;
  }

}

// **{{{mylog()}}}**
//
// {{{mylog}}} is a function to display stuff nicely in FireBug' console
// from chrome... it's a hack!
if ((typeof window) == 'undefined') {// kick it chrome style

  // mitcho just uses this function for debug purposes:
  mylog = function mylog(what) {
    const Cc = Components.classes;
    const Ci = Components.interfaces;
    Cc["@mozilla.org/appshell/window-mediator;1"].
      getService(Ci.nsIWindowMediator).
        getMostRecentWindow("navigator:browser").Firebug.Console.
          logFormatted([what]);
  }

} else {
  //mylog = console.log;
}

var cloneParse = function(p) {
  let ret = new Parser.Parse(p.partialParser,
                             p.input,
                             cloneObject(p._verb),
                             p.argString);
  ret.args = cloneObject(p.args);
  ret.complete = p.complete;
  ret._suggested = p._suggested;
  ret.scoreMultiplier = p.scoreMultiplier;
  ret.__score = p.__score;
  return ret;
}

// **{{{cloneObject()}}}**
//
// {{{cloneObject()}}} takes an object and returns a clone, recursively
// cloning the children as well. It only supports object nodes of type
// Object or Array... strings, numbers, bools, etc. of course do work.
//
// NOTE: if you put this function in a different file and import it as
// a module, it won't be able to correctly identify whether the input is
// {{{instanceof Array}}} or not! Ask mitcho for details.
var cloneObject = function(o) {
  if (o == null)
    return null;
  if (o == undefined)
    return undefined;

  if (typeof o != 'object')
    return o;

  var ret = (o.constructor.name == 'Array') ? new Array() : new Object();

  for (var i in o) {
    ret[i] = cloneObject(o[i]);
  }

  return ret;
}

function sameNounType(a,b,print) {

  // TODO: figure out a better way to compare functions?

  if ((typeof a) == 'function' && (typeof b) == 'function')
    return (a.toString() == b.toString());

  if ((typeof a) != 'object' || (typeof b) != 'object') {
    if (print) dump('>returning typeof data: '+a+' ('+(typeof a)+')<>'+b+' ('+(typeof b)+') = '+(a == b)+'\n');
    return (a == b);
  }

  for (let i in a) {
    if (i != 'contactList') {
      if (!sameObject(a[i],b[i],print)) {
        if (print) dump('>'+i+' was in a but not in b\n');
        return false;
      }
    }
  }
  for (let j in b) {
    if (j != 'contactList') {
      if (!sameObject(a[j],b[j],print)) {
        if (print) dump('>'+j+' was in b but not in a\n');
        return false;
      }
    }
  }
  return true;
}

function sameObject(a,b,print) {

  // TODO: figure out a better way to compare functions?

  if ((typeof a) == 'function' && (typeof b) == 'function')
    return (a.toString() == b.toString());

  if ((typeof a) != 'object' || (typeof b) != 'object') {
    if (print) dump('>returning typeof data: '+a+' ('+(typeof a)+')<>'+b+' ('+(typeof b)+') = '+(a == b)+'\n');
    return (a == b);
  }

  for (let i in a) {
    if (!sameObject(a[i],b[i],print)) {
      if (print) dump('>'+i+' was in a but not in b\n');
      return false;
    }
  }
  for (let j in b) {
    if (!sameObject(a[j],b[j],print)) {
      if (print) dump('>'+j+' was in b but not in a\n');
      return false;
    }
  }
  return true;
}