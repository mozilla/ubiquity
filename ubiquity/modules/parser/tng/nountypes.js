// set up noun type cache

var nounCache = {};

// set up noun type detectors

var nounTypes = {
  arb:      { score: function(x) {return 0.7;} },
  contact:  { list: ['John','Mary','Bill'],
    score: function(x) { return (x.search(eval('/^('+matchString(this.list)+')$/i')) >= 0 ? 1 : 0) } },
  city:     { list: ['San Francisco', 'Tokyo', 'Boston'],
    score: function(x) { return (x.search(eval('/^('+matchString(this.list)+')$/i')) >= 0 ? 1 : 0) } },
  time:     { score: function(x) {return (x.search(/^\d+ ?\w+$/i) >= 0 ? 1 : 0);} },
  number:   { score: function(x) { return (x.search(/^\d+$/) >= 0 ? 1 : 0) } },
  service:  { list: ['Google', 'Yahoo', 'calendar'],
    score: function(x) { return (x.search(eval('/^('+matchString(this.list)+')$/i')) >= 0 ? 1 : 0) } },
  language: { list: ['English','French','Japanese','Chinese'],
    score: function(x) { return (x.search(eval('/^('+matchString(this.list)+')$/i')) >= 0 ? 1 : 0) } }
};

function detectNounType(x) {
  if (nounCache[x] == undefined)
    nounCache[x] = protoDetectNounType(x);
  return nounCache[x];
}

function protoDetectNounType(x) {
  let returnObj = [];
  for (let type in nounTypes) {
    let score = nounTypes[type].score(x);
    if (score > 0)
      returnObj[type] = score;
  }
  return returnObj;
}

function cacheNounTypes(args) {
  for each (let arg in args) {
    if (typeof(arg) == 'object')
      for each (let x in arg)
        detectNounType(x);
    else
      detectNounType(arg);
  }
  return true;
}