var EXPORTED_SYMBOLS = ["detectNounType",'setNounTypes','callback'];

Components.utils.import("resource://ubiquity/modules/parser/new/active_noun_types.js");

//dump('in the worker now: there are '+activeNounTypes.length+' nountypes\n');

nounTypes = [];

setNounTypes = function setNounTypes(outsideNounTypes) {
  nounTypes = outsideNounTypes;
}

//if ((typeof postMessage) != 'function')
//  postMessage = function(){ dump('default function :p\n') };

detectNounType = function detectNounType(x,callback) {
  var returnArray = [];
  
  dump('detecting '+x+'\n');
  
  for each (thisNounType in nounTypes) {

    var completeAsyncSuggest = function completeAsyncSuggest(suggestion) {
      suggestion.nountype = thisNounType;
      if ((typeof callback) == 'function')
        callback([suggestion]);
    }

    var suggestions = thisNounType.suggest(x,x,completeAsyncSuggest) || [];
    //mylog(suggestions);
    for each (suggestion in suggestions) {
      // set the nountype that was used in each suggestion so that it can 
      // later be compared with the nountype specified in the verb.
      suggestion.nountype = thisNounType;
    }
    if (suggestions.length > 0) {
      returnArray = returnArray.concat(suggestions);
    }
  }
  
  if ((typeof callback) == 'function')
    callback(returnArray);
  //postMessage(returnArray);
}

onmessage = function onmessage(event) {
  if (event.data) {
    nounTypes = event.data.nounTypes;
    //dump('received '+nounTypes.length+' nountypes\n');
    //postMessage(nounTypes);
    detectNounType(event.data.input);
  }
}

