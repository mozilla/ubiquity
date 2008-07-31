
// -----------------------------------------------------------------
// SEARCH COMMANDS
// -----------------------------------------------------------------

function setDefaultSearchPreview( name, query, pblock ) {
  var content = ("Performs a " + name + " search for <b>" +
            escape(query) + "</b>.");
  pblock.innerHTML = content;
}

function makeSearchCommand( options ) {
  var cmd = function(query, modifiers) {
    var urlString = options.url.replace("{QUERY}", query);
    openUrlInBrowser(urlString);
    setLastResult( urlString );
  };

  cmd.setOptions({
    takes: {"search term": arbText},
    icon: options.icon,
    preview: function(pblock, query, modifiers) {
      if (query) {
        if( options.preview ) options.preview( query, pblock );
        else setDefaultSearchPreview(options.name, query, pblock);
      }
    }
  });

  return cmd;
}


var cmd_google = makeSearchCommand({
  name: "Google",
  url: "http://www.google.com/search?q={QUERY}",
  icon: "http://www.google.com/favicon.ico",
  preview: function(searchTerm, pblock) {
    var url = "http://ajax.googleapis.com/ajax/services/search/web";
    var params = { v: "1.0", q: searchTerm };

    jQuery.get( url, params, function(data) {
      var numToDisplay = 3;
      var results = data.responseData.results.splice( 0, numToDisplay );

      pblock.innerHTML = renderTemplate( "searchresults.html", {results:results} );
		}, "json");
  }
});

var cmd_imdb = makeSearchCommand({
  name: "IMDB",
  url: "http://www.imdb.com/find?s=all&q={QUERY}&x=0&y=0",
  icon: "http://i.imdb.com/favicon.ico"
});

var cmd_bugzilla = makeSearchCommand({
  name: "Bugzilla",
  url: "https://bugzilla.mozilla.org/buglist.cgi?query_format=specific&order=relevance+desc&bug_status=__open__&content={QUERY}",
  icon: "https://bugzilla.mozilla.org/favicon.ico"
});

CreateCommand({
  name: "yelp",
  takes: { "restaurant":arbText },
  // TODO: Should be AddressNounType, which is currently broken.
  // See http://labs.toolness.com/trac/ticket/44
  modifiers: { near:arbText },
  icon: "http://www.yelp.com/favicon.ico",

  execute: function( query, info ) {
    var url = "http://www.yelp.com/search?find_desc={QUERY}&find_loc={NEAR}";
    url = url.replace( /{QUERY}/g, query);
    url = url.replace( /{NEAR}/g, info.near);

    openUrlInBrowser( url );
  },

  preview: function( pblock, query, info ) {
    var url = "http://api.yelp.com/business_review_search?";

    if( query.length == 0 ) return;

    loc = getLocation();
    var near = info.near || (loc.city + ", " + loc.state);

    var params = {
      term: query,
      num_biz_requested: 4,
      location: near,
      ywsid: "HbSZ2zXYuMnu1VTImlyA9A"
    };

    jQuery.get( url, params, function(data) {
      pblock.innerHTML = renderTemplate( "yelp.html", {businesses: data.businesses} );
		}, "json");
  }
})



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


CreateCommand({
  name: "calculate",
  takes: {"expression": arbText},
  icon: "http://www.metacalc.com/favicon.ico",
  execute: function( expr ) {
    if( expr.length > 0 ) {
      var result = eval( expr );
      setTextSelection( result );
      setLastResult( result );
    } else
      displayMessage( "Requires an expression.");
  },
  preview: function( pblock, expr ) {
    if( expr.length < 1 ){
      pblock.innerHTML = "Calculates an expression. E.g., 22/7.";
      return;
    }

    pblock.innerHTML = expr + " = ";
    try{ pblock.innerHTML += eval( expr ); }
    catch(e) { pblock.innerHTML += "?"; }
  }
});


function defineWord(word, callback) {
  var url = "http://services.aonaware.com/DictService/DictService.asmx/DefineInDict";
  var params = paramsToString({
    dictId: "wn", //wn: WordNet, gcide: Collaborative Dictionary
    word: word
  });

  ajaxGet(url + params, function(xml) {
    loadJQuery( function() {
      var $ = window.jQuery;
      var text = $(xml).find("WordDefinition").text();
      callback(text);
    });
  });
}

