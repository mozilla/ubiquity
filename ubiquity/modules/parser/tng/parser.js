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

var nounCache = {};

// set up the Parser class

function Parser(lang) {
  this.lang = lang;
  if (this._verbList.length && this._nounTypes.length)
    this.initialCache();
}
Parser.prototype = {
  lang: '',
  branching: '', // left or right
  usespaces: true,
  joindelimiter: ' ',
  examples: [],
  clitics: [],
  anaphora: ['this'],
  rolesCache: {},
  patternCache: {},
  _verbList: [],
  _nounTypes: [],

  setCommandList: function( commandList ) {
    for (let verb in commandList) {
      if (commandList[verb].names != undefined) {
        this._verbList.push(commandList[verb]);
        //dump("loaded verb: "+verb+"\n");
      }
    }
    //this._verbList = commandList;
  },
  
  setNounList: function( nounList ) {

    let registeredNounTypes = [];

    // TODO: for some reason the nounList contains lots of duplicates now...
    // this filter just reduces those

    this._nounTypes = nounList.filter(function(type) {
      if (type._name != undefined) {
        if (registeredNounTypes[type._name] == undefined) {
          registeredNounTypes[type._name] = true;
          return true;
        }
      } 
      return false;
    });

    this.initialCache();
  },

  initialCache: function() {
    // this method is initialized when the language is loaded
    // caches a number of commonly used regex's into this.patternCache

    // just a little utility generator
    function allNames(verbs,lang) {
      for each (verb in verbs) {
        for each (name in (verb.names[lang] || verb.names.en)) {
          yield name;
        }
      }
    }

    // a little utility function to create a RegExp which matches any prefix of a set of strings
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

    this.patternCache.verbMatcher = matchString([name for (name in allNames(this._verbList,this.lang))]);

    this.patternCache.verbInitialTest = new RegExp('^\\s*('+this.patternCache.verbMatcher+')'+(this.usespaces?'(\\s+.*$|$)':'(.*$)'));
    this.patternCache.verbFinalTest = new RegExp((this.usespaces?'(^.*\\s+|^)':'(^.*)')+'('+this.patternCache.verbMatcher+')\\s*$');

    this.patternCache.anaphora = new RegExp((this.usespaces?'(^.*\\s+|^)':'(^.*)')+'('+(this.anaphora.join('|'))+')'+(this.usespaces?'(\\s+.*$|$)':'(.*$)'))

    // cache the roles used in each verb
    // also cache a regex for recognizing its delimiters
    this.patternCache.delimiters = {};

    for (let verb in this._verbList) {
      this.rolesCache[verb] = [role for each (role in this.roles) if (this._verbList[verb].arguments
                            .some(function(arg) arg.role == role.role ) ) ];
      this.patternCache.delimiters[verb] = new RegExp('^('+[role.delimiter for each (role in this.rolesCache[verb]) ].join('|')+')$');
    }

    this.patternCache.delimiters[null] = new RegExp('^('+[role.delimiter for each (role in this.roles) ].join('|')+')$');

  },
  roles: [{role: 'object', delimiter: ''}], // a list of roles and their delimiters
  newQuery: function(queryString,context,maxSuggestions,dontRunImmediately) {
    return new Parser.Query(this,queryString,context,maxSuggestions,dontRunImmediately);
  },
  wordBreaker: function(input) {
    return input;
  },
  splitWords: function(input) {
    return input.replace(/^\s*(.*?)\s*$/,'$1').split(/\s+/);
  },
  verbFinder: function(input) {
    let returnArray = new Array({_verb: {id: null, text: null, _order: null}, argString: input.replace(/^\s*(.*?)\s*$/,'$1')});

    // just a little utility generator
    // yields the synonymous names this verb in a given language
    function names(verb,lang) {
      for each (name in (verb.names[lang] || verb.names.en)) {
        yield name;
      }
    }

    if ((test = input.match(this.patternCache.verbInitialTest)) != null) {
      let [ ,verbPrefix,argString] = test;

      for (verb in this._verbList) {
        // check each verb synonym
        for (name in names(this._verbList[verb],this.lang)) {
          if (name.indexOf(verbPrefix) == 0) {
            let thisParse = {_verb: cloneObject(this._verbList[verb]), argString: argString};
            thisParse._verb.id = verb;
            thisParse._verb.text = name;
            thisParse._verb._order = 0;
            returnArray.push(thisParse);
            break;
          }
        }
      }
    }

    if ((test = input.match(this.patternCache.verbFinalTest)) != null) {
      let [ ,argString,verbPrefix] = test;

      for (verb in this._verbList) {
        // check each verb synonym
        for (name in names(this._verbList[verb],this.lang)) {
          if (name.indexOf(verbPrefix) == 0) {
            let thisParse = {_verb: cloneObject(this._verbList[verb]), argString: argString};
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
  argFinder: function(argString,verb) {

    let possibleParses = [];

    let words = this.splitWords(argString);

    // find all the possible delimiters
    let possibleDelimiterIndices = [];

    // if the verb is set, only look for delimiters which are available
    let roles = ( verb.id ? this.rolesCache[verb.id] : this.roles );

    for (var i=0; i < words.length; ++i) {
      if (this.hasDelimiter(words[i],verb.id))
        possibleDelimiterIndices.push(i);
    }

    // this is a cache of the possible roles for each delimiter word encountered
    let rolesForEachDelimiterCache = {};

    // find all the possible combinations of delimiters
    // this method uses .reduce to return a power set
    // http://twitter.com/mitchoyoshitaka/status/1489386225
    var possibleDelimiterCombinations = possibleDelimiterIndices.reduce(function(last, current) last.concat([a.concat([current]) for each (a in last)]), [[]]);

    for each (var delimiterIndices in possibleDelimiterCombinations) {

      // don't process invalid delimiter combinations
      // (where two delimiters are back to back)
      var breaknow = false;
      for (var i=0; i < delimiterIndices.length - 1; ++i) {
        if (delimiterIndices[i] + 1 == delimiterIndices[i+1])
          breaknow = true;
      }
      if (breaknow) break;
      if (delimiterIndices[delimiterIndices.length - 1] == words.length-1)
        dump('maybe this is why I\'m dead.\n'); // TODO check if this breaks things

      var theseParses = [new Parser.Parse(this.branching,this.joindelimiter,verb,argString)];

      // if there are no delimiters at all, put it all in the direct object
      if (delimiterIndices.length == 0) {
        if (theseParses[0].args.object == undefined)
          theseParses[0].args.object = [];
        theseParses[0].args.object.push({ _order:1, input:words.join(this.joindelimiter), modifier:'' });
      }

      // if there are extra words at the beginning or end, make them a direct object
      if (this.branching == 'left') {
        if (delimiterIndices[delimiterIndices.length - 1] < words.length - 1 && delimiterIndices[delimiterIndices.length - 1] != undefined) {

          if (theseParses[0].args.object == undefined)
            theseParses[0].args.object = [];
          theseParses[0].args.object.push({ _order: (2 * delimiterIndices.length + 2), input:words.slice(delimiterIndices[delimiterIndices.length  - 1] + 1,words.length).join(this.joindelimiter), modifier:'' });

        }
      } else {
        if (delimiterIndices[0] > 0 && delimiterIndices[0] != undefined) {

          if (theseParses[0].args.object == undefined)
            theseParses[0].args.object = [];
          theseParses[0].args.object.push({ _order: 1, input:words.slice(0,delimiterIndices[0]).join(this.joindelimiter), modifier:'' });

        }
      }

      if (this.branching == 'left')
        delimiterIndices = delimiterIndices.reverse();

      // for each delimiter
      for (let i=0; i<delimiterIndices.length; i++) {
      
        var newParses = []; // we'll update each copy of theseParses and them put them here for the time being

        if (this.branching == 'left') {// find args right to left
          var jmin = ((delimiterIndices[(i*1) + 1] == undefined) ? 0 : delimiterIndices[(i*1) + 1] + 1);
          var jmax = delimiterIndices[(i*1)] - 1;
        } else {
          var jmin = delimiterIndices[i] + 1;
          var jmax = ((delimiterIndices[(i*1) + 1] == undefined) ? words.length - 1 : delimiterIndices[(i*1)+1] - 1);
        }

        // compute the possible roles for this delimiter
        if (rolesForEachDelimiterCache[words[delimiterIndices[i]]] == undefined)
          rolesForEachDelimiterCache[words[delimiterIndices[i]]] = this.getRoleByDelimiter(words[delimiterIndices[i]],roles);
          
        // for each scope
        for (var j = jmin; j <= jmax; j++) {

          // for each delimiter's possible role
          for each (var role in rolesForEachDelimiterCache[words[delimiterIndices[i]]]) {
            // for each of the current parses

            for (var k in theseParses) {

              let thisParse = new cloneObject(theseParses[k]);
              
              if (this.branching == 'left') {// find args right to left

                // put the selected argument in its proper role

                if (thisParse.args[role] == undefined)
                  thisParse.args[role] = [];

                thisParse.args[role].push({ _order: 1 + 2*(delimiterIndices.length - i), input:this.cleanArgument(words.slice(j,jmax + 1).join(this.joindelimiter)), modifier:words[delimiterIndices[i]] });

                // put the extra words between the earlier delimiter and our arguments
                if (j != jmin) {

                  if (thisParse.args.object == undefined)
                    thisParse.args.object = [];
                  thisParse.args.object.push({ _order: 2*(delimiterIndices.length - i), input:this.cleanArgument(words.slice(jmin,j).join(this.joindelimiter)), modifier:'' });

                }
              } else {
                // put the selected argument in its proper role
                if (thisParse.args[role] == undefined)
                  thisParse.args[role] = [];
                thisParse.args[role].push({ _order: 1 + 2*(i)+2 - 1, input:this.cleanArgument(words.slice(jmin,j + 1).join(this.joindelimiter)), modifier:words[delimiterIndices[i]] });

                // put the extra words between this delimiter and the next in the direct object array
                if (j != jmax) {

                  if (thisParse.args.object == undefined)
                    thisParse.args.object = [];
                  thisParse.args.object.push({ _order: 1 + 2*(i)+2, input:this.cleanArgument(words.slice(j + 1,jmax + 1).join(this.joindelimiter)), modifier:'' });

                }
              }

              newParses.push(thisParse);
            }
          }
        }
        theseParses = newParses;
      }

      possibleParses.push(theseParses);
    }

    return possibleParses;
  },
  cleanArgument: function(word) {
    return word;
  },
  substitute: function(parse,selection) {
    let returnArr = [];

    for (let role in parse.args) {
      let args = parse.args[role];
      for (let i in args) {
        let newArg;
        if (newArg = args[i].input.replace(this.patternCache.anaphora,"$1"+selection+"$3")) {
          if (newArg != args[i].input) {
            let parseCopy = cloneObject(parse);
            parseCopy.args[role][i]._substitutedInput = newArg;
            returnArr.push(parseCopy);
          }
        }
      }
    }

    return returnArr;
  },
  hasDelimiter: function(delimiter,verb) {
    return this.patternCache.delimiters[verb].exec(delimiter);
  },
  getRoleByDelimiter: function(delimiter,roles) {
    return [role.role for each (role in roles) if (role.delimiter == delimiter) ];
  },
  suggestVerb: function(parse,threshold) {

    // for parses which already have a verb
    if (parse._verb.id != null)
      return [parse];

    // for parses WITHOUT a set verb:
    var returnArray = [];
    for (let verb in this._verbList) {
      let suggestThisVerb = true;

      for (let role in parse.args) {
        let thisRoleIsUsed = this._verbList[verb].arguments.some(function(arg) arg.role == role);
        if (!thisRoleIsUsed)
          suggestThisVerb = false;
      }

      if (suggestThisVerb) {
        let parseCopy = cloneObject(parse);
        parseCopy._verb = cloneObject(this._verbList[verb]);
        parseCopy._verb.id = verb;
        parseCopy._verb.text = this._verbList[verb].names[this.lang][0];
        parseCopy._verb._order = 0; // TODO: for verb forms which clearly should be sentence-final, change this value to -1

        parseCopy.score = 0.5; // lowered because we had to suggest a verb
        parseCopy._suggested = true;
        if (parseCopy.score > threshold)
          returnArray.push(parseCopy);
      }
    }
    return returnArray;
  },

  /* suggestArgs returns an array of copies of the given parse.
     there may be multiple returned as different noun suggestions are thrown in together.
  */
  suggestArgs: function(parse) {

    // make sure we keep the anaphor-substituted input intact... we're going to make changes to text, html, score, and nountype
    /*for each (let args in parse.args) {
      for each (let arg in args) {
        if (arg.text == undefined)
          arg.text = arg._substitutedInput;
        if (arg.html == undefined)
          arg.html = arg._substitutedInput;
      }
    }*/

    let initialCopy = cloneObject(parse);
    let returnArr = [initialCopy];

    for (let role in parse.args) {

      let thisVerbTakesThisRole = false;

      for each (let verbArg in parse._verb.arguments) {
        if (role == verbArg.role) {

          for (let i in parse.args[role]) {

            let argText = parse.args[role][i]._substitutedInput;

            // if a score for this arg as this nountype is set
            if (nounCache[argText][verbArg.nountype] != undefined) {
              //score *= nounCache[argText][verbArg.nountype];
              let newreturn = [];
              for each (argument in nounCache[argText][verbArg.nountype]) {
                for each (let parse in returnArr) {
                  let parseCopy = cloneObject(parse);
                  // copy the attributes we want to copy from the nounCache
                  parseCopy.args[role][i].text = argument.text;
                  parseCopy.args[role][i].html = argument.html;
                  parseCopy.args[role][i].score = argument.score;
                  parseCopy.args[role][i].nountype = verbArg.nountype;

                  newreturn.push(parseCopy);
                }
              }
              returnArr = newreturn;

              thisVerbTakesThisRole = true;

            }

          }

          if (thisVerbTakesThisRole)
            continue;
        }
      }

      if (!thisVerbTakesThisRole)
        return [];

    }
    return returnArr;
  },
  score: function(parse,threshold) {
    let score = (parse.score || 1); // start with a perfect score

    for (let role in parse.args) {

      // if there are multiple of any role, mark this parse down.
      if (parse.args[role].length > 1) {
        score *= Math.pow(0.5,(parse.args[role].length - 1));
        if (score < threshold)
          return [];
      }

      score *= parse.args[role][0].score;

      if (score < threshold)
        return [];

    }

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

    parse.score = score;

    return [parse];
  },
  
  // Noun Type stuff
  
  _detectNounType: function(x) {
    if (nounCache[x] == undefined) {
      nounCache[x] = this._protoDetectNounType(x);
    }
    return nounCache[x];
  },
  _protoDetectNounType: function (x) {
    let returnObj = {};

    for each (let nounType in this._nounTypes) {
      var suggestions = nounType.suggest(x);
      for each (suggestion in suggestions) {
        suggestion.nountype = nounType._name;
      }
      if (suggestions.length > 0)
        returnObj[nounType._name] = suggestions;
    }
    return returnObj;
  },
  cacheNounTypes: function (args) {
    for each (let arg in args) {
      for each (let x in arg)
        this._detectNounType(x._substitutedInput);
    }
    return true;
  }
  
}

// set up the Query class

Parser.Query = function(parser,queryString, context, maxSuggestions, dontRunImmediately) {
  this.parser = parser;
  this.input = queryString;
  this.context = context;
  this.maxSuggestions = maxSuggestions;

  // code flow control stuff
  this.finished = false;
  this._keepworking = true;
  this._times = [];
  this._step = 0;
  this._async = true;

  // internal variables
  this._input = '';
  this._verbArgPairs = [];
  this._possibleParses = [];
  this._verbedParses = [];
  this._suggestedParses = [];
  this._scoredParses = [];
  this._threshold = 0.2;
  
  if (!dontRunImmediately) {
    this._async = false;
    this.run();
  }
}

Parser.Query.prototype = {
  run: function() {
  
    //dump("run: "+this.input+"\n");
  
    this._keepworking = true;

    this._times = [Date.now()];
    this._step++;

    this._input = this.parser.wordBreaker(this.input);

    this._times[this._step] = Date.now();
    this._step++;

    var parseGenerator = this._yieldingParse();
    var self = this;
    /*var ok = true;
    var done = false;
    while (ok && !done && self._keepworking) {
      ok = parseGenerator.next();
    }*/

    function doAsyncParse() {
      //dump("step:"+self._step+"\n");
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

    return true;
  },
  _yieldingParse: function() {

    this._verbArgPairs = this.parser.verbFinder(this._input);
    //yield true;

    this._times[this._step] = Date.now();
    this._step++;

    // clitics go here
    //yield true;

    this._times[this._step] = Date.now();
    this._step++;

    for each (var pair in this._verbArgPairs) {
      for each (var argParses in this.parser.argFinder(pair.argString,pair._verb)) {
        this._possibleParses = this._possibleParses.concat(argParses);
        yield true;
      }
    }

    this._times[this._step] = Date.now();
    this._step++;
    
    let selection;
    if (this.context.getSelection != undefined)
      selection = this.context.getSelection();
    else
      selection = '';

    for each (let parse in this._possibleParses) {
      // make sure we keep the original input intact... we're going to make changes to _substitutedInput
      for each (let args in parse.args) {
        for each (let arg in args) {
          if (arg._substitutedInput == undefined)
            arg._substitutedInput = arg.input;
        }
      }

      if (selection.length && this.parser.patternCache.anaphora.test(this._input)) {
        let newParses = this.parser.substitute(parse,selection);
        if (newParses.length)
          this._possibleParses = this._possibleParses.concat(newParses);
        yield true;
      }

    }

    this._times[this._step] = Date.now();
    this._step++;

    for each (let parse in this._possibleParses) {
      this._verbedParses = this._verbedParses.concat(this.parser.suggestVerb(parse,this._threshold));
      yield true;
    }

    this._times[this._step] = Date.now();
    this._step++;

    for each (let parse in this._verbedParses) {
      this.parser.cacheNounTypes(parse.args);
      yield true;
    }

    this._times[this._step] = Date.now();
    this._step++;

    for each (let parse in this._verbedParses) {
      this._suggestedParses = this._suggestedParses.concat(this.parser.suggestArgs(parse));
      yield true;
    }

    this._times[this._step] = Date.now();
    this._step++;

    for each (parse in this._suggestedParses) {
      this._scoredParses = this._scoredParses.concat(this.parser.score(parse,this._threshold));
      yield true;
    }

    this._scoredParses = this._scoredParses.sort( function(a,b) b.score - a.score );

    this._times[this._step] = Date.now();
    this._step++;

    this.finished = true;

    this.onResults();
  },
  get hasResults() { return this._scoredParses.length > 0; },
  get suggestionList() { return this._scoredParses; },
  cancel: function() {
    //console.log("cancelled!");
    this._keepworking = false;
  },
  onResults: function() {}
}

Parser.Parse = function(branching, delimiter, verb, argString) {
  this._branching = branching;
  this._delimiter = delimiter,
  this._verb = verb;
  this.argString = argString;
  this.args = {};
}

Parser.Parse.prototype = {
  getDisplayText: function() {
    let display = '';
    let displayFinal = '';

    if (this._verb._order != -1)
      display = "<span class='verb' title='"+(this._verb.id || 'null')+"'>"+(this._verb.text || '<i>null</i>')+"</span>"+this._delimiter;
    else
      displayFinal = this._delimiter+"<span class='verb' title='"+this._verb.id+"'>"+(this._verb.text || '<i>null</i>')+"</span>";

    argsArray = [];
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

      if (this._branching == 'right')
        display += this._delimiter+"<span class='prefix' title='"+arg.role+"'>"+arg.modifier+this._delimiter+"</span><span class='"+className+"' title=''>"+(arg.text || arg._substitutedInput || arg.input)+"</span>";
      else
        display += this._delimiter+"<span class='"+className+"' title=''>"+(arg.text || arg._substitutedInput || arg.input)+"</span><span class='prefix' title='"+arg.role+"'>"+this._delimiter+arg.modifier+"</span>";

    }

    return display + displayFinal + ' (' + (Math.floor(this.score*100)/100 || '<i>no score</i>') + ')';

  },
  getIcon: function() {
    return this._verb._icon;
  },

  execute: function(context) {
    return this._verb.execute( context, this._argSuggs );
  },

  preview: function(context, previewBlock) {
    // TODO: enable real preview
    return '';
    //this._verb.preview( context, this._argSuggs, previewBlock );
  },

  get previewDelay() {
    return this._verb.previewDelay;
  },

  get previewUrl() {
    return this._verb.previewUrl;
  }
}

if ((typeof window) == 'undefined') {// kick it chrome style

  // mitcho just uses this function for debug purposes:
  mylog = function mylog(what) {
    const Cc = Components.classes;
    const Ci = Components.interfaces;
    Cc["@mozilla.org/appshell/window-mediator;1"].
             getService(Ci.nsIWindowMediator).getMostRecentWindow("navigator:browser").Firebug.Console.logFormatted([what]);
  }
  
} else {
//  mylog = console.log;
}

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
