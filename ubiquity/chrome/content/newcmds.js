function makeSearchCommand(name, urlTemplate, icon) {
  var cmd = function(context, directObject, modifiers) {
    var urlString = urlTemplate.replace("{QUERY}", directObject);
    openUrlInBrowser(urlString);
  };

  cmd.icon = icon;

  cmd.preview = function(context, directObject, modifiers, pblock) {
    if (sel) {
      if (name == "Google") {
        setGooglePreview(directObject, pblock);
        pblock.innerHTML = ("Getting google results for <b>" +
                           escape(directObject) + "</b>...");
      }
      else if (name == "Google Maps") {
        setMapPreview(directObject, pblock);
        pblock.innerHTML = ("Getting map for <b>" +
                           escape(directObject) + "</b>...");
      }
      else {
        var content = ("Performs a " + name + " search for <b>" +
                  escape(directObject) + "</b>.");
        pblock.innerHTML = content;
      }
    }
  };

  cmd.DOType = arbText;
  cmd.DOName = "search term";
  cmd.modifiers = {};
  return cmd;
}

var cmd_google = makeSearchCommand(
  "Google",
  "http://www.google.com/search?q={QUERY}",
  "http://www.google.com/favicon.ico"
);

var cmd_imdb = makeSearchCommand(
  "IMDB",
  "http://www.imdb.com/find?s=all&q={QUERY}&x=0&y=0",
  "http://i.imdb.com/favicon.ico"
);

var cmd_map_it = makeSearchCommand(
  "Google Maps",
  "http://maps.google.com/?q={QUERY}",
  "http://www.google.com/favicon.ico"
);
