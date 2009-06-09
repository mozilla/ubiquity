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

EXPORTED_SYMBOLS = ["NLParser1"];

Components.utils.import("resource://ubiquity/modules/suggestion_memory.js");
Components.utils.import("resource://ubiquity/modules/utils.js");

var NLParser1 = {};

NLParser1.makeParserForLanguage = function(languageCode, verbList, nounList,
                                           ContextUtils, suggestionMemory) {

  let parserPlugin = NLParser1.getPluginForLanguage(languageCode);
  return new NLParser1.Parser(verbList, nounList, parserPlugin, ContextUtils,
                              suggestionMemory);
};

(function() {
   var plugins = {};

   NLParser1.registerPluginForLanguage = function(languageCode, plugin) {
     plugins[languageCode] = plugin;
   };

   NLParser1.getPluginForLanguage = function(languageCode) {
     return plugins[languageCode];
   };
})();

/* ParserQuery: An object that wraps a request to the parser for suggestions
 * based on a given query string.  Multiple ParserQueries may be in action at
 * a single time; each is independent.  A ParserQuery can execute
 * asynchronously, producing a suggestion list that changes over time as the
 * results of network calls come in.
 */
NLParser1.ParserQuery = function(parser, queryString, context, maxSuggestions) {
  this._init(parser, queryString, context, maxSuggestions);
};
NLParser1.ParserQuery.prototype = {
  _init: function(parser, queryString, context, maxSuggestions) {
    this._parser = parser;
    this._suggestionList = [];
    this._outstandingRequests = [];
    this.onResults = null;
    this._queryString = queryString;
    this._context = context;
    this._maxSuggestions = maxSuggestions;

    // temporary
    this._parsingsList = [];
  },

  // TODO: Does query need some kind of destructor?  If this has a ref to the
  // partiallyParsedSentences and they have a ref back here, it may be a self-
  // perpetuating cycle that doesn't get GCed.  Investigate.

  // Client code should set onResults to a function!!

  cancel: function() {
    for (var x = 0; x < this._outstandingRequests.length; x++) {
      // abort outstanding ajax requests
      this._outstandingRequests[x].abort();
    }
    //reset outstanding requests
    this._outstandingRequests = [];
  },

  // Read-only properties:
  get finished() { this._refreshOutstandingRequests(); return this._outstandingRequests.length == 0; },
  get hasResults() { return this._suggestionList.length > 0; },
  get suggestionList() { return this._suggestionList; },

  // The handler that makes this a listener for partiallyParsedSentences.
  onNewParseGenerated: function() {
    this._refreshSuggestionList();
    if (this.onResults) {
      this.onResults( this._suggestionList, this.finished );
    }
  },

  // This method should be called by parser code only, not client code.
  _addPartiallyParsedSentence: function( partiallyParsedSentence ) {
    var argStrings = partiallyParsedSentence._argStrings;
    partiallyParsedSentence.addListener( this );
    this._parsingsList.push( partiallyParsedSentence );
  },

  // Internal methods:
  
  _refreshOutstandingRequests: function() {
    //check the ajax requests of each parsing to see which are still open
    this._outstandingRequests = [];
    for each (let parsing in this._parsingsList) {
      this._outstandingRequests = this._outstandingRequests.concat(parsing._ajaxRequests);
    }
  },

  _refreshSuggestionList: function() {
    // get completions from parsings -- the completions may have changed
    // since the parsing list was first generated.
    this._suggestionList = [];
    for each (let parsing in this._parsingsList) {
      let newSuggs = parsing.getParsedSentences();
      this._suggestionList = this._suggestionList.concat(newSuggs);
    }
    // Sort and take the top maxSuggestions number of suggestions
    this._sortSuggestionList();
    this._suggestionList = this._suggestionList.slice(0, this._maxSuggestions);
  },

  _sortSuggestionList: function() {
    // TODO the following is no good, it's English-specific:
    let inputVerb = this._queryString.split(" ")[0];
    /* Each suggestion in the suggestion list should already have a matchScore
       assigned by Verb.getCompletions.  Give them also a frequencyScore based
       on the suggestionMemory:*/
    for each( let sugg in this._suggestionList) {
      let suggVerb = sugg._verb._name;
      let freqScore = 0;
      if (sugg._cameFromNounFirstSuggestion) {
        // TODO suggestion memory belongs to the parser...
        freqScore = this._parser.getSuggestionMemoryScore("", suggVerb);
      } else {
        freqScore = this._parser.getSuggestionMemoryScore(inputVerb, suggVerb);
      }
      sugg.setFrequencyScore(freqScore);
    }

    this._suggestionList.sort( function( x, y ) {
      let xMatchScores = x.getMatchScores();
      let yMatchScores = y.getMatchScores();
      for (let z in xMatchScores) {
        if (xMatchScores[z] > yMatchScores[z]) {
          return -1;
        }
        else if (yMatchScores[z] > xMatchScores[z]) {
          return 1;
        }
        /* if they are equal, then continue on to the
         * next loop iteration to compare them based on
         * the next most important score. */
      }
      // Got all the way through the lists and found
      // no tiebreaker... they are truly tied.
      return 0;
    });

  }

};

