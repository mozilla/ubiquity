var gFriday = null;

function fridaySetup()
{
  var cmdUtils = new UriCodeSource(
    "chrome://friday/content/cmdutils.js"
  );

  var builtinCmds = new UriCodeSource(
    "chrome://friday/content/builtincmds.js"
  );

  var msgService = new AlertMessageService();

  var globals = {
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

  gFriday = new Friday(
    document.getElementById("transparent-msg-panel"),
    document.getElementById("cmd-entry"),
    cmdMan
  );
}

function fridayTeardown()
{
}

window.addEventListener("load", fridaySetup, false);
window.addEventListener("unload", fridayTeardown, false);
