/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Ubiquity.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
 *   Blair McBride <unfocused@gmail.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var EXPORTED_SYMBOLS = ["Utils"];

const Cc = Components.classes;
const Ci = Components.interfaces;

var Utils = {};

Utils.__globalObject = this;


Utils.safeWrapper = function safeWrapper(func) {
  var wrappedFunc = function safeWrappedFunc() {
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
  var json = Cc["@mozilla.org/dom/json;1"]
             .createInstance(Ci.nsIJSON);
  return json.encode(object);
};

Utils.decodeJson = function decodeJson(string) {
  var json = Cc["@mozilla.org/dom/json;1"]
             .createInstance(Ci.nsIJSON);
  return json.decode(string);
};

Utils.__TimerCallback = function __TimerCallback(callback) {
  Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

  this._callback = callback;
  this.QueryInterface = XPCOMUtils.generateQI([Ci.nsITimerCallback]);
};

Utils.__TimerCallback.prototype = {
  notify : function notify(timer) {
    for(timerID in Utils.__timerData.timers) {
      if(Utils.__timerData.timers[timerID] == timer) {
        delete Utils.__timerData.timers[timerID];
        break;
      }
    }
    this._callback();
  }
};

Utils.__timerData = {
  nextID: Math.floor(Math.random() * 100) + 1,
  timers: {}
};

//Utils.setTimeout works just like DOM setTimeout() method
//but it can only accept a function (not a string) as the callback argument
//TODO: Allow strings for the first argument like DOM setTimeout() does.

Utils.setTimeout = function setTimeout(callback, delay) {
  var classObj = Cc["@mozilla.org/timer;1"];
  var timer = classObj.createInstance(Ci.nsITimer);
  var timerID = Utils.__timerData.nextID;
  // emulate window.setTimeout() by incrementing next ID by random amount
  Utils.__timerData.nextID += Math.floor(Math.random() * 100) + 1;
  Utils.__timerData.timers[timerID] = timer;

  timer.initWithCallback(new Utils.__TimerCallback(callback),
                         delay,
                         classObj.TYPE_ONE_SHOT);
  return timerID;
};

Utils.clearTimeout = function clearTimeout(timerID) {
  if(!(timerID in Utils.__timerData.timers))
    return;

  var timer = Utils.__timerData.timers[timerID];
  timer.cancel();
  delete Utils.__timerData.timers[timerID];
};

// Given a string representing an absolute URL or a nsIURI object,
// returns an equivalent nsIURI object.  Alternatively, an object with
// keyword arguments as keys can also be passed in; the following
// arguments are supported:
//
//   uri: a string/nsIURI representing an absolute or relative URL.
//
//   base: a string/nsIURI representing an absolute URL, which is used
//         as the base URL for the 'uri' keyword argument.
Utils.url = function url(spec) {
  var base = null;
  if (typeof(spec) == "object") {
    if (spec instanceof Ci.nsIURI)
      // nsIURL object was passed in, so just return it back
      return spec;

    // Assume jQuery-style dictionary with keyword args was passed in.
    base = Utils.url(spec.base);
    spec = spec.uri ? spec.uri : null;
  }

  var ios = Cc["@mozilla.org/network/io-service;1"]
    .getService(Ci.nsIIOService);
  return ios.newURI(spec, null, base);
};

Utils.openUrlInBrowser = function openUrlInBrowser(urlString, postData) {
  // allow postData to be null/undefined, string representation, json representation, or nsIInputStream
  // nsIInputStream is what is needed

  var postInputStream = null;
  if(postData) {
    if(postData instanceof Ci.nsIInputStream) {
      postInputStream = postData;
    } else {
      if(typeof postData == "object") // json -> string
        postData = Utils.paramsToString(postData);

      var stringStream = Cc["@mozilla.org/io/string-input-stream;1"]
        .createInstance(Ci.nsIStringInputStream);
      stringStream.data = postData;

      postInputStream = Cc["@mozilla.org/network/mime-input-stream;1"]
        .createInstance(Ci.nsIMIMEInputStream);
      postInputStream.addHeader("Content-Type", "application/x-www-form-urlencoded");
      postInputStream.addContentLength = true;
      postInputStream.setData(stringStream);
    }
  }

  var windowManager = Cc["@mozilla.org/appshell/window-mediator;1"]
    .getService(Ci.nsIWindowMediator);
  var browserWindow = windowManager.getMostRecentWindow("navigator:browser");
  var browser = browserWindow.getBrowser();

  var prefService = Cc["@mozilla.org/preferences-service;1"]
    .getService(Ci.nsIPrefBranch);
  var openPref = prefService.getIntPref("browser.link.open_newwindow");

  //2 (default in SeaMonkey and Firefox 1.5): In a new window
  //3 (default in Firefox 2 and above): In a new tab
  //1 (or anything else): In the current tab or window

  if(browser.mCurrentBrowser.currentURI.spec == "about:blank" && !browser.webProgress.isLoadingDocument )
    browserWindow.loadURI(urlString, null, postInputStream, false);
  else if(openPref == 3)
    browser.loadOneTab(urlString, null, null, postInputStream, false, false);
  else if(openPref == 2)
    window.openDialog('chrome://browser/content', '_blank', 'all,dialog=no',
                  urlString, null, null, postInputStream);
  else
    browserWindow.loadURI(urlString, null, postInputStream, false);
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
  var cookieManager = Cc["@mozilla.org/cookiemanager;1"].
                      getService(Ci.nsICookieManager);

  var iter = cookieManager.enumerator;
  while (iter.hasMoreElements()) {
    var cookie = iter.getNext();
    if (cookie instanceof Ci.nsICookie)
      if (cookie.host == domain && cookie.name == name )
        return cookie.value;
  }
  // if no matching cookie:
  return null;
};

Utils.paramsToString = function paramsToString(params) {
  var stringPairs = [];
  function addPair(key, value) {
    stringPairs.push(
      encodeURIComponent(key) + "=" + encodeURIComponent(value)
    );
  }
  for (key in params) {
    // note: explicitly ignoring values that are objects!
    if (params[key] instanceof Array) {
      params[key].forEach(function(item) {
        if(typeof item == "string")
          addPair(key + "[]", item);
      });
    } else if (typeof params[key] == "string") {
      addPair(key, params[key]);
    };
  }
  return "?" + stringPairs.join("&");
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
  jQuery.ajax({
    url:url,
    success: callbackFunction,
    error: failureFunction
  })
};

Utils.parseRemoteDocument = function parseRemoteDocument(remoteUrl, postParams, successCallback, errorCallback) {
  // based on code from http://mxr.mozilla.org/mozilla/source/browser/components/microsummaries/src/nsMicrosummaryService.js

  var rootElement = null;
  var iframe = null;

  var parseHandler = {
    handleEvent: function handleEvent(event) {
      event.target.removeEventListener("DOMContentLoaded", this, false);
      var doc = iframe.contentDocument;
      rootElement.removeChild(iframe);
      successCallback(doc);
    }
  };

  function parseHtml(htmlText) {
    var windowMediator = Cc['@mozilla.org/appshell/window-mediator;1']
      .getService(Ci.nsIWindowMediator);
    var window = windowMediator.getMostRecentWindow("navigator:browser");
    var document = window.document;
    rootElement = document.documentElement;
    iframe = document.createElement('iframe');
    iframe.setAttribute("collapsed", true);
    // secure iframe against untrusted content
    iframe.setAttribute("type", "content");
    // needed to create a docshell
    rootElement.appendChild(iframe);
    // stop loading about:blank (not needed, and weird things could happpen apparently)
    iframe.docShell.QueryInterface(Ci.nsIWebNavigation)
      .stop(Ci.nsIWebNavigation.STOP_NETWORK);
    // turn off unneeded/unwanted/bad things
    iframe.docShell.allowJavascript = false;
    iframe.docShell.allowAuth = false;
    iframe.docShell.allowPlugins = false;
    iframe.docShell.allowMetaRedirects = false;
    iframe.docShell.allowSubframes = false;
    iframe.docShell.allowImages = false;

    // Convert the HTML text into an input stream.
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
      .createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var stream = converter.convertToInputStream(htmlText);
    // Set up a channel to load the input stream.
    var channel = Cc["@mozilla.org/network/input-stream-channel;1"]
      .createInstance(Ci.nsIInputStreamChannel);
    channel.setURI(Utils.url(remoteUrl));
    channel.contentStream = stream;
    // Load in the background so we don't trigger web progress listeners.
    channel.QueryInterface(Ci.nsIRequest)
      .loadFlags |= Ci.nsIRequest.LOAD_BACKGROUND;
    // need to specify content type, so user isn't prompted to download "unknown" file type
    var baseChannel = channel.QueryInterface(Ci.nsIChannel);
    baseChannel.contentType = "text/html";
    // this will always be UTF-8 thanks to XMLHttpRequest and nsIScriptableUnicodeConverter
    baseChannel.contentCharset = "UTF-8";

    // background loads don't fire "load" events, listen for DOMContentLoaded instead
    iframe.addEventListener("DOMContentLoaded", parseHandler, true);
    var uriLoader = Cc["@mozilla.org/uriloader;1"]
      .getService(Ci.nsIURILoader);
    uriLoader.openURI(channel, true, iframe.docShell);
  }

  var ajaxOptions = {
    url: remoteUrl,
    type: "GET",
    datatype: "string",
    success: function success(responseText) {
      parseHtml(responseText);
    },
    error: function error() {
      if(errorCallback)
        errorCallback();
    }
  };

  if(postParams) {
    ajaxOptions.type = "POST";
    ajaxOptions.data = postParams;
  }

  jQuery.ajax(ajaxOptions);

};

Utils.trim = function trim(str) {
  return str.replace(/^\s+|\s+$/g,"");
};


Utils.History = {
  visitsToDomain : function visitsToDomain( domain ) {

      var hs = Cc["@mozilla.org/browser/nav-history-service;1"].
               getService(Ci.nsINavHistoryService);

      var query = hs.getNewQuery();
      var options = hs.getNewQueryOptions();

      options.maxResults = 10;
      query.domain = domain;

      // execute query
      var result = hs.executeQuery(query, options );
      var root = result.root;
      root.containerOpen = true;
      var count = 0;
      for( var i=0; i < root.childCount; ++i ) {
        place = root.getChild( i );
        count += place.accessCount;
      }
    return count;
  }
}