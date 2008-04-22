function cmd_google(context)
{
    sel = get_text_selection(context);
    go_to_url("http://www.google.com/search?q={QUERY}", sel);
}
cmd_google.icon = "http://www.google.com/favicon.ico";

function cmd_imdb(context)
{
    sel = get_text_selection(context);
    go_to_url("http://www.imdb.com/find?s=all&q={QUERY}&x=0&y=0", sel);
}
cmd_imdb.icon = "http://i.imdb.com/favicon.ico";
