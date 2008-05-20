var gUbiquity = null;

function ubiquitySetup()
{
  var cmdUtils = new UriCodeSource(
    "chrome://ubiquity/content/cmdutils.js"
  );

  var builtinCmds = new UriCodeSource(
    "chrome://ubiquity/content/builtincmds.js"
  );

  var msgService = new AlertMessageService();

  var globals = {
    jQuery: jQuery,
    Application: Application,
    Components: Components,
    window: window,
    globals: {},
    displayMessage: function(msg, title, icon) {
      msgService.displayMessage(msg, title, icon);
    }
  };

  var sandboxFactory = new SandboxFactory(globals);

  var cmdSource = new CommandSource(
    [cmdUtils, builtinCmds, PrefCommands],
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
