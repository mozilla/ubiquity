var EXPORTED_SYMBOLS = ["NLParserMaker"];

const Cu = Components.utils;

function NLParserMaker(parserVersion) {
  var jsm = {};
  if (parserVersion < 2) {
    Cu.import("resource://ubiquity/modules/parser/original/parser.js", jsm);
    Cu.import("resource://ubiquity/modules/parser/original/locale_en.js", jsm);
    jsm.NLParser1.registerPluginForLanguage("en", jsm.EnParser);
    return jsm.NLParser1;
  }
  Cu.import("resource://ubiquity/modules/parser/new/namespace.js", jsm);
  return jsm.NLParser2;
}