NLParser1.Parser = function(verbList, nounList, languagePlugin,
                           ContextUtils, suggestionMemory) {
  this.setCommandList( verbList );
  this._nounTypeList = nounList;
  this._languagePlugin = languagePlugin;

  if (!ContextUtils) {
    var ctu = {};
    Components.utils.import("resource://ubiquity/modules/contextutils.js",
                            ctu);
    ContextUtils = ctu.ContextUtils;
  }
  this._ContextUtils = ContextUtils;

  if (!suggestionMemory) {
    var sm = {};
    Components.utils.import("resource://ubiquity/modules/suggestion_memory.js",
                            sm);
    suggestionMemory = new sm.SuggestionMemory("main_parser");
  }
  this._suggestionMemory = suggestionMemory;
  this._sortGenericVerbCache();
};

NLParser1.Parser.prototype = {

  _nounFirstSuggestions: function( selObj, maxSuggestions ) {
    let suggs = [];
    let topGenerics = this._rankedVerbsThatUseGenericNouns
                          .slice(0, maxSuggestions);
    let verbsToTry = this._verbsThatUseSpecificNouns.concat( topGenerics );
    for each(let verb in verbsToTry) {
      if(!verb.disabled){
        let newPPS = new NLParser1.PartiallyParsedSentence( verb,
                                                            {},
                                                            selObj,
                                                            0,
                                                            this._languagePlugin );
         // TODO make a better way of having the parsing remember its source than
         // this encapsulation breaking...
         newPPS._cameFromNounFirstSuggestion = true;
         suggs.push( newPPS );
      }
    }
    dump("nounFirstSuggestions returning suggestions.\n");

    return suggs;
  },

  strengthenMemory: function(query, chosenSuggestion) {
    // query is the whole input, chosenSuggestion is a parsedSentence.
    // This parser only cares about the verb name.
    let chosenVerb = chosenSuggestion._verb._name;

    if (chosenSuggestion.hasFilledArgs()) {
      this._suggestionMemory.remember("", chosenVerb);
      this._sortGenericVerbCache();
    }
    if (!chosenSuggestion._cameFromNounFirstSuggestion ) {
      let inputVerb = query.split(" ")[0];
      /* TODO English-specific! */
      this._suggestionMemory.remember(inputVerb, chosenVerb);
    }
  },

  getSuggestionMemoryScore: function(inputVerb, suggestedVerb) {
    return this._suggestionMemory.getScore(inputVerb, suggestedVerb);
  },

  // TODO reset is gone

  newQuery: function( query, context, maxSuggestions ) {
    var theNewQuery = new NLParser1.ParserQuery(this,
                                               query,
                                               context,
                                               maxSuggestions);
    var nounType, verb;
    var newSuggs = [];
    var selObj = this._ContextUtils.getSelectionObject(context);
    // selection, no input, noun-first suggestion on selection
    if (!query || query.length == 0) {
      if (selObj.text || selObj.html) {
        let nounSuggs =  this._nounFirstSuggestions(selObj,
                                                    maxSuggestions);
        newSuggs = newSuggs.concat(nounSuggs);
      }
    } else {
      // Language-specific full-sentence suggestions:
      newSuggs = this._languagePlugin.parseSentence(
        query,
        this._nounTypeList,
        this._verbList,
        selObj
      );
      // noun-first matches on input
      if (newSuggs.length == 0 ) {
        selObj = {
          text: query,
          html: query
        };
        let nounSuggs = this._nounFirstSuggestions(selObj,
                                                   maxSuggestions);
        newSuggs = newSuggs.concat(nounSuggs);
      }
    }

    // partials is now a list of PartiallyParsedSentences; if there's a
    // selection, try using it for any missing arguments...
    if (selObj.text || selObj.html) {
      for each(var part in newSuggs) {
        let withSel = part.getAlternateSelectionInterpolations();
        for each( let sugg in withSel ) {
          theNewQuery._addPartiallyParsedSentence( sugg );
        }
      }
    } else {
      for each( let sugg in newSuggs ) {
        theNewQuery._addPartiallyParsedSentence( sugg );
      }
    }
    theNewQuery._refreshSuggestionList();

    return theNewQuery;
  },

  // TODO instead of getSuggestionList, use query.suggestionList.
  // instead of getNumSuggestions, use query.suggestionList.length.
  // instead of getSentence, use query.suggestionList[index].

  setCommandList: function( commandList ) {
    this._verbList = [ new NLParser1.Verb( commandList[x] )
                       for (x in commandList) ];

    this._verbsThatUseSpecificNouns = [];
    this._rankedVerbsThatUseGenericNouns = [];
    for each ( let verb in this._verbList) {
      if (verb.usesAnySpecificNounType()) {
        this._verbsThatUseSpecificNouns.push(verb);
      } else {
        this._rankedVerbsThatUseGenericNouns.push(verb);
      }
    }
    if (this._suggestionMemory) {
      this._sortGenericVerbCache();
    }
  },

  _sortGenericVerbCache: function() {
    var suggMemory = this._suggestionMemory;
    let sortFunction = function(x, y) {
      let xScore = suggMemory.getScore("", x._name);
      let yScore = suggMemory.getScore("", y._name);
      if (xScore > yScore) {
        return -1;
      } else if (yScore > xScore) {
        return 1;
      }
      return 0;
    };
    this._rankedVerbsThatUseGenericNouns.sort(sortFunction);
  },

  setNounList: function( nounList ) {
    this._nounTypeList = nounList;
  }
};

