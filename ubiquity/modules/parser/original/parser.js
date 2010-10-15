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

var EXPORTED_SYMBOLS = ["NLParser1"];

var NLParser1 = ([f for each (f in this) if (typeof f === "function")]
                 .reduce(function addMethod(o, f) (o[f.name] = f, o), {}));

const Cu = Components.utils;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/suggestion_memory.js");
Cu.import("resource://ubiquity/modules/parser/new/namespace.js");
Cu.import("resource://ubiquity/modules/parser/original/locale_en.js");
Cu.import("resource://ubiquity/modules/msgservice.js");

const PLUGINS = {en: EnParser};
const FLAG_DEFAULT = 1;

var {push} = Array.prototype;

function makeParserForLanguage(languageCode, verbList,
                               ContextUtils, suggestionMemory) {
  var plugin = (
    languageCode in PLUGINS
    ? PLUGINS[languageCode]
    : PLUGINS[languageCode] = {parseSentence: EnParser.parseSentence});
  return new Parser(verbList, setupPlugin(plugin, languageCode),
                    ContextUtils, suggestionMemory);
}

function setupPlugin(plugin, code) {
  if ("roleMap" in plugin) return plugin;
  var parser = NLParser2.makeParserForLanguage(code, {}, {}, {});
  var roleMap = plugin.roleMap = {__proto__: null};
  for each (let {role, delimiter} in parser.roles)
    if (!(role in roleMap)) roleMap[role] = delimiter;
  plugin.PRONOUNS = parser.anaphora;
  plugin.pronouns = [
    RegExp(a.replace(/\W/g, "\\$&").replace(/^\b|\b$/g, "\\b"), "i")
    for each (a in parser.anaphora)];
  return plugin;
}

// ParserQuery: An object that wraps a request to the parser for suggestions
// based on a given query string.  Multiple ParserQueries may be in action at
// a single time; each is independent.  A ParserQuery can execute
// asynchronously, producing a suggestion list that changes over time as the
// results of network calls come in.
function ParserQuery(parser, queryString, context, maxSuggestions) {
  this._parser = parser;
  this._suggestionList = [];
  this._queryString = queryString;
  this._context = context;
  this._parsingsList = [];

  this.maxSuggestions = maxSuggestions;
  this.nounCache = {"": {text: "", html: "", data: null, summary: ""}};
  this.requests = [];
  // Client code should set a function to onResults!
  this.onResults = Boolean;
}
ParserQuery.prototype = {
  cancel: function PQ_cancel() {
    for each (let req in this.requests)
      if (req && typeof req.abort === "function")
        req.abort();
    this.onResults = Boolean;
    this._parsingsList = null;
  },

  // Read-only properties:
  get finished() {
    for each (let req in this.requests)
      if ((req.readyState || 4) !== 4) return false;
    return true;
  },
  get hasResults() !!this._suggestionList.length,
  get suggestionList() this._suggestionList,

  // The handler that makes this a listener for partiallyParsedSentences.
  onNewParseGenerated: function PQ_onNewParseGenerated() {
    this._refreshSuggestionList();
    this.onResults();
  },

  run: function PQ_run() {
    this.onNewParseGenerated();
    return this;
  },

  addPartiallyParsedSentences:
  function PQ_addPartiallyParsedSentences(ppss) {
    push.apply(this._parsingsList, ppss);
  },

  _refreshSuggestionList: function PQ__refreshSuggestionList() {
    // get completions from parsings -- the completions may have changed
    // since the parsing list was first generated.
    var suggs = this._suggestionList = [];
    for each (let parsing in this._parsingsList) {
      let newSuggs = parsing.getParsedSentences();
      push.apply(suggs, newSuggs);
    }
    // Sort and take the top maxSuggestions number of suggestions
    this._sortSuggestionList();
    suggs.splice(this.maxSuggestions);
  },

  _sortSuggestionList: function PQ__sortSuggestionList() {
    // Each suggestion in the suggestion list should already have a matchScore
    // assigned by Verb.match().
    // Give them also a frequencyScore based on the suggestionMemory:
    var {_parser} = this;
    var {pow} = Math;
    for each (let sugg in this._suggestionList) {
      let freq = _parser.getSuggestionMemoryScore(
        sugg.fromNounFirstSuggestion ? "" : sugg._verb.input,
        sugg._verb.cmd.id);
      sugg.frequencyMatchScore = pow(.1, 1 / (freq + 1));
    }
    Utils.sort(this._suggestionList, "score", true);
  },
};

