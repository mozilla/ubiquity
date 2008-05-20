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

function setTextSelection(html, context) {
  var doc = context.focusedWindow.document;
  if (doc.designMode == "on")
    doc.execCommand("insertHTML", false, html);
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