NLParser1.ParsedSentence = function(verb, arguments, verbMatchScore, selObj) {
  /* DO and the values of modifiers should be NLParser1.EnInputData
   * objects.
   */
  this._init( verb, arguments, verbMatchScore, selObj);
}
NLParser1.ParsedSentence.prototype = {
  _init: function( verb, argumentSuggestions, verbMatchScore, selObj) {
    var nu = {};
    Components.utils.import("resource://ubiquity/modules/nounutils.js",
                            nu);
    this._makeSugg = nu.NounUtils.makeSugg;

    /* modifiers is dictionary of preposition: noun */
    if (verb){
      this._verb = verb;
      this._argSuggs = argumentSuggestions;
    }
    this._selObj = selObj;
    this.verbMatchScore = verbMatchScore;
    this.duplicateDefaultMatchScore = 100;
    this.frequencyScore = 0;  // not yet tracked
    this.argMatchScore = 0;
    /* argument match score starts at 0 and gets +1 for each
     argument where a specific nountype (i.e. non-arbitrary-text)
     matches user input.  */
    for (let argName in this._argSuggs) {
      if (this._argSuggs[argName])
        if (!this._verb._arguments[argName].type.rankLast)
          this.argMatchScore++;
    }
  },

  get completionText() {
    /* return plain text that we should set the input box to if user hits
     the key to autocomplete to this sentence. */

    /* TODO: The whole logic of this function looks completely wrong to me
     * on a cursory read-over.  If this ever generates correct output,
     * I think it must be by sheer luck.  Rip this whole thing out and
     * rewrite to make sense! -- JONO */
     var sentence = this._verb._name;
     var directObjPresent = false;
     for (var x in this._verb._arguments) {
       let argText = (this._argSuggs[x] || 0).text;
       let preposition = "";
       if (argText) {
         if (x == "direct_object") {
           /*Check for a valid text/html selection. We'll replace
              the text with a pronoun for readability */
           if (this._selObj.text == argText ||
               this._selObj.html == argText) {
             //In future, the pronoun should be contextual to the selection
             argText = "selection";
           }
           directObjPresent = true;
           preposition = " ";
         } else {
           //only append the modifiers if we have a valid direct-object
           if (argText && directObjPresent)
             preposition = " " + x + " ";
         }
         //Concatenate sentence pieces
         sentence += preposition + argText;
      }
    }
    return sentence + " ";
  },

  get displayText() {
    // returns html formatted sentence for display in suggestion list
    var sentence = Utils.escapeHtml(this._verb._name);
    var args = this._verb._arguments;
    var label;
    for (let x in args) {
      let obj = x === "direct_object";
      if ((this._argSuggs[x] || 0).summary) {
        label = obj ? "" : Utils.escapeHtml(args[x].flag) + " ";
        sentence += (' <span class="' + (obj ? "object" : "argument") + '">' +
                     label + this._argSuggs[x].summary + "</span>");
      } else {
        if (obj)
          label = args[x].label;
        else {
          let {type} = this._verb._arguments[x];
          label = args[x].flag + " " + (type.name || type._name || "?");
        }
        sentence += (' <span class="needarg">' +
                     Utils.escapeHtml(label) + "</span>");
      }
    }
    return sentence;
  },

  get icon() {
    return this._verb._icon;
  },

  execute: function(context) {
    return this._verb.execute( context, this._argSuggs );
  },

  preview: function(context, previewBlock) {
    this._verb.preview( context, previewBlock, this._argSuggs );
  },

  get previewDelay() {
    return this._verb.previewDelay;
  },

  get previewUrl() {
    return this._verb.previewUrl;
  },

  copy: function() {
    // Deep copy!
    let newArgSuggs = {};
    for (let x in this._argSuggs) {
      newArgSuggs[x] = {};
      for (let y in this._argSuggs[x])
        newArgSuggs[x][y] = this._argSuggs[x][y];
    }
    let newSentence = new NLParser1.ParsedSentence(this._verb,
                                                   newArgSuggs,
                                                   this.verbMatchScore,
                                                   this._selObj);
    return newSentence;
  },
  setArgumentSuggestion: function( arg, sugg ) {
    this._argSuggs[arg] = sugg;
  },
  getArgText: function( arg ) {
    return this._argSuggs[arg].text;
  },

  argumentIsFilled: function( arg ) {
    return ( this._argSuggs[arg] != undefined );
  },

  hasFilledArgs: function() {
    /* True if suggestion has at least one filled argument.
     False if verb has no arguments to fill, or if it has arguments but
     none of them are filled. */
    for (var x in this._argSuggs) {
      if (this._argSuggs[x] != undefined ) {
        return true;
      }
    }
    return false;
  },

  equals: function(other) {
    if (this._verb._name != other._verb._name)
      return false;
    for (var x in this._argSuggs) {
      if (this._argSuggs[x].text != other._argSuggs[x].text)
        return false;
    }
    return true;
  },

  fillMissingArgsWithDefaults: function ps_fmawd() {
    let newSentences = [this.copy()];
    let defaultValue;
    let defaultsArray = [];
    let gotArrayOfDefaults = false;
    let defaultsSoFar = {};
    for (let argName in this._verb._arguments) {
      if (!this._argSuggs[argName]) {
        let missingArg = this._verb._arguments[argName];
        if (missingArg.default) {
          defaultValue = this._makeSugg(missingArg.default);
        }
        else if (missingArg.type.default) { // Argument value from nountype default
          defaultValue = missingArg.type.default();
        }
        else { // No argument
          defaultValue = {text:"", html:"", data:null, summary:""};
        }

        let numDefaults = defaultValue.length;
        if (numDefaults === 1 || (numDefaults > 1 && gotArrayOfDefaults) ) {
          // either this is a single-item array, or
          // we've already used an array of values for a previous modifier,
          // so just use first default for this modifier
          defaultValue = defaultValue[0];
          numDefaults = 0;
        }

        if (numDefaults) {
          // first time we've seen multiple defaults, so create an array of sentences
          gotArrayOfDefaults = true;
          for (let i = 0; i < numDefaults; i++) {
            if (i) {
              newSentences[i] = this.copy();
              for (let arg in defaultsSoFar) {
                newSentences[i].setArgumentSuggestion(arg, defaultsSoFar[arg]);
              }
              // reduce the match score so that multiple entries with the
              //   same verb are only shown if there are no other verbs
              newSentences[i].duplicateDefaultMatchScore=
                                      this.duplicateDefaultMatchScore / (i + 1);
            }
            newSentences[i].setArgumentSuggestion(argName, defaultValue[i]);
          }
        }
        else {
          for (let sen in newSentences)
            newSentences[sen].setArgumentSuggestion(argName, defaultValue);
          defaultsSoFar[argName] = defaultValue;
        }

      }
    }
    return newSentences;
  },

  getMatchScores: function ps_getMatchScores() {
    if (this._cameFromNounFirstSuggestion) {
      return [this.argMatchScore, this.frequencyMatchScore];
    }
    return [this.duplicateDefaultMatchScore,
            this.frequencyMatchScore,
            this.verbMatchScore,
            this.argMatchScore];
  },

  setFrequencyScore: function( freqScore ) {
    this.frequencyMatchScore = freqScore;
  }

};

