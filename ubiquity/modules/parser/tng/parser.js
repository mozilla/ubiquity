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
// [[https://wiki.mozilla.org/User:Mitcho/ParserTNG|Parser TNG]].
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
// Nouns are cached in this cache in the {{{Parser.cacheNounTypes}}} method
// and associated methods. Later in the parse process elements of {{{nounCache}}}
// are accessed directly, assuming that the nouns were already cached
// using {{{Parser.cacheNounTypes}}}.
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
  // work with Parser TNG.
  setCommandList: function( commandList ) {
    for (let verb in commandList) {
      if (commandList[verb].names != undefined) {
        this._verbList.push(commandList[verb]);
        //dump("loaded verb: "+verb+"\n");
      }
    }
  },


  // ** {{{Parser.setNounList()}}} **
  //
  // Accepts an array of nountype objects and registers a unique set of them.
  // The nountypes registered go in the {{{Parser._nounTypes}}} object. There,
  // the keys used become references to the actual nountype objects in the
  // {{{_nounTypes}}}, which is used for comparison later with the nountype
  // specified in the verbs.
  //
  // After the nountypes have been registered, {{{Parser.initialCache()}}} is
  // called.
  setNounList: function( nounList ) {

    for each (nountype in nounList) {

      // if there's no _name, skip this nountype
      if (nountype._name == undefined)
        continue;

      var thisNounTypeIsAlreadyRegistered = false;

      for each (registeredNounType in this._nounTypes) {

        if (sameObject(nountype,registeredNounType)) {
        
          thisNounTypeIsAlreadyRegistered = true;
          //dump("this noun type is already registered.");
          // search no more. it's already registered.
          break;
        }
      }
      
      // if it hasn't been registered yet, register it now.
      if (!thisNounTypeIsAlreadyRegistered) {
        this._nounTypes.push(nountype);
        //dump("just registered"+nountype._name+"\n");
      }
    }
    
    dump(this._nounTypes.length+' nountypes registered\n');
    
    this.initialCache();
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
        (this.usespaces?'(\\s+.*$|$)':'(.*$)'));
    // this._patternCache.verbFinalTest matches a verb at the end of the string
    this._patternCache.verbFinalTest = new RegExp(
      (this.usespaces?'(^.*\\s+|^)':'(^.*)')+
        '('+this._patternCache.verbMatcher+')\\s*$');

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
        +')$');
    }

    // this is the RegExp to recognize delimiters for an as yet unspecified
    // verb... in other words, it's just a RegExp to recognize every
    // possible delimiter.
    this._patternCache.delimiters[null] = new RegExp(
      '^('+[role.delimiter for each (role in this.roles) ].join('|')+')$');

  },

  // ** {{{Parser.newQuery()}}} **
  //
  // This method returns a new {{{Parser.Query}}} object, as detailed in 
  // [[http://ubiquity.mozilla.com/trac/ticket/532|trac #532]]
  newQuery: function(queryString,context,maxSuggestions,dontRunImmediately) {
    return new Parser.Query(this,
                            queryString,
                            context,
                            maxSuggestions,
                            dontRunImmediately);
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
                 _order: null},
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
    
    // let's see if there's a verb at the beginning of the string
    let initialMatches = input.match(this._patternCache.verbInitialTest);
    // if we found a match
    if (initialMatches != null) {

      // initialMatches will return an array of strings in the following order
      let [ ,verbPrefix,argString] = initialMatches;

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
          if (name.indexOf(verbPrefix) == 0) {
            let thisParse = {_verb: cloneObject(this._verbList[verb]),
                             argString: argString};
            // add some extra information specific to this parse
            thisParse._verb.id = verb;
            thisParse._verb.text = name;
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

      for (verb in this._verbList) {
        // check each verb synonym in this language
        for (name in names(this._verbList[verb],this.lang)) {
          // if it matched...
          if (name.indexOf(verbPrefix) == 0) {
            let thisParse = {_verb: cloneObject(this._verbList[verb]),
                             argString: argString};
            // add some extra information specific to this parse
            thisParse._verb.id = verb;
            thisParse._verb.text = name;
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
  // Takes an input string and returns an array of all the words.
  // Words are returned in left to right order, split using \s as delimiter.
  // If input is empty, it will return [].
  //
  // Used by {{{Parser.argFinder()}}}
  splitWords: function(input) {
    return input.match(/\S+/g);
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
    return [role.role for each (role in roles)
                      if (role.delimiter == delimiter) ];
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
  // [[https://wiki.mozilla.org/User:Mitcho/ParserTNG#step_4:_group_into_arguments]].
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
  
  argFinder: function(argString,verb) {

    // initialize possibleParses. This is the array that we're going to return.
    let possibleParses = [];

    // split words using the splitWords() method
    let words = this.splitWords(argString);

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
      var theseParses = [new Parser.Parse(this.branching,
                                          this.joindelimiter,
                                          verb,
                                          argString)];

      // if there are no delimiters at all, put it all in the direct object
      if (delimiterIndices.length == 0) {
        if (theseParses[0].args.object == undefined)
          theseParses[0].args.object = [];
        theseParses[0].args.object.push({ _order:1,
                                          input:words.join(this.joindelimiter),
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
              input: words.slice(
                       delimiterIndices[delimiterIndices.length - 1] + 1,
                       words.length).join(this.joindelimiter),
              modifier:'' }
          );

        }
      } else {
        if (delimiterIndices[0] > 0 && delimiterIndices[0] != undefined) {

          if (theseParses[0].args.object == undefined)
            theseParses[0].args.object = [];
          theseParses[0].args.object.push(
            {_order: 1,
             input: words.slice(0,delimiterIndices[0]).join(this.joindelimiter),
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
              let thisParse = new cloneObject(theseParses[k]);

              if (this.branching == 'left') {// find args right to left

                // put the selected argument in its proper role

                if (thisParse.args[role] == undefined)
                  thisParse.args[role] = [];

                // our argument is words (j)...(jmax+1-1)
                // note that Array.slice(i,j) returns *up to* j
                var argument = words.slice(j,jmax + 1).
                                             join(this.joindelimiter);
                // our delimiter
                var modifier = words[delimiterIndices[i]];

                // push it!
                thisParse.args[role].push(
                  { _order: 1 + 2*(delimiterIndices.length - i),
                    input:this.cleanArgument(argument),
                    modifier:modifier
                  });

                // put the extra words between the earlier delimiter and our
                // arguments into the object role
                if (j != jmin) {

                  if (thisParse.args.object == undefined)
                    thisParse.args.object = [];

                  // our argument is words (jmin)...(j-1)
                  // note that Array.slice(i,j) returns *up to* j
                  var argument = words.slice(jmin,j).join(this.joindelimiter);

                  // push it!
                  thisParse.args.object.push(
                    { _order: 2*(delimiterIndices.length - i),
                      input:this.cleanArgument(argument),
                      modifier:''
                    });

                }
              } else {
                // put the selected argument in its proper role
                if (thisParse.args[role] == undefined)
                  thisParse.args[role] = [];
                  
                // our argument is words (jmin)...(j+1-1)
                // note that Array.slice(i,j) returns *up to* j
                var argument = words.slice(jmin,j + 1).join(this.joindelimiter);

                // our delimiter
                var modifier = words[delimiterIndices[i]];

                // push it!
                thisParse.args[role].push(
                  { _order: 1 + 2*(i)+2 - 1,
                    input:this.cleanArgument(argument),
                    modifier:modifier });

                // put the extra words between this delimiter and the next
                // into the object role
                if (j != jmax) {

                  if (thisParse.args.object == undefined)
                    thisParse.args.object = [];

                  // our argument is words (j+1)...(jmax+1-1)
                  // note that Array.slice(i,j) returns *up to* j
                  var argument = words.slice(j + 1,jmax + 1).
                                               join(this.joindelimiter);

                  // push it!
                  thisParse.args.object.push(
                    { _order: 1 + 2*(i)+2,
                      input:this.cleanArgument(argument),
                      modifier:''
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
      possibleParses.push(theseParses);
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
  
  // ** {{{Parser.substitute()}}} **
  //
  // {{{substitute()}}} takes a parse and a selection string. It should only
  // be called if the {{{selection}}} is not empty. It looks for any of the
  // anaphora set in {{{Parser.anaphora}}} and creates a copy of that parse
  // where that anaphor has been substituted with the selection string.
  //
  // The new string with the substitution is assigned to each arg's
  // {{{_substitutedInput}}} property. The argument's {{{input}}} property is
  // left unchanged.
  // 
  // An array of //new// parses is returned, so it should then be 
  // {{{concat}}}'ed to the current running list of parses.
  substitute: function(parse,selection) {
    let returnArr = [];

    for (let role in parse.args) {
      let args = parse.args[role];
      for (let i in args) {
        let oldArg = args[i].input;
        let newArg = oldArg.replace(this._patternCache.anaphora,
                                           "$1"+selection+"$3");

        if (newArg != oldArg) {
          let parseCopy = cloneObject(parse);
          parseCopy.args[role][i]._substitutedInput = newArg;
          returnArr.push(parseCopy);
        }
      }
    }

    return returnArr;
  },
  
  // ** {{{Parser.suggestVerb()}}} **
  //
  // {{{suggestVerb()}}} takes a parse and, if it doesn't yet have a verb,
  // suggests one based on its arguments. If one of the parse's argument's
  // roles is not used by a verb, that verb is not suggested.
  //
  // If a verb was suggested, the {{{parse.score}}} is set to 0.5 as a penalty.
  // {{{_suggested}}} is also set to true.
  //
  // An array of //new// parses is returned, so it should replace the original
  // list of parses (which may include parses without any verbs). If none of
  // the verbs match the arguments' roles in the parse, it will return [].
  suggestVerb: function(parse,threshold) {

    // for parses which already have a verb
    if (parse._verb.id != null)
      return [parse];

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
        parseCopy._verb.text = this._verbList[verb].names[this.lang][0];
        parseCopy._verb._order = 0;
        // TODO: for verb forms which clearly should be sentence-final,
        // change this value to -1

        parseCopy.score = 0.5; // lowered because we had to suggest a verb
        parseCopy._suggested = true;
        if (parseCopy.score > threshold)
          returnArray.push(parseCopy);
      }
    }
    return returnArray;
  },

  // ** {{{Parser.suggestArgs()}}} **
  //
  // {{{suggestArgs()}}} returns an array of copies of the given parse by 
  // replacing each of the arguments' text (from {{{_substitutedInput}}}) with 
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

    // make sure we keep the anaphor-substituted input intact... we're
    // going to make changes to text, html, score, and nountype

    let initialCopy = cloneObject(parse);
    let returnArr = [initialCopy];

    for (let role in parse.args) {

      let thisVerbTakesThisRole = false;

      for each (let verbArg in parse._verb.arguments) {
        if (role == verbArg.role) {

          // for each argument of this role...
          for (let i in parse.args[role]) {

            // this is the argText to check
            let argText = parse.args[role][i]._substitutedInput;

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

              if (sameObject(suggestion.nountype,verbArg.nountype)) {
              
                // TODO: real comparison of the nountypes
              
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
              
              } else {

                if (suggestion.nountype._name == verbArg.nountype._name)
                  dump('sameObject just said no, but the names are the same: '+suggestion.nountype._name+'\n');
              
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

      if (!thisVerbTakesThisRole)
        return [];

    }
    return returnArr;
  },
  
  // ** {{{Parser.score()}}} **
  //
  // {{{score()}}} computes the score of the parse based on each argument's 
  // nountype score and the number of matching arguments, etc. It returns the
  // parse itself, not just the score float, with the {{{score}}} property
  // set.
  //
  // Since the current algorithm is non-increasing, at many points we check
  // to see if the score is less than the threshold. If it is less than the 
  // threshold at one point, there's no way it will get back above, so we
  // kill it, i.e. return [] right there.
  // 
  // TODO: Improve this algorithm, most likely in an additive (non-decreasing)
  // way. See 
  // [[http://mitcho.com/blog/observation/scoring-and-ranking-suggestions/|this article]]
  // for some thoughts on scoring.
  // 
  // TODO: This might could be a method of Parser.Parse, rather than in Parser.
  score: function(parse,threshold) {
    let score = (parse.score || 1); // start with a perfect score

    // for each of the roles parsed in the parse
    for (let role in parse.args) {

      // if there are multiple arguments of any role, mark this parse down.
      if (parse.args[role].length > 1) {
        score *= Math.pow(0.5,(parse.args[role].length - 1));
        if (score < threshold)
          return [];
      }
   
      // multiply the score by each role's first argument's nountype match score
      score *= parse.args[role][0].score;

      if (score < threshold)
        return [];

    }

    // Now we'll check to see if all of the arguments required by the verb
    // have been set.
    // We do this by preemptively lowering the score for each expected arg,
    // and then raising it back up if we do end up finding that argument.
    for each (var verbArg in this._verbList[parse._verb.id].arguments) {
      score *= 0.8; // lower for each unset argument

      for (var role in parse.args) {
        if (role == verbArg.role) {
          score *= (1/0.8); // repair this for set arguments
          break;
        }
      }

      if (score < threshold)
        return [];

    }

    // if we made it this far, return this parse with the score set.
    parse.score = score;
    return [parse];
  },

  // == Noun Type utilities ==
  //
  // In the future these methods of {{{Parser}}} probably ought to
  // go into a separate class or something.
  //
  // The only method actually called elsewhere is 
  // {{{cacheNounTypes()}}}... the other two are just used by that one.
  
  // ** {{{Parser._detectNounType()}}} **
  // 
  // Takes an argument string and, if it is not in the {{{nounCache}}},
  // calls {{{_protoDetectNounType}}} and caches it. It then also returns
  // the result.
  _detectNounType: function(x) {
    if (nounCache[x] == undefined) {
      nounCache[x] = this._protoDetectNounType(x);
    }
    return nounCache[x];
  },
  
  // ** {{{Parser._protoDetectNounType()}}} **
  //
  // This method actually does the detecting.
  // It takes an argument string and runs through all of the noun types in
  // {{{Parser._nounTypes}}} and gets their suggestions (via their 
  // {{{.suggest()}}} methods). It then takes each of those suggestions,
  // marks them with which noun type it came from (in {{{.nountype}}})
  // and puts all of those suggestions in an object (hash) keyed by
  // noun type name.
  _protoDetectNounType: function (x) {
    //mylog('detecting:'+x+"\n");

    let returnArray = [];

    for each (let thisNounType in this._nounTypes) {
//      mylog(thisNounType);
      let suggestions = thisNounType.suggest(x);
      for each (let suggestion in suggestions) {
        // set the nountype that was used in each suggestion so that it can 
        // later be compared with the nountype specified in the verb.
        suggestion.nountype = thisNounType;
      }
      if (suggestions.length > 0) {
        returnArray = returnArray.concat(suggestions);
      }
    }
    return returnArray;
  },
  
  // ** {{{Parser.cacheNounTypes()}}} **
  //
  // Takes an {{{args}}} property of a Parse and digs deep to find the actual
  // argument strings. It then passes each argument string
  // ({{{_substitutedInput}}}) to {{{Parser._detectNounType()}}}.
  cacheNounTypes: function (args) {
    for each (let arg in args) {
      for each (let x in arg) {
        this._detectNounType(x._substitutedInput);
      }
    }
    return true;
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
  this._threshold = 0.2;

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
  // [[https://wiki.mozilla.org/User:Mitcho/ParserTNG|the ParserTNG proposal]].
  // Notes that the first two steps are actually done outside of
  // {{{_yieldingParse()}}}.
  // 
  // # split words/arguments + case markers
  // # pick possible verbs
  // # pick possible clitics
  // # group into arguments
  // # substitute anaphora (aka "magic words")
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
      for each (var argParses in
                this.parser.argFinder(pair.argString,pair._verb)) {
        this._possibleParses = this._possibleParses.concat(argParses);
        yield true;
      }
    }

    this._times[this._step] = Date.now();
    this._step++;

    // STEP 5: substitute anaphora
    // set selection with the text in the selection context
    let selection;
    if (this.context.getSelection != undefined)
      selection = this.context.getSelection();
    else
      selection = '';

    for each (let parse in this._possibleParses) {
      // make sure we keep the original input intact... we're going to make
      // changes to _substitutedInput
      for each (let args in parse.args) {
        for each (let arg in args) {
          if (arg._substitutedInput == undefined)
            arg._substitutedInput = arg.input;
        }
      }

      // if there is a selection and if we find some anaphora in the entire
      // input...
      if (selection.length &&
          this.parser._patternCache.anaphora.test(this._input)) {
        let newParses = this.parser.substitute(parse,selection);
        if (newParses.length)
          this._possibleParses = this._possibleParses.concat(newParses);
      }
      yield true;

    }

    this._times[this._step] = Date.now();
    this._step++;

    // STEP 6: suggest verbs for parses which don't have one
    for each (parse in this._possibleParses) {
      let newVerbedParses = this.parser.suggestVerb(parse,this._threshold);
      this._verbedParses = this._verbedParses.concat(newVerbedParses);
      yield true;
    }

    this._times[this._step] = Date.now();
    this._step++;

    // STEP 7: do nountype detection + cache
    for each (parse in this._verbedParses) {
      this.parser.cacheNounTypes(parse.args);
      yield true;
    }

    this._times[this._step] = Date.now();
    this._step++;

    // STEP 8: replace arguments with their nountype suggestions
    // TODO: make this async to support async nountypes!
    for each (parse in this._verbedParses) {
      this._suggestedParses = this._suggestedParses.concat(
        this.parser.suggestArgs(parse));
      yield true;
    }

    this._times[this._step] = Date.now();
    this._step++;

    // STEP 9: score + rank
    for each (parse in this._suggestedParses) {
      this._scoredParses = this._scoredParses.concat(
        this.parser.score(parse,this._threshold));
      yield true;
    }
    
    // order the scored parses here.
    this._scoredParses = this._scoredParses.sort(
      function(a,b) { return b.score - a.score; } );

    this._times[this._step] = Date.now();
    this._step++;

    this.finished = true;

    this.onResults();
  },

  // ** {{{Parser.Query.hasResults}}} (read-only)**
  //
  // A getter for whether there are any results yet or not.
  get hasResults() { return this._scoredParses.length > 0; },

  // ** {{{Parser.Query.suggestionList}}} (read-only) **
  //
  // A getter for the suggestion list.
  get suggestionList() { return this._scoredParses; },

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
  onResults: function() {}

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

Parser.Parse = function(branching, joindelimiter, verb, argString) {
  this._branching = branching;
  this._delimiter = joindelimiter,
  this._verb = verb;
  this.argString = argString;
  this.args = {};
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
        + "</span>" + this._delimiter;
    else
      displayFinal = this._delimiter + "<span class='verb' title='"
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
      if (this._branching == 'right')
        display += this._delimiter + "<span class='prefix' title='"
          + arg.role+"'>" + arg.modifier + this._delimiter
          + "</span><span class='" + className + "' title=''>"
          + (arg.text || arg._substitutedInput || arg.input) + "</span>";
      else
        display += this._delimiter + "<span class='" + className
          + "' title=''>" + (arg.text || arg._substitutedInput || arg.input)
          + "</span><span class='prefix' title='" + arg.role + "'>"
          + this._delimiter + arg.modifier + "</span>";

    }

    // return with score for the time being
    // DEBUG: score is being displayed here.
    return display + displayFinal + ' ('
           + (Math.floor(this.score*100)/100 || '<i>no score</i>') + ')';

  },
  // **{{{Parser.Parse.getIcon()}}}**
  //
  // Return the verb's icon.
  getIcon: function() {
    return this._verb._icon;
  },
  // **{{{Parser.Parse.execute()}}}**
  //
  // Execute the verb.
  //
  // TODO: link up the arguments correctly for execute and preview.
  execute: function(context) {
    return this._verb.execute( context, this._argSuggs );
  },
  // **{{{Parser.Parse.preview()}}}**
  //
  // Returns the verb preview.
  preview: function(context, previewBlock) {
    return '';
    //this._verb.preview( context, this._argSuggs, previewBlock );
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

  var ret = (o instanceof Array) ? new Array() : new Object();

  for (var i in o) {
    ret[i] = cloneObject(o[i]);
  }

  return ret;
}

function sameNounType(nountype1,nountype2) {
  dump(nountype1._name+'<>'+nountype2._name+'\n');
  if (nountype1._name != nountype2._name) {
    dump('different _name\n');
    return false;
  }
  if (nountype1.list != undefined && nountype2.list != undefined) {
    if (nountype1.list.length != nountype2.list.length) {
      dump('different list length\n');
      return false;
    }
    for (let i in nountype1.list) {
      if (nountype1.list[i] != nountype2.list[i]) {
        dump('different list item\n');
        return false;
      }
    }
  } else {
    dump('different list status\n');
    return false;
  }
  if (nountype1.suggest != nountype2.suggest) {
    dump('different suggest function\n');
    return false;
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