function Parser(verbList, languagePlugin, ContextUtils, suggestionMemory) {
  this._languagePlugin = languagePlugin;
  this._ContextUtils = ContextUtils ||
    (Cu.import("resource://ubiquity/modules/contextutils.js", null)
     .ContextUtils);
  this._suggestionMemory = suggestionMemory ||
    new (Cu.import("resource://ubiquity/modules/suggestion_memory.js", null)
         .SuggestionMemory)("main_parser");
  this.setCommandList(verbList);
}
Parser.prototype = {
  _nounFirstSuggestions:
  function P__nounFirstSuggestions(selObj, maxSuggestions, query) {
    function ok(v) !v.disabled;
    var verbs =
      this._rankedVerbsThatUseGenericNouns.filter(ok).slice(0, maxSuggestions);
    push.apply(verbs, this._verbsThatUseSpecificNouns.filter(ok));
    return [new PartiallyParsedSentence(v, {__proto__: null}, selObj, 0, query)
            for each (v in verbs)];
  },

  strengthenMemory: function P_strengthenMemory(chosenSuggestion) {
    var verb = chosenSuggestion._verb;
    if (chosenSuggestion.hasFilledArgs) {
      this._suggestionMemory.remember("", verb.cmd.id);
      verb.usesAnySpecificNounType() || this._sortGenericVerbCache();
    }
    chosenSuggestion.fromNounFirstSuggestion ||
      this._suggestionMemory.remember(verb.input, verb.cmd.id);
  },

  getSuggestionMemoryScore:
  function P_getSuggestionMemoryScore(input, cmdId)
    this._suggestionMemory.getScore(input, cmdId),

  newQuery: function P_newQuery(input, context, maxSuggestions, lazy) {
    var query = new ParserQuery(this, input, context, maxSuggestions);
    var selObj = this._ContextUtils.getSelectionObject(context);
    var selected = !!(selObj.text || selObj.html);
    var plugin = this._languagePlugin;
    if (selected) {
      query.PRONOUNS = plugin.PRONOUNS;
      query.pronouns = plugin.pronouns;
    }
    if (!input && selected)
      // selection, no input, noun-first suggestion on selection
      var ppss = this._nounFirstSuggestions(selObj, maxSuggestions, query);
    else {
      // Language-specific full-sentence suggestions:
      ppss = plugin.parseSentence(
        input,
        this._verbList,
        function makePPS(verb, argStrings, matchScore) {
          for (var x in verb.args)
            // ensure all args in argStrings
            // will be used for reconstructing the sentence
            argStrings[x] = x in argStrings && argStrings[x].join(" ");
          return new PartiallyParsedSentence(
            verb, argStrings, selObj, matchScore, query);
        });
      // noun-first matches on input
      if (!ppss.length) {
        let selObj = {
          text: input,
          html: Utils.escapeHtml(input),
          fake: true,
        };
        selected = !!input;
        ppss = this._nounFirstSuggestions(selObj, maxSuggestions, query);
      }
    }

    // partials is now a list of PartiallyParsedSentences; if there's a
    // selection, try using it for any missing arguments...
    if (selected)
      for each (let pps in ppss)
        query.addPartiallyParsedSentences(
          pps.getAlternateSelectionInterpolations());
    else
      query.addPartiallyParsedSentences(ppss);

    lazy || Utils.setTimeout(function P_nQ_delayedRun() { query.run() });
    return query;
  },

  setCommandList: function P_setCommandList(commandList) {
    var verbs = this._verbList = [];
    var specifics = this._verbsThatUseSpecificNouns = [];
    var generics  = this._rankedVerbsThatUseGenericNouns = [];
    var {roleMap} = this._languagePlugin;
    for each (let cmd in commandList) {
      let verb = new Verb(cmd, roleMap);
      verbs.push(verb);
      (verb.usesAnySpecificNounType() ? specifics : generics).push(verb);
    }
    this._sortGenericVerbCache();
  },

  _sortGenericVerbCache: function P__sortGenericVerbCache() {
    var suggMemory = this._suggestionMemory;
    if (!suggMemory) return;
    Utils.sort(
      this._rankedVerbsThatUseGenericNouns,
      function bySMScore(v) suggMemory.getScore("", v.cmd.id), true);
  },
};