NLParser1.PartiallyParsedSentence = function(verb, argStrings, selObj,
                                             matchScore, parserPlugin) {
  /*This is a partially parsed sentence.
   * What that means is that we've decided what the verb is,
   * and we've assigned all the words of the input to one of the arguments.
   * What we haven't nailed down yet is the exact value to use for each
   * argument, because the nountype may produce multiple argument suggestions
   * from a single argument string.  So one of these partially parsed
   * sentences can produce several completely-parsed sentences, in which
   * final values for all arguments are specified.
   */
  this._listeners = [];
  this._parserPlugin = parserPlugin;
  this._verb = verb;
  this._argStrings = argStrings;
  this._selObj = selObj;
  this._parsedSentences = [];
  this._matchScore = matchScore;
  this._invalidArgs = {};
  this._validArgs = {};
  this._ajaxRequests = [];
  /* Create fully parsed sentence with empty arguments:
   * If this command takes no arguments, this is all we need.
   * If it does take arguments, this initializes the parsedSentence
   * list so that the algorithm in addArgumentSuggestion will work
   * correctly. */
  let newSen = new NLParser1.ParsedSentence(this._verb,
                                            {},
                                            this._matchScore,
                                            this._selObj);
  this._parsedSentences = [newSen];
  for (let argName in this._verb._arguments) {
    if (argStrings[argName] && argStrings[argName].length > 0) {
      // If argument is present, try the noun suggestions based both on
      // substituting pronoun...
      let text = argStrings[argName].join(" ");
      let gotSuggs = this._suggestWithPronounSub(argName, text);
      // and on not substituting pronoun...
      let gotSuggsDirect = this._argSuggest(argName, text, text, null);
      if (!gotSuggs && !gotSuggsDirect) {
        /* One of the arguments is supplied by the user, but produces
         * no suggestions, meaning it's an invalid argument for this
         * command -- that makes the whole parsing invalid!! */
        this._invalidArgs[argName] = true;
      }
    }
    /* Otherwise, this argument will simply be left blank (or filled in with
     * default value later.*/
  }
  /* ArgStrings is a dictionary, where the keys match the argument names in
   * the verb, and the values are each a ["list", "of", "words"] that have
   * been assigned to that argument
   */
};

