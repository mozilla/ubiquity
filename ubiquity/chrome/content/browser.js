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

  var cmdMan = new CommandManager(
    new CommandSource([cmdUtils, builtinCmds, PrefCommands],
                      msgService,
                      sandboxFactory),
    msgService
  );

  gUbiquity = new Ubiquity(
    document.getElementById("transparent-msg-panel"),
    document.getElementById("cmd-entry"),
    cmdMan
  );
}

function ubiquityTeardown()
{
}

window.addEventListener("load", ubiquitySetup, false);
window.addEventListener("unload", ubiquityTeardown, false);
