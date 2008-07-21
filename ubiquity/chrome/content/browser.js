var gUbiquity = null;

function ubiquitySetup()
{
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
    new LocalUriCodeSource("chrome://ubiquity/content/cmdutils.js"),
    new LocalUriCodeSource("chrome://ubiquity/content/builtincmds.js"),
    PrefCommands,
    new BookmarksCodeSource("ubiquity"),
    new LocalUriCodeSource("chrome://ubiquity/content/final.js")
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
  // Key to invoke ubiquity is ctrl+space on Window, and alt+space on
  // Mac, and everything else.

  // TODO: Fix the code below, because we actually accept ctrl+space
  // *and* alt+space, which can be confusing, esp. it works but is
  // buggy on mac.

  if (aEvent.keyCode == 32 && (aEvent.ctrlKey || aEvent.altKey)) {
    gUbiquity.openWindow();
    aEvent.stopPropagation();
  }
}

window.addEventListener("load", ubiquitySetup, false);
window.addEventListener("unload", ubiquityTeardown, false);
window.addEventListener("keydown", ubiquityKeydown, false);
