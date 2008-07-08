
// -----------------------------------------------------------------
// SEARCH COMMANDS
// -----------------------------------------------------------------

function makeSearchCommand(urlTemplate, icon) {
  var cmd = function() {
    var sel = getTextSelection();
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

var cmd_map_it = makeSearchCommand(
  "http://maps.google.com/?q={QUERY}",
  "http://www.google.com/favicon.ico"
);

// -----------------------------------------------------------------
// TEXT COMMANDS
// -----------------------------------------------------------------

function cmd_bold() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("bold", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}

function cmd_highlight() {
  var sel = context.focusedWindow.getSelection();
  var document = context.focusedWindow.document;

  if (sel.rangeCount >= 1) {
    var range = sel.getRangeAt(0);
    var newNode = document.createElement("span");
    newNode.style.background = "yellow";
    range.surroundContents(newNode);
  }
}

function cmd_to_rich_text() {
  var html = getTextSelection();

  if (html) {
    var doc = context.focusedWindow.document;
    if (doc.designMode == "on")
      doc.execCommand("insertHTML", false, html);
    else
      displayMessage("You're not in a rich text editing field.");
  }
}

function cmd_to_html() {
  var html = getHtmlSelection();

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

function cmd_link_to_wikipedia() {
  var text = getTextSelection();

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

function cmd_signature() {
  setTextSelection( "-- aza | ɐzɐ --" );
}

function calculate(expr) {
  setTextSelection( eval(expr) );
}

function cmd_calculate() {
  useSelectionOrPrompt("Enter expression:", calculate);
}
cmd_calculate.icon = "http://humanized.com/favicon.ico";

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

function cmd_define() {
  useSelectionOrPrompt("Enter word to be defined:", defineWord);
}

function cmd_edit_page() {
  getDocumentInsecure().body.contentEditable = 'true';
  getDocumentInsecure().designMode='on';
}

// -----------------------------------------------------------------
// EMAIL/GOOGLE COMMANDS
// -----------------------------------------------------------------


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

function cmd_email() {
  var document = context.focusedWindow.document;
  var title = document.title;
  var location = document.location;
  var gmailTab = findGmailTab();
  var html = getHtmlSelection();

  if (html)
    html = ("<p>From the page <a href=\"" + location +
            "\">" + title + "</a>:</p>" + html);
  else {
    displayMessage("No selected HTML!");
    return;
  }

  if (gmailTab) {
    // Note that this is technically insecure because we're
    // accessing wrappedJSObject, but we're only executing this
    // in a Gmail tab, and Gmail is trusted code.
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

function cmd_add_to_google_calendar() {
  var msg = "Enter your event below, then hit enter:";
  useSelectionOrPrompt(msg , addToGoogleCalendar);
}

cmd_add_to_google_calendar.icon = "http://google.com/favicon.ico";

function cmd_send() {
  loadJQuery(function() {
    var $ = window.jQuery;
    var gm = getWindowInsecure().gmonkey.get(1);
    var gmail = gm.getCanvasElement();
    $(gmail).find("button[textContent=Send]").get(0).click();
  });
}
cmd_send.icon = "http://google.com/favicon.ico";

function checkCalendar(date) {
  var date = getWindowInsecure().Date.parse(date);
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

function cmd_check_calendar() {
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

function cmd_last_mail() {
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

function cmd_get_email_address() {
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

// -----------------------------------------------------------------
// MISC COMMANDS
// -----------------------------------------------------------------

function windowOpen_inject_xss() {
  onPageLoad( function(){
    getWindowInsecure().ajaxGet = ajaxGet;
  });
}

function insertMap( query ) {
  var apiKey = "ABQIAAAAzr2EBOXUKnm_jVnk0OJI7xSsTL4WIgxhMZ0ZK_kHjwHeQuOD4xQJpBVbSrqNn69S6DOTv203MQ5ufA";

  var geocodeUrl = "http://maps.google.com/maps/geo?key={key}&q={query}&output=csv";

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

    setTextSelection( query + "<br/>" + imgHtml );
  });
};

function cmd_map() {
  useSelectionOrPrompt("Where do you want to map?", insertMap);
}

function cmd_inject_jquery() {
  injectJavascript("http://code.jquery.com/jquery-latest.pack.js");
}

function cmd_fade_page() {
  var fadeTime = 1000;

  loadJQuery( function() {
      var $ = window.jQuery;
      $("body").fadeOut( fadeTime );
      setTimeout( function() { $("body").fadeIn( fadeTime ); },
                  fadeTime);
  });
}

function cmd_inspect() {
  injectCss( "._highlight{ background-color: #ffffcc;}" );

  var removeHighlight = function() {
    $(this).removeClass( "_highlight" );
  };

  // TODO: Figure out why this no longer removes the highlight on mouse out.
  loadJQuery( function() {
    var $ = window.jQuery;

    $("body").mouseover( function(e) {
        $(e.target).addClass("_highlight")
                   .one( "mouseout", removeHighlight );
    });
  });
}

function cmd_javascript_console() {
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

function cmd_inject_datejs() {
  injectJavascript("http://datejs.googlecode.com/files/date.js");
}

function cmd_delete() {
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

function cmd_undelete() {
  loadJQuery(function() {
    var $ = window.jQuery;
    $("._toRemove").slideDown();
  });
}


// removes all page annotations - add more functionality
function cmd_undo_delete() {
  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);

  annotationService.removePageAnnotations(ioservice.newURI(window.content.location.href, null, null));

  window.content.location.reload();
}

// permanent delete - in progress, slightly buggy
function cmd_perm_delete() {
  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);

  var document = context.focusedWindow.document;
  var sel      = context.focusedWindow.getSelection();
  var range    = sel.getRangeAt(0);

  var startNode = range.startContainer;
  var endNode   = range.endContainer;
  var startOffset = range.startOffset;
  var endOffset   = range.endOffset;
  var startXpath;
  var endXpath;

  // see if we need to modify the startNode xpath
  if (startNode.nodeType == 3) {
    // modify the offset with respect to the parent
    var children = startNode.parentNode.childNodes;
    var count = 0;
    while (children[count] != startNode) {
      startOffset = startOffset + children[count].textContent.length;
      count++;
    }
    // set the start node to its parent
    startNode = startNode.parentNode;
  }

  // see if we need to modify the endNode xpath
  if (endNode.nodeType == 3) {
    // modify the offset with respect to the parent
    var children = endNode.parentNode.childNodes;
    var count = 0;
    while (children[count] != endNode) {
      endOffset = endOffset + children[count].textContent.length;
      count++;
    }
    // set the start node to its parent
    endNode = endNode.parentNode;
  }

  var children = endNode.childNodes;
  for (var i=0; i<children.length; i++) {
    if (children[i] == startNode)
      displayMessage("found it");
  }
  startXpath = this.getXpath(startNode);
  endXpath = this.getXpath(endNode);

  //displayMessage("start: " + startXpath + ", end: " + endXpath);
  if (!startXpath || !endXpath) {
    displayMessage("Can't delete!");
    return;
  }
  if ((countChars(startXpath, '/') != countChars(endXpath, '/')) ||
       (sel.toString().length > endOffset-startOffset)) {
    displayMessage("Can't delete nicely!");
    return;
  }

  //endOffset = startOffset + sel.toString().length;

  // delete the text content in between the start and end nodes
  if (startNode == endNode) {
    startNode.textContent = startNode.textContent.substring(0, startOffset) +
                            startNode.textContent.substring(endOffset);
  }
  else {
    startNode.textContent = startNode.textContent.substring(0, startOffset);
    var curNode = startNode.nextSibling;
    while (curNode && (curNode != endNode)) {
      curNode.textContent = "";
      curNode = curNode.nextSibling;
    }
    endNode.textContent = endNode.textContent.substring(endOffset);
  }

  var annotationName = "ubiquity/delete/" + startXpath + "#" + endXpath;
  var annotationValue = startOffset + "#" + endOffset;

  annotationService.setPageAnnotation(ioservice.newURI(window.content.location.href, null, null), annotationName, annotationValue, 0, 4);

}
/*
function getXpath(node) {
  var generator = Components.classes["@mozilla.org/xpath-generator;1"].createInstance(Components.interfaces.nsIXPathGenerator);
  generator.addNamespace("html", "http://www.w3.org/1999/xhtml");
  return generator.generateXPath(node, context.focusedWindow.document);
}
*/
function getXpath(el) {
  if (el == null) {
    displayMessage("Can't delete");
    return null;
  }
  else {
    var xml = context.focusedWindow.document;
    var xpath = '';
    var pos, tempitem2;

    while(el !== xml.documentElement) {
      if (!el || !el.parentNode) {
        return null;
      }

      pos = 0;
      tempitem2 = el;
      while(tempitem2) {
	if (tempitem2.nodeType === 1 &&
            tempitem2.nodeName === el.nodeName) {
          // If it is ELEMENT_NODE of the same name
	  pos += 1;
	}
	tempitem2 = tempitem2.previousSibling;
      }

      xpath = (el.nodeName + (el.namespaceURI===null?'':el.namespaceURI) +
               "[" + pos + ']' + '/' + xpath);

      el = el.parentNode;
    }
    xpath = (xml.documentElement.nodeName +
             (el.namespaceURI===null?'':el.namespaceURI) + '/' + xpath);
    xpath = xpath.replace(/\/$/, '');
    return xpath;
  }
}

function countChars(str, chr) {
  var count = 0;
  while (str.match(chr)) {
    count++;
    str = str.substring(str.indexOf(chr) + 1);
  }
  return count;
}

function cmd_get_sel() {
  function insertText(element, snippet)
  {
    var selectionEnd = element.selectionStart + snippet.length;
    var currentValue = element.value;

    var beforeText = currentValue.substring(0, element.selectionStart);
    var afterText = currentValue.substring(element.selectionEnd,
                                           currentValue.length);

    element.value = beforeText + snippet + afterText;
    element.focus();

    //put the cursor after the inserted text
    element.setSelectionRange(selectionEnd, selectionEnd);
  }

  insertText(context.focusedElement, "hello");
}

// -----------------------------------------------------------------
// WORD-CLOUD RELATED
// -----------------------------------------------------------------


function cmd_capture_word_cloud( ){
  onPageLoad( cloudPageLoadHandler );
  displayMessage( "Word Cloud Handlers Added");
}


function cmd_reset_word_cloud( ) {
  globals.wordCloud = {};
}

function cmd_display_word_cloud( ){

  var d = getDocumentInsecure().createElement("div");
  d.style.position = "absolute";
  d.style.top = "0px";
  d.style.left = "0px";
  d.style.backgroundColor = "#cdcdcd";
  for( var word in globals.wordCloud ) {
    var actualWord = word.substring(5);
    if( globals.wordCloud[word] > 3 ){
      var s = getDocumentInsecure().createElement("span");
      s.style.fontSize = globals.wordCloud[word] * 3 + "px";
      s.innerHTML = actualWord;
      d.appendChild( s );
    }
  }

  getDocumentInsecure().body.appendChild( d );

}

function cloudPageLoadHandler( ) {
  if( typeof(globals.wordCloud) == "undefined" ){
    globals.wordCloud = {};
  }

  var body = jQuery( getDocumentInsecure().body ).clone();
  body.find("script,head,style").remove();

  var text = jQuery( body ).text();
  var data = text.split(/\W/).filter( function(d){
    if( d == "" ) return false;
    if( d.length <= 3 ) return false;
    if( d.match(/\d/) ) return false;

    return true;
  } );

  for( var i=0; i<=data.length; i++ ){
    var d = "word_" + data[i];

    if( typeof(globals.wordCloud[d]) == "undefined" ){ globals.wordCloud[d] = 1; }
    else{ globals.wordCloud[d] += 1; }
    if( typeof(globals.wordCloud.length) == "number" ){ displayMessage(d, data[i-1]); return;}
  }

}

// -----------------------------------------------------------------
// LANGUAGE/TRANSLATE RELATED
// -----------------------------------------------------------------

function translate_to( lang ) {
  var url = "http://ajax.googleapis.com/ajax/services/language/translate";
  var params = paramsToString({
    v: "1.0",
    q: getTextSelection(),
    langpair: "|" + lang
  });

  ajaxGet( url + params, function(jsonData){
    var data = eval( '(' + jsonData + ')' );
    var translatedText = data.responseData.translatedText;
    setTextSelection( translatedText );
  });
}

var Languages = {
  'ARABIC' : 'ar',
  'CHINESE' : 'zh',
  'CHINESE_TRADITIONAL' : 'zh-TW',
  'DANISH' : 'da',
  'DUTCH': 'nl',
  'ENGLISH' : 'en',
  'FINNISH' : 'fi',
  'FRENCH' : 'fr',
  'GERMAN' : 'de',
  'GREEK' : 'el',
  'HINDI' : 'hi',
  'ITALIAN' : 'it',
  'JAPANESE' : 'ja',
  'KOREAN' : 'ko',
  'NORWEGIAN' : 'no',
  'POLISH' : 'pl',
  'PORTUGUESE' : 'pt-PT',
  'ROMANIAN' : 'ro',
  'RUSSIAN' : 'ru',
  'SPANISH' : 'es',
  'SWEDISH' : 'sv'
};

function generateTranslateFunction( langCode ){
  return function(){
    translate_to( langCode );
  };
}

for( lang in Languages ){
  var langCode = Languages[lang];
  var langName = lang.toLowerCase();

  this["cmd_translate_to_" + langName] = generateTranslateFunction( langCode );
}

function cmd_translate_to_fake_swedish() {
  var URL = "http://www.cs.utexas.edu/users/jbc/bork/bork.cgi?";
  var params = "type=chef&input=" + getTextSelection();

  ajaxGet(URL + params, function(data) {
    setTextSelection(data);
  });
}


// -----------------------------------------------------------------
// MICROFORMAT RELATED
// -----------------------------------------------------------------


function getMF( type ) {
  Components.utils.import("resource://gre/modules/Microformats.js");

  var count = Microformats.count( type , getDocumentInsecure(), {recurseExternalFrames: true});
  if( count > 0 ) {
    return Microformats.get( type , getDocumentInsecure(), {recurseExternalFrames: true});
  }
  return null;
}

function cmd_detect_microformat() {
  var uf = getMF( "adr" );
  if( uf ) {
    displayMessage( "Found address: " + uf );
    if( !globals.addresses ) globals.addresses = [];
    globals.addresses.push( uf[0] );
  }
}

// If Google Maps is open, go to the last harvested address
// microformat.
function cmd_populate_with_microformat() {
  //displayMessage( globals.addresses.length )
  if( globals.addresses.length == 0 ) return;

  var last = globals.addresses.length - 1;
  var addr = globals.addresses[last].toString();
  var url = getWindowInsecure().location.href;

  if( url == "http://maps.google.com/" ){
    getDocumentInsecure().getElementById("q_d").value = addr;

    setTimeout( function(){
      getDocumentInsecure().getElementById("q_sub").click();
    }, 50 );
  }
}

function windowOpen_microfomrat() {
  onPageLoad( cmd_detect_microformat );
}

function windowOpen_populate() {
  onPageLoad( cmd_populate_with_microformat );
}

// -----------------------------------------------------------------
// SNAPSHOT RELATED
// -----------------------------------------------------------------

function getHiddenWindow() {
  return Components.classes["@mozilla.org/appshell/appShellService;1"]
                   .getService(Components.interfaces.nsIAppShellService)
                   .hiddenDOMWindow;
}

function takeSnapshotOfWindow( window, scrollDict ) {
  if( !scrollDict ) scrollDict = {};
  var top = scrollDict.top || 0.001;
  var left = scrollDict.left || 0.001;

  var hiddenWindow = getHiddenWindow();
  var canvas = hiddenWindow.document.createElementNS("http://www.w3.org/1999/xhtml", "canvas" );

  var body = window.document.body;

  var width = jQuery(body).width();
  var height = window.innerHeight+110;

  canvas.width = width;
  canvas.height = height;

  var ctx = canvas.getContext( "2d" );
  ctx.drawWindow( window, left, top, width, height, "rgb(255,255,255)" );
  return canvas.toDataURL();
}

function cmd_inject_snapshot() {
  var win = getWindowInsecure();
  win.snapshot = takeSnapshotOfWindow;
}

function windowOpen_inject_snapshot() {
  onPageLoad( function(){
    getWindowInsecure().snapshot = takeSnapshotOfWindow;
  });
}

// -----------------------------------------------------------------
// ZOOM RELATED
// -----------------------------------------------------------------


function setFullPageZoom( level ) {
  var navigator1 = window
                    .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                    .getInterface(Components.interfaces.nsIWebNavigation);
  var docShell = navigator1.QueryInterface(Components.interfaces.nsIDocShell);
  var docviewer = docShell.contentViewer.QueryInterface(Components.interfaces.nsIMarkupDocumentViewer);
  docviewer.fullZoom = level;
}

function iframeFullPageZoom( iframe, level ) {
  var navigator1 = iframe.contentWindow
                    .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                    .getInterface(Components.interfaces.nsIWebNavigation);
  var docShell = navigator1.QueryInterface(Components.interfaces.nsIDocShell);
  var docviewer = docShell.contentViewer.QueryInterface(Components.interfaces.nsIMarkupDocumentViewer);
  docviewer.fullZoom = level;
}

function cmd_scale_firefox_down() {
  setFullPageZoom( .91 );
}

function cmd_zoom() {
  var win = getWindowInsecure();
  var document = getDocumentInsecure();

  var $ = jQuery;

  var dataUrl = takeSnapshotOfWindow( win, {top:win.scrollY} );

  var div = document.createElement( "div" );
  $(div).css({
    position:"fixed",
    top:0,
    left: 0,
    backgroundColor: "#222",
    width: "100%",
    height: "100%",
    zIndex: 10000000
  });

  var w = jQuery(document.body).width();
  var h = window.innerHeight;

  var img = document.createElement("img");
  img.src = dataUrl;
  img.id = "theImage";

  $(img).css({
    position:"fixed",
    top: 0,
    left: 0,
    zIndex: 10000001
  });

  $(document.body).append( img ).append(div);
  $(document.body).css({overflow:"hidden"});

  // This is a hack which fixes an intermittent bug where the top wasn't
  // being set correctly before animating.
  $(img).animate({top:0, width:w, height: h}, 1);

  $(img).animate({top:100, left:w/2, width:w*.1, height: h*.1}, 500);
  $(img).click( function(){
    $(img).animate({top:0, left:0, width:w, height: h}, 500);
    setTimeout( function(){
      $(div).remove();
      $(img).remove();
      $(document.body).css({overflow:"auto"});
    },500);

  });
}


// -----------------------------------------------------------------
// SYSTEM
// -----------------------------------------------------------------

function cmd_editor() {
  openUrlInBrowser("chrome://ubiquity/content/editor.html");
}

// This function is run by Firefox on startup.
function startup_welcome_message() {
  displayMessage("Welcome to Firefox, now with Ubiquity support!");
}