NLParser1.PartiallyParsedSentence.prototype = {
  addListener: function(listener) {
    // Listener must be an object with an onNewParseGenerated function.
    // onNewParseGenerated will be called whenever new parsings are
    // asynchronously generated.
    this._listeners.push( listener );
  },

  _argSuggest: function(argName, text, html, selectionIndices) {
    /* For the given argument of the verb, sends (text,html) to the nounType
     * gets back suggestions for the argument, and adds each suggestion.
     * Return true if at least one arg suggestion was added in this way. */

    let argument = this._verb._arguments[argName];
    try {
      let self = this;
      // Callback function for asynchronously generated suggestions:
      let callback = function(newSugg) {
        var suggLen = newSugg.length;
        if (suggLen) {
           for (let i=0; i < suggLen; i++)
             self.addArgumentSuggestion(argName, newSugg[i]);
        } else {
           self.addArgumentSuggestion(argName, newSugg);
        }

	// Remove this request from list of open ajax requests
        if (argument.type.ajaxRequest){
	  if(self._ajaxRequests.indexOf(argument.type.ajaxRequest) != -1){
	    self._ajaxRequests.splice(self._ajaxRequests.indexOf(argument.type.ajaxRequest), 1);
	  }
	}

        // Notify our listeners!!
        for (let i = 0; i < self._listeners.length; i++) {
          self._listeners[i].onNewParseGenerated();
        }
      };
      // This is where the suggestion is actually built.
      let suggestions = argument.type.suggest(text, html, callback,
                                              selectionIndices);

      // Add ajax request from argument to ajax requests array
      if(argument.type.ajaxRequest){
	this._ajaxRequests.push(argument.type.ajaxRequest);
      }

      for each( let argSugg in suggestions) {
        if (argSugg) { // strip out null suggestions -- TODO not needed?
          this.addArgumentSuggestion(argName, argSugg);
        }
      }
      return (suggestions.length > 0);
    } catch(e) {
      Components.utils.reportError(
          'Exception occured while getting suggestions for "' +
          this._verb._name + '" with noun "' + argument.label + '": ' + e
          );
      return false;
    }
  },


  _suggestWithPronounSub: function(argName, words) {
    /* */
    let gotAnySuggestions = false;
    /* No selection to interpolate. */
    if ((!this._selObj.text) && (!this._selObj.html)) {
      return false;
    }
    let selection = this._selObj.text;
    let htmlSelection = this._selObj.html;

    for each (var pronoun in this._parserPlugin.PRONOUNS ) {
      let regexp = new RegExp("\\b" + pronoun + "\\b");
      let index = words.search(regexp);
      if ( index > -1 ) {
        let selectionIndices = [index, index + selection.length];
        let textArg = words.replace(regexp, selection);
        let htmlArg = words.replace(regexp, htmlSelection);
        dump("Suggesting " + textArg + "/" + htmlArg + "\n");
        if (this._argSuggest(argName, textArg, htmlArg,
                             selectionIndices)) {
          gotAnySuggestions = true;
        }
      }
    }
    return gotAnySuggestions;
  },

  addArgumentSuggestion: function( arg, sugg ) {
    /* Adds the given sugg as a suggested value for the given arg.
     * Extends the parsedSentences list with every new combination that
     * is made possible by the new suggestion.
     */

    let newSentences = [];
    let newSen;
    this._validArgs[arg] = true;
    for each( let sen in this._parsedSentences) {
      if ( ! sen.argumentIsFilled( arg ) ) {
        sen.setArgumentSuggestion(arg, sugg);
      } else {
        let newSen = sen.copy();
        newSen.setArgumentSuggestion(arg, sugg);
        let duplicateSuggestion = false;
        for each( let alreadyNewSen in newSentences ) {
          if (alreadyNewSen.equals(newSen))
            duplicateSuggestion = true;
        }
        if (!duplicateSuggestion)
          newSentences.push( newSen );
      }
    }
    this._parsedSentences = this._parsedSentences.concat(newSentences);
  },

  getParsedSentences: function pps_getParsedSentences() {
    /* For any parsed sentence that is missing any arguments, fill in those
    arguments with the defaults before returning the list of sentences.
    The reason we don't set the defaults directly on the object is cuz
    an asynchronous call of addArgumentSuggestion could actually fill in
    the missing argument after this.*/

    let parsedSentences = [];
    // Return nothing if this parsing is invalid due to bad user-supplied args
    for (let argName in this._invalidArgs) {
      if (this._invalidArgs[argName] && !this._validArgs[argName])
        return [];
    }

    if (this._cameFromNounFirstSuggestion) {
      for each( let sen in this._parsedSentences) {
	      if (sen.hasFilledArgs()) {
          /* When doing noun-first suggestion, we only want matches that put the
           * input or selection into an argument of the verb; therefore, explicitly
           * filter out suggestions that fill no arguments.
           */
          let filledSen = sen.fillMissingArgsWithDefaults();

          for each (let oneSen in filledSen) {
            oneSen._cameFromNounFirstSuggestion = true;
            parsedSentences.push(oneSen);
          }
      	}
      }
    } else {
      for each( let sen in this._parsedSentences) {
        let filledSen = sen.fillMissingArgsWithDefaults();
        parsedSentences = parsedSentences.concat(filledSen);
      }
    }

    return parsedSentences;
  },

  copy: function() {
    // Deep copy constructor
    let newPPSentence = new NLParser1.PartiallyParsedSentence(
        this._verb,
        {},
        this._selObj,
        this._matchScore,
        this._parserPlugin
    );
    newPPSentence._parsedSentences = [];
    for each(let parsedSen in this._parsedSentences) {
      newPPSentence._parsedSentences.push( parsedSen.copy() );
    }
    for (let argName in this._argStrings) {
      newPPSentence._argStrings[argName] = this._argStrings[argName].slice();
    }
    newPPSentence._invalidArgs = {};
    for (let invalidArg in this._invalidArgs) {
      newPPSentence._invalidArgs[invalidArg] = this._invalidArgs[invalidArg];
    }
    newPPSentence._validArgs = {};
    for (let validArg in this._validArgs) {
      newPPSentence._validArgs[validArg] = this._validArgs[validArg];
    }
    for each(let listener in this._listeners) {
      newPPSentence.addListener(listener);
    }
    return newPPSentence;
  },

  _getUnfilledArguments: function() {
    /* Returns list of the names of all arguments the verb expects for which
     no argument was provided in this partially parsed sentence. */
    let unfilledArguments = [];
    for (let argName in this._verb._arguments) {
      if (!this._argStrings[argName] || this._argStrings[argName].length == 0) {
        unfilledArguments.push(argName);
      }
    }
    return unfilledArguments;
  },

  getAlternateSelectionInterpolations: function() {
    /* Returns a list of PartiallyParsedSentences with the selection
     * interpolated into missing arguments -- one for each argument where
     * the selection could go.
     *
     * If there's no selection, or the selection can't be used, returns a
     * list containing just this object.
     */
    if (!this._selObj || !this._selObj.text || this._selObj.text.length == 0)
      return [this];
    let unfilledArgs = this._getUnfilledArguments();
    if (unfilledArgs.length == 0)
      return [this];
    if (unfilledArgs.length == 1) {
      this._argSuggest(unfilledArgs[0],
                       this._selObj.text,
                       this._selObj.html,
                       [0, this._selObj.text.length]);
      return [this];
    }

    let alternates = [];
    for each(let arg in unfilledArgs) {
      let newParsing = this.copy();
      let canUseSelection =
        newParsing._argSuggest(arg,
                               this._selObj.text,
                               this._selObj.html,
                               [0, this._selObj.text.length]);
      if (canUseSelection)
        alternates.push(newParsing);
    }
    if (alternates.length == 0)
      return [this];
    return alternates;
  }
};

