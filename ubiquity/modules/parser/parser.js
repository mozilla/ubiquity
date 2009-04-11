var EXPORTED_SYMBOLS = ["NLParser"];

const USE_VERSION = 1;

var NLParser;
if (USE_VERSION == 1 ) {
  Components.utils.import("resource://ubiquity/modules/parser/original/parser.js");
  Components.utils.import("resource://ubiquity/modules/parser/original/locale_en.js");
  Components.utils.import("resource://ubiquity/modules/parser/original/locale_jp.js");
  NLParser = NLParser1;
} else {
  Components.utils.import("resource://ubiquity/modules/parser/tng/namespace.js");
  NLParser = NLParser2;
}