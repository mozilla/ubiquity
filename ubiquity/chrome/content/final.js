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

if (window.location == "chrome://browser/content/browser.xul") {
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

  // Configure all functions starting with "windowOpen_" to be called
  // whenever a browser window is opened.
  callRunOnceFunctions(windowGlobals, "windowOpen_");

  // Remove any old page-load event listeners.
  if (windowGlobals._pageLoadFuncs)
    for (var i = 0; i < windowGlobals._pageLoadFuncs.length; i++)
      windowGlobals._pageLoadFuncs[i].remove();
  windowGlobals._pageLoadFuncs = [];

  // Configure all functions starting with "pageLoad_" to be called
  // whenever a page is loaded.
  var funcs = findFunctionsWithPrefix("pageLoad_");
  for (i = 0; i < funcs.length; i++)
    onPageLoad(funcs[i]);
} else {
  // We're being included in an HTML page.  Yes, this is a hack, but
  // this solution is temporary anyways.

  function onDocumentLoad() {
    // Dynamically generate entries for undocumented commands.
    for (name in window)
      if (name.indexOf(CMD_PREFIX) == 0) {
        var cmd = window[name];
        var cmdName = name.substr(CMD_PREFIX.length);
        var cmdQuery = $("#" + name);

        if (cmdQuery.length == 0) {
          cmdName = cmdName.replace(/_/g, " ");
          $(document.body).append(
            ('<div class="command" id="' + name + '">' +
             '<span class="name">' + cmdName + '</span>')
          );
          cmdQuery = $("#" + name);
        }

        if (cmd.icon && cmdQuery.children(".icon").length == 0) {
          cmdQuery.prepend('<img class="icon" src="' + cmd.icon + '"/> ');
        }
      }
  }

  $(document).ready(onDocumentLoad);
}
