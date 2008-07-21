function detectOS(){
  var nav = Application.activeWindow
                       .activeTab
                       .document
                       .defaultView
                       .wrappedJSObject
                       .navigator;
  
  var OSName="Unknown OS";
  if (nav.appVersion.indexOf("Win")!=-1) OSName="Windows";
  if (nav.appVersion.indexOf("Mac")!=-1) OSName="Mac";
  if (nav.appVersion.indexOf("X11")!=-1) OSName="UNIX";
  if (nav.appVersion.indexOf("Linux")!=-1) OSName="Linux";
  
  displayMessage( OSName );
}

function cmd_monkey() {
  detectOS();
}

// -----------------------------------------------------------------
// SEARCH COMMANDS
// -----------------------------------------------------------------

function makeSearchCommand(name, urlTemplate, icon) {
  var cmd = function() {
    var sel = getTextSelection();
    var urlString = urlTemplate.replace("{QUERY}", sel);

    openUrlInBrowser(urlString);
  };

  cmd.icon = icon;

  cmd.preview = function(pblock) {
    var sel = getTextSelection();
    var content = "Takes you to the " + name + " homepage.";

    if (sel) {
      if (name == "Google") {
        setGooglePreview(sel, pblock);
        pblock.innerHTML = ("Getting google results for <b>" + 
                           escape(sel) + "</b>...");
      }
      else if (name == "Google Maps") {
        setMapPreview(sel, pblock);
        pblock.innerHTML = ("Getting map for <b>" + 
                           escape(sel) + "</b>...");        
      }
      else {
        content = ("Performs a " + name + " search for <b>" +
                  escape(sel) + "</b>.");
        pblock.innerHTML = content;
      }
    }
  };

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

function setGooglePreview(searchTerm, pblock) {
  var url = "http://ajax.googleapis.com/ajax/services/search/web";
  var params = "v=1.0&q=" + encodeURIComponent(searchTerm);

  var req = new XMLHttpRequest();
  req.open('GET', url + "?" + params, true);
  req.overrideMimeType('application/json');
  req.onreadystatechange = function() {
    if (req.readyState == 4 && req.status == 200) {
      var jObj = eval( '(' + req.responseText + ')' );
      var count = jObj.responseData.cursor.estimatedResultCount;
      var numToDisplay = 3;
      var results = jObj.responseData.results;
      var html = "";

      if (numToDisplay < count) {
        for (var i=0; i<numToDisplay; i++) {
          var title = results[i].title;
          var content = results[i].content;
          var url = results[i].url;
          var visibleUrl = results[i].visibleUrl;

          html = html + "<div class=\"gresult\">" +
                        "<div><a onclick=\"window.content.location.href = '" + url + "';\">" + title + "</a></div>" +
                        "<xul:description class=\"gresult-content\">" + content + "</xul:description>" +
                        "<div class=\"gresult-url\">" + visibleUrl +
                        "</div></div>";
        }
      }
      pblock.innerHTML = html;
    }
  };
  req.send(null);

}

function loadMap(lat, lng) {
  if (GBrowserIsCompatible) {
    var map = new GMap2(document.getElementById("map"));
    var point = new GLatLng(lat, lng);
    map.setCenter(point, 13);
    map.addOverlay(new GMarker(point));
    map.addControl(new GSmallMapControl());
  }
}

function setMapPreview(searchTerm, pblock) {
  var doc = context.focusedWindow.document;
  var url = "http://maps.google.com/maps/geo";
  var apikey = "ABQIAAAAzr2EBOXUKnm_jVnk0OJI7xSsTL4WIgxhMZ0ZK_kHjwHeQuOD4xQJpBVbSrqNn69S6DOTv203MQ5ufA";
  var params = "key=" + apikey + "&q=" + encodeURIComponent(searchTerm);   

  var req = new XMLHttpRequest();
  req.open('GET', url + "?" + params, true);
  req.overrideMimeType('application/json');
  req.onreadystatechange = function() {
    if (req.readyState == 4 && req.status == 200) {
      var jobj = eval( '(' + req.responseText + ')' );
      var numToDisplay = 3;
        
      if (!jobj.Placemark) {
        displayMessage("not specific enough");
        return;
      }

      var placemark = jobj.Placemark[0];
      var lng0 = placemark.Point.coordinates[0];
      var lat0 = placemark.Point.coordinates[1];

      var html = "<div id=\"address-list\">";
      for (var i=0; i<numToDisplay; i++) {
        if (jobj.Placemark[i]) {
          var address = jobj.Placemark[i].address;
          var lng = jobj.Placemark[i].Point.coordinates[0];
          var lat = jobj.Placemark[i].Point.coordinates[1]; 
        
          html = html + "<div class=\"gaddress\">" + 
                        "<a href=\"#\" onclick=\"loadMap(" + lat + ", " + lng + ");\">" + 
                        address + "</a></div>";
        }
      }
      html = html + "</div>" + 
                    "<div id=\"map\">[map]</div>"; 
                    
      // For now, just displaying the address listings and the map
      pblock.innerHTML = html;   
      
      // This call to load map doesn't have access to the google api script which is currently included in the popup in browser.xul
      // Possibly insert a script tag here instead- doesn't seem to be working either: doesn't actually LOAD (ie: onload event never fires)
      loadMap(lat0, lng0);
      
    }
  };
  req.send(null);
}



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

function cmd_italic() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("italic", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}

function cmd_underline() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("underline", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}

function cmd_undo() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("undo", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}

function cmd_redo() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("redo", false, null);
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

cmd_highlight.preview = function(pblock) {
  pblock.innerHTML = 'Highlights your current selection, like <span style="background: yellow; color: black;">this</span>.';
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

function cmd_escape_html_entities() {
  var text = getTextSelection();
  text = text.replace(/</g, "&amp;lt;");  
  text = text.replace(/>/g, "&amp;gt;");  
  setTextSelection( text );
}

function cmd_word_count(){
	var sel = getTextSelection();
	displayMessage(wordCount(sel) + " words");
}

cmd_word_count.preview = function(pblock) {
	var sel = getTextSelection();
	pblock.innerHTML = wordCount(sel) + " words";
}

function wordCount(text){
	var words = text.split(" ");
	var wordCount = 0;
	
	for(i=0; i<words.length; i++){
		if (words[i].length > 0)
			wordCount++;
	}
	
	return wordCount;
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

function cmd_unedit_page() {
  getDocumentInsecure().body.contentEditable = 'false';
  getDocumentInsecure().designMode='off';
}

function isAddress( query, callback ) {
  var url = "http://local.yahooapis.com/MapsService/V1/geocode";
  var params = paramsToString({
    location: query,
    appid: "YD-9G7bey8_JXxQP6rxl.fBFGgCdNjoDMACQA--"
  });
  
  
  jQuery.ajax({
    url: url+params,
    dataType: "xml",
    error: function() {
      callback( false );
    },
    success:function(data) {      
      var results = jQuery(data).find("Result");
      var allText = jQuery.makeArray(
                      jQuery(data)
                        .find(":contains()")
                        .map( function(){ return jQuery(this).text().toLowerCase() } )
                      );
                      
      // TODO: Handle non-abbriviated States. Like Illinois instead of IL.

      if( results.length == 0 ){
        callback( false );
        return;        
      }
            
      function existsMatch( text ){
        var joinedText = allText.join(" ");
        return joinedText.indexOf( text.toLowerCase() ) != -1;
      }
      
      missCount = 0;
      
      var queryWords = query.match(/\w+/g);
      for( var i=0; i < queryWords.length; i++ ){
        if( existsMatch( queryWords[i] ) == false ) {
          missCount += 1;
          //displayMessage( queryWords[i] );
        }
      }
      
      var missRatio = missCount / queryWords.length;
      //displayMessage( missRatio );
      
      if( missRatio < .5 )
        callback( true );
      else
        callback( false );
    }
  });
}

function cmd_is_address(){
  humanePrompt( "Give me some text. I'll tell you if it's an address.", function( text ) {
    isAddress( text, function( bool ) {
      if( bool )
        displayMessage( "Yes. It is an address." );
      else
        displayMessage( "No. An address this is not." );
    })
  })
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
      // For some reason continuer.apply() won't work--we get
      // a security violation on Function.__parent__--so we'll
      // manually safety-wrap this.
      try {
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
      } catch (e) {
        displayMessage({text: "A gmonkey exception occurred.",
                        exception: e});
      }
    };

    gmonkey.load("1", continuer);
  } else
    displayMessage("Gmail must be open in a tab.");
}

cmd_email.preview = function(pblock) {
  pblock.innerHTML = 'Creates an email message with your current selection as the contents.';
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
      displayMessage({text: summary, title: title});
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
          displayMessage({text: contacts[c], title: c});
        }
      }
    });
  });
}

