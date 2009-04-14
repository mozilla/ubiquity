var EXPORTED_SYMBOLS = ["NLParser"];

//let Application = Components.classes["@mozilla.org/fuel/application;1"]
//                  .getService(Components.interfaces.fuelIApplication);

//var PARSER_VERSION_PREF = "extensions.ubiquity.parserVersion";
//var USE_VERSION = Application.prefs.getValue(PARSER_VERSION_PREF, "");
var USE_VERSION = 1;

dump('loading parser version: '+USE_VERSION);

var NLParser;
if (USE_VERSION < 2 ) {
  Components.utils.import("resource://ubiquity/modules/parser/original/parser.js");
  Components.utils.import("resource://ubiquity/modules/parser/original/locale_en.js");
  Components.utils.import("resource://ubiquity/modules/parser/original/locale_jp.js");
  NLParser = NLParser1;
} else {
  Components.utils.import("resource://ubiquity/modules/parser/tng/namespace.js");
  NLParser = NLParser2;
}