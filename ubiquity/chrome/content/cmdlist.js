Components.utils.import("resource://ubiquity-modules/globals.js");

function onDocumentLoad() {
  var msgService = new AlertMessageService();
  var globals = makeBuiltinGlobals(msgService,
                                   UbiquityGlobals);
  var sandboxFactory = new SandboxFactory(globals);
  var codeSources = makeBuiltinCodeSources(UbiquityGlobals.japaneseMode);
  var cmdSource = new CommandSource(
    codeSources,
    msgService,
    sandboxFactory
  );

  // TODO: This won't immediately load commands from remote URI's!
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
}

$(document).ready(onDocumentLoad);
