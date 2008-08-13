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

function makeBuiltinCodeSources(languageCode) {
  var codeSources = [
    new LocalUriCodeSource("chrome://ubiquity/content/utils.js"),
    new LocalUriCodeSource("chrome://ubiquity/content/cmdutils.js")
  ];
  dump( "Language code is " + languageCode + "\n");
  if (languageCode == "jp") {
    codeSources = codeSources.concat([
      new LocalUriCodeSource("chrome://ubiquity/content/nlparser/jp/nountypes.js"),
      new LocalUriCodeSource("chrome://ubiquity/content/nlparser/jp/builtincmds.js")
				      ]);
  } else if (languageCode == "en") {
    codeSources = codeSources.concat([
      new LocalUriCodeSource("chrome://ubiquity/content/date.js"),
      new LocalUriCodeSource("chrome://ubiquity/content/nlparser/en/nountypes.js"),
      new LocalUriCodeSource("chrome://ubiquity/content/builtincmds.js"),
      new LocalUriCodeSource("chrome://ubiquity/content/tagging_cmds.js"),
      PrefCommands,
      //new LinkRelCodeSource(),
      new BookmarksCodeSource("ubiquity")
				     ]);
  }
  codeSources = codeSources.concat([
    new LocalUriCodeSource("chrome://ubiquity/content/final.js")
				    ]);
  return codeSources;
}
