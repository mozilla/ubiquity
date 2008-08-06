// This script is loaded into a Ubiquity sandbox once all other
// code has been injected into it, so that it can perform any
// necessary post-processing and other finalization on the
// contents of the sandbox.

// Assign a default command icon for anything that doesn't explicitly
// have an icon set.

var CMD_PREFIX = "cmd_";
var DEFAULT_CMD_ICON = "";

for (name in this)
  if (name.indexOf(CMD_PREFIX) == 0) {
    var cmd = this[name];

    if (!cmd.icon)
      cmd.icon = DEFAULT_CMD_ICON;
  }

function startup_setBasicPreferences() {
  // Allow JS chrome errors to show up in the error console.
  Application.prefs.setValue("javascript.options.showInConsole", true);
}

function startup_openUbiquityWelcomePage()
{
  const VERSION_PREF ="extensions.ubiquity.lastversion";

  // Compare the version in our preferences from our version in the
  // install.rdf.
  var ext = Application.extensions.get("ubiquity@labs.mozilla.com");
  var currVersion = Application.prefs.getValue(VERSION_PREF, "firstrun");
  if (currVersion != ext.version) {
    Application.prefs.setValue(VERSION_PREF, ext.version);
    cmd_help();
  }
}

if (window.location == "chrome://browser/content/browser.xul") {
  // We're being loaded in the browser.

  function findFunctionsWithPrefix(prefix) {
    var funcs = [];

    for (name in this)
      if (name.indexOf(prefix) == 0 && typeof(this[name]) == "function")
        funcs.push(this[name]);

    return funcs;
  }

  function callRunOnceFunctions(scopeObj, prefix) {
    if (!scopeObj.hasRunOnce) {
      scopeObj.hasRunOnce = true;
      var funcs = findFunctionsWithPrefix(prefix);
      for (var i = 0; i < funcs.length; i++)
        funcs[i]();
    }
  }

  // Configure all functions starting with "startup_" to be called on
  // Firefox startup.
  callRunOnceFunctions(globals, "startup_");

  // Remove any old page-load event listeners.
  if (windowGlobals._pageLoadFuncs)
    for (var i = 0; i < windowGlobals._pageLoadFuncs.length; i++)
      windowGlobals._pageLoadFuncs[i].remove();
  windowGlobals._pageLoadFuncs = [];

  // Configure all functions starting with "pageLoad_" to be called
  // whenever a page is loaded.
  var funcs = findFunctionsWithPrefix("pageLoad_");
  for (i = 0; i < funcs.length; i++)
    CmdUtils.onPageLoad(funcs[i]);
}
