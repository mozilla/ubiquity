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

var EXPORTED_SYMBOLS = ["NLParser1"];

const Cu = Components.utils;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/nounutils.js");
Cu.import("resource://ubiquity/modules/suggestion_memory.js");

var NLParser1 = ([f for each (f in this) if (typeof f === "function")]
                 .reduce(function addMethod(o, f) (o[f.name] = f, o), {}));

function makeParserForLanguage(languageCode, verbList,
                               ContextUtils, suggestionMemory) {
  return new Parser(verbList, getPluginForLanguage(languageCode),
                    ContextUtils, suggestionMemory);
}

var plugins = {};

function registerPluginForLanguage(languageCode, plugin) {
  plugins[languageCode] = plugin;
}

function getPluginForLanguage(languageCode) plugins[languageCode];

/* ParserQuery: An object that wraps a request to the parser for suggestions
 * based on a given query string.  Multiple ParserQueries may be in action at
 * a single time; each is independent.  A ParserQuery can execute
 * asynchronously, producing a suggestion list that changes over time as the
 * results of network calls come in.
 */
function ParserQuery(parser, queryString, context, maxSuggestions) {
  this._init.apply(this, arguments);
}
ParserQuery.prototype = {
  _init: function PQ__init(parser, queryString, context, maxSuggestions) {
    this._parser = parser;
    this._suggestionList = [];
    this._queryString = queryString;
    this._context = context;
    this._pronouns = null;
    this._parsingsList = [];

    this.maxSuggestions = maxSuggestions;
    this.nounCache = {};
    this.requests = [];
    this.onResults = null;
  },

  // TODO: Does query need some kind of destructor?  If this has a ref to the
  // partiallyParsedSentences and they have a ref back here, it may be a self-
  // perpetuating cycle that doesn't get GCed.  Investigate.

  // Client code should set onResults to a function!!

  cancel: function PQ_cancel() {
    for each (let req in this.requests)
      if (req && typeof req.abort === "function")
        req.abort();
    this.onResults = this._parsingsList = null;
  },

  // Read-only properties:
  get finished() {
    for each (let req in this.requests)
      if ((req.readyState || 4) !== 4) return false;
    return true;
  },
  get hasResults() this._suggestionList.length > 0,
  get suggestionList() this._suggestionList,

  get pronouns() this._pronouns,
  set pronouns(prons) {
    this._pronouns = [RegExp("\\b" + p + "\\b") for each (p in prons)];
  },

  // The handler that makes this a listener for partiallyParsedSentences.
  onNewParseGenerated: function PQ_onNewParseGenerated() {
    this._refreshSuggestionList();
    if (this.onResults) {
      this.onResults(this._suggestionList, this.finished);
    }
  },

  // This method should be called by parser code only, not client code.
  _addPartiallyParsedSentence:
  function PQ__addPartiallyParsedSentence(partiallyParsedSentence) {
    this._parsingsList.push(partiallyParsedSentence);
  },

  _refreshSuggestionList: function PQ__refreshSuggestionList() {
    // get completions from parsings -- the completions may have changed
    // since the parsing list was first generated.
    var suggs = this._suggestionList = [], {push} = suggs;
    for each (let parsing in this._parsingsList) {
      let newSuggs = parsing.getParsedSentences();
      push.apply(suggs, newSuggs);
    }
    // Sort and take the top maxSuggestions number of suggestions
    this._sortSuggestionList();
    suggs.splice(this.maxSuggestions);
  },

  _sortSuggestionList: function PQ__sortSuggestionList() {
    // TODO the following is no good, it's English-specific:
    let inputVerb = this._queryString.split(" ", 1)[0];
    /* Each suggestion in the suggestion list should already have a matchScore
       assigned by Verb.getCompletions.  Give them also a frequencyScore based
       on the suggestionMemory:*/
    for each (let sugg in this._suggestionList) {
      sugg.setFrequencyScore(
        this._parser.getSuggestionMemoryScore(
          sugg._cameFromNounFirstSuggestion ? "" : inputVerb,
          sugg._verb._name));
    }
    this._suggestionList.sort(this._byScoresDescending);
  },

  _byScoresDescending: function PQ_byScoresDescending(x, y) {
    let xMatchScores = x.getMatchScores();
    let yMatchScores = y.getMatchScores();
    for (let z in xMatchScores) {
      let diff = yMatchScores[z] - xMatchScores[z];
      if (diff) return diff;
      // if they are equal, then continue on to the
      // next loop iteration to compare them based on
      // the next most important score.
    }
    // Got all the way through the lists and found
    // no tiebreaker... they are truly tied.
    return 0;
  },
};