CreateCommand({
  name: "define",
  takes: {"word": arbText},
  execute: function( word ) {
    openUrlInBrowser( "http://www.answers.com/" + escape(word) );
  },
  preview: function( pblock, word ) {
    defineWord( word, function(text){
      text = text.replace(/(\d+:)/g, "<br/><b>$&</b>");
      text = text.replace(/(1:)/g, "<br/>$&");
      text = text.replace(word, "<span style='font-size:18px;'>$&</span>");
      text = text.replace(/\[.*?\]/g, "");

      pblock.innerHTML = text;
    });
  }
})

// TODO: Add the ability to manually set the language being highlighted.
// TODO: Add the ability to select the style of code highlighting.
CreateCommand({
  name: "syntax&nbsp;highlight",
  takes: {"code": arbText},
  execute: function( code ) {
    var url = "http://azarask.in/services/syntaxhighlight/color.py";
    var params = {
      code: code,
      style: "native"
    };

    jQuery.post( url, params, function( html ) {
      html = html.replace( /class="highlight"/, "style='background-color:#222;padding:3px'");
      setTextSelection( html );
    });
  },
  preview: "Syntax highlights your code."
})

// -----------------------------------------------------------------
// TRANSLATE COMMANDS
// -----------------------------------------------------------------

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

function translateTo( text, langCodePair, callback ) {
  var url = "http://ajax.googleapis.com/ajax/services/language/translate";

  if( typeof(langCodePair.from) == "undefined" ) langCodePair.from = "";
  if( typeof(langCodePair.to) == "undefined" ) langCodePair.to = "";

  var params = paramsToString({
    v: "1.0",
    q: text,
    langpair: langCodePair.from + "|" + langCodePair.to
  });

  ajaxGet( url + params, function(jsonData){
    var data = eval( '(' + jsonData + ')' );

    // The usefulness of this command is limited because of the
    // length restriction enforced by Google. A better way to do
    // this would be to split up the request into multiple chunks.
    // The other method is to contact Google and get a special
    // account.

    try {
      var translatedText = data.responseData.translatedText;
    } catch(e) {

      // If we get this error message, that means Google wasn't able to
      // guess the originating language. Let's assume it was English.
      // TODO: Localize this.
      var BAD_FROM_LANG_GUESS_MSG = "invalid translation language pair";
      if( data.responseDetails == BAD_FROM_LANG_GUESS_MSG ){
        // Don't do infinite loops. If we already have a guess language
        // that matches the current forced from language, abort!
        if( langCodePair.from != "en" )
          translateTo( text, {from:"en", to:langCodePair.to}, callback );
        return;
      }
      else {
        displayMessage( "Translation Error: " + data.responseDetails );
      }
      return;
    }

    if( typeof callback == "function" )
      callback( translatedText );
    else
      setTextSelection( translatedText );

    setLastResult( translatedText );
  });
}

CreateCommand({
  name: "translate",
  takes: {"text to translate": arbText},
  modifiers: {to: languageNounType, from: languageNounType},

  execute: function( textToTranslate, languages ) {
    // Default to translating to English if no to language
    // is specified.
    // TODO: Choose the default in a better way.

    var toLang = languages.to || "English";
    var fromLang = languages.from || "";
    var toLangCode = Languages[toLang.toUpperCase()];

    translateTo( textToTranslate, {to:toLangCode} );
  },

  preview: function( pblock, textToTranslate, languages ) {
    var toLang = languages.to || "English";

    var toLangCode = Languages[toLang.toUpperCase()];
    var lang = toLang[0].toUpperCase() + toLang.substr(1);

    pblock.innerHTML = "Replaces the selected text with the " + lang + " translation:<br/>";
    translateTo( textToTranslate, {to:toLangCode}, function( translation ) {
      pblock.innerHTML = "Replaces the selected text with the " + lang + " translation:<br/>";
      pblock.innerHTML += "<i style='padding:10px;color: #CCC;display:block;'>" + translation + "</i>";
      });
  }
})


// -----------------------------------------------------------------
// SYSTEM COMMANDS
// -----------------------------------------------------------------

CreateCommand({
  name: "help",
  preview: "Provides help on using Ubiquity, as well as access to preferences, etc.",
  execute: function(){
    openUrlInBrowser("about:ubiquity");
  }
});

function cmd_editor() {
  openUrlInBrowser("chrome://ubiquity/content/editor.html");
}


CreateCommand({
  name: "remember",
  takes: {"thing": arbText},
  execute: function( thing, modifiers ) {
    displayMessage( "I am remembering " + thing );
    setLastResult( thing );
  }
});


