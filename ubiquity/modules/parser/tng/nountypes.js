// set up noun type cache

var nounCache = {};

// set up noun type detectors

var nounTypes = {
  arb:      { suggest: function(x) [ { text:x, html:x, score:0.7 } ] },
  contact:  {
    list: ['John','Mary','Bill'],
    suggest: function(x) { 
      let suggestions = [];
      x = x.toLowerCase();
      for each (let candidate in this.list) {
        if (x == candidate.toLowerCase()) {
          suggestions.push({ text:candidate, html:candidate, score:1 });
          continue;
        }
        if (candidate.toLowerCase().indexOf(x) > -1) {
          suggestions.push({ text:candidate, html:candidate, score:0.9 });
          continue;
        }
      }
      return suggestions;
    }
  },
  city:  {
    list: ['San Francisco', 'San Diego', 'Tokyo', 'Boston'],
    suggest: function(x) { 
      let suggestions = [];
      x = x.toLowerCase();
      for each (let candidate in this.list) {
        if (x == candidate.toLowerCase()) {
          suggestions.push({ text:candidate, html:candidate, score:1 });
          continue;
        }
        if (candidate.toLowerCase().indexOf(x) > -1) {
          suggestions.push({ text:candidate, html:candidate, score:0.9 });
          continue;
        }
      }
      return suggestions;
    }
  },
  time:   { suggest: function(x) {
    if (x.search(/^\d+ ?\w+$/i) >= 0) 
      return [ { text:x, html:x, score:1 } ];    
    else
      return [];
  } },
  number: { suggest: function(x) {
    if (x.search(/^\d+$/) >= 0) 
      return [ { text:x, html:x, score:1 } ];    
    else
      return [];
  } },
  service:  {
    list: ['Google', 'Yahoo', 'Calendar'],
    suggest: function(x) { 
      let suggestions = [];
      x = x.toLowerCase();
      for each (let candidate in this.list) {
        if (x == candidate.toLowerCase()) {
          suggestions.push({ text:candidate, html:candidate, score:1 });
          continue;
        }
        if (candidate.toLowerCase().indexOf(x) > -1) {
          suggestions.push({ text:candidate, html:candidate, score:0.9 });
          continue;
        }
      }
      return suggestions;
    }
  },
  language:  {
    list: ['English','French','Japanese','Chinese'],
    suggest: function(x) { 
      let suggestions = [];
      x = x.toLowerCase();
      for each (let candidate in this.list) {
        if (x == candidate.toLowerCase()) {
          suggestions.push({ text:candidate, html:candidate, score:1 });
          continue;
        }
        if (candidate.toLowerCase().indexOf(x) > -1) {
          suggestions.push({ text:candidate, html:candidate, score:0.9 });
          continue;
        }
      }
      return suggestions;
    }
  }
};

function detectNounType(x) {
  if (nounCache[x] == undefined)
    nounCache[x] = protoDetectNounType(x);
  return nounCache[x];
}

function protoDetectNounType(x) {
  let returnObj = {};
  for (let type in nounTypes) {
    var suggestions = nounTypes[type].suggest(x);
    for each (suggestion in suggestions) {
      suggestion.nountype = type;
    }    
    if (suggestions.length > 0)
      returnObj[type] = suggestions;
  }
  return returnObj;
}

function cacheNounTypes(args) {
  for each (let arg in args) {
    for each (let x in arg)
      detectNounType(x._substitutedInput);
  }
  return true;
}