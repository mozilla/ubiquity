function makeSearchCommand(urlTemplate, icon)
{
    var cmd = function(context) {
        var sel = getTextSelection(context);
        var urlString = urlTemplate.replace("{QUERY}", sel);

        openUrlInBrowser(urlString);
    };
    cmd.icon = icon;
    return cmd;
}

var cmd_google = makeSearchCommand(
    "http://www.google.com/search?q={QUERY}",
    "http://www.google.com/favicon.ico"
);

var cmd_imdb = makeSearchCommand(
    "http://www.imdb.com/find?s=all&q={QUERY}&x=0&y=0",
    "http://i.imdb.com/favicon.ico"
);

function cmd_bold(context)
{
    var doc = context.focusedWindow.document;
    if (doc.designMode == "on")
    {
        doc.execCommand("bold", false, null);
    } else {
        displayMessage("You're not in a rich text editing field.");
    }
}

function cmd_editor(context)
{
    openUrlInBrowser("chrome://friday/content/editor.html");
}