// -----------------------------------------------------------------
// EMAIL COMMANDS
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

CreateCommand({
  name: "email",
  takes: {"message": arbHtml},
  modifiers: {to: PersonNounType},

  preview: function(pblock, directObject, modifiers) {
    var html = "Creates an email message ";
    if (modifiers["to"]) {
      html += "to " + modifiers["to"];
    }
    html += "with these contents:" + directObject;
    pblock.innerHTML = html;
  },

  execute: function(html, headers) {
    var document = context.focusedWindow.document;
    var title = document.title;
    var location = document.location;
    var gmailTab = findGmailTab();
    /* TODO get headers["to"] and put it in the right field*/
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
    // TODO why not open gmail if it's not already open?
  }
});


// -----------------------------------------------------------------
// CALENDAR COMMANDS
// -----------------------------------------------------------------


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

/* TODO this comman just takes unstructured text right now and relies on
 google calendar to figure it out.  So we're not using the DateNounType
 here.  Should we be?  And, is there a better name for this command? */
CreateCommand({
  name: "add&nbsp;to&nbsp;calendar",
  takes: {"event": arbText}, // TODO: use DateNounType or EventNounType?
  preview: "Adds the event to Google Calendar.",
  execute: function( eventString ) {
    addToGoogleCalendar( eventString );
  }
})



// TODO: Don't do a whole-sale copy of the page ;)
function checkCalendar(pblock, date) {
  var url = "http://www.google.com/calendar/m";
  var params = paramsToString({ as_sdt: date.toString("yyyyMMdd") });

  ajaxGet(url + params, function(html) {
    pblock.innerHTML = html;
  });
}

CreateCommand({
  name: "check&nbsp;calendar",
  takes: {"date to check": DateNounType},
  execute: function( date ) {
    var url = "http://www.google.com/calendar/m";
    var params = paramsToString({ as_sdt: date.toString("yyyyMMdd") });

    openUrlInBrowser( url + params );
  },
  preview: function( pblock, date ) {
    pblock.innerHTML = "Checks Google Calendar for the day of" +
  		       date.toString("dd MM, yyyy");
  	checkCalendar( pblock, date );
  }
});


// -----------------------------------------------------------------
// WEATHER COMMANDS
// -----------------------------------------------------------------


var WEATHER_TYPES = "none|tropical storm|hurricane|severe thunderstorms|thunderstorms|mixed rain and snow|mixed rain and sleet|mixed snow and sleet|freezing drizzle|drizzle|freezing rain|rain|rain|snow flurries|light snow showers|blowing snow|snow|hail|sleet|dust|foggy|haze|smoky|blustery|windy|cold|cloudy|mostly cloudy|mostly cloudy|partly cloudy|partly cloudy|clear|sunny|fair|fair|mixed rain and hail|hot|isolated thunderstorms|scattered thunderstorms|scattered thunderstorms|scattered showers|heavy snow|scattered snow showers|heavy snow|partly cloudy|thundershowers|snow showers|isolated thundershowers".split("|");

CreateCommand({
  name: "weather",
  takes: {"location": arbText},

  execute: function( location ) {
    var url = "http://www.wunderground.com/cgi-bin/findweather/getForecast?query=";
    url += escape( location );

    openUrlInBrowser( url );
  },

  preview: function( pblock, location ) {
    if( location.length < 1 ) {
      pblock.innerHTML = "Gets the weather for a zip code/city.";
      return;
    }

    var url = "http://www.google.com/ig/api";
    jQuery.get( url, {weather: location}, function(xml) {
      var el = jQuery(xml).find("current_conditions");
      if( el.length == 0 ) return;

      var condition = el.find("condition").attr("data");

      var weatherId = WEATHER_TYPES.indexOf( condition.toLowerCase() );
      var imgSrc = "http://l.yimg.com/us.yimg.com/i/us/nws/weather/gr/";
      imgSrc += weatherId + "d.png";

      var weather = {
        condition: condition,
        temp: el.find("temp_f").attr("data"),
        humidity: el.find("humidity").attr("data"),
        wind: el.find("wind_condition").attr("data"),
        img: imgSrc
      };

      weather["img"] = imgSrc;

      html = renderTemplate( "weather.html", {w:weather});

      jQuery(pblock).html( html );
      }, "xml");
  }
})


// -----------------------------------------------------------------
// MAPPING COMMANDS
// -----------------------------------------------------------------

