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

function findGmailTab()
{
    var window = Application.activeWindow;

    for (var i = 0; i < window.tabs.length; i++) {
        var tab = window.tabs[i];
        var location = String(tab.document.location);
        if (location.indexOf("://mail.google.com") != -1) {
            return tab;
        }
    }
    return null;
}

function getSelectedHtml(context)
{
    var sel = context.focusedWindow.getSelection();
    var html = null;

    if (sel.rangeCount >= 1) {
        var html = sel.getRangeAt(0).cloneContents();
        var newNode = context.focusedWindow.document.createElement("p");
        newNode.appendChild(html);
        return newNode.innerHTML;
    }
    return null;
}

function cmd_email(context)
{
    var document = context.focusedWindow.document;
    var title = document.title;
    var location = document.location;
    var gmailTab = findGmailTab();
    var html = getSelectedHtml(context);

    if (html) {
        html = "<p>From the page <a href=\""+location+"\">" + title + "</a>:</p>" + html;
    } else {
        displayMessage("No selected HTML!");
        return;
    }

    if (gmailTab) {
        var console = gmailTab.document.defaultView.wrappedJSObject.console;
        var gmonkey = gmailTab.document.defaultView.wrappedJSObject.gmonkey;

        var continuer = function() {
            var gmail = gmonkey.get("1");
            var sidebar = gmail.getNavPaneElement();
            var composeMail = sidebar.getElementsByTagName("span")[0];
            var event = composeMail.ownerDocument.createEvent("Events");
            event.initEvent("click", true, false);
            composeMail.dispatchEvent(event);
            var active = gmail.getActiveViewElement();
            var subject = active.getElementsByTagName("input")[0];
            subject.value = "'"+title+"'";
            var iframe = active.getElementsByTagName("iframe")[0];
            iframe.contentDocument.execCommand("insertHTML", false, html);
            gmailTab.focus();
        };

        gmonkey.load("1", safeWrapper(continuer));
    } else {
        displayMessage("Gmail must be open in a tab.");
    }
}

function cmd_highlight(context)
{
    var sel = context.focusedWindow.getSelection();
    var document = context.focusedWindow.document;

    if (sel.rangeCount >= 1) {
        var range = sel.getRangeAt(0);
        var newNode = document.createElement("span");
        newNode.style.background = "yellow";
        range.surroundContents(newNode);
    }
}

function cmd_to_rich_text(context)
{
    var html = getTextSelection(context);

    if (html) {
        var doc = context.focusedWindow.document;
        if (doc.designMode == "on")
        {
            doc.execCommand("insertHTML", false, html);
        } else {
            displayMessage("You're not in a rich text editing field.");
        }
    }
}

function cmd_to_html(context)
{
    var html = getSelectedHtml(context);

    if (html) {
        var doc = context.focusedWindow.document;
        if (doc.designMode == "on")
        {
            html = html.replace(/&/g, "&amp;");
            html = html.replace(/>/g, "&gt;");
            html = html.replace(/</g, "&lt;");
            doc.execCommand("insertHTML", false, html);
        } else {
            displayMessage("You're not in a rich text editing field.");
        }
    }
}