function ParsedSentence(
  verb, args, verbMatchScore, selObj, argStrings, query) {
  this._verb = verb;
  this._argSuggs = args;
  this._argFlags = {__proto__: null};
  this._argStrings = argStrings;
  this._selObj = selObj;
  this._query = query;
  this.verbMatchScore = verbMatchScore;
  this.duplicateDefaultMatchScore = 1;
  // assigned later
  this.argMatchScore = 0;
  this.frequencyMatchScore = 0;
}
ParsedSentence.prototype = {
  get completionText() {
    // Returns plain text that we should set the input box to if user hits
    // the key to autocomplete to this sentence.
    var {matchedName: sentence, args} = this._verb;
    for (let x in (this.fromNounFirstSuggestion
                   ? this._argSuggs
                   : this._argStrings)) {
      let {text} = this._argSuggs[x] || 0;
      if (!text || this._argFlags[x] & FLAG_DEFAULT) continue;
      let preposition = " ";
      if (x === "object") {
        // Check for a valid text selection. We'll replace
        // the text with a pronoun for readability
        if (!this.fromNounFirstSuggestion && this._selObj.text === text)
          text = this._query.PRONOUNS[0];
      }
      else preposition += args[x].preposition + " ";
      sentence += preposition + text;
    }
    return sentence + " ";
  },
  // text formatted sentence for display in popup menu
  get displayText() {
    var {matchedName: sentence, args} = this._verb;
    for (let x in (this.fromNounFirstSuggestion
                   ? this._argSuggs
                   : this._argStrings)) {
      let obj = x === "object";
      let {text} = this._argSuggs[x] || 0;
      if (text) sentence += (" " +
                             (obj ? "" : args[x].preposition + " ") +
                             (obj ? "[ " + text + " ]" : text));
    }
    return sentence;
  },
  // html formatted sentence for display in suggestion list
  get displayHtml() {
    var {escapeHtml} = Utils;
    var {matchedName, args} = this._verb;
    var html = '<span class="verb">' + escapeHtml(matchedName) + "</span> ";
    for (let x in (this.fromNounFirstSuggestion
                   ? this._argSuggs
                   : this._argStrings)) {
      let obj = x === "object";
      let prearg = (
        (obj ? "" :
         '<span class="delimiter">' +
         escapeHtml(args[x].preposition) +
         "</span> ") +
        '<span class="' + (obj ? "object" : "argument") + '">');
      let {summary} = this._argSuggs[x] || 0;
      html += (
        summary
        ? prearg + summary + "</span> "
        : ('<span class="needarg">' +
           prearg + escapeHtml(args[x].label) +
           "</span></span> "));
    }
    return html;
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
    var newPS = {__proto__: this};
    for each (let key in ["_argSuggs", "_argFlags"]) {
      let dest = newPS[key] = {__proto__: null};
      let from = this[key];
      for (let x in from) dest[x] = from[x];
    }
    return newPS;
  },

  setArgumentSuggestion:
  function PS_setArgumentSuggestion(arg, sugg, isDefault) {
    this._argSuggs[arg] = sugg;
    this._argFlags[arg] |= isDefault && FLAG_DEFAULT;
  },

  getArgText: function PS_getArgText(arg) {
    return this._argSuggs[arg].text;
  },

  argumentIsFilled: function PS_argumentIsFilled(arg) {
    return arg in this._argSuggs;
  },

  get hasFilledArgs() {
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
    let gotArrayOfDefaults = false;
    let defaultsSoFar = {__proto__: null};
    let args = this._verb.args;
    for (let argName in args) {
      if (argName in this._argSuggs) continue;
      let missingArg = args[argName];
      let noun = missingArg.type;
      let {nounCache} = this._query;
      let defaultValue = missingArg.default || nounCache[noun.id];
      if (!defaultValue) {
        let val = noun.default;
        if (typeof val === "function") val = val.call(noun);
        defaultValue = nounCache[noun.id] =
          val && val.length !== 0 ? val : nounCache[""];
      }

      let numDefaults = defaultValue.length;
      if (numDefaults === 1 || numDefaults > 1 && gotArrayOfDefaults) {
        // either this is a single-item array, or
        // we've already used an array of values for a previous modifier,
        // so just use first default for this modifier
        defaultValue = defaultValue[0];
        numDefaults = 0;
      }
      if (numDefaults) {
        let defaults = defaultValue;
        // first time we've seen multiple defaults,
        // so create an array of sentences
        gotArrayOfDefaults = true;
        for (let i = 0; i < numDefaults; i++) {
          if (i) {
            let newSen = this.copy();
            for (let arg in defaultsSoFar)
              newSen.setArgumentSuggestion(arg, defaultsSoFar[arg], true);
            // reduce the match score so that multiple entries with the
            // same verb are only shown if there are no other verbs
            newSen.duplicateDefaultMatchScore =
              this.duplicateDefaultMatchScore / (i + 1);
            newSentences[i] = newSen;
          }
          newSentences[i].setArgumentSuggestion(argName, defaults[i], true);
        }
      }
      else {
        for each (let sen in newSentences)
          sen.setArgumentSuggestion(argName, defaultValue, true);
        defaultsSoFar[argName] = defaultValue;
      }
    }
    return newSentences;
  },

  get score() {
    if (!this.argMatchScore) {
      // argument match score starts at 1 and increased for each
      // argument where a specific nountype (i.e. non-arbitrary-text)
      // matches user input.
      let {_argFlags, _argSuggs} = this, ams = 1;
      for (let name in _argFlags)
        if (!(_argFlags[name] & FLAG_DEFAULT))
          ams += _argSuggs[name].score || 1;
      this.argMatchScore = ams;
    }
    return (this.verbMatchScore * this.duplicateDefaultMatchScore +
            this.argMatchScore * this.frequencyMatchScore / 99);
  }
};

