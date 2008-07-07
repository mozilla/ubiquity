function __TimerCallback(callback) {
  Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
  var Ci = Components.interfaces;

  this._callback = callback;
  this.QueryInterface = XPCOMUtils.generateQI([Ci.nsITimerCallback]);
}

__TimerCallback.prototype = {
  notify : function(timer) {
    this._callback();
  }
};

function setTimeout(callback, delay) {
  var classObj = Components.classes["@mozilla.org/timer;1"];
  var timer = classObj.createInstance(Components.interfaces.nsITimer);

  timer.initWithCallback(new __TimerCallback(callback),
                         delay,
                         classObj.TYPE_ONE_SHOT);
}

function url(spec) {
  var classObj = Components.classes["@mozilla.org/network/io-service;1"];
  var ios = classObj.getService(Components.interfaces.nsIIOService);
  return ios.newURI(spec, null, null);
}

function openUrlInBrowser(urlString) {
  var tab = Application.activeWindow.open(url(urlString));
  tab.focus();
}

function getHtmlSelection() {
  var sel = context.focusedWindow.getSelection();

  if (sel.rangeCount >= 1) {
    var html = sel.getRangeAt(0).cloneContents();
    var newNode = context.focusedWindow.document.createElement("p");
    newNode.appendChild(html);
    return newNode.innerHTML;
  }

  return null;
}

function getTextSelection() {
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
}

function safeWrapper(func) {
  var wrappedFunc = function() {
    try {
      func();
    } catch (e) {
      displayMessage("An exception occurred: " + e);
    }
  };

  return wrappedFunc;
}

function ajaxGet(url, callbackFunction) {
  var request = new window.XMLHttpRequest();
  request.open("GET", url, true);
  request.setRequestHeader("Content-Type",
                           "application/x-www-form-urlencoded");

  request.onreadystatechange = safeWrapper( function() {
    if (request.readyState == 4 && request.status == 200)
      if (request.responseText)
        callbackFunction(request.responseText);
  });

  request.send(null);
}


function setTextSelection(html) {

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
      displayMessage( "This command requires a rich text field for full support.")
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
    displayMessage(html);
    var div = doc.createElement("span");
    div.innerHTML = html;
    div.style.position = "absolute";
    div.style.top = "100px";
    div.style.left = "100px";
    div.style.border = "5px solid #666";
    div.style.backgroundColor = "white";
    doc.body.appendChild(div);
  }
}

// This gets the outer document of the current tab.
function getDocument() {
  return getWindow().document;
}

// This gets the outer window of the current tab.
function getWindow() {
  return Application.activeWindow
                    .activeTab
                    .document
                    .defaultView
                    .wrappedJSObject;
}

function injectCss(css) {
  var doc = getDocument();
  var style = doc.createElement("style");
  style.innerHTML = css;
  doc.body.appendChild(style);
}

function injectHtml( html ) {
  var doc = getDocument();
  var div = doc.createElement("div");
  div.innerHTML = html;
  doc.body.appendChild(div.firstChild);
}

function log(what) {
  var console = getWindow().console;
  if (typeof(console) != "undefined"){
    console.log( what );
  } else {
    displayMessage("Firebug Required For Full Usage\n\n" + what);
  }
}

function injectJavascript(src, callback) {
  var doc = getDocument();

  var script = doc.createElement("script");
  script.src = src;
  doc.body.appendChild(script);

  script.addEventListener("load", function() {
    doc.body.removeChild( script );
    if (typeof(callback) == "function") {
      callback();
    }
  }, true);
}

function loadJQuery(func) {
  injectJavascript(
    "http://code.jquery.com/jquery-latest.pack.js",
    safeWrapper( function() {
      window.jQuery = window.$ = getWindow().jQuery;
      func();
    })
  );
}

// Runs the function "callback" whenever a new page/tab is loaded
// Also handles the case where new windows are opened.
function onPageLoad( callback ) {
  var activeWin = Application.activeWindow;
  
  function addLoadHandlerToTab( tab ) {
    tab.events.addListener( "load", callback );    
  }
  
  function addLoadHandlerToTabs(){
    activeWin.tabs.forEach( addLoadHandlerToTab );
  }
  
  addLoadHandlerToTabs();
  activeWin.events.removeListener( "TabOpen", addLoadHandlerToTab );    
  activeWin.events.addListener( "TabOpen", addLoadHandlerToTabs );
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
  var sel = getTextSelection();
  if (sel.length != 0)
    callback(sel);
  else
    humanePrompt(message, callback);
}