// -----------------------------------------------------------------
// MISC COMMANDS
// -----------------------------------------------------------------

function cmd_test() {
  var generator = Components
                    .classes["@mozilla.org/xpath-generator;1"]
                    .createInstance(Components.interfaces.nsIXPathGenerator);  
  displayMessage( generator );                  
}

function pageLoad_inject_xss(){
  getWindowInsecure().ajaxGet = ajaxGet;
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

function cmd_save() {
  // TODO: works w/o wrappedJSObject in getDocumentInsecure() call- fix this
  getDocumentInsecure().body.contentEditable = 'false';
  getDocumentInsecure().designMode='off';

  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);

  var body = jQuery( getDocumentInsecure().body );

  annotationService.setPageAnnotation(ioservice.newURI(window.content.location.href, null, null), "ubiquity/edit", body.html(), 0, 4);
}


// removes all page annotations - add more functionality
function cmd_remove_annotations() {
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
    if( typeof(globals.wordCloud.length) == "number" ){
      displayMessage({text: d, title: data[i-1]});
      return;
    }
  }

}

// -----------------------------------------------------------------
// LANGUAGE/TRANSLATE RELATED
// -----------------------------------------------------------------

function translateTo( lang, callback ) {  
  var url = "http://ajax.googleapis.com/ajax/services/language/translate";
  var params = paramsToString({
    v: "1.0",
    q: getTextSelection(),
    langpair: "|" + lang
  });

  ajaxGet( url + params, function(jsonData){
    var data = eval( '(' + jsonData + ')' );
    var translatedText = data.responseData.translatedText;
    if( typeof callback == "function" )
      callback( translatedText );
    else
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

function generateTranslateFunction( langCode ) {
  return function(){
    translateTo( langCode );
  };
}

function generateTranslatePreviewFunction( langCode, langName ) {
  return function(pblock) {
    var lang = langName[0].toUpperCase() + langName.substr(1);
    pblock.innerHTML = "Replaces the selected text with the " + lang + " translation:<br/>";
    translateTo( langCode, function( translation ) {
      pblock.innerHTML += "<i style='padding:10px;color: #CCC;display:block;'>" + translation + "</i>";
    })
  }
  
}

for( lang in Languages ){
  var langCode = Languages[lang];
  var langName = lang.toLowerCase();

  this["cmd_translate_to_" + langName] = generateTranslateFunction( langCode );
  this["cmd_translate_to_" + langName].preview = generateTranslatePreviewFunction( langCode, langName );  
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
  if( !globals.addresses )
    globals.addresses = [];

  var uf = getMF( "adr" );
  if( uf ) {
    displayMessage( "Found address: " + uf );
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

function pageLoad_installMicroformatHarvesters() {
  cmd_detect_microformat();
  cmd_populate_with_microformat();
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

function pageLoad_inject_snapshot(){
  getWindowInsecure().snapshot = takeSnapshotOfWindow;
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

// Apply annotations so that all changes to our document are "activated"
function pageLoad_applyAnnotations(doc) {
  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService);

  var uri = ioservice.newURI(doc.location.href, null, null);

  var annotationNames = annotationService.getPageAnnotationNames(uri, {});

  for (var i=0; i<annotationNames.length; i++) {

    var annotationName, annotationValue;
    var startNode, endNode;
    var startXpath, endXpath;
    var startOffset, endOffset;

    if (annotationNames[i].match("ubiquity/delete/")) {
      annotationName = annotationNames[i].substring(16);
      annotationValue = annotationService.getPageAnnotation(uri, annotationNames[i]);

      // get xpaths out of name
      startXpath = annotationName.substring(0, annotationName.indexOf("#"));
      endXpath = annotationName.substring(annotationName.indexOf("#") + 1);

      // get offsets out of value
      startOffset = parseInt(annotationValue.substring(0, annotationValue.indexOf("#")));
      endOffset = parseInt(annotationValue.substring(annotationValue.indexOf("#") + 1));


      // find the nodes from the xpaths
      var iterator;
      iterator = doc.evaluate(startXpath, doc, null, XPathResult.ANY_TYPE, null);
      startNode = iterator.iterateNext();
      iterator = doc.evaluate(endXpath, doc, null, XPathResult.ANY_TYPE, null);
      endNode = iterator.iterateNext();


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

    }

    if (annotationNames[i] == "ubiquity/edit") {
      // TODO: works w/o wrappedJSObject in getDocumentInsecure() call- fix this
      var body = jQuery( getDocumentInsecure().body );

      annotationValue = annotationService.getPageAnnotation(uri, annotationNames[i]);
      body.html(annotationValue);

      // TODO: Fix "TypeError: head is not defined" on some pages

    }
  }
}

function cmd_help() {
  openUrlInBrowser("about:ubiquity");
}



// -----------------------------------------------------------------
// EXTENSION-RELATED (ONLY ADDED IF EXTENSION IS RUNNING)
// -----------------------------------------------------------------

//DEL.ICIO.US
if(window.yAddBookMark){
	
	function cmd_del_icio_us(){

		if(!window.yAddBookMark){
			displayMessage("To use this command, you need to have del.icio.us extension installed");
		}else{
			window.yAddBookMark.open();
		}
	}
}

//FOXY.TUNES
if(window.foxytunesDispatchPlayerCommand){
	
	function cmd_lyrics(){

		if(!window.foxytunesGetCurrentTrackTitle){
			humanePrompt("Lyrics for which song?", lyrics_search);
		}else{
			song_title = window.foxytunesGetCurrentTrackTitle();
			lyrics_search(song_title);
	   	}
	}

	function lyrics_search(song){
		openUrlInBrowser("http://www.google.com/search?q=" + escape(song + " lyrics"));
	}

	function cmd_play_song(){
		foxy_tunes_action("Play"); 
	}

	function cmd_pause_song(){
		foxy_tunes_action("Pause"); 
	}

	function cmd_previous_song(){
		foxy_tunes_action("Previous"); 
	}

	function cmd_next_song(){
		foxy_tunes_action("Next"); 
	}

	function foxy_tunes_action(action){
	
		if(!window.foxytunesDispatchPlayerCommand){
			displayMessage("To use this command, you need to have FoxyTunes extension installed");
		}else{
			window.foxytunesDispatchPlayerCommand(action, true);
		}
	
	}

}

//STUMBLEUPON
if(window.stumble){

	function cmd_stumble(){
		window.stumble(0);
	}
	
	function cmd_stumble_thumbs_up(){
		window.su_rate(1, 0, 0, 0);
		displayMessage("You liked it");
	}

	function cmd_stumble_thumbs_down(){
		window.su_rate(0, 0, 0, 0);
		displayMessage("You disliked it");
	}

	function cmd_stumble_view_reviews(){
		window.su_website_info(0,'', 0);
	}

	function cmd_stumble_toggle_toolbar(){
		window.su_toggle_toolbar();
	}
}

// -----------------------------------------------------------------
// TAB COMMANDS
// -----------------------------------------------------------------

function cmd_close_related_tabs(){
	
	var relatedWord = getTextSelection().toLowerCase();
    
	Application.activeWindow.tabs.forEach(function(tab){
		if ( tab.uri.spec.toLowerCase().match(relatedWord) || tab.document.title.toLowerCase().match(relatedWord))
			tab.close();
	});
	
}

cmd_close_related_tabs.preview = function(pblock) {
	
	var relatedWord = getTextSelection().toLowerCase();
	
	if(relatedWord.length != 0){
		
	  	var html = "Closes the following tabs that are related to <b style=\"color:yellow\">\"" + relatedWord + "\"</b> : <ul>";
		var numTabs = 0;
	
		Application.activeWindow.tabs.forEach(function(tab){
			if ( tab.uri.spec.toLowerCase().match(relatedWord) || tab.document.title.toLowerCase().match(relatedWord)){
				html += "<li>" + tab.document.title + "</li>";
				numTabs++;
			}
		});

		if(numTabs == 0){
			html = "No tabs related to <b style=\"color:yellow\">\"" + relatedWord + "\"</b>";
		}else{
			html += "</ul>";
		}
		
	}else{
		html = "No text selected";
	}
	
	pblock.innerHTML = html;

}

