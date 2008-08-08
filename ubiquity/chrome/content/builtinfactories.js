function makeBuiltinGlobals(msgService, ubiquityGlobals) {
  var globals = {
    XPathResult: XPathResult,
    XMLHttpRequest: XMLHttpRequest,
    jQuery: jQuery,
    Template: TrimPath,
    Application: Application,
    Components: Components,
    window: window,
    windowGlobals: {},
    globals: ubiquityGlobals,
    displayMessage: function() {
      msgService.displayMessage.apply(msgService, arguments);
    }
  };

  return globals;
}

function makeBuiltinCodeSources(isJapaneseMode) {
  var codeSources = [
    new LocalUriCodeSource("chrome://ubiquity/content/utils.js"),
    new LocalUriCodeSource("chrome://ubiquity/content/cmdutils.js"),
    new LocalUriCodeSource("chrome://ubiquity/content/nlparser/nounTypeBase.js")
  ];
  if (isJapaneseMode) {
    codeSources = codeSources.concat([
      new LocalUriCodeSource("chrome://ubiquity/content/jp-nlparser/japaneseNounTypes.js"),
      new LocalUriCodeSource("chrome://ubiquity/content/jp-nlparser/japaneseCmdsUtf8.js")
				      ]);
  } else {
    codeSources = codeSources.concat([
      new LocalUriCodeSource("chrome://ubiquity/content/date.js"),
      new LocalUriCodeSource("chrome://ubiquity/content/nlparser/nountypes.js"),
      new LocalUriCodeSource("chrome://ubiquity/content/builtincmds.js"),
      new LocalUriCodeSource("chrome://ubiquity/content/tagging_cmds.js"),
      PrefCommands,
      new BookmarksCodeSource("ubiquity")
				     ]);
  }
  codeSources = codeSources.concat([
    new LocalUriCodeSource("chrome://ubiquity/content/final.js")
				    ]);
  return codeSources;
}
