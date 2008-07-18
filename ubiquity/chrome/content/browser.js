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

function detectOS(){
  var nav = Application.activeWindow
                       .activeTab
                       .document
                       .defaultView
                       .wrappedJSObject
                       .navigator;
  
  var OSName="Unknown OS";
  if (nav.appVersion.indexOf("Win")!=-1) OSName="Windows";
  if (nav.appVersion.indexOf("Mac")!=-1) OSName="Mac";
  if (nav.appVersion.indexOf("X11")!=-1) OSName="UNIX";
  if (nav.appVersion.indexOf("Linux")!=-1) OSName="Linux";
  
  return OSName;
}

function ubiquityKeydown(aEvent)
{
  // Key to invoke ubiquity is ctrl+space on Window, and alt+space on
  // Mac, and everything else.
  // TODO: Is this the best behavior for Linux?
  if( detectOS() == "Windows" ) var modifierKey = aEvent.ctrlKey;
  else var modifierKey = aEvent.altKey;
  
  if (aEvent.keyCode == 32 && modifierKey) {
    gUbiquity.openWindow();
    aEvent.stopPropagation();
  }
}

window.addEventListener("load", ubiquitySetup, false);
window.addEventListener("unload", ubiquityTeardown, false);
window.addEventListener("keydown", ubiquityKeydown, false);