// This mapping is used to convert Parser 2 commands for use with Parser 1.
var roleToPrep = {
  source: 'from',
  goal: 'to',
  position: 'on',
  instrument: 'with',
  alias: 'as',
};

NLParser1.Verb = function( cmd ) {
  if (cmd)
    this._init( cmd );
}
NLParser1.Verb.prototype = {
  _init: function( cmd ) {
    /* cmd.DOType must be a NounType, if provided.
       cmd.modifiers should be a dictionary
       keys are prepositions
       values are NounTypes.
       example:  { "from" : City, "to" : City, "on" : Day } */
    this._execute     = cmd.execute;
    this._preview     = cmd.preview;
    this._description = cmd.description;
    this._help        = cmd.help;
    this._name        = cmd.name || cmd.names[0];
    this._icon        = cmd.icon;
    this._synonyms    = cmd.synonyms;

    // Determines if an object has one or more keys
    function hasKey(obj) !!(obj || 0).__count__;

    // Use the presence or absence of a 'names' array
    // to decide whether this is a version 1 or version 2 command.
    this._isNewStyle = hasKey(cmd.names);

    this.__defineGetter__("previewDelay", function() {
      return cmd.previewDelay;
    });
    this.__defineGetter__("previewUrl", function() {
      return cmd.previewUrl || null;
    });
    this.__defineGetter__("disabled", function() {
      if("disabled" in cmd)
        return cmd.disabled;
      return false;
    });
    this._arguments = {};
    
    // New-style API: command defines arguments dictionary
    // only do it if we're not using the old API (for compatibility with Parser 2)
    if (this._isNewStyle) {
      dump("converting 2 > 1: " + this._name + "\n");
      if (cmd.takes || cmd.modifiers)
        dump("WARNING: " + this._name +
             " apparently follows the (now defunct) Parser 1.5 format\n");

      // if there are arguments, copy them over using a (semi-arbitrary) choice
      // of preposition
      if (hasKey(cmd.arguments)) {
        for each (let arg in cmd.arguments) {
          let {role, nountype} = arg;
          let obj = role === "object";
          this._arguments[obj ? "direct_object" : role] = {
            type : nountype,
            label: arg.label || nountype.name,
            flag : obj ? null : roleToPrep[role],
            "default": arg.default,
          };
        }
      }
    } else {
      // Old-style API for backwards compatibility: command
      // defines DirectObject and modifiers dictionary.  Convert
      // this to argument dictionary.
      if (cmd.DOType) {
        this._arguments.direct_object = {
          type: cmd.DOType,
          label: cmd.DOLabel,
          flag: null,
          "default": cmd.DODefault
        };
      }

      if (hasKey(cmd.modifiers)) {
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
    }
  },

  execute: function( context, argumentValues ) {
    if ( this._isNewStyle ) {
      /* New-style commands (api 1.5) expect a single dictionary with all
       * arguments in it, and the object named 'object'*/
      argumentValues.object = argumentValues.direct_object;
      return this._execute( context, argumentValues );
    } else {
      /* Old-style commands (api 1.0) expect the direct object to be passed
       * in separately: */
      let directObjectVal = null;
      if (argumentValues && argumentValues.direct_object) {
        // TODO: when direct obj is not specified, we should use a
        // nothingSugg, so argumentValues.direct_object should never be false.
        directObjectVal = argumentValues.direct_object;
      }
      return this._execute( context, directObjectVal, argumentValues );
    }
  },

  preview: function( context, previewBlock, argumentValues ) {
    // Same logic as the execute command -- see comment above.
    if (this._preview) {
      if (this._isNewStyle) {
        argumentValues.object = argumentValues.direct_object;
        this._preview(context, previewBlock, argumentValues);
      } else {
        let directObjectVal = null;
        if (argumentValues && argumentValues.direct_object)
          directObjectVal = argumentValues.direct_object;
        this._preview(context, previewBlock, directObjectVal, argumentValues);
      }
    } else {
      // Command exists, but has no preview; provide a default one.
      var template = "";
      if (this._description)
        template += "<p>"+this._description+"</p>";
      if (this._help)
        template += "<h3>How to use it:</h3><p>"+this._help+"</p>";
      // No description or help available, fall back to old defualt
      if (template == "")
        template = "Executes the <b>" + this._name + "</b> command.";;
      previewBlock.innerHTML = template;
    }
  },

  usesAnySpecificNounType: function() {
    for each ( let arg in this._arguments) {
      if (!arg.type.rankLast) {
        return true;
      }
    }
    return false;
  },

  match: function( inputWord ) {
    /* returns a float from 0 to 1 telling how good of a match the input
       is to this verb.  Return value will be used for sorting.
       The current heuristic is extremely ad-hoc but produces the ordering
       we want... so far.*/
    if (this.disabled) return 0.0; // verb is disabled, so can't be a match
    if (this._name == inputWord)
      // Perfect match always gets maximum rating!
      return 1.0;

    let index = this._name.indexOf( inputWord );
    if ( index == 0 ) {
      // verb starts with the input! A good match.
      // The more letters of the verb that have been typed, the better the
      // match is. (Note this privileges short verbs over longer ones)
      return 0.75 + 0.25 * (inputWord.length / this._name.length);
    }

    if ( index > 0 ) {
      // The input matches the middle of the verb.  Not such a good match but
      // still a match.
      return 0.5 + 0.25 * (inputWord.length / this._name.length);
    }

    // Look for a match on synonyms:
    if ( this._synonyms && this._synonyms.length > 0) {
      for each( let syn in this._synonyms) {
        index = syn.indexOf( inputWord );
        if (index == 0) {
          return 0.25 + 0.25 * (inputWord.length / syn.length);
        }
        if (index > 0 ) {
          return 0.25 * (inputWord.length / syn.length);
        }
      }
    }

    // No match at all!
    return 0.0;

    // TODO: disjoint matches, e.g. matching "atc" to "add-to-calendar"
  }
};
