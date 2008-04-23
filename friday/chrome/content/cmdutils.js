function url(spec) {
    var classObj = Components.classes["@mozilla.org/network/io-service;1"];
    var ios = classObj.getService(Components.interfaces.nsIIOService);
    return ios.newURI(spec, null, null);
}

function openUrlInBrowser(urlString)
{
    var tab = Application.activeWindow.open(url(urlString));
    tab.focus();
}

function getTextSelection(context)
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
