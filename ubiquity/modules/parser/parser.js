var EXPORTED_SYMBOLS = ["NLParserMaker"];

function NLParserMaker(parserVersion) (
  Components.utils.import(
    (parserVersion === 2
     ? "resource://ubiquity/modules/parser/new/namespace.js"
     : "resource://ubiquity/modules/parser/original/parser.js"),
    null)
  ["NLParser" + parserVersion]);
