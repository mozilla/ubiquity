Components.utils.import("resource://ubiquity-modules/globals.js");

function onDocumentLoad() {
  var msgService = new AlertMessageService();
  var globals = makeBuiltinGlobals(msgService,
                                   UbiquityGlobals);
  var sandboxFactory = new SandboxFactory(globals);
  var codeSources = makeBuiltinCodeSources(UbiquityGlobals.languageCode);
  var cmdSource = new CommandSource(
    codeSources,
    msgService,
    sandboxFactory
  );

  function updateCommands() {
    cmdSource.refresh();
    // Dynamically generate entries for undocumented commands.
    for (var i = 0; i < cmdSource.commandNames.length; i++) {
      var cmd = cmdSource.commandNames[i];
      var cmdElement = document.getElementById(cmd.id);

      if (cmdElement == null) {
        $(document.body).append(
          ('<div class="command" id="' + cmd.id + '">' +
           '<span class="name">' + cmd.name + '</span>')
        );
        cmdElement = document.getElementById(cmd.id);
      }

      if (cmd.icon && $(cmdElement).children(".icon").length == 0) {
        $(cmdElement).prepend('<img class="icon" src="' + cmd.icon + '"/> ');
      }
    }

    // TODO: Remove any entries that no longer exist.

    window.setTimeout(updateCommands, 1000);
  }

  updateCommands();

}

$(document).ready(onDocumentLoad);
