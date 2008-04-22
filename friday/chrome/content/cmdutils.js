function url(spec) {
    var classObj = Components.classes["@mozilla.org/network/io-service;1"];
    var ios = classObj.getService(Components.interfaces.nsIIOService);
    return ios.newURI(spec, null, null);
}

function go_to_url(url_template, query)
{
    var urlstr = url_template.replace("{QUERY}", query);

    var tab = Application.activeWindow.open(url(urlstr));
    tab.focus();
}

function get_text_selection(context)
{
    var focused = context.focusedElement;
    var retval = "";

    if (focused) {
        if (focused.selectionStart != focused.selectionEnd)
            retval = focused.value.substring(focused.selectionStart,
                                             focused.selectionEnd);
    } else {
        var sel = context.focusedWindow.getSelection();
        if (sel.rangeCount >= 1) {
            retval = sel.toString();
        }
    }
    return retval;
}
