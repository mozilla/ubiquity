CmdUtils = {};

CmdUtils.__globalObject = this;

CmdUtils.getHtmlSelection = function getHtmlSelection() {
  var sel = context.focusedWindow.getSelection();

  if (sel.rangeCount >= 1) {
    var html = sel.getRangeAt(0).cloneContents();
    var newNode = context.focusedWindow.document.createElement("p");
    newNode.appendChild(html);
    return newNode.innerHTML;
  }

  return null;
};

CmdUtils.safeWrapper = function safeWrapper(func) {
  var wrappedFunc = function() {
    try {
      func.apply(this, arguments);
    } catch (e) {
      displayMessage(
        {text: ("An exception occurred while running " +
                func.name + "()."),
         exception: e}
      );
    }
  };

  return wrappedFunc;
};

CmdUtils.setTextSelection = function setTextSelection(html) {

  var doc = context.focusedWindow.document;
  var focused = context.focusedElement;

  if (doc.designMode == "on") {
    doc.execCommand("insertHTML", false, html);
  }

  else if( focused ) {
    var el = doc.createElement( "html" );
    el.innerHTML = "<div>" + html + "</div>";

    var text = el.textContent;

    if( html != text){
      displayMessage( "This command requires a rich " +
                      "text field for full support.");
    }

    var selectionEnd = focused.selectionStart + text.length;
    var currentValue = focused.value;

    var beforeText = currentValue.substring(0, focused.selectionStart);
    var afterText = currentValue.substring(focused.selectionEnd, currentValue.length);

    focused.value = beforeText + text + afterText;
    focused.focus();

    //put the cursor after the inserted text
    focused.setSelectionRange(selectionEnd, selectionEnd);
  }

  else {
    var sel = context.focusedWindow.getSelection();

    if (sel.rangeCount >= 1) {
        var range = sel.getRangeAt(0);
        var newNode = doc.createElement("span");
        range.surroundContents(newNode);
        jQuery(newNode).html( html );
    }
  }
};

// This gets the outer document of the current tab.
CmdUtils.getDocumentInsecure = function getDocumentInsecure() {
  return CmdUtils.getWindowInsecure().document;
};

// This gets the outer window of the current tab.
CmdUtils.getWindowInsecure = function getWindowInsecure() {
  return Application.activeWindow
                    .activeTab
                    .document
                    .defaultView
                    .wrappedJSObject;
};

CmdUtils.injectCss = function injectCss(css) {
  var doc = CmdUtils.getDocumentInsecure();
  var style = doc.createElement("style");
  style.innerHTML = css;
  doc.body.appendChild(style);
};

CmdUtils.injectHtml = function injectHtml( html ) {
  var doc = CmdUtils.getDocumentInsecure();
  var div = doc.createElement("div");
  div.innerHTML = html;
  doc.body.appendChild(div.firstChild);
};

CmdUtils.log = function log(what) {
  var console = CmdUtils.getWindowInsecure().console;
  if (typeof(console) != "undefined"){
    console.log( what );
  } else {
    displayMessage("Firebug Required For Full Usage\n\n" + what);
  }
};

CmdUtils.injectJavascript = function injectJavascript(src, callback) {
  var doc = CmdUtils.getDocumentInsecure();

  var script = doc.createElement("script");
  script.src = src;
  doc.body.appendChild(script);

  script.addEventListener("load", function() {
    doc.body.removeChild( script );
    if (typeof(callback) == "function") {
      callback();
    }
  }, true);
};

CmdUtils.loadJQuery = function loadJQuery(func) {
  CmdUtils.injectJavascript(
    "http://code.jquery.com/jquery-latest.pack.js",
    CmdUtils.safeWrapper( function() {
      window.jQuery = window.$ = CmdUtils.getWindowInsecure().jQuery;
      func();
    })
  );
};

