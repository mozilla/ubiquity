var gUbiquity = null;
Components.utils.import("resource://ubiquity-modules/globals.js");

function checkLanguagePreference() {
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);
  if (prefs.getCharPref("extensions.ubiquity.language") == "jp")
    UbiquityGlobals.japaneseMode = true;
  else
    UbiquityGlobals.japaneseMode = false;
}

function ubiquitySetup()
{

  checkLanguagePreference();

  var previewIframe = document.getElementById("cmd-preview");
  var previewBlock = previewIframe.contentDocument.getElementById("preview");

  function onDomChange(aEvent) {
    previewIframe.height = previewIframe.contentDocument.height;
    previewIframe.width = previewBlock.scrollWidth;
  }

  previewIframe.contentDocument.addEventListener("DOMSubtreeModified",
                                                 onDomChange,
                                                 false);

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
    Template: TrimPath,
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
    new LocalUriCodeSource("chrome://ubiquity/content/nlparser/nounTypeBase.js")
  ];
  if (UbiquityGlobals.japaneseMode) {
    codeSources = codeSources.concat([
      new LocalUriCodeSource("chrome://ubiquity/content/jp-nlparser/japaneseNounTypes.js"),
      new LocalUriCodeSource("chrome://ubiquity/content/jp-nlparser/japaneseCmdsUtf8.js")
				      ]);
  } else {
    codeSources = codeSources.concat([
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

  var cmdSource = new CommandSource(
    codeSources,
    msgService,
    sandboxFactory
  );

  var cmdMan = new CommandManager(cmdSource, msgService);

  var popupMenu = UbiquityPopupMenu(
    document.getElementById("ubiquity-menupopup"),
    makeDefaultCommandSuggester(cmdMan)
  );

  gUbiquity = new Ubiquity(
    document.getElementById("transparent-msg-panel"),
    document.getElementById("cmd-entry"),
    cmdMan,
    previewBlock
  );
  if (UbiquityGlobals.japaneseMode)
    gUbiquity.setLocalizedDefaults("jp");
  cmdSource.refresh();
}

function ubiquityTeardown()
{
  /* TODO: Remove event listeners. */
}

function ubiquityKeydown(aEvent)
{

  const KEYCODE_PREF ="extensions.ubiquity.keycode";
  const KEYMODIFIER_PREF = "extensions.ubiquity.keymodifier";
  var UBIQUITY_KEYMODIFIER = null;
  var UBIQUITY_KEYCODE = null;
  
  //Default keys are different for diff platforms
  // Windows Vista, XP, 2000 & NT: CTRL+SPACE
  // Mac, Linux, Others : ALT+SPACE
  var defaultKeyModifier = "ALT";
  var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
                             .getService(Components.interfaces.nsIXULRuntime);  
  if(xulRuntime.OS == "WINNT"){
    defaultKeyModifier = "CTRL";
  }
  
  // If we're running in the development harness, don't use
  // the normal keycode, b/c the normal keycode won't propagate
  // down to the current tab.
  if (window.location != "chrome://browser/content/browser.xul"){
    UBIQUITY_KEYCODE = 68; // The character 'd'
    UBIQUITY_KEYMODIFIER = "ALT";
  }else{
    UBIQUITY_KEYCODE = Application.prefs.getValue(KEYCODE_PREF, 32); //The space character
    UBIQUITY_KEYMODIFIER = Application.prefs.getValue(KEYMODIFIER_PREF, defaultKeyModifier);
  }

  //Open Ubiquity if the key pressed matches the shortcut key
  if (aEvent.keyCode == UBIQUITY_KEYCODE) {
    if((UBIQUITY_KEYMODIFIER == "SHIFT" && aEvent.shiftKey)
        || (UBIQUITY_KEYMODIFIER == "CTRL" && aEvent.ctrlKey)
        || (UBIQUITY_KEYMODIFIER == "ALT" && aEvent.altKey)
        || (UBIQUITY_KEYMODIFIER == "META" && aEvent.metaKey)){
    	    gUbiquity.openWindow();
 	    aEvent.preventDefault();
    }
  }
}

window.addEventListener("load", ubiquitySetup, false);
window.addEventListener("unload", ubiquityTeardown, false);
window.addEventListener("keydown", ubiquityKeydown, true);
