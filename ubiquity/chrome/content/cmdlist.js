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
      var cmd = cmdSource.getCommand(cmdSource.commandNames[i].name);
      var cmdId = cmdSource.commandNames[i].id;

      if (document.getElementById(cmdId) == null) {
        $(document.body).append(
          ('<div class="command" id="' + cmdId + '">' +
           '<span class="icon"/>' +
           '<span class="name">' + cmd.name + '</span>' +
           '<span class="homepage"/>' +
           '<span class="description"/>' +
           '<div class="light"><span class="author"/><span class="license"/></div>' +
           '<div class="help"/>' +
           '</div>')
        );
      }
      
      cmdElement = $(document.getElementById(cmdId));
      
      if(cmd.homepage) {
        cmdElement.find(".homepage").html(
          '[<a href="' + cmd.homepage + '">Homepage</a>]'
        );
      }
      if(cmd.description) {
        cmdElement.find(".description").html(cmd.description);
      }
      if(cmd.author) {
        cmdElement.find(".author").html(formatCommandAuthor(cmd.author));
      }
      if(cmd.license) {
        cmdElement.find(".license").html(' - licensed as ' + cmd.license);
      }
      if(cmd.help) {
        cmdElement.find(".help").html(cmd.help);
      }
      
      if (cmd.icon && cmdElement.find(".icon img").length == 0) {
        cmdElement.find(".icon").append('<img src="' + cmd.icon + '"/>');
      }
    }

    // TODO: Remove any entries that no longer exist.

    sortCommandsBy(sortKey);
    
    window.setTimeout(updateCommands, 1000);
  }

  var sortKey = $("#sortby").val();

  updateCommands();

  $("#sortby").change(function() {
    sortKey = $("#sortby").val();
    sortCommandsBy(sortKey);
  });

}

function formatCommandAuthor(authorData) {
  if(!authorData)
    return "";
  
  if(typeof authorData == "string")
    return authorData;
  
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
  var body = $("body");
  var allCommands = $(".command").get();
  
  allCommands.sort(function(a, b) {
    var aKey = $(a).find(key).text().toLowerCase();
    var bKey = $(b).find(key).text().toLowerCase();
    
    // ensure empty fields get given lower priority
    if(aKey.length > 0  && bKey.length == 0)
      return -1
    if(aKey.length == 0  && bKey.length > 0)
      return 1
    
    if(aKey < bKey)
      return -1;
    if(aKey > bKey)
      return 1;
    
    return 0;
  })
  
  $.each(allCommands, function(cmdIndex, cmd) {
    body.append(cmd);
  });
}

$(document).ready(onDocumentLoad);
