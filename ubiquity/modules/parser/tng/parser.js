// set up the Parser class

Parser = function(lang) {
  this.lang = lang;
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
  initialCache: function() {
    // this method is initialized when the language is loaded

    // caches a number of commonly used regex's into patternCache

    patternCache = {};

    patternCache.verbMatcher = matchString([name for (name in allNames(verbs))]);

    patternCache.verbInitialTest = new RegExp('^\\s*('+patternCache.verbMatcher+')'+(this.usespaces?'(\\s+.*$|$)':'(.*$)'));
    patternCache.verbFinalTest = new RegExp((this.usespaces?'(^.*\\s+|^)':'(^.*)')+'('+patternCache.verbMatcher+')\\s*$');
    
    patternCache.anaphora = new RegExp((this.usespaces?'(^.*\\s+|^)':'(^.*)')+'('+(this.anaphora.join('|'))+')'+(this.usespaces?'(\\s+.*$|$)':'(.*$)'))
    
    // cache the roles used in each verb
    // also cache a regex for recognizing its delimiters
    patternCache.delimiters = {};
    
    for (let verb in verbs) {
      this.rolesCache[verb] = [role for each (role in this.roles) if (verbs[verb].arguments
                            .some(function(arg) arg.role == role.role ) ) ];
      patternCache.delimiters[verb] = new RegExp('^('+[role.delimiter for each (role in this.rolesCache[verb]) ].join('|')+')$');
    }

    patternCache.delimiters[null] = new RegExp('^('+[role.delimiter for each (role in this.roles) ].join('|')+')$');

  },
  roles: [{role: 'object', delimiter: ''}], // a list of roles and their delimiters
  newQuery: function(queryString,context,maxSuggestions) {
    return new Parser.Query(this,queryString,context,maxSuggestions);
  },
  wordBreaker: function(input) {
    return input;
  },
  splitWords: function(input) {
    return input.replace(/^\s*(.*?)\s*$/,'$1').split(/\s+/);
  },
  verbFinder: function(input) {
    let returnArray = [{verb: null, argString: input.replace(/^\s*(.*?)\s*$/,'$1'), verbName: null}];

    if ((test = input.match(patternCache.verbInitialTest)) != null) {
      let [ ,verbPrefix,argString] = test;
      
      for (var verb in verbs) {
        // check each verb synonym
        for (var name in names(verbs[verb])) {
          if (name.indexOf(verbPrefix) == 0) {
            returnArray.push({verb: verb, argString: argString, verbName: name});
            break;
          }
        }
      }
    }

    if ((test = input.match(patternCache.verbFinalTest)) != null) {
      let [ ,argString,verbPrefix] = test;
      
      for (var verb in verbs) {
        // check each verb synonym
        for (var name in names(verbs[verb])) {
          if (name.indexOf(verbPrefix) == 0) {
            returnArray.push({verb: verb, argString: argString, verbName: name});
            break;
          }
        }
      }
    }

    return returnArray;
  },
  argFinder: function(words,verb) {
    var possibleArgs = [];
    
    // find all the possible delimiters
    var possibleDelimiterIndices = [];
    
    // if the verb is set, only look for delimiters which are available
    let roles = ( verb ? this.rolesCache[verb] : this.roles );

    for (var i=0; i < words.length; ++i) {
      if (this.hasDelimiter(words[i],verb))
        possibleDelimiterIndices.push(i);
    }
    
    // this is a cache of the possible roles for each delimiter word encountered
    let rolesForEachDelimiterCache = {};
    
    // find all the possible combinations of delimiters
    var possibleDelimiterCombinations = p(possibleDelimiterIndices);
    
    for each (var delimiterIndices in possibleDelimiterCombinations) {
      // don't process invalid delimiter combinations
      // (where two delimiters are back to back)
      var breaknow = false;
      for (var i=0; i < delimiterIndices.length - 1; ++i) {
        if (delimiterIndices[i] + 1 == delimiterIndices[i+1])
          breaknow = true;
      }
      if (breaknow) break;

      var theseArgParses = [{object: [],display:''}];
      
      // if there are no delimiters at all, put it all in the direct object
      if (delimiterIndices.length == 0) {
        theseArgParses[0].object.push(words.join(this.joindelimiter));
        theseArgParses[0].display += ' <span class="object">'+words.join(this.joindelimiter)+'</span>';
      }
      
      // if there are extra words at the beginning or end, make them a direct object
      if (this.branching == 'left') {
        if (delimiterIndices[delimiterIndices.length - 1] < words.length - 1 && delimiterIndices[delimiterIndices.length - 1] != undefined) {
          theseArgParses[0].object.unshift(words.slice(delimiterIndices[delimiterIndices.length  - 1] + 1,words.length).join(this.joindelimiter));
          theseArgParses[0].display = ' <span class="object">'+words.slice(delimiterIndices[delimiterIndices.length  - 1] + 1,words.length).join(this.joindelimiter)+'</span>' + theseArgParses[0].display;
        }
      } else {
        if (delimiterIndices[0] > 0 && delimiterIndices[0] != undefined) {
          theseArgParses[0].object.push(words.slice(0,delimiterIndices[0]).join(this.joindelimiter));
          theseArgParses[0].display += ' <span class="object">'+words.slice(0,delimiterIndices[0]).join(this.joindelimiter)+'</span>';
        }
      }
      
      if (this.branching == 'left')
        delimiterIndices = delimiterIndices.reverse();
      
      // for each delimiter
      for (var i in delimiterIndices) {
        
        var newArgParses = []; // we'll update each copy of theseArgParses and them put them here for the time being
        
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
            for (var k in theseArgParses) {
              let thisArgParse = new cloneObject(theseArgParses[k]);

              if (this.branching == 'left') {// find args right to left

                // put the selected argument in its proper role
                if (role == 'object') {
                  thisArgParse.object.unshift(this.cleanArgument(words.slice(j,jmax + 1).join(this.joindelimiter)));
                } else {
                  // check to make sure we're not overwriting anything
                  if (thisArgParse[role] == undefined) {
                    thisArgParse[role] = this.cleanArgument(words.slice(j,jmax + 1).join(this.joindelimiter));
                  } else {
                    continue; // this will move onto the next of the theseArgParses (increments k)
                  }
                }
                
                thisArgParse.display = ' <span class="argument">'+words.slice(j,jmax + 1).join(this.joindelimiter)+'</span><span class="prefix" title="'+role+'"> '+words[delimiterIndices[i]]+'</span>' + thisArgParse.display;
  
                // put the extra words between the earlier delimiter and our arguments
                if (j != jmin) {
                  thisArgParse.object.unshift(words.slice(jmin,j).join(this.joindelimiter));
                  thisArgParse.display = ' <span class="object">'+words.slice(jmin,j).join(this.joindelimiter)+'</span>' + thisArgParse.display;
                }
              } else {
      
                // put the selected argument in its proper role
                if (role == 'object') {
                  thisArgParse.object.push(this.cleanArgument(words.slice(jmin,j + 1).join(this.joindelimiter)));
                } else {
                  // check to make sure we're not overwriting anything
                  if (thisArgParse[role] == undefined) {
                    thisArgParse[role] = this.cleanArgument(words.slice(jmin,j + 1).join(this.joindelimiter));
                  } else {
                    continue; // this will move onto the next of the theseArgParses (increments k)
                  }
                }
                
                thisArgParse.display += ' <span class="prefix" title="'+role+'">'+words[delimiterIndices[i]]+' </span><span class="argument">'+words.slice(jmin,j + 1).join(this.joindelimiter)+'</span>';
  
                // put the extra words between this delimiter and the next in the direct object array
                if (j != jmax) {
                  thisArgParse.object.push(words.slice(j + 1,jmax + 1).join(this.joindelimiter));
                  thisArgParse.display += ' <span class="object">'+words.slice(j + 1,jmax + 1).join(this.joindelimiter)+'</span>';
                }
              }

              newArgParses.push(thisArgParse);
            }
          }
        }
          
          theseArgParses = newArgParses;
      }

      possibleArgs.push(theseArgParses);
    }
    
    return possibleArgs;
  },
  cleanArgument: function(word) {
    return word;
  },
  substitute: function(parse,selection) {
    let returnArr = [];
    for (let role in parse.args) {
      let args = (role == 'object'?parse.args[role]:[parse.args[role]]);
      for (let i in args) {
        let newArg;
        if (newArg = args[i].replace(patternCache.anaphora,"$1"+selection+"$3")) {
          if (newArg != args[i]) {
            let parseCopy = cloneObject(parse);
            if (role == 'object') {
              parseCopy.args[role][i] = newArg;
              parseCopy._display = parseCopy._display.replace('<span class="object">'+args[i]+'</span>','<span class="object">'+newArg+'</span>');            
            } else {
              parseCopy.args[role] = newArg;
              parseCopy._display = parseCopy._display.replace('<span class="argument">'+args[i]+'</span>','<span class="argument">'+newArg+'</span>');
            }
            if (typeof(parseCopy.verb) == 'object') {
              parseCopy.verb = null;
              parseCopy.verbName = null;
            }
            returnArr.push(parseCopy);
          }
        }
      }
    }
    return returnArr;
  },
  hasDelimiter: function(delimiter,verb) {
    return patternCache.delimiters[verb].exec(delimiter);
  },
  getRoleByDelimiter: function(delimiter,roles) {
    return [role.role for each (role in roles) if (role.delimiter == delimiter) ];
  },
  score: function(parse) {
    var returnArray = [];

    // cleanup the parse first
    if (parse.args.object != undefined) {
      if (parse.args.object.length == 0) {
        delete parse.args['object'];
      } else {
        if (parse.args.object.length == 1 && parse.args.object[0] == '')
          delete parse.args['object'];
      }
    }

    // for parses WITHOUT a set verb:
    if (parse.verb == null) {
      for (let verb in verbs) {
        let suggestThisVerb = true;
        
        for (var role in parse.args) {
          let thisRoleIsUsed = verbs[verb].arguments.some(function(arg) arg.role == role);
          if (!thisRoleIsUsed)
            suggestThisVerb = false;
        }
                
        if (suggestThisVerb) {
          let parseCopy = cloneObject(parse);
          parseCopy.verb = verb;
          parseCopy.verbName = verb;

          parseCopy.score = 0.5; // lowered because we had to suggest a verb
          parseCopy._suggested = true;
          parseCopy.score = this.scoreWithVerb(parseCopy);
          if (parseCopy.score > threshold)
            returnArray.push(parseCopy);
        }
      }
    } else { // for parses with verbs
      //console.log(parse);
      parse.score = this.scoreWithVerb(parse);
      //console.log(parseCopy.score);
      if (parse.score > threshold)
        returnArray.push(parse);
    }
    
    return returnArray;
  },
  scoreWithVerb: function(parse) {
    let score = (parse.score || 1); // start with a perfect score

    //console.log(parse);

    for (let role in parse.args) {
      let argText = parse.args[role];
      let thisVerbTakesThisRole = false;
      
      if (role == 'object') {
        // if there are multiple direct objects, mark this parse down.
        if (argText.length > 1) {
          score *= Math.pow(0.5,(argText.length - 1));
          if (score < threshold)
            return 0;
        }
        // make sure to incorporate the score of the noun type of the *first* DO
        argText = argText[0];
      }
      
      //console.log(role+': '+argText);
      
      for each (let verbArg in verbs[parse.verb].arguments) {
        if (role == verbArg.role) {
          // if a score for this arg as this nountype is set
          if (nounCache[argText][verbArg.nountype] != undefined) {
            score *= nounCache[argText][verbArg.nountype];
            thisVerbTakesThisRole = true;
          }
        }
      }

      if (score < threshold)
        return 0;

      if (!thisVerbTakesThisRole) {
        return 0; // if this role isn't appropriate for the verb, kill this parse
      }
    }

    for each (var verbArg in verbs[parse.verb].arguments) {
      score *= 0.8; // lower for each unset argument

      for (var role in parse.args) {
        if (role == verbArg.role) {
          score *= (1/0.8); // repair this for set arguments
          break;
        }
      }

      if (score < threshold)
        return 0;
        
    }

    return score;
  }
}