// Runs the function "callback" whenever a new page/tab is loaded in
// the window that this Ubiquity sandbox is associated with, passing
// the window's document object as a parameter.
CmdUtils.onPageLoad = function onPageLoad( callback ) {
  var safeCallback = CmdUtils.safeWrapper(callback);

  function _onPageLoad(aEvent) {
    var isValidPage = false;
    try {
      // See if we can get the current document;
      // if we get an exception, then the page that's
      // been loaded is probably XUL or something,
      // and we won't want to deal with it.
      var doc = Application.activeWindow
                           .activeTab
                           .document;
      isValidPage = true;
    } catch (e) {}
    if (isValidPage)
      safeCallback(aEvent.originalTarget);
  }

  var appcontent = window.document.getElementById("appcontent");
  windowGlobals._pageLoadFuncs.push(_onPageLoad);

  _onPageLoad.remove = function _onPageLoad_remove() {
    appcontent.removeEventListener("DOMContentLoaded",
                                   _onPageLoad,
                                   true);
  };

  appcontent.addEventListener("DOMContentLoaded", _onPageLoad, true);
};

CmdUtils.getTextSelection = function getTextSelection() {
  var focused = context.focusedElement;
  var retval = "";

  if (focused)
    if (focused.selectionStart != focused.selectionEnd)
      retval = focused.value.substring(focused.selectionStart,
                                       focused.selectionEnd);
  if (!retval) {
    var sel = context.focusedWindow.getSelection();
    if (sel.rangeCount >= 1)
      retval = sel.toString();
  }
  return retval;
};

CmdUtils.setLastResult = function setLastResult( result ) {
  globals.lastCmdResult = result;
};

// Uses Geo-ip lookup to get your current location.
CmdUtils.getLocation = function getLocation( ){
  if( globals.location ) return globals.location;

  jQuery.ajax({
    type: "GET",
    url: "http://j.maxmind.com/app/geoip.js",
    dataType: "text",
    async: false,
    success: function( js ) {
      eval( js );
      var loc = geoip_city() + ", " + geoip_region();
      globals.location = {
        city: geoip_city(),
        state: geoip_region_name(),
        country: geoip_country_name(),
        lat: geoip_latitude(),
        "long": geoip_longitude()
      };
    }
  });

  return globals.location;
};


CmdUtils.FBLog = function FBLog( arg1, arg2 ){
  if( arg2 )
    CmdUtils.getWindowInsecure().console.log( arg1, arg2 );
  else
    CmdUtils.getWindowInsecure().console.log( arg1 );
};


// -----------------------------------------------------------------
// SNAPSHOT RELATED
// -----------------------------------------------------------------

CmdUtils.getHiddenWindow = function getHiddenWindow() {
  return Components.classes["@mozilla.org/appshell/appShellService;1"]
                   .getService(Components.interfaces.nsIAppShellService)
                   .hiddenDOMWindow;
}

CmdUtils.snapshotWindow = function snapshotWindow( window, callback) {
  var top = 0;
  var left = 0;

  var hiddenWindow = CmdUtils.getHiddenWindow();
  var canvas = hiddenWindow.document.createElementNS("http://www.w3.org/1999/xhtml", "canvas" );

  var body = window.document.body;

  var width = jQuery(body).width();
  var height = window.innerHeight+110;

  canvas.width = width;
  canvas.height = height;

  var ctx = canvas.getContext( "2d" );
  ctx.drawWindow( window, left, top, width, height, "rgb(255,255,255)" );
  callback( canvas.toDataURL() );
}

CmdUtils.snapshotImage = function snapshotImage( url, callback ) {
  var hiddenWindow = CmdUtils.getHiddenWindow();
  var body = hiddenWindow.document.body;

  var canvas = hiddenWindow.document.createElementNS("http://www.w3.org/1999/xhtml", "canvas" );

  var img = new hiddenWindow.Image();
  img.src = url;//"http://www.google.com/logos/olympics08_opening.gif";
  img.addEventListener("load", function(){
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext( "2d" );
    ctx.drawImage( img, 0, 0 );

    callback( canvas.toDataURL() );
		       }, true);
}



// -----------------------------------------------------------------
// COMMAND CREATION FUNCTIONS
// -----------------------------------------------------------------


