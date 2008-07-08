var gUbiquity = null;

function ubiquitySetup()
{
  var cmdUtils = new UriCodeSource(
    "chrome://ubiquity/content/cmdutils.js"
  );

  var builtinCmds = new UriCodeSource(
    "chrome://ubiquity/content/builtincmds.js"
  );

  var finalProcessing = new UriCodeSource(
    "chrome://ubiquity/content/final.js"
  );

  var msgService = new AlertMessageService();

  var globalSpace = {};

  Components.utils.import("resource://ubiquity-modules/globals.js",
                          globalSpace);

  var globals = {
    jQuery: jQuery,
    Application: Application,
    Components: Components,
    window: window,
    windowGlobals: {},
    globals: globalSpace.UbiquityGlobals,
    displayMessage: function(msg, title, icon) {
      msgService.displayMessage(msg, title, icon);
    }
  };

  var sandboxFactory = new SandboxFactory(globals);

  var codeSources = [
    cmdUtils,
    builtinCmds,
    PrefCommands,
    finalProcessing
  ];

  var cmdSource = new CommandSource(
    codeSources,
    msgService,
    sandboxFactory
  );

  var cmdMan = new CommandManager(cmdSource, msgService);

  gUbiquity = new Ubiquity(
    document.getElementById("transparent-msg-panel"),
    document.getElementById("cmd-entry"),
    cmdMan
  );
  cmdSource.refresh();
}

function ubiquityTeardown()
{
}

window.addEventListener("load", ubiquitySetup, false);
window.addEventListener("unload", ubiquityTeardown, false);
