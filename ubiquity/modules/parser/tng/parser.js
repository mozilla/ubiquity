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
  parse: function(input) {
  
    threshold = $('#threshold').val()*1;
    let displayParseInfo = $('#displayparseinfo').attr('checked');
    $('#parseinfo').empty();

    let times = [Date.now()];
    let timefactor = 7;
    
    var input = (input || $('.input').val());
    input = this.wordBreaker(input);
    if (displayParseInfo)
      $('<h3>step 1: split words</h3><code>'+input+'</code>').appendTo($('#parseinfo'));
    $('#timeinfo .step1').css('width',((times[1] = Date.now()) - times[0]) * timefactor);

    var verbArgPairs = this.verbFinder(input);
    if (displayParseInfo) {
      $('<h3>step 2: pick possible verbs</h3><ul id="verbArgPairs"></ul>').appendTo($('#parseinfo'));
      for each (pair in verbArgPairs) {
        $('<li>V: <code title="'+(pair.verb || 'null')+'">'+(pair.verbName || '<i>null</i>')+'</code>, argString: <code>'+pair.argString+'</code></li>').appendTo($('#verbArgPairs'));
      }
    }
    
    $('#timeinfo .step2').css('width',((times[2] = Date.now()) - times[1]) * timefactor);

    if (displayParseInfo)
      $('<h3>step 3: pick possible clitics (TODO)</h3>').appendTo($('#parseinfo'));
    $('#timeinfo .step3').css('width',((times[3] = Date.now()) - times[2]) * timefactor);

    if (displayParseInfo)
      $('<h3>step 4: group into arguments</h3><ul id="argParses"></ul>').appendTo($('#parseinfo'));

    let possibleParses = [];
    for each (var pair in verbArgPairs) {
      var words = this.splitWords(pair.argString);
      for each (var argSets in this.argFinder(words,pair.verb)) {
        for each (var args in argSets) {
          var thisParse = {verb:pair.verb,verbName:pair.verbName,argString:pair.argString,args:args,_display:args.display};
          delete thisParse.args['display'];
          possibleParses.push(thisParse);
        }
      }
    }
    
    if (displayParseInfo) {
      for each (var parse in possibleParses) {
        $('<li><span class="verb" title='+(parse.verb || 'null')+'>'+(parse.verbName || '<i>null</i>')+'</span>'+parse._display+'</li>').appendTo($('#argParses'));
      }
      $('<p><small>'+possibleParses.length+' possible parses</small></p>').appendTo($('#parseinfo'));
    }
        
    $('#timeinfo .step4').css('width',((times[4] = Date.now()) - times[3]) * timefactor);

    if (displayParseInfo)
      $('<h3>step 5: anaphora substitution</h3><ul id="newPossibleParses"></ul>').appendTo($('#parseinfo'));

    let selection = $('#selection').val();
    if (selection.length && patternCache.anaphora.test(input)) {
      for each (let parse in possibleParses) {
        let newParses = this.substitute(parse,selection);
        if (newParses.length)
          possibleParses = possibleParses.concat(newParses);
      }
    }

    if (displayParseInfo) {
      for each (var parse in possibleParses) {
        $('<li><span class="verb" title='+(parse.verb || 'null')+'>'+(parse.verbName || '<i>null</i>')+'</span>'+parse._display+'</li>').appendTo($('#newPossibleParses'));
      }
      $('<p><small>'+possibleParses.length+' possible parses</small></p>').appendTo($('#parseinfo'));
    }

    $('#timeinfo .step5').css('width',((times[5] = Date.now()) - times[4]) * timefactor);    
    
    //console.log(possibleParses);

    if (displayParseInfo)
      $('<h3>step 6: noun type detection</h3><ul id="nounCache"></ul>').appendTo($('#parseinfo'));
    
    for each (let parse in possibleParses) {
      cacheNounTypes(parse.args);
    }
    
    if (displayParseInfo) {
      for (var text in nounCache) {
        var html = $('<li><code>'+text+'</code></li>');
        var list = $('<ul></ul>');
        for (let type in nounCache[text]) {
          $('<li>type: <code>'+type+'</code>, score: '+nounCache[text][type]+'</li>').appendTo(list);
        }
        list.appendTo(html);
        html.appendTo($('#nounCache'));
      }
    }
    
    $('#timeinfo .step6').css('width',((times[5] = Date.now()) - times[5]) * timefactor);

    if (displayParseInfo)    
      $('<h3>step 7: ranking</h3>').appendTo($('#parseinfo'));
    
    $('#scoredParses').empty();
    
    var scoredParses = [];
    for each (parse in possibleParses) {
      scoredParses = scoredParses.concat(this.score(parse));
    }
    
    scoredParses = scoredParses.sort(compareByScoreDesc);
    
    times[7] = Date.now(); // because everything after this is display code.
    
    for each (var parse in scoredParses.sort(compareByScoreDesc)) {
      $('<tr><td><span class="verb" title="'+parse.verb+'">'+parse.verbName+'</span>'+parse._display+'</td><td>'+Math.floor(100*parse.score)/100+'</td></tr>').appendTo($('#scoredParses'));
    }
    
    $('#timeinfo .step7').css('width',(times[7] - times[6]) * timefactor);
    
    $('#timeinfo span').text((times[7] - times[0])+'ms');
    
    //console.log(times);
    
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
      
      for (verb in verbs) {
        // check each verb synonym
        for (name in names(verbs[verb])) {
          if (name.indexOf(verbPrefix) == 0) {
            returnArray.push({verb: verb, argString: argString, verbName: name});
            break;
          }
        }
      }
    }

    if ((test = input.match(patternCache.verbFinalTest)) != null) {
      let [ ,argString,verbPrefix] = test;
      
      for (verb in verbs) {
        // check each verb synonym
        for (name in names(verbs[verb])) {
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

// initialize the patternCache

var patternCache = {};
