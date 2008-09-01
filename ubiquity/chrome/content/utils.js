var Utils = {};

Utils.__globalObject = this;


Utils.safeWrapper = function safeWrapper(func) {
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

Utils.encodeJson = function encodeJson(object) {
  var json = Components.classes["@mozilla.org/dom/json;1"]
             .createInstance(Components.interfaces.nsIJSON);
  return json.encode(object);
};

Utils.decodeJson = function decodeJson(string) {
  var json = Components.classes["@mozilla.org/dom/json;1"]
             .createInstance(Components.interfaces.nsIJSON);
  return json.decode(string);
};

Utils.__TimerCallback = function __TimerCallback(callback) {
  Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
  var Ci = Components.interfaces;

  this._callback = callback;
  this.QueryInterface = XPCOMUtils.generateQI([Ci.nsITimerCallback]);
};

Utils.__TimerCallback.prototype = {
  notify : function(timer) {
    this._callback();
  }
};

Utils.setTimeout = function setTimeout(callback, delay) {
  var classObj = Components.classes["@mozilla.org/timer;1"];
  var timer = classObj.createInstance(Components.interfaces.nsITimer);

  timer.initWithCallback(new Utils.__TimerCallback(callback),
                         delay,
                         classObj.TYPE_ONE_SHOT);
};

Utils.url = function url(spec) {
  if (typeof(spec) != "string")
    // Assume that a URI object was passed in, so just return it back.
    return spec;
  var classObj = Components.classes["@mozilla.org/network/io-service;1"];
  var ios = classObj.getService(Components.interfaces.nsIIOService);
  return ios.newURI(spec, null, null);
};

Utils.openUrlInBrowser = function openUrlInBrowser(urlString, postData) {
  // allow postData to be null/undefined, string representation, json representation, or nsIInputStream
  // nsIInputStream is what is needed
  
  var postInputStream = null;
  if(postData) {
    if(postData instanceof Components.interfaces.nsIInputStream) {
      postInputStream = postData;
    } else {
      if(typeof postData == "object") // json -> string
        postData = Utils.paramsToString(postData);
      
      var stringStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
        .createInstance(Components.interfaces.nsIStringInputStream);
      stringStream.data = postData;
      
      postInputStream = Components.classes["@mozilla.org/network/mime-input-stream;1"]
        .createInstance(Components.interfaces.nsIMIMEInputStream);
      postInputStream.addHeader("Content-Type", "application/x-www-form-urlencoded");
      postInputStream.addContentLength = true;
      postInputStream.setData(stringStream);
    }
  }


  var windowManager = Components.classes["@mozilla.org/appshell/window-mediator;1"]
    .getService(Components.interfaces.nsIWindowMediator);
  var browserWindow = windowManager.getMostRecentWindow("navigator:browser");
  var browser = browserWindow.getBrowser();
  
  if(browser.mCurrentBrowser.currentURI.spec == "about:blank")
    browserWindow.loadURI(urlString, null, postInputStream, false);
  else
    browser.loadOneTab(urlString, null, null, postInputStream, false, false);
};

// Focuses a tab with the given URL if one exists in the current
// window, otherwise opens a new tab with the URL and focuses it.
Utils.focusUrlInBrowser = function focusUrlInBrowser(urlString) {
  var tabs = Application.activeWindow.tabs;
  for (var i = 0; i < tabs.length; i++)
    if (tabs[i].uri.spec == urlString) {
      tabs[i].focus();
      return;
    }
  Utils.openUrlInBrowser(urlString);
};

Utils.getCookie = function getCookie(domain, name) {
  var cookieManager = Components.classes["@mozilla.org/cookiemanager;1"].
                      getService(Components.interfaces.nsICookieManager);

  var iter = cookieManager.enumerator;
  while (iter.hasMoreElements()) {
    var cookie = iter.getNext();
    if (cookie instanceof Components.interfaces.nsICookie)
      if (cookie.host == domain && cookie.name == name )
        return cookie.value;
  }
};

Utils.paramsToString = function paramsToString(params) {
  var string = "?";

  for (key in params) {
    string += encodeURIComponent(key) + "=" + encodeURIComponent(params[key]) + "&";
  }

  // Remove the trailing &
  return string.substr(0, string.length - 1);
};

// Synchronously retrieves the content of the given local URL
// and returns it.
Utils.getLocalUrl = function getLocalUrl(url) {
  var req = new XMLHttpRequest();
  req.open('GET', url, false);
  req.overrideMimeType("text/plain");
  req.send(null);
  if (req.status == 0)
    return req.responseText;
  else
    throw new Error("Failed to get " + url);
};

Utils.ajaxGet = function ajaxGet(url, callbackFunction, failureFunction) {
  var request = new window.XMLHttpRequest();
  request.open("GET", url, true);
  request.setRequestHeader("Content-Type",
                           "application/x-www-form-urlencoded");

  var onRscFunc = function ajaxGet_onReadyStateChange() {
    if (request.readyState == 4) {
      if (request.status == 200) {
        if (request.responseText)
          callbackFunction(request.responseText);
        else
          callbackFunction("");
      } else {
        if(failureFunction)
          failureFunction();
        else
          throw new Error("Ajax request failed: " + url);
      }
    }
  };

  // If we're being called in the context of a command, safe-wrap the
  // callback.
  if (Utils.__globalObject.CmdUtils)
    onRscFunc = Utils.safeWrapper(onRscFunc);

  request.onreadystatechange = onRscFunc;
  request.send(null);
};


Utils.trim = function(str) {
  var str = str.replace(/^\s\s*/, ''),
    ws = /\s/,
    i = str.length;
  while (ws.test(str.charAt(--i)));
  return str.slice(0, i + 1);
}