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
      var cmdQuery = $("#" + cmd.id);

      if (cmdQuery.length == 0) {
        $(document.body).append(
          ('<div class="command" id="' + cmd.id + '">' +
           '<span class="name">' + cmd.name + '</span>')
        );
        cmdQuery = $("#" + cmd.id);
      }

      if (cmd.icon && cmdQuery.children(".icon").length == 0) {
        cmdQuery.prepend('<img class="icon" src="' + cmd.icon + '"/> ');
      }
    }

    // TODO: Remove any entries that no longer exist.

    window.setTimeout(updateCommands, 1000);
  }

  updateCommands();
}

$(document).ready(onDocumentLoad);
