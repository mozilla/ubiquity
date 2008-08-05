function encodeJson(object) {
  var json = Components.classes["@mozilla.org/dom/json;1"]
             .createInstance(Components.interfaces.nsIJSON);
  return json.encode(object);
}

function decodeJson(string) {
  var json = Components.classes["@mozilla.org/dom/json;1"]
             .createInstance(Components.interfaces.nsIJSON);
  return json.decode(string);
}

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

// Synchronously retrieves the content of the given local URL
// and returns it.
function getLocalUrl(url) {
  var req = new XMLHttpRequest();
  req.open('GET', url, false);
  req.overrideMimeType("text/plain");
  req.send(null);
  if (req.status == 0)
    return req.responseText;
  else
    throw new Error("Failed to get " + url);
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
