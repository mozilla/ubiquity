var EXPORTED_SYMBOLS = ["NLParserMaker"];

var NLParserMaker = function(parserVersion) {
  dump('loading parser version: '+parserVersion+"\n");

  var NLParser;
  if (parserVersion < 2 ) {
    Components.utils.import("resource://ubiquity/modules/parser/original/parser.js");
    Components.utils.import("resource://ubiquity/modules/parser/original/locale_en.js");
    Components.utils.import("resource://ubiquity/modules/parser/original/locale_jp.js");
    NLParser = NLParser1;
  } else {
    Components.utils.import("resource://ubiquity/modules/parser/new/namespace.js");
    NLParser = NLParser2;
  }
  return NLParser;
}