function PartiallyParsedSentence(verb, argStrings, selObj, matchScore, query) {
  // This is a partially parsed sentence.
  // What that means is that we've decided what the verb is,
  // and we've assigned all the words of the input to one of the arguments.
  // What we haven't nailed down yet is the exact value to use for each
  // argument, because the nountype may produce multiple argument suggestions
  // from a single argument string.  So one of these partially parsed
  // sentences can produce several completely-parsed sentences, in which
  // final values for all arguments are specified.
  this._verb = verb;
  // ArgStrings is a dictionary, where the keys match the argument names in
  // the verb, and the values are each input that have
  // been assigned to that argument
  this._argStrings = argStrings;
  this._selObj = selObj;
  this._matchScore = matchScore;
  this._invalidArgs = {__proto__: null};
  this._validArgs = {__proto__: null};
  this._query = query;

  // Create fully parsed sentence with empty arguments:
  // If this command takes no arguments, this is all we need.
  // If it does take arguments, this initializes the parsedSentence
  // list so that the algorithm in addArgumentSuggestion will work
  // correctly.
  this._parsedSentences = [new ParsedSentence(
    verb, {__proto__: null}, matchScore, selObj, argStrings, query)];
  for (let argName in argStrings) {
    let text = argStrings[argName];
    // If argument is present, try the noun suggestions
    // based both on substituting pronoun...
    // (but not for noun-first)
    let gotSuggs = (text && matchScore &&
                    this._suggestWithPronounSub(argName, text));
    // and on not substituting pronoun...
    let gotSuggsDirect = ((text || (text = verb.args[argName].input)) &&
                          this._argSuggest(argName, text,
                                           Utils.escapeHtml(text), null));
    if (text && !gotSuggs && !gotSuggsDirect) {
      // One of the arguments is supplied by the user, but produces
      // no suggestions, meaning it's an invalid argument for this
      // command -- that makes the whole parsing invalid!!
      this._invalidArgs[argName] = true;
    }
    // Otherwise, this argument will simply be left blank.
    // (or filled in with default value later)
  }
}
PartiallyParsedSentence.prototype = {
  _argSuggest:
  function PPS__argSuggest(argName, text, html, selectionIndices) {
    // For the given argument of the verb, sends (text,html) to the nounType
    // gets back suggestions for the argument, and adds each suggestion.
    // Return true if at least one arg suggestion was added in this way.
    var noun = this._verb.args[argName].type;
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
        if (!suggestions.length) return;

        for each (let sugg in suggestions) {
          sugg.score = (sugg.score || 1) / 4;
          for each (let [pps, arg] in callback.otherSentences)
            pps.addArgumentSuggestion(arg, sugg);
        }
        self._query.onNewParseGenerated();
      }
      try {
        suggestions = noun.suggest(text, html, callback, selectionIndices);
      } catch (e) {
        new ErrorConsoleMessageService().displayMessage({exception: e});
        //errorToLocalize
        new AlertMessageService().displayMessage(
          'Exception occured while getting suggestions for "' +
          this._verb.name + '" with noun "' + (noun.name || noun.id) + '".');
        return false;
      }
      suggestions = this._handleSuggestions(argName, suggestions);
      callback.otherSentences = [];
      suggestions.callback = callback;
      nounCache[key] = suggestions;
    }
    return suggestions.length > 0;
  },

  _suggestWithPronounSub: function PPS__suggestWithPronounSub(argName, words) {
    var {text, html} = this._selObj
    var gotAnySuggestions = false;
    function quoteDollars(x) x.replace(/\$/g, "$$$$");
    for each (let regexp in this._query.pronouns) {
      let index = words.search(regexp);
      if (index < 0) continue;
      let selectionIndices = [index, index + text.length];
      let textArg = words.replace(regexp, quoteDollars(text));
      let htmlArg = words.replace(regexp, quoteDollars(html));
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
    // Adds the given sugg as a suggested value for the given arg.
    // Extends the parsedSentences list with every new combination that
    // is made possible by the new suggestion.
    var newSentences = [];
    this._validArgs[arg] = true;
    EACH_PS: for each (let sen in this._parsedSentences) {
      if (sen.argumentIsFilled(arg)) {
        let newSen = sen.copy();
        newSen.setArgumentSuggestion(arg, sugg);
        for each (let alreadyNewSen in newSentences)
          if (alreadyNewSen.equals(newSen)) // duplicate suggestion
            continue EACH_PS;
        newSentences.push(newSen);
      }
      else sen.setArgumentSuggestion(arg, sugg);
    }
    push.apply(this._parsedSentences, newSentences);
  },

  getParsedSentences: function PPS_getParsedSentences() {
    // For any parsed sentence that is missing any arguments, fill in those
    // arguments with the defaults before returning the list of sentences.
    // The reason we don't set the defaults directly on the object is cuz
    // an asynchronous call of addArgumentSuggestion could actually fill in
    // the missing argument after this.
    for (let argName in this._invalidArgs)
      if (!(argName in this._validArgs))
        // Return nothing if this parsing is invalid
        // due to bad user-supplied args
        return [];

    var parsedSentences = [];
    if (this.fromNounFirstSuggestion) {
      for each (let sen in this._parsedSentences) if (sen.hasFilledArgs) {
        // When doing noun-first suggestion, we only want matches that put
        // the input or selection into an argument of the verb; therefore,
        // explicitly filter out suggestions that fill no arguments.
        for each (let oneSen in sen.fillMissingArgsWithDefaults()) {
          oneSen.fromNounFirstSuggestion = true;
          parsedSentences.push(oneSen);
        }
      }
    }
    else
      for each (let sen in this._parsedSentences)
        push.apply(parsedSentences,
                   sen.fillMissingArgsWithDefaults());

    return parsedSentences;
  },

  copy: function PPS_copy() {
    let newPPS = {__proto__: this};
    newPPS._parsedSentences =
      [ps.copy() for each (ps in this._parsedSentences)];
    for each (let key in ["_invalidArgs", "_validArgs"]) {
      let dest = newPPS[key] = {__proto__: null};
      let from = this[key];
      for (let x in from) dest[x] = from[x];
    }
    return newPPS;
  },

  getAlternateSelectionInterpolations:
  function PPS_getAlternateSelectionInterpolations() {
    let alternates = [this];
    // Returns a list of PartiallyParsedSentences with the selection
    // interpolated into missing arguments -- one for each argument where
    // the selection could go.
    // If the selection can't be used, returns a
    // list containing just this object.
    let unfilledArgs = [
      name for ([name, arg] in new Iterator(this._verb.args))
      if (!this._argStrings[name] && !arg.type.noSelection)];
    if (!unfilledArgs.length) return alternates;

    let {text, html, fake} = this._selObj;
    let indices = [0, fake ? 0 : text.length];
    for each (let arg in unfilledArgs) {
      let newParsing = this.copy();
      if (newParsing._argSuggest(arg, text, html, indices))
        alternates.push(newParsing);
    }
    return alternates;
  },

  get fromNounFirstSuggestion() !this._matchScore,
};

