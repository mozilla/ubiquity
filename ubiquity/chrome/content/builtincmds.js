function makeSearchCommand(urlTemplate, icon) {
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

var cmd_open_map = makeSearchCommand(
  "http://maps.google.com/?q={QUERY}",
  "http://www.google.com/favicon.ico"
);

function cmd_bold(context) {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("bold", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}

function cmd_editor(context) {
  openUrlInBrowser("chrome://ubiquity/content/editor.html");
}

function findGmailTab() {
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

function getSelectedHtml(context) {
  var sel = context.focusedWindow.getSelection();

  if (sel.rangeCount >= 1) {
    var html = sel.getRangeAt(0).cloneContents();
    var newNode = context.focusedWindow.document.createElement("p");
    newNode.appendChild(html);
    return newNode.innerHTML;
  }

  return null;
}

function cmd_email(context) {
  var document = context.focusedWindow.document;
  var title = document.title;
  var location = document.location;
  var gmailTab = findGmailTab();
  var html = getSelectedHtml(context);

  if (html)
    html = ("<p>From the page <a href=\"" + location +
            "\">" + title + "</a>:</p>" + html);
  else {
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
  } else
    displayMessage("Gmail must be open in a tab.");
}

function cmd_highlight(context) {
  var sel = context.focusedWindow.getSelection();
  var document = context.focusedWindow.document;

  if (sel.rangeCount >= 1) {
    var range = sel.getRangeAt(0);
    var newNode = document.createElement("span");
    newNode.style.background = "yellow";
    range.surroundContents(newNode);
  }
}

function cmd_to_rich_text(context) {
  var html = getTextSelection(context);

  if (html) {
    var doc = context.focusedWindow.document;
    if (doc.designMode == "on")
      doc.execCommand("insertHTML", false, html);
    else
      displayMessage("You're not in a rich text editing field.");
  }
}

function cmd_to_html(context) {
  var html = getSelectedHtml(context);

  if (html) {
    var doc = context.focusedWindow.document;
    if (doc.designMode == "on") {
      html = html.replace(/&/g, "&amp;");
      html = html.replace(/>/g, "&gt;");
      html = html.replace(/</g, "&lt;");
      doc.execCommand("insertHTML", false, html);
    } else
      displayMessage("You're not in a rich text editing field.");
  }
}

function cmd_link_to_wikipedia(context) {
  var text = getTextSelection(context);

  if (text) {
    var wikiText = text.replace(/ /g, "_");

    var html = ("<a href=\"http://en.wikipedia.org/wiki/" +
                + "Special:Search/" + wikiText +
                "\">" + text + "</a>");

    var doc = context.focusedWindow.document;
    if (doc.designMode == "on")
      doc.execCommand("insertHTML", false, html);
    else
      displayMessage("You're not in a rich text editing field.");
  }
}

function cmd_signature(context) {
  setTextSelection( "-- aza | ɐzɐ --", context );
}

function cmd_swedish(context) {
  var URL = "http://www.cs.utexas.edu/users/jbc/bork/bork.cgi?";
  var params = "type=chef&input=" + getTextSelection(context);

  ajaxGet(URL + params, function(data) {
    setTextSelection(data, context);
  });
}

function calculate(expr) {
  var context = window.context;
  var result = eval(expr);
  setTextSelection(result, context);
}

function cmd_calculate(context) {
  window.context = context;
  useSelectionOrPrompt("Enter expression:", calculate);
}
cmd_calculate.icon = "http://humanized.com/favicon.ico";

function cmd_map(context) {
  var apiKey = "ABQIAAAAzr2EBOXUKnm_jVnk0OJI7xSsTL4WIgxhMZ0ZK_kHjwHeQuOD4xQJpBVbSrqNn69S6DOTv203MQ5ufA";

  var geocodeUrl = "http://maps.google.com/maps/geo?key={key}&q={query}&output=csv";
  var query = getTextSelection(context);

  geocodeUrl = geocodeUrl.replace( /{key}/, apiKey );
  geocodeUrl = geocodeUrl.replace( /{query}/, escape(query) );

  var mapUrl = "http://maps.google.com/staticmap?";
  mapUrl += "center={point}&zoom=14&size=512x256&maptype=mobile&markers={point},red&key={key}";
  mapUrl = mapUrl.replace( /{key}/, apiKey );

  ajaxGet( geocodeUrl, function(data) {
    data = data.split(",");
    var point = data[2] + "," + data[3];

    var src = mapUrl.replace( /{point}/g, point );
    var imgHtml = "<img src='{src}'/>".replace( /{src}/, src );

    setTextSelection( query + "<br/>" + imgHtml, context );
  });
};

function cmd_inject_jquery(context) {
  injectJavascript( "http://code.jquery.com/jquery-latest.pack.js",
                    context );
}

function cmd_fade_page(context) {
  var fadeTime = 1000;
  window.context = context;

  loadJQuery( function() {
      var $ = window.jQuery;
      $("body").fadeOut( fadeTime );
      setTimeout( function() { $("body").fadeIn( fadeTime ); },
                  fadeTime);
  });
}

function cmd_inspect(context) {
  window.context = context;
  injectCss( "._highlight{ background-color: #ffffcc;}" );

  var removeHighlight = function() {
    $(this).removeClass( "_highlight" );
  };

  loadJQuery( function() {
    var $ = window.jQuery;

    $("body").mouseover( function(e) {
        $(e.target).addClass("_highlight")
                   .one( "mouseout", removeHighlight );
    });
  });
}

function cmd_javascript_console(context) {
  window.context = context;
  injectCss( "#_box{ position:fixed; left:0; bottom:0; width:100%; " +
             "       height: 200px; background-color:#CCC; display:none; " +
             "       border-top: 1px solid #999; font-size: 9pt; overflow-y: auto;} " +
             "#_close{ float:right; } " +
             "#_box #input{ width:95%; border:none; height:2em; font-weight:bold; background:none;}" +
             "#_box #output{ width:100%; white-space: pre; white-space: -moz-pre-wrap;} " +
             "#_box .input{ font-weight:bold;} " +
             "#_box .big{ font-weight:bold;}");

  injectHtml( "<div id='_box'><span id='_close'>[Close]</span><div id='output'><div class='big'>Welcome to the Ubiquity Javascript Console</div><div>Features: autocompletion of property names with Tab, multiline input with Shift+Enter, input history with (Ctrl+) Up/Down, <a accesskey=\"M\" href=\"javascript:go('scope(Math); mathHelp();');\" title=\"Accesskey: M\">Math</a>,</div><div>Values and functions: ans, print(string), <a accesskey=\"P\" href=\"javascript:go('props(ans)')\" title=\"Accesskey: P\">props(object)</a>, <a accesskey=\"B\" href=\"javascript:go('blink(ans)')\" title=\"Accesskey: B\">blink(node)</a>, <a accesskey=\"C\" href=\"javascript:go('clear()')\" title=\"Accesskey: C\">clear()</a>, load(scriptURL), scope(object), jQuery, $</div></div><textarea id='input' wrap='off' onkeydown='inputKeydown(event)' rows='1'></textarea></div>" );

  injectJavascript(
    "http://jconsole.com/shell.js",
    function() { injectHtml( "<script>init();</script>"); }
  );

  loadJQuery( function() {
    var $ = window.jQuery;
    $("#_box").slideDown();

    setTimeout( function() {
      $('#_box #input').select();
    }, 1000 );

    $("#_close").click( function() {
      $("#_box").slideUp();
    });
  });
}

function cmd_inject_datejs(context) {
  window.context = context;
  injectJavascript("http://datejs.googlecode.com/files/date.js");
}

function getCookie(domain, name) {
  var cookieManager = Components.classes["@mozilla.org/cookiemanager;1"].
                      getService(Components.interfaces.nsICookieManager);

  var iter = cookieManager.enumerator;
  while (iter.hasMoreElements()) {
    var cookie = iter.getNext();
    if (cookie instanceof Components.interfaces.nsICookie)
      if (cookie.host == domain && cookie.name == name )
        return cookie.value;
  }
}

function paramsToString(params) {
  var string = "?";

  for (key in params) {
    string += escape(key) + "=" + escape(params[key]) + "&";
  }

  // Remove the trailing &
  return string.substr(0, string.length - 1);
}

function addToGoogleCalendar(eventString) {
  var secid = getCookie("www.google.com", "secid");

  var URLS = {
    parse: "http://www.google.com/calendar/compose",
    create: "http://www.google.com/calendar/event"
  };

  function parseGoogleJson(json) {
    var securityPreface = "while(1)";
    var splitString = json.split( ";", 2 );
    if ( splitString[0] != securityPreface ) {
      displayMessage( "Unexpected Return Value" );
      return null;
    }
    // TODO: Security hull breach!
    return eval( splitString[1] )[0];
  }

  var params = paramsToString({
    "ctext": eventString,
    "qa-src": "QUICK_ADD_BOX"
  });

  ajaxGet(URLS["parse"]+params, function(json) {
    var data = parseGoogleJson( json );
    var eventText = data[1];
    var eventStart = data[4];
    var eventEnd = data[5];
    var secid = getCookie("www.google.com", "secid");

    var params = paramsToString({
      "dates": eventStart + "/" + eventEnd,
      "text": eventText,
      "secid": secid,
      "action": "CREATE",
      "output": "js"
    });

    ajaxGet(URLS["create"] + params, function(json) {
      // TODO: Should verify this, and print appropriate positive
      // understand feedback. Like "blah at such a time was created.
      displayMessage("Event created.");

      // TODO: Should iterate through open tabs and cause any open
      // Google Calendar tabs to refresh.
    });
  });
}

function cmd_go(context) {
  injectHtml("<h1 style='position:fixed;z-index:1000;top:0px;'>HELLO</h1>");
}

function humanePrompt(text, callback) {
  injectCss("#_box{ position:fixed; left:0; bottom:0; width:100%; z-index: 1000;" +
            "       height: 85px; background-color:#CCC; display:none; text-align:center;" +
            "       border-top: 1px solid #999; font-size: 12pt; overflow-y: auto;} " +
            "#_input{ width: 95%; font-size:24pt;}");

  injectHtml("<div id='_box'>" + text + "<br/><input id='_input'></div>");

  loadJQuery(function() {
    var $ = window.jQuery;
    $("#_box").slideDown();
    $("#_input").keydown( function(e) {
      switch( e.which ) {
      case 13: // RETURN
        callback( $(this).attr("value") );
      case 27: // ESC (and continuation of RETURN )
        $("#_box").slideUp();

        // TODO: We should be able to do
        // $("#_box").slideUp(speed, callback) but we get
        // a strange security error.

        setTimeout( function() { $("#_box").remove(); }, 400);
        break;
      }
    });
    setTimeout( function() { $("#_input").focus(); }, 400);
  });
}

function useSelectionOrPrompt(message, callback) {
  var sel = getTextSelection(window.context);
  if (sel.length != 0)
    callback(sel);
  else
    humanePrompt(message, callback);
}

function cmd_add_to_google_calendar(context) {
  window.context = context;
  var msg = "Enter your event below, then hit enter:";
  useSelectionOrPrompt(msg , addToGoogleCalendar);
}

cmd_add_to_google_calendar.icon = "http://google.com/favicon.ico";

function cmd_send(context) {
  loadJQuery(function() {
    var $ = window.jQuery;
    var gm = getWindow().gmonkey.get(1);
    var gmail = gm.getCanvasElement();
    $(gmail).find("button[textContent=Send]").get(0).click();
  });
}
cmd_send.icon = "http://google.com/favicon.ico";

function defineWord(word) {
  var url = "http://services.aonaware.com/DictService/DictService.asmx/DefineInDict";
  var params = paramsToString({
    dictId: "wn", //wn: WordNet, gcide: Collaborative Dictionary
    word: word
  });

  ajaxGet(url + params, function(xml) {
    loadJQuery( function() {
      var $ = window.jQuery;
      var text = $(xml).find("WordDefinition").text();
      displayMessage(text);
    });
  });
}

function cmd_define(context) {
  window.context = context;
  useSelectionOrPrompt("Enter word to be defined:", defineWord);
}

function cmd_delete(context) {
  var sel = context.focusedWindow.getSelection();
  var document = context.focusedWindow.document;

  if (sel.rangeCount >= 1) {
      var range = sel.getRangeAt(0);
      var newNode = document.createElement("div");
      newNode.className = "_toRemove";
      range.surroundContents(newNode);
  }

  loadJQuery(function() {
    var $ = window.jQuery;
    $("._toRemove").slideUp();
  });
}

function cmd_undelete(context) {
  loadJQuery(function() {
    var $ = window.jQuery;
    $("._toRemove").slideDown();
  });
}

function checkCalendar(date) {
  var date = getWindow().Date.parse(date);
  date = date._toString("yyyyMMdd");

  var url = "http://www.google.com/calendar/m";
  var params = paramsToString({ as_sdt: date });

  // jQuery is already loaded because we've done a humane prompt before
  // getting here.
  var $ = window.jQuery;

  ajaxGet(url + params, function(html) {
    var output = "";
    $(html).find(".c2").each(function() {
      // Strip out the extra whitespace.
      var text = $(this).text().replace(/[ ]+/g, " ");
      text = text.replace(/ \n /g, " ");
      output += text + "\n";
    });
    displayMessage(output);
  });
}

function cmd_check_calendar(context) {
  window.context = context;
  injectJavascript("http://datejs.googlecode.com/files/date.js");
  humanePrompt("What day would you like to check?", checkCalendar);
}

function gmailChecker() {
  var url = "http://mail.google.com/mail/feed/atom";
  ajaxGet(url, function(rss) {
    loadJQuery(function() {
      var $ = window.jQuery;

      var firstEntry = $(rss).find("entry").get(0);

      var newEmailId = $(firstEntry).find("id").text();
      var subject = $(firstEntry).find("title").text();
      var author = $(firstEntry).find("author name").text();
      var summary = $(firstEntry).find("summary").text();

      var title = author + ' says "' + subject + '"';
      displayMessage(summary, title);
    });
  });
}

function cmd_last_mail( context ) {
  gmailChecker();
}
cmd_last_mail.icon = "http://gmail.com/favicon.ico";

function getGmailContacts( callback ) {
  var url = "http://mail.google.com/mail/contacts/data/export";
  var params = paramsToString({
    exportType: "ALL",
    out: "CSV"
  });

  if (typeof(globals.gmailContacts) != "undefined") {
    callback(globals.gmailContacts);
    return;
  }

  ajaxGet(url + params , function(data) {
    data = data.split("\n");

    var contacts = {};
    for each( var line in data ) {
      var splitLine = line.split(",");

      var name = splitLine[0];
      var email = splitLine[1];

      contacts[name] = email;
    }

    globals.gmailContacts = contacts;
    callback(contacts);
  });
}

function cmd_get_email_address(context) {
  window.context = context;
  humanePrompt("What's the person's name?", function(name) {
    getGmailContacts(function(contacts) {
      for (var c in contacts) {
        if (c.match(name, "i")) {
          displayMessage(contacts[c], c);
        }
      }
    });
  });
}

// Assign a default command icon for anything that doesn't explicitly
// have an icon set.

var CMD_PREFIX = "cmd_";
var DEFAULT_CMD_ICON = "http://www.mozilla.com/favicon.ico";

for (name in this)
  if (name.indexOf(CMD_PREFIX) == 0) {
    var cmd = this[name];

    if (!cmd.icon)
      cmd.icon = DEFAULT_CMD_ICON;
  }

// Functionality for when we're loaded in an HTML page

function onDocumentLoad() {
  // Dynamically generate entries for undocumented commands.
  for (name in window)
    if (name.indexOf(CMD_PREFIX) == 0) {
      var cmd = window[name];
      var cmdName = name.substr(CMD_PREFIX.length);
      var cmdQuery = $("#" + name);

      if (cmdQuery.length == 0) {
        cmdName = cmdName.replace(/_/g, " ");
        $(document.body).append(
          ('<div class="command" id="' + name + '">' +
           '<span class="name">' + cmdName + '</span>')
        );
        cmdQuery = $("#" + name);
      }

      if (cmd.icon && cmdQuery.children(".icon").length == 0) {
        cmdQuery.prepend('<img class="icon" src="' + cmd.icon + '"/> ');
      }
    }
}

if (window.location != "chrome://browser/content/browser.xul") {
  // We're being included in an HTML page.  Yes, this is a hack, but
  // this solution is temporary anyways.
  $(document).ready(onDocumentLoad);
}
