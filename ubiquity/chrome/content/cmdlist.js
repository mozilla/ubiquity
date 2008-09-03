Components.utils.import("resource://ubiquity-modules/globals.js");

function onDocumentLoad() {
  // TODO: This isn't implemented very well; we're essentially
  // re-creating an environment for commands and re-fetching all
  // command feeds from scratch ust so we can see what commands are
  // available, but we should really be able to get the browser
  // window's command manager and simply ask it.

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

  // Number of times we'll update the commands before we assume that
  // all command feeds have been retrieved.
  var timesLeftToUpdate = 10;
  // Amount of time in milliseconds that we wait between asking our
  // command source for commands again.
  var updateDelay = 2000;

  function updateCommands() {
    timesLeftToUpdate--;
    if (!timesLeftToUpdate)
      return;

    cmdSource.refresh();

    // Dynamically generate entries for undocumented commands.
    var cmdsChanged = false;
    var cmdList = $('#command-list');
    for (var i = 0; i < cmdSource.commandNames.length; i++) {
      var cmd = cmdSource.getCommand(cmdSource.commandNames[i].name);
      var cmdId = cmdSource.commandNames[i].id.replace(/ /g, "_");

      if (cmdList.find('#' + cmdId).length == 0) {
        cmdsChanged = true;
        cmdList.append(
          '<li class="command" id="' + cmdId + '">' +
           '<span class="name">' + cmd.name + '</span>' +
           '<span class="description"/>' +
           '<div class="light"><span class="author"/><span class="license"/></div>' +
           '<div class="homepage light"/>' +
           '<div class="help"/>' +
           '</li>'
        );

        var cmdElement = cmdList.find('#' + cmdId);

        if(cmd.icon) {
          cmdElement.css('list-style-image', "url('" + cmd.icon + "')");
        } else {
          cmdElement.css('list-style-type', 'none');
        }
        if(cmd.homepage) {
          cmdElement.find(".homepage").html(
            'View more information at <a href="' + cmd.homepage + '">' + cmd.homepage + '</a>.'
          );
        } else cmdElement.find(".homepage").empty();
		
        if(cmd.description) cmdElement.find(".description").html(cmd.description);
        else cmdElement.find(".description").empty();
		
        if(cmd.author) cmdElement.find(".author").html(formatCommandAuthor(cmd.author));
        else cmdElement.find(".author").empty();
		
        if(cmd.license) cmdElement.find(".license").html(' - licensed as ' + cmd.license);
        else cmdElement.find(".license").empty();
		
        if(cmd.help) cmdElement.find(".help").html(cmd.help);
        else cmdElement.find(".help").empty();

      }
    }

    // TODO: Remove any entries that no longer exist.

    if (cmdsChanged)
      sortCommandsBy(sortKey);

    window.setTimeout(updateCommands, updateDelay);
  }

  var sortKey = $("#sortby").val();

  $("#sortby").change(function() {
    sortKey = $("#sortby").val();
    sortCommandsBy(sortKey);
  });

  updateCommands();
}

function formatCommandAuthor(authorData) {
  if(!authorData) return "";

  if(typeof authorData == "string") return authorData;

  var authorMarkup = '';
  if(authorData.name && !authorData.email) {
    authorMarkup += authorData.name + " ";
  } else if(authorData.name && authorData.email) {
    authorMarkup += '<a href="mailto:' + authorData.email + '">' +
      authorData.name +
      '</a> ';
  } else if(!authorData.name && authorData.email) {
    authorMarkup += '<a href="mailto:' + authorData.email + '">' +
      authorData.email +
      '</a> ';
  }

  if(authorData.homepage) {
    authorMarkup += '[<a href="' + authorData.homepage + '">Homepage</a>]';
  }

  if(authorMarkup.length == 0)
    return '';

  return 'by ' + authorMarkup;
}

function sortCommandsBy(key) {
  var cmdList = $("#command-list");
  var allCommands = cmdList.find(".command").get();

  allCommands.sort(function(a, b) {
    var aKey = $(a).find(key).text().toLowerCase();
    var bKey = $(b).find(key).text().toLowerCase();

    // ensure empty fields get given lower priority
    if(aKey.length > 0  && bKey.length == 0)
      return -1;
    if(aKey.length == 0  && bKey.length > 0)
      return 1;

    if(aKey < bKey)
      return -1;
    if(aKey > bKey)
      return 1;

    return 0;
  });

  $.each(allCommands, function(cmdIndex, cmd) {
    cmdList.append(cmd);
  });
}

$(document).ready(onDocumentLoad);