function Verb(cmd, roleMap) {
  // Picks up noun's label. "_name" is for backward compatiblity
  function pluckLabel(noun) noun.label || noun._name || "?";

  this.cmd = cmd;
  this.matchedName = cmd.names[0];
  this.input = "";
  this.newAPI = !("DOType" in cmd || "modifiers" in cmd);
  var args = this.args = {__proto__: null};
  // Use the presence or absence of the "arguments" dictionary
  // to decide whether this is a version 1 or version 2 command.
  if (this.newAPI) {
    // New-style API: command defines arguments array
    // if there are arguments, copy them over using
    // a (semi-arbitrary) choice of preposition
    for each (let arg in cmd.arguments) {
      let {role, nountype} = arg;
      let obj = role === "object";
      args[obj ? "object" : role] = {
        type : nountype,
        label: arg.label || pluckLabel(nountype),
        preposition: obj ? "" : roleMap[role],
        "default": arg.default,
        input: arg.input,
      };
    }
  }
  else {
    // Old-style API for backwards compatibility:
    //   Command defines DOType/DOLabel and modifiers dictionary.
    // Convert this to argument dictionary.
    // cmd.DOType must be a NounType, if provided.
    if ("DOType" in cmd) {
      args.object = {
        type: cmd.DOType,
        label: cmd.DOLabel,
        preposition: "",
        "default": cmd.DODefault,
      };
    }
    // cmd.modifiers should be a dictionary
    // keys are prepositions
    // values are NounTypes.
    // example: {"from" : City, "to" : City, "on" : Day}
    if (!Utils.isEmpty(cmd.modifiers)) {
      let {modifiers, modifierDefaults} = cmd;
      for (let x in modifiers) {
        let type = modifiers[x];
        args[x] = {
          type: type,
          label: pluckLabel(type),
          preposition: x,
        };
        if (modifierDefaults)
          args[x].default = modifierDefaults[x];
      }
    }
  }
  this.argCount = [0 for (_ in args)].length;
}
Verb.prototype = {
  get name() this.cmd.names[0],
  get icon() this.cmd.icon,
  get disabled() this.cmd.disabled,

  execute: function V_execute(context, argumentValues) {
    return (
      this.newAPI
      // New-style commands (api 1.5) expect a single dictionary with all
      // arguments in it, and the object named 'object'.
      ? this.cmd.execute(context, argumentValues)
      // Old-style commands (api 1.0) expect the direct object to be passed
      // in separately.
      : this.cmd.execute(context, argumentValues.object, argumentValues));
  },

  preview: function V_preview(context, previewBlock, argumentValues) {
    // Same logic as the execute command -- see comment above.
    (this.newAPI
     ? this.cmd.preview(context, previewBlock, argumentValues)
     : this.cmd.preview(context, previewBlock,
                        argumentValues.object, argumentValues));
  },

  usesAnySpecificNounType: function V_usesAnySpecificNounType() {
    for each (let arg in this.args) if (!arg.type.rankLast) return true;
    return false;
  },

  // Returns a matching score (1 ~ 0) which will be used for sorting.
  // input should be lowercased.
  match: function V_match(input) {
    var {names} = this.cmd;
    var inputLC = input.toLowerCase();
    for (let i = 0, l = names.length; i < l; ++i) {
      let score = hagureMetal(inputLC, names[i].toLowerCase());
      if (!score) continue;
      this.matchedName = names[i];
      this.input = input;
      // lower the score based on the name position
      return score * (l - i) / l;
    }
    return 0;
  }
};

// Represents how well an abbreviation matches the original
// as a float number 1 (perfect) to 0 (invalid).
// Inspired by <http://github.com/rmm5t/liquidmetal/tree/master>.
function hagureMetal(abbr, orig) {
  var len = orig.length;
  if (len < abbr.length) return 0;
  var sum = 0, score = 1, preIndex = -1;
  var {nonWord} = hagureMetal;
  var {pow} = Math;
  for each (let c in abbr) {
    let index = orig.indexOf(c, preIndex + 1);
    if (index < 0) return 0;
    if (index !== preIndex + 1) score = pow((len - index) / len, 3);
    sum += (nonWord.test(orig[index - 1])
            ? pow(score, .3) // beginning of a word
            : score);
    preIndex = index;
  }
  return pow(sum / len, .3);
}
hagureMetal.nonWord = /^\W/;