// set up the Query class

Parser.Query = function(parser,queryString, context, maxSuggestions) {
  this.parser = parser;
  this.input = queryString;
  this.context = context;
  this.maxSuggestions = maxSuggestions;

  // code flow control stuff
  this.finished = false;
  this.hasResults = false;
  this.suggestionList = [];
  this._keepworking = true;
  this._times = [];
  this._step = 0;
  
  // internal variables
  this._input = '';
  this._verbArgPairs = [];
  this._possibleParses = [];
  this._scoredParses = [];

}

Parser.Query.prototype = {
  run: function() {
      
    threshold = $('#threshold').val()*1;

    this._times = [Date.now()];
    this._step++;
    
    this._input = this.parser.wordBreaker(this.input);

    this._times[this._step] = Date.now();
    this._step++;
    
    this._verbArgPairs = this.parser.verbFinder(this._input);
    
    this._times[this._step] = Date.now();
    this._step++;

    // clitics go here

    if (!this._keepworking) return false;
    this._times[this._step] = Date.now();
    this._step++;
    
    for each (var pair in this._verbArgPairs) {
      let words = this.parser.splitWords(pair.argString);
      for each (var argSets in this.parser.argFinder(words,pair.verb)) {
        for each (var args in argSets) {
          let thisParse = {verb:pair.verb,verbName:pair.verbName,argString:pair.argString,args:args,_display:args.display};
          delete thisParse.args['display'];
          this._possibleParses.push(thisParse);
        }
      }
    }

    if (!this._keepworking) return false;
    this._times[this._step] = Date.now();
    this._step++;
    
    let selection = $('#selection').val();
    if (selection.length && patternCache.anaphora.test(this._input)) {
      for each (let parse in this._possibleParses) {
        let newParses = this.parser.substitute(parse,selection);
        if (newParses.length)
          this._possibleParses = this._possibleParses.concat(newParses);
      }
    }

    if (!this._keepworking) return false;
    this._times[this._step] = Date.now();
    this._step++;
    
    for each (let parse in this._possibleParses) {
      cacheNounTypes(parse.args);
    }
    
    if (!this._keepworking) return false;
    this._times[this._step] = Date.now();
    this._step++;
    
    for each (var parse in this._possibleParses) {
      this._scoredParses = this._scoredParses.concat(this.parser.score(parse));
    }
    
    this._scoredParses = this._scoredParses.sort(compareByScoreDesc);
    
    if (!this._keepworking) return false;    
    this._times[this._step] = Date.now();
    this._step++;
    
    this.finished = true;
    // _scoredParses will be replaced by the suggestionList in the future...
    if (this._scoredParses.length > 0)
      this.hasResults = true
    this.onResults();
    
    return true;
           
  },
  getSuggestionList: function() {
  },
  cancel: function() {
    //dump('cancelled!');
    this._keepworking = false;
  },
  onResults: function() {}
}
