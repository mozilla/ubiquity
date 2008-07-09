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
}

// This gets the outer document of the current tab.
function getDocumentInsecure() {
  return getWindowInsecure().document;
}

// This gets the outer window of the current tab.
function getWindowInsecure() {
  return Application.activeWindow
                    .activeTab
                    .document
                    .defaultView
                    .wrappedJSObject;
}

function injectCss(css) {
  var doc = getDocumentInsecure();
  var style = doc.createElement("style");
  style.innerHTML = css;
  doc.body.appendChild(style);
}

function injectHtml( html ) {
  var doc = getDocumentInsecure();
  var div = doc.createElement("div");
  div.innerHTML = html;
  doc.body.appendChild(div.firstChild);
}

function log(what) {
  var console = getWindowInsecure().console;
  if (typeof(console) != "undefined"){
    console.log( what );
  } else {
    displayMessage("Firebug Required For Full Usage\n\n" + what);
  }
}

function injectJavascript(src, callback) {
  var doc = getDocumentInsecure();

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
      window.jQuery = window.$ = getWindowInsecure().jQuery;
      func();
    })
  );
}

// Runs the function "callback" whenever a new page/tab is loaded in
// the window that this Ubiquity sandbox is associated with, passing
// the window's document object as a parameter.
function onPageLoad( callback ) {
  var safeCallback = safeWrapper(callback);

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
  injectCss("#_box{ position:fixed; left:0; bottom:0; width:100%; " +
            "       z-index: 1000;" +
            "       height: 85px; background-color:#CCC; display:none; " +
            "       text-align:center;" +
            "       border-top: 1px solid #999; font-size: 12pt; " +
            "       overflow-y: auto;} " +
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

function paramsToString(params) {
  var string = "?";

  for (key in params) {
    string += escape(key) + "=" + escape(params[key]) + "&";
  }

  // Remove the trailing &
  return string.substr(0, string.length - 1);
}