CreateCommand({
  name: "map",
  takes: {"address": arbText},
  preview: function(pblock, location) {
    showPreviewFromFile( pblock, "templates/map.html", function(winInsecure) {
      winInsecure.setPreview( location );
    });
  }
})


// -----------------------------------------------------------------
// MISC COMMANDS
// -----------------------------------------------------------------

function cmd_view_source() {
  var url = Application.activeWindow.activeTab.document.location.href;
  url = "view-source:" + url;
  // TODO: Should do it this way:
  // openUrlInBrowser( "http://www.google.com" );
  getWindowInsecure().location = url;
}

var TabNounType = {
  _name: "tab name",

  // Returns all tabs from all windows.
  getTabs: function(){
    var tabs = {};

    for( var j=0; j < Application.windows.length; j++ ) {
      var window = Application.windows[j];
      for (var i = 0; i < window.tabs.length; i++) {
        var tab = window.tabs[i];
        tabs[tab.document.title] = tab;
      }
    }

    return tabs;
  },

  match:function( fragment ) {
    return TabNounType.suggest( fragment ).length > 0;
  },

  suggest: function( fragment ) {
    var suggestions  = [];
    var tabs = TabNounType.getTabs();

    for ( var tabName in tabs ) {
      if (tabName.match(fragment, "i"))
	      suggestions.push( tabName );
    }
    return suggestions.splice(0, 5);
  },
}

CreateCommand({
  name: "tab",
  takes: {"tab name": TabNounType},

  // TODO: BUG. This seems to get passed the first of whatever
  // it is in the suggestion list, instead of the selected thing
  // in the suggestion list. I wonder why that is?
  execute: function( tabName ) {
    var tabs = TabNounType.getTabs();
    tabs[tabName]._window.focus();
    tabs[tabName].focus();
  },

  preview: function( pblock, tabName ) {
    if( tabName.length > 1 )
      pblock.innerHTML = "Changes to <b>%s</b> tab.".replace(/%s/, tabName);
    else
      pblock.innerHTML = "Switch to tab by name."
  }
})



// -----------------------------------------------------------------
// TAB COMMANDS
// -----------------------------------------------------------------

CreateCommand({
  name: "close.related.tabs",
  takes: {"related word": arbText},

  preview: function( pblock, query ) {
    var relatedWord = query.toLowerCase();
    var html = null;
    if(relatedWord.length != 0){
      html = "Closes the following tabs that are related to <b style=\"color:yellow\">\"" + relatedWord + "\"</b> : <ul>";
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
      html = "Closes tabs related to the word";
    }
    jQuery(pblock).html( html );
  },

  execute: function( query ) {
    var relatedWord = query.toLowerCase();
    var numTabs = 0;

    Application.activeWindow.tabs.forEach(function(tab){
      if ( tab.uri.spec.toLowerCase().match(relatedWord) || tab.document.title.toLowerCase().match(relatedWord)){
        tab.close();
        numTabs++;
      }
    });

    displayMessage(numTabs + " tabs closed");
  }

})


CreateCommand({
  name: "go.to.tab",
  takes: {"related word": arbText},

  preview: function( pblock, query ) {
    var relatedWord = query.toLowerCase();
    var html = null;
    if(relatedWord.length != 0){
      html = "Goes to the first tab that are related to <b style=\"color:yellow\">\"" + relatedWord + "\"</b> : <ul>";
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
      html = "Goes tabs related to the word";
    }
    jQuery(pblock).html( html );
  },

  execute: function( query ) {
    var relatedWord = query.toLowerCase();
    var switchedFocus = false;
    Application.activeWindow.tabs.forEach(function(tab){
      if ( tab.uri.spec.toLowerCase().match(relatedWord) || tab.document.title.toLowerCase().match(relatedWord)){
        if(!switchedFocus){
          tab.focus();
          switchedFocus = true;
        }
      }
    });
  }

});


// -----------------------------------------------------------------
// PAGE EDIT COMMANDS
// -----------------------------------------------------------------

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
cmd_delete.preview = function( pblock ) {
  pblock.innerHTML = "Deletes the selected chunk of HTML from the page.";
}

function cmd_undelete() {
  loadJQuery(function() {
    var $ = window.jQuery;
    $("._toRemove").slideDown();
  });
}
cmd_undelete.preview = function( pblock ) {
  pblock.innerHTML = "Restores the HTML deleted by the delete command.";
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
