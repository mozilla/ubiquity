var EXPORTED_SYMBOLS = ["NLParser"];

var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefService);
prefs = prefs.getBranch("extensions.ubiquity.");
var USE_VERSION = prefs.getIntPref("parserVersion");
//var USE_VERSION = 1;

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