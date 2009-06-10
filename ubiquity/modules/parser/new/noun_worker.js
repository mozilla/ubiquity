var EXPORTED_SYMBOLS = ["detectNounType"];

Components.utils.import("resource://ubiquity/modules/utils.js");

//dump('in the worker now: there are '+activeNounTypes.length+' nountypes\n');

//if ((typeof postMessage) != 'function')
//  postMessage = function(){ dump('default function :p\n') };

function detectNounType(x, callback) {
  var returnArray = [];
  var ajaxRequests = [];
  var {activeNounTypes} =
    Components.utils.import(
      "resource://ubiquity/modules/parser/new/active_noun_types.js",
      null);

  dump("detecting: " + x + "\n");

  for (let thisNounTypeId in activeNounTypes) {
    let id = thisNounTypeId;
    let completeAsyncSuggest = function completeAsyncSuggest(suggs) {
      suggs = handleSuggs(suggs, id);
      if(ajaxRequests.indexOf(activeNounTypes[id].ajaxRequest) != -1)
        ajaxRequests.splice(ajaxRequests.indexOf(activeNounTypes[id].ajaxRequest), 1);
      if (suggs.length) callback(suggs, ajaxRequests);
    }
    returnArray.push.apply(
      returnArray,
      handleSuggs(
        activeNounTypes[id].suggest(x, x, completeAsyncSuggest), id));

    if(activeNounTypes[id].ajaxRequest)
      ajaxRequests.push(activeNounTypes[id].ajaxRequest);
  }

  callback(returnArray, ajaxRequests);
}

function handleSuggs(suggs, id) {
  if (!suggs && !suggs.length)
    return [];
  if (!Utils.isArray(suggs)) suggs = [suggs];
  for each (let s in suggs) s.nountypeId = id;
  return suggs;
}

function onmessage(event) {
  if (event.data) {
    //nounTypes = event.data.nounTypes;
    //dump('received '+nounTypes.length+' nountypes\n');
    //postMessage(nounTypes);
    detectNounType(event.data.input);
  }
}