// Use like this:
// cmd_yelp.setOptions({
//  takes: { "restaurant":noun_arb_text },
//  modifiers: { near:noun_arb_text },
//  icon: "http://www.yelp.com/favicon.ico"
// })
Function.prototype.setOptions = function( options ) {
  // Returns the first key in a dictionary.
  function getKey( dict ) {
    for( var key in dict ) return key;
  }

  if( options.takes ) {
    this.DOLabel = getKey( options.takes );
    this.DOType = options.takes[this.DOLabel];
  }

  // Reserved keywords that shouldn't be added to the cmd function.
  var RESERVED = ["takes", "execute", "name"];

  for( var key in options ) {
    if( RESERVED.indexOf(key) == -1 )
      this[key] = options[key];
  }

  // If preview is a string, wrap it in a function that does
  // what you'd expect it to.
  if( typeof this["preview"] == "string" ) {
    var previewString = this["preview"];
    this["preview"] = function( pblock ){
      pblock.innerHTML = previewString;
    };
  }
};

// Creates a command from a list of options
CmdUtils.CreateCommand = function CreateCommand( options ) {
  var globalObj = CmdUtils.__globalObject;
  var execute;

  if (options.execute)
    execute = function() {
      options.execute.apply(options, arguments);
    };
  else
    execute = function() {
      displayMessage("No action defined.");
    };

  globalObj["cmd_" + options.name] = execute;
  globalObj["cmd_" + options.name].setOptions( options );
};

// -----------------------------------------------------------------
// TEMPLATING FUNCTIONS
// -----------------------------------------------------------------


CmdUtils.renderStringTemplate = function renderStringTemplate( string, data ) {
  var template = Template.parseTemplate( string );
  return template.process( data );
};

CmdUtils.renderTemplate = function renderTemplate( templateName, data ) {
  var chromePrefixUrl = "chrome://ubiquity/content/templates/";

  var template = Utils.getLocalUrl( chromePrefixUrl + templateName );
  return CmdUtils.renderStringTemplate( template, data );
};

CmdUtils.showPreviewFromFile = function showPreviewFromFile( pblock,
                                                             filePath,
                                                             callback ) {
  var iframe = pblock.ownerDocument.createElement("iframe");
  var browser;
  iframe.setAttribute("src", "chrome://ubiquity/content/mapping/mapping.xul");
  iframe.style.border = "none";
  iframe.setAttribute("width", 500);
  function onXulLoad() {
    var ioSvc = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
    var extMgr = Components.classes["@mozilla.org/extensions/manager;1"]
                 .getService(Components.interfaces.nsIExtensionManager);
    var loc = extMgr.getInstallLocation("ubiquity@labs.mozilla.com");
    var extD = loc.getItemLocation("ubiquity@labs.mozilla.com");
    var uri = ioSvc.newFileURI(extD).spec;
    uri += "chrome/content/" + filePath;
    browser = iframe.contentDocument.createElement("browser");
    browser.setAttribute("src", uri);
    browser.setAttribute("width", 500);
    browser.setAttribute("height", 300);
    function onBrowserLoad() {
      // TODO: Security risk -- this is very insecure!
      callback( browser.contentWindow );
    }
    browser.addEventListener("load", CmdUtils.safeWrapper(onBrowserLoad),
                             true);
    iframe.contentDocument.documentElement.appendChild(browser);
    browser.contentWindow.addEventListener("load", onBodyLoad, false);
  }

  iframe.addEventListener("load", CmdUtils.safeWrapper(onXulLoad), true);
  pblock.innerHTML = "";
  pblock.appendChild(iframe);

  // In order to modify the browser/iframe size based on contents, add an event listener to check when the DOM is modified.
  // This is done by specifically inserting a div when the preview size changes.
  // This currently prevents the use of animation for the preview-pane... hopefully find a fix for future release.
  function onBodyLoad() {
    browser.contentWindow.document.getElementById("map").addEventListener("DOMNodeInserted", onDomModified, false);
  }
  function onDomModified() {
    var previewPane = browser.contentWindow.document.getElementsByName("preview-pane")[0];
    iframe.setAttribute("height", previewPane.clientHeight);
    browser.setAttribute("height", previewPane.clientHeight);
  }

};
