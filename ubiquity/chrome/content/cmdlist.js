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
      // it thinks cmd only has .id, .name, and .icon?
      if (cmdElement == null) {
        $(document.body).append(
          ('<div class="command" id="' + cmd.id + '">' +
           '<span class="icon"/>' +
           '<span class="name">' + cmd.name + '</span></div>')
	);


        cmdElement = document.getElementById(cmd.id);
      }

      if (cmd.icon && $(cmdElement).find(".icon img").length == 0) {
        $(cmdElement).find(".icon").append('<img src="' + cmd.icon + '"/>');
      }

      if (cmd.description && $(cmdElement).find(".description").length == 0) {
	$(cmdElement).append('<div class="description">' + cmd.description + '</div>');
      }

      if (cmd.help && $(cmdElement).find(".help").length == 0) {
	$(cmdElement).append('<div class="help"><p>' + cmd.help + '</p></div>');
      }
    }

    // TODO: Remove any entries that no longer exist.

    window.setTimeout(updateCommands, 1000);
  }

  updateCommands();

}

$(document).ready(onDocumentLoad);
