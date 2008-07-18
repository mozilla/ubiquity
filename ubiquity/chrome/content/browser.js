var gUbiquity = null;

function ubiquitySetup()
{
  var cmdUtils = new LocalUriCodeSource(
    "chrome://ubiquity/content/cmdutils.js"
  );

  var builtinCmds = new LocalUriCodeSource(
    "chrome://ubiquity/content/builtincmds.js"
  );

  var finalProcessing = new LocalUriCodeSource(
    "chrome://ubiquity/content/final.js"
  );

  var msgService = new CompositeMessageService();

  msgService.add(new AlertMessageService());
  msgService.add(new ErrorConsoleMessageService());

  var globalSpace = {};

  Components.utils.import("resource://ubiquity-modules/globals.js",
                          globalSpace);

  var globals = {
    XPathResult: XPathResult,
    XMLHttpRequest: XMLHttpRequest,
    jQuery: jQuery,
    Application: Application,
    Components: Components,
    window: window,
    windowGlobals: {},
    globals: globalSpace.UbiquityGlobals,
    displayMessage: function() {
      msgService.displayMessage.apply(msgService, arguments);
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
    cmdMan,
    document.getElementById("cmd-preview")
  );
  cmdSource.refresh();
}

function ubiquityTeardown()
{
}

function ubiquityKeydown(aEvent)
{
  // Key to invoke ubiquity is alt+space on Mac, ctrl+space on
  // Windows; either one actually works, though this makes
  // things buggy on the Mac b/c it doesn't allow the user to
  // use ctrl+space to activate context menus.
  if (aEvent.keyCode == 32 && (aEvent.altKey || aEvent.ctrlKey)) {
    gUbiquity.openWindow();
    aEvent.stopPropagation();
  }
}

window.addEventListener("load", ubiquitySetup, false);
window.addEventListener("unload", ubiquityTeardown, false);
window.addEventListener("keydown", ubiquityKeydown, false);
