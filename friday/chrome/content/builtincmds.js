function cmd_google(context)
{
    var sel = getTextSelection(context);
    openSearchResultsInBrowser(
        "http://www.google.com/search?q={QUERY}",
        sel
    );
}
cmd_google.icon = "http://www.google.com/favicon.ico";

function cmd_imdb(context)
{
    var sel = getTextSelection(context);
    openSearchResultsInBrowser(
        "http://www.imdb.com/find?s=all&q={QUERY}&x=0&y=0",
        sel
    );
}
cmd_imdb.icon = "http://i.imdb.com/favicon.ico";

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