function Parser(verbList, languagePlugin, ContextUtils, suggestionMemory) {
  this.setCommandList(verbList);
  this._languagePlugin = languagePlugin;

  if (!ContextUtils) {
    var ctu = {};
    Cu.import("resource://ubiquity/modules/contextutils.js", ctu);
    ContextUtils = ctu.ContextUtils;
  }
  this._ContextUtils = ContextUtils;

  if (!suggestionMemory) {
    var sm = {};
    Cu.import("resource://ubiquity/modules/suggestion_memory.js", sm);
    suggestionMemory = new sm.SuggestionMemory("main_parser");
  }
  this._suggestionMemory = suggestionMemory;
  this._sortGenericVerbCache();
}
Parser.prototype = {
  _nounFirstSuggestions:
  function P__nounFirstSuggestions(selObj, maxSuggestions, query) {
    let sens = [];
    let topGenerics =
      this._rankedVerbsThatUseGenericNouns.slice(0, maxSuggestions);
    let verbsToTry = this._verbsThatUseSpecificNouns.concat(topGenerics);
    for each (let verb in verbsToTry) if (!verb.disabled) {
      let newPPS = new PartiallyParsedSentence(verb, {}, selObj, 0, query);
      // TODO make a better way of having the parsing remember its source than
      // this encapsulation breaking...
      newPPS._cameFromNounFirstSuggestion = true;
      sens.push(newPPS);
    }
    return sens;
  },

  strengthenMemory: function P__strengthenMemory(input, chosenSuggestion) {
    // input is the whole input, chosenSuggestion is a parsedSentence.
    // This parser only cares about the verb name.
    let chosenVerb = chosenSuggestion._verb._name;

    if (chosenSuggestion.hasFilledArgs()) {
      this._suggestionMemory.remember("", chosenVerb);
      this._sortGenericVerbCache();
    }
    if (!chosenSuggestion._cameFromNounFirstSuggestion) {
      let inputVerb = input.split(" ", 1)[0];
      /* TODO English-specific! */
      this._suggestionMemory.remember(inputVerb, chosenVerb);
    }
  },

  getSuggestionMemoryScore:
  function P_getSuggestionMemoryScore(inputVerb, suggestedVerb) {
    return this._suggestionMemory.getScore(inputVerb, suggestedVerb);
  },

  // TODO reset is gone

  newQuery: function P_newQuery(input, context, maxSuggestions) {
    var query = new ParserQuery(this, input, context, maxSuggestions);
    var psss = [], {push} = psss;
    var selObj = this._ContextUtils.getSelectionObject(context);
    var selection = selObj.text || selObj.html;
    if (!input && selection)
      // selection, no input, noun-first suggestion on selection
      push.apply(psss, this._nounFirstSuggestions(selObj,
                                                  maxSuggestions,
                                                  query));
    else {
      let plugin = this._languagePlugin;
      if (selection) query.pronouns = plugin.PRONOUNS;
      // Language-specific full-sentence suggestions:
      psss = plugin.parseSentence(
        input,
        this._verbList,
        selObj,
        function makePPS(verb, argStrings, selObj, matchScore) (
          new PartiallyParsedSentence(
            verb, argStrings, selObj, matchScore, query)));
      // noun-first matches on input
      if (psss.length === 0) {
        let selObj = {
          text: input,
          html: Utils.escapeHtml(input),
        };
        selection = true;
        push.apply(psss, this._nounFirstSuggestions(selObj,
                                                    maxSuggestions,
                                                    query));
      }
    }

    // partials is now a list of PartiallyParsedSentences; if there's a
    // selection, try using it for any missing arguments...
    if (selection)
      for each (let pps in psss) {
        let withSel = pps.getAlternateSelectionInterpolations();
        for each (let ppsx in withSel)
          query._addPartiallyParsedSentence(ppsx);
      }
    else
      for each (let pps in psss)
        query._addPartiallyParsedSentence(pps);

    query._refreshSuggestionList();
    return query;
  },

  // TODO instead of getSuggestionList, use query.suggestionList.
  // instead of getNumSuggestions, use query.suggestionList.length.
  // instead of getSentence, use query.suggestionList[index].

  setCommandList: function P_setCommandList(commandList) {
    this._verbList = [new Verb(cmd) for each (cmd in commandList)];
    this._verbsThatUseSpecificNouns = [];
    this._rankedVerbsThatUseGenericNouns = [];
    for each (let verb in this._verbList) {
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

  _sortGenericVerbCache: function P__sortGenericVerbCache() {
    var suggMemory = this._suggestionMemory;
    let sortFunction = function(x, y) {
      let xScore = suggMemory.getScore("", x._name);
      let yScore = suggMemory.getScore("", y._name);
      return yScore - xScore;
    };
    this._rankedVerbsThatUseGenericNouns.sort(sortFunction);
  },
};

function ParsedSentence(verb, args, verbMatchScore, selObj) {
  this._init.apply(this, arguments);
}
ParsedSentence.prototype = {
  _init: function PS__init(verb, argumentSuggestions, verbMatchScore, selObj) {
    this._verb = verb;
    this._argSuggs = argumentSuggestions;
    this._selObj = selObj;
    this.verbMatchScore = verbMatchScore;
    this.duplicateDefaultMatchScore = 100;
    this.frequencyScore = 0;  // not yet tracked
    this.argMatchScore = 0;
    // argument match score starts at 0 and increased for each
    // argument where a specific nountype (i.e. non-arbitrary-text)
    // matches user input.
    let args = verb._arguments;
    for (let argName in argumentSuggestions)
      this.argMatchScore += ((argName === "direct_object" ? 1 : 1.1) *
                             (args[argName].type.rankLast ? .1 : 1));
  },

  get completionText() {
    /* return plain text that we should set the input box to if user hits
     the key to autocomplete to this sentence. */

    /* TODO: The whole logic of this function looks completely wrong to me
     * on a cursory read-over.  If this ever generates correct output,
     * I think it must be by sheer luck.  Rip this whole thing out and
     * rewrite to make sense! -- JONO */
    var sentence = this._verb.matchedName;
    var directObjPresent = false;
    for (let x in this._verb._arguments) {
      let argText = (this._argSuggs[x] || 0).text;
      if (!argText) continue;
      let preposition = " ";
      if (x === "direct_object") {
        // Check for a valid text/html selection. We'll replace
        // the text with a pronoun for readability
        let selObj = this._selObj;
        if (selObj.text === argText ||
            selObj.html === argText) {
          //In future, the pronoun should be contextual to the selection
          argText = "selection";
        }
        directObjPresent = true;
      }
      else if (argText && directObjPresent)
        //only append the modifiers if we have a valid direct-object
        preposition += x + " ";
      //Concatenate sentence pieces
      sentence += preposition + argText;
    }
    return sentence + " ";
  },

  get displayText() {
    var {escapeHtml} = Utils;
    // returns html formatted sentence for display in suggestion list
    var sentence = ('<span class="verb">' +
                    escapeHtml(this._verb.matchedName) +
                    '</span>');
    var args = this._verb._arguments;
    for (let x in args) {
      let obj = x === "direct_object";
      let {summary} = this._argSuggs[x] || 0;
      if (summary) {
        let label = obj ? "" : escapeHtml(args[x].flag) + " ";
        sentence += (
          " " + (obj ? "" : '<span class="delimiter">' + label + '</span>') + 
          '<span class="' + (obj ? "object" : "argument") + '">' +
          summary + "</span>");
      }
      else {
        let label = (obj ? "" : args[x].flag + " ") + args[x].label;
        sentence += ' <span class="needarg">' + escapeHtml(label) + "</span>";
      }
    }
    return sentence;
  },

  get icon() this._verb.cmd.icon,
  get previewUrl() this._verb.cmd.previewUrl,
  get previewDelay() this._verb.cmd.previewDelay,

  execute: function PS_execute(context) {
    return this._verb.execute(context, this._argSuggs);
  },

  preview: function PS_preview(context, previewBlock) {
    this._verb.preview(context, previewBlock, this._argSuggs);
  },

  copy: function PS_copy() {
    let newArgSuggs = {};
    let argSuggs = this._argSuggs;
    for (let x in argSuggs) newArgSuggs[x] = argSuggs[x];
    return new ParsedSentence(this._verb, newArgSuggs,
                              this.verbMatchScore, this._selObj);
  },

  setArgumentSuggestion: function PS_setArgumentSuggestion(arg, sugg) {
    this._argSuggs[arg] = sugg;
  },

  getArgText: function PS_getArgText(arg) {
    return this._argSuggs[arg].text;
  },

  argumentIsFilled: function PS_argumentIsFilled(arg) {
    return arg in this._argSuggs;
  },

  hasFilledArgs: function PS_hasFilledArgs() {
    /* True if suggestion has at least one filled argument.
     False if verb has no arguments to fill, or if it has arguments but
     none of them are filled. */
    for (var x in this._argSuggs) return true;
    return false;
  },

  equals: function PS_equals(other) {
    if (this._verb.cmd !== other._verb.cmd)
      return false;
    let argSuggs = this._argSuggs;
    for (let x in argSuggs)
      if (argSuggs[x].summary !== other._argSuggs[x].summary)
        return false;
    return true;
  },

  fillMissingArgsWithDefaults: function PS_fillMissingArgsWithDefaults() {
    let newSentences = [this.copy()];
    let defaultsArray = [];
    let gotArrayOfDefaults = false;
    let defaultsSoFar = {};
    let args = this._verb._arguments;
    for (let argName in args) {
      if (argName in this._argSuggs) continue;
      let missingArg = args[argName];
      let defaultValue =
        missingArg.default && NounUtils.makeSugg(missingArg.default);
      if (!defaultValue) {
        let {type} = missingArg;
        defaultValue = ((typeof type.default === "function"
                         ? type.default()
                         : type.default) ||
                        {text: "", html: "", data: null, summary: ""});
      }

      let numDefaults = defaultValue.length;
      if (numDefaults === 1 || (numDefaults > 1 && gotArrayOfDefaults)) {
        // either this is a single-item array, or
        // we've already used an array of values for a previous modifier,
        // so just use first default for this modifier
        defaultValue = defaultValue[0];
        numDefaults = 0;
      }
      if (numDefaults) {
        // first time we've seen multiple defaults,
        // so create an array of sentences
        gotArrayOfDefaults = true;
        for (let i = 0; i < numDefaults; i++) {
          if (i) {
            let newSen = this.copy();
            for (let arg in defaultsSoFar)
              newSen.setArgumentSuggestion(arg, defaultsSoFar[arg]);
            // reduce the match score so that multiple entries with the
            // same verb are only shown if there are no other verbs
            newSen.duplicateDefaultMatchScore =
              this.duplicateDefaultMatchScore / (i + 1);
            newSentences[i] = newSen;
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
    return newSentences;
  },

  getMatchScores: function PS_getMatchScores() {
    if (this._cameFromNounFirstSuggestion) {
      return [this.argMatchScore, this.frequencyMatchScore];
    }
    return [this.duplicateDefaultMatchScore,
            this.frequencyMatchScore,
            this.verbMatchScore,
            this.argMatchScore];
  },

  setFrequencyScore: function PS_setFrequencyScore(freqScore) {
    this.frequencyMatchScore = freqScore;
  }
};

function PartiallyParsedSentence(
  verb, argStrings, selObj, matchScore, query, copying) {
  /*This is a partially parsed sentence.
   * What that means is that we've decided what the verb is,
   * and we've assigned all the words of the input to one of the arguments.
   * What we haven't nailed down yet is the exact value to use for each
   * argument, because the nountype may produce multiple argument suggestions
   * from a single argument string.  So one of these partially parsed
   * sentences can produce several completely-parsed sentences, in which
   * final values for all arguments are specified.
   */
  this._verb = verb;
  this._argStrings = argStrings;
  this._selObj = selObj;
  this._matchScore = matchScore;
  this._invalidArgs = {};
  this._validArgs = {};
  this._query = query;

  if (copying) return;
  /* Create fully parsed sentence with empty arguments:
   * If this command takes no arguments, this is all we need.
   * If it does take arguments, this initializes the parsedSentence
   * list so that the algorithm in addArgumentSuggestion will work
   * correctly. */
  this._parsedSentences = [new ParsedSentence(this._verb,
                                              {},
                                              this._matchScore,
                                              this._selObj)];
  var {pronouns} = query;
  for (let argName in this._verb._arguments) {
    if (argStrings[argName] && argStrings[argName].length > 0) {
      // If argument is present, try the noun suggestions based both on
      // substituting pronoun...
      let text = argStrings[argName].join(" ");
      let html = Utils.escapeHtml(text);
      let gotSuggs = pronouns && this._suggestWithPronounSub(argName, text,
                                                             pronouns);
      // and on not substituting pronoun...
      let gotSuggsDirect = this._argSuggest(argName, text, html, null);
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
}
PartiallyParsedSentence.prototype = {
  _argSuggest:
  function PPS__argSuggest(argName, text, html, selectionIndices) {
    /* For the given argument of the verb, sends (text,html) to the nounType
     * gets back suggestions for the argument, and adds each suggestion.
     * Return true if at least one arg suggestion was added in this way. */
    var noun = this._verb._arguments[argName].type;
    var {nounCache} = this._query;
    var key = text + "\n" + noun.id;
    var suggestions = nounCache[key];
    if (suggestions) {
      suggestions.callback.otherSentences.push([this, argName]);
      for (let i = 0, l = suggestions.length; i < l; ++i)
        this.addArgumentSuggestion(argName, suggestions[i]);
    }
    else {
      let self = this;
      // Callback function for asynchronously generated suggestions:
      function callback(suggs) {
        var suggestions = self._handleSuggestions(argName, suggs);
        var {length} = suggestions;
        if (!length) return;
        for each (let [pps, arg] in callback.otherSentences)
          for (let i = 0; i < length; ++i)
            pps.addArgumentSuggestion(arg, suggestions[i]);
        self._query.onNewParseGenerated();
      }
      try {
        // This is where the suggestion is actually built.
        suggestions = noun.suggest(text, html, callback, selectionIndices);
      } catch (e) {
        if (e && e.stack) e += "\n" + /[^\n]+/(e.stack);
        Cu.reportError(
          'Exception occured while getting suggestions for "' +
          this._verb._name + '" with noun "' + (noun.name || noun.id) +
          '"\n' + e);
        return false;
      }
      suggestions = this._handleSuggestions(argName, suggestions);
      callback.otherSentences = [];
      suggestions.callback = callback;
      nounCache[key] = suggestions;
    }
    return suggestions.length > 0;
  },

  _suggestWithPronounSub: function PPS__suggestWithPronounSub(argName, words,
                                                              pronounREs) {
    var {text, html} = this._selObj;
    if (!text && !html) return false; // No selection to interpolate.

    var gotAnySuggestions = false;
    for each (let regexp in pronounREs) {
      let index = words.search(regexp);
      if (index < 0) continue;
      let selectionIndices = [index, index + text.length];
      let textArg = words.replace(regexp, text);
      let htmlArg = words.replace(regexp, html);
      if (this._argSuggest(argName, textArg, htmlArg, selectionIndices))
        gotAnySuggestions = true;
    }
    return gotAnySuggestions;
  },

  _handleSuggestions: function PPS__handleSuggestions(argName, suggs) {
    var filtered = [], {requests, maxSuggestions} = this._query;
    if (!Utils.isArray(suggs)) suggs = [suggs];
    for each (let sugg in suggs) if (sugg) {
      if (sugg.summary >= "") filtered.push(sugg);
      else requests.push(sugg);
    }
    if (maxSuggestions) filtered.splice(maxSuggestions);
    for each (let sugg in filtered) this.addArgumentSuggestion(argName, sugg);
    return filtered;
  },

  addArgumentSuggestion: function PPS_addArgumentSuggestion(arg, sugg) {
    /* Adds the given sugg as a suggested value for the given arg.
     * Extends the parsedSentences list with every new combination that
     * is made possible by the new suggestion.
     */
    var newSentences = [];
    this._validArgs[arg] = true;
    EACH_PS: for each (let sen in this._parsedSentences) {
      if (!sen.argumentIsFilled(arg))
        sen.setArgumentSuggestion(arg, sugg);
      else {
        let newSen = sen.copy();
        newSen.setArgumentSuggestion(arg, sugg);
        for each (let alreadyNewSen in newSentences)
          if (alreadyNewSen.equals(newSen)) // duplicate suggestion
            continue EACH_PS;
        newSentences.push(newSen);
      }
    }
    newSentences.push.apply(this._parsedSentences, newSentences);
  },

  getParsedSentences: function PPS_getParsedSentences() {
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
      for each (let sen in this._parsedSentences) {
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
    }
    else {
      for each (let sen in this._parsedSentences) {
        let filledSen = sen.fillMissingArgsWithDefaults();
        parsedSentences = parsedSentences.concat(filledSen);
      }
    }

    return parsedSentences;
  },

  copy: function PPS_copy() {
    // Deep copy constructor
    let newPPSentence = new PartiallyParsedSentence(
      this._verb,
      {},
      this._selObj,
      this._matchScore,
      this._query,
      true);
    newPPSentence._parsedSentences =
      [parsedSen.copy() for each (parsedSen in this._parsedSentences)];
    for each (let key in ["_argStrings", "_invalidArgs", "_validArgs"]) {
      let dest = newPPSentence[key];
      let from = this[key];
      for (let x in from) dest[x] = from[x];
    }
    newPPSentence._cameFromNounFirstSuggestion =
      this._cameFromNounFirstSuggestion;
    return newPPSentence;
  },

  _getUnfilledArguments: function PPS__getUnfilledArguments() {
    /* Returns list of the names of all arguments the verb expects for which
     no argument was provided in this partially parsed sentence. */
    return [argName
            for (argName in this._verb._arguments)
            if (!(this._argStrings[argName] || "").length)];
  },

  getAlternateSelectionInterpolations:
  function PPS_getAlternateSelectionInterpolations() {
    /* Returns a list of PartiallyParsedSentences with the selection
     * interpolated into missing arguments -- one for each argument where
     * the selection could go.
     *
     * If there's no selection, or the selection can't be used, returns a
     * list containing just this object.
     */
    var selObj = this._selObj || 0;
    if (!selObj.text)
      return [this];
    let unfilledArgs = this._getUnfilledArguments();
    if (unfilledArgs.length === 0)
      return [this];
    if (unfilledArgs.length === 1) {
      this._argSuggest(unfilledArgs[0],
                       selObj.text,
                       selObj.html,
                       [0, selObj.text.length]);
      return [this];
    }

    let alternates = [];
    for each (let arg in unfilledArgs) {
      let newParsing = this.copy();
      let canUseSelection = newParsing._argSuggest(arg,
                                                   selObj.text,
                                                   selObj.html,
                                                   [0, selObj.text.length]);
      if (canUseSelection) alternates.push(newParsing);
    }
    return alternates.length ? alternates : [this];
  }
};

// This mapping is used to convert Parser 2 commands for use with Parser 1.
var roleToPrep = {
  source: "from",
  goal: "to",
  location: "near",
  time: "at",
  instrument: "with",
  alias: "as",
  format: "in",
  modifier: "of",
};

function Verb(cmd) {
  if (cmd) this._init(cmd);
}
Verb.prototype = {
  _init: function V__init(cmd) {
    // Picks up noun's label. "_name" is for backward compatiblity
    function pluckLabel(noun) noun.label || noun._name || "?";
    // Determines if an object has one or more own keys
    function hasKey(obj) !!(obj || 0).__count__;
    /* cmd.DOType must be a NounType, if provided.
       cmd.modifiers should be a dictionary
       keys are prepositions
       values are NounTypes.
       example:  { "from" : City, "to" : City, "on" : Day } */
    this.cmd = cmd;
    this.matchedName = this._name = cmd.names[0];
    this._arguments = {};
    // Use the presence or absence of the "arguments" dictionary
    // to decide whether this is a version 1 or version 2 command.
    this._isNewStyle = hasKey(cmd.arguments);

    // New-style API: command defines arguments dictionary
    if (this._isNewStyle) {
      //if (cmd.takes || cmd.modifiers)
      //  dump("WARNING: " + cmd.name +
      //       " apparently follows the (now defunct) Parser 1.5 format\n");

      // if there are arguments, copy them over using
      // a (semi-arbitrary) choice of preposition
      for each (let arg in cmd.arguments) {
        let {role, nountype} = arg;
        let obj = role === "object";
        this._arguments[obj ? "direct_object" : role] = {
          type : nountype,
          label: arg.label || pluckLabel(nountype),
          flag : obj ? null : roleToPrep[role],
          "default": arg.default,
        };
      }
    }
    else {
      // Old-style API for backwards compatibility:
      //   Command defines DOType/DOLabel and modifiers dictionary.
      // Convert this to argument dictionary.
      if (cmd.DOType) {
        this._arguments.direct_object = {
          type: cmd.DOType,
          label: cmd.DOLabel,
          flag: null,
          "default": cmd.DODefault
        };
      }

      if (hasKey(cmd.modifiers)) {
        let {modifiers, modifierDefaults} = cmd;
        for (let x in modifiers) {
          let type = modifiers[x];
          this._arguments[x] = {
            type: type,
            label: pluckLabel(type),
            flag: x
          };
          if (modifierDefaults)
            this._arguments[x].default = modifierDefaults[x];
        }
      }
    }
  },

  get disabled() this.cmd.disabled,

  execute: function V_execute(context, argumentValues) {
    if (this._isNewStyle) {
      /* New-style commands (api 1.5) expect a single dictionary with all
       * arguments in it, and the object named 'object'*/
      argumentValues.object = argumentValues.direct_object;
      return this.cmd.execute(context, argumentValues);
    }
    else {
      /* Old-style commands (api 1.0) expect the direct object to be passed
       * in separately: */
      return this.cmd.execute(context,
                              argumentValues.direct_object,
                              argumentValues);
    }
  },

  preview: function V_preview(context, previewBlock, argumentValues) {
    // Same logic as the execute command -- see comment above.
    if (this._isNewStyle) {
      argumentValues.object = argumentValues.direct_object;
      this.cmd.preview(context, previewBlock, argumentValues);
    }
    else {
      this.cmd.preview(context, previewBlock,
                       argumentValues.direct_object, argumentValues);
    }
  },

  usesAnySpecificNounType: function V_usesAnySpecificNounType() {
    for each (let arg in this._arguments)
      if (!arg.type.rankLast)
        return true;
    return false;
  },

  match: function V_match(input) {
    /* returns a float from 0 to 1 telling how good of a match the input
       is to this verb.  Return value will be used for sorting.
       The current heuristic is extremely ad-hoc but produces the ordering
       we want... so far.*/
    // score = .75 + .25 * lengthRatio - .5 * indexRatio - .25 * namePosition
    // Perfect match: 1.0 = .75 + .25 * 1 - .5 * 0 - .25 * 0
    var {names} = this.cmd;
    for (let i = 0, l = names.length; i < l; ++i) {
      let name = names[i];
      let index = name.toLowerCase().indexOf(input);
      if (index < 0) continue;
      this.matchedName = name;
      return (.75
              + .25 * input.length / name.length
              - .5  * index / input.length
              - .25 * i / l);
    }
    // No match at all!
    return 0.0;
    // TODO: disjoint matches, e.g. matching "atc" to "add-to-calendar"
  }
};
