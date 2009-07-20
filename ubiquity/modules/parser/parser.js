var EXPORTED_SYMBOLS = ["NLParserMaker"];

const Cu = Components.utils;

function NLParserMaker(parserVersion) {
  if (parserVersion === 2)
    return (
      Cu.import("resource://ubiquity/modules/parser/new/namespace.js", null)
      .NLParser2);

  var {NLParser1} = Cu.import(
    "resource://ubiquity/modules/parser/original/parser.js", null);
  var {EnParser} = Cu.import(
    "resource://ubiquity/modules/parser/original/locale_en.js", null);
  NLParser1.registerPluginForLanguage("en", EnParser);
  NLParser1.registerPluginForLanguage("$", {__proto__: EnParser});
  return NLParser1;
}
