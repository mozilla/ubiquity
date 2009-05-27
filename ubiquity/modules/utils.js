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

// = Utils =
//
// This is a small library of all-purpose, general utility functions
// for use by chrome code.  Everything clients need is contained within
// the {{{Utils}}} namespace.

var EXPORTED_SYMBOLS = ["Utils"];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

var Utils = {
  // xpcshell workaround
  get Application() {
    delete this.Application;
    return this.Application = (Cc["@mozilla.org/fuel/application;1"]
                               .getService(Ci.fuelIApplication));
  }
};

// Keep a reference to the global object, as certain utility functions
// need it.
Utils.__globalObject = this;

// ** {{{ Utils.reportWarning() }}} **
//
// This function can be used to report a warning to the JS Error Console,
// which can be displayed in Firefox by choosing "Error Console" from
// the "Tools" menu.
//
// {{{aMessage}}} is a plaintext string corresponding to the warning
// to provide.
//
// {{{stackFrameNumber}}} is an optional number specifying how many
// frames back in the call stack the warning message should be
// associated with. Its default value is 0, meaning that the line
// number of the caller is shown in the JS Error Console.  If it's 1,
// then the line number of the caller's caller is shown.

Utils.reportWarning = function reportWarning(aMessage, stackFrameNumber) {
  var stackFrame = Components.stack.caller;

  if (typeof(stackFrameNumber) != "number")
    stackFrameNumber = 0;

  for (var i = 0; i < stackFrameNumber; i++)
    stackFrame = stackFrame.caller;

  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                       .getService(Components.interfaces.nsIConsoleService);
  var scriptError = Components.classes["@mozilla.org/scripterror;1"]
                    .createInstance(Components.interfaces.nsIScriptError);
  var aSourceName = stackFrame.filename;
  var aSourceLine = stackFrame.sourceLine;
  var aLineNumber = stackFrame.lineNumber;
  var aColumnNumber = null;
  var aFlags = scriptError.warningFlag;
  var aCategory = "ubiquity javascript";
  scriptError.init(aMessage, aSourceName, aSourceLine, aLineNumber,
                   aColumnNumber, aFlags, aCategory);
  consoleService.logMessage(scriptError);
};

// ** {{{ Utils.reportInfo() }}} **
//
// Reports a purely informational message to the JS Error Console.
// Source code links aren't provided for informational messages, so
// unlike {{{Utils.reportWarning()}}}, a stack frame can't be passed
// in to this function.

Utils.reportInfo = function reportInfo(aMessage) {
  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                       .getService(Components.interfaces.nsIConsoleService);
  var aCategory = "ubiquity javascript: ";
  consoleService.logStringMessage(aCategory + aMessage);
};

// ** {{{ Utils.encodeJson() }}} **
//
// This function serializes the given object using JavaScript Object
// Notation (JSON).

Utils.encodeJson = function encodeJson(object) {
  var json = Cc["@mozilla.org/dom/json;1"]
             .createInstance(Ci.nsIJSON);
  return json.encode(object);
};

// ** {{{ Utils.decodeJson() }}} **
//
// This function unserializes the given string in JavaScript Object
// Notation (JSON) format and returns the result.

Utils.decodeJson = function decodeJson(string) {
  var json = Cc["@mozilla.org/dom/json;1"]
             .createInstance(Ci.nsIJSON);
  return json.decode(string);
};

// ** {{{Utils.ellipsify()}}} **
//
// Given a DOM node and a maximum number of characters, returns a
// new DOM node that has the same contents truncated to that number of
// characters. If any truncation was performed, an ellipsis is placed
// at the end of the content.

Utils.ellipsify = function ellipsify(node, chars) {
  var doc = node.ownerDocument;
  var copy = node.cloneNode(false);
  if (node.hasChildNodes()) {
    var children = node.childNodes;
    for (var i = 0; i < children.length && chars > 0; i++) {
      var childNode = children[i];
      var childCopy;
      if (childNode.nodeType == childNode.TEXT_NODE) {
        var value = childNode.nodeValue;
        if (value.length >= chars) {
          childCopy = doc.createTextNode(value.slice(0, chars) + "\u2026");
          chars = 0;
        } else {
          childCopy = childNode.cloneNode(false);
          chars -= value.length;
        }
      } else if (childNode.nodeType == childNode.ELEMENT_NODE) {
        childCopy = ellipsify(childNode, chars);
        chars -= childCopy.textContent.length;
      }
      copy.appendChild(childCopy);
    }
  }
  return copy;
}

// ** {{{ Utils.setTimeout() }}} **
//
// This function works just like the {{{window.setTimeout()}}} method
// in content space, but it can only accept a function (not a string)
// as the callback argument.
//
// {{{callback}}} is the callback function to call when the given
// delay period expires.  It will be called only once (not at a regular
// interval).
//
// {{{delay}}} is the delay, in milliseconds, after which the callback
// will be called once.
//
// {{arg1, arg2 ...}} are optional arguments that will be passed to
// the callback.
//
// This function returns a timer ID, which can later be given to
// {{{Utils.clearTimeout()}}} if the client decides that it wants to
// cancel the callback from being triggered.

// TODO: Allow strings for the first argument like DOM setTimeout() does.

Utils.setTimeout = function setTimeout(callback, delay /*, arg1, arg2 ...*/) {
  var timerClass = Cc["@mozilla.org/timer;1"];
  var timer = timerClass.createInstance(Ci.nsITimer);
  // emulate window.setTimeout() by incrementing next ID
  var timerID = Utils.__timerData.nextID++;
  Utils.__timerData.timers[timerID] = timer;

  timer.initWithCallback(new Utils.__TimerCallback(callback,
                                                   Array.slice(arguments, 2)),
                         delay,
                         timerClass.TYPE_ONE_SHOT);
  return timerID;
};

// ** {{{ Utils.clearTimeout() }}} **
//
// This function behaves like the {{{window.clearTimeout()}}} function
// in content space, and cancels the callback with the given timer ID
// from ever being called.

Utils.clearTimeout = function clearTimeout(timerID) {
  var {timers} = Utils.__timerData;
  var timer = timers[timerID];
  if (timer) {
    timer.cancel();
    delete timers[timerID];
  }
};

// Support infrastructure for the timeout-related functions.

Utils.__TimerCallback = function __TimerCallback(callback, args) {
  this._callback = callback;
  this._args = args;
  this.QueryInterface = XPCOMUtils.generateQI([Ci.nsITimerCallback]);
};

Utils.__TimerCallback.prototype = {
  notify : function notify(timer) {
    var {timers} = Utils.__timerData;
    for (let timerID in timers)
      if (timers[timerID] === timer) {
        delete timers[timerID];
        break;
      }
    this._callback.apply(null, this._args);
  }
};

Utils.__timerData = {
  nextID: 1,
  timers: {}
};

// ** {{{ Utils.url() }}} **
//
// Given a string representing an absolute URL or a {{{nsIURI}}}
// object, returns an equivalent {{{nsIURI}}} object.  Alternatively,
// an object with keyword arguments as keys can also be passed in; the
// following arguments are supported:
//
// * {{{uri}}} is a string or {{{nsIURI}}} representing an absolute or
//   relative URL.
//
// * {{{base}}} is a string or {{{nsIURI}}} representing an absolute
//   URL, which is used as the base URL for the {{{uri}}} keyword
//   argument.
//
// An optional second argument may also be passed in, which specifies
// a default URL to return if the given URL can't be parsed.

Utils.url = function url(spec, defaultUri) {
  var base = null;
  if (typeof(spec) == "object") {
    if (spec instanceof Ci.nsIURI)
      // nsIURL object was passed in, so just return it back
      return spec;

    // Assume jQuery-style dictionary with keyword args was passed in.
    base = spec.base ? Utils.url(spec.base, defaultUri) : null;
    spec = spec.uri ? spec.uri : null;
  }

  var ios = Cc["@mozilla.org/network/io-service;1"]
    .getService(Ci.nsIIOService);

  try {
    return ios.newURI(spec, null, base);
  } catch (e if (e.result == Components.results.NS_ERROR_MALFORMED_URI) &&
           defaultUri) {
    return Utils.url(defaultUri);
  }
};

// ** {{{ Utils.openUrlInBrowser() }}} **
//
// This function opens the given URL in the user's browser, using
// their current preferences for how new URLs should be opened (e.g.,
// in a new window vs. a new tab, etc).
//
// {{{urlString}}} is a string corresponding to the URL to be
// opened.
//
// {{{postData}}} is an optional argument that allows HTTP POST data
// to be sent to the newly-opened page.  It may be a string, an Object
// with keys and values corresponding to their POST analogues, or an
// {{{nsIInputStream}}}.

Utils.openUrlInBrowser = function openUrlInBrowser(urlString, postData) {
  var postInputStream = null;
  if(postData) {
    if(postData instanceof Ci.nsIInputStream) {
      postInputStream = postData;
    } else {
      if(typeof postData == "object") // json -> string
        postData = Utils.paramsToString(postData, "");

      var stringStream = (Cc["@mozilla.org/io/string-input-stream;1"]
                          .createInstance(Ci.nsIStringInputStream));
      stringStream.data = postData;

      postInputStream = (Cc["@mozilla.org/network/mime-input-stream;1"]
                         .createInstance(Ci.nsIMIMEInputStream));
      postInputStream.addHeader("Content-Type",
                                "application/x-www-form-urlencoded");
      postInputStream.addContentLength = true;
      postInputStream.setData(stringStream);
    }
  }

  var browserWindow = Utils.currentChromeWindow;
  var browser = browserWindow.getBrowser();

  var prefService = (Cc["@mozilla.org/preferences-service;1"]
                     .getService(Ci.nsIPrefBranch));
  var openPref = prefService.getIntPref("browser.link.open_newwindow");

  //2 (default in SeaMonkey and Firefox 1.5): In a new window
  //3 (default in Firefox 2 and above): In a new tab
  //1 (or anything else): In the current tab or window

  if(browser.mCurrentBrowser.currentURI.spec == "about:blank" &&
     !browser.webProgress.isLoadingDocument )
    browserWindow.loadURI(urlString, null, postInputStream, false);
  else if(openPref == 3){
    var ke = (Utils.currentChromeWindow.gUbiquity || 0).lastKeyEvent || 0;
    browser[ke.shiftKey || ke.ctrlKey ? 'addTab' : 'loadOneTab'](
      urlString, null, null, postInputStream, false, false);
  }
  else if(openPref == 2)
    browserWindow.openDialog('chrome://browser/content', '_blank',
                             'all,dialog=no', urlString, null, null,
                             postInputStream);
  else
    browserWindow.loadURI(urlString, null, postInputStream, false);
};

// ** {{{ Utils.focusUrlInBrowser() }}} **
//
// This function focuses a tab with the given URL if one exists in the
// current window; otherwise, it delegates the opening of the URL in a
// new window or tab to {{{Utils.openUrlInBrowser()}}}.

Utils.focusUrlInBrowser = function focusUrlInBrowser(urlString) {
  for each (let tab in Utils.Application.activeWindow.tabs)
    if (tab.uri.spec === urlString) {
      tab.focus();
      return;
    }
  Utils.openUrlInBrowser(urlString);
};

// ** {{{ Utils.getCookie() }}} **
//
// This function returns the cookie for the given domain and with the
// given name.  If no matching cookie exists, {{{null}}} is returned.

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

// ** {{{ Utils.paramsToString() }}} **
//
// This function takes the given Object containing keys and
// values into a querystring suitable for inclusion in an HTTP
// GET or POST request.
//
// {{{params}}} is the key-value pairs.
//
// {{{prefix = "?"}}} is an optional string prepended to the result.

Utils.paramsToString = function paramsToString(params, prefix) {
  var stringPairs = [];
  function addPair(key, value) {
    // note: explicitly ignoring values that are functions/null/undefined!
    if (typeof value !== "function" && value != null)
      stringPairs.push(
        encodeURIComponent(key) + "=" + encodeURIComponent(value));
  }
  for (var key in params) {
    if (Utils.isArray(params[key])) {
      params[key].forEach(function(item) {
        addPair(key, item);
      });
    } else {
      addPair(key, params[key]);
    };
  }
  return (prefix == null ? "?" : prefix) + stringPairs.join("&");
};

// ** {{{ Utils.urlToParams() }}} **
//
// This function takes the given url and returns an Object containing keys and
// values retrieved from its query-part.

Utils.urlToParams = function urlToParams(url) {
  var params = {};
  for each (let param in url.slice(url.indexOf("?") + 1).split("&")) {
    var [key, val] = param.split("=");
    val = val ? val.replace(/\+/g, " ") : "";
    try { val = decodeURIComponent(val) } catch (e) {};
    params[key] = (key in params
                   ? [].concat(params[key], val)
                   : val);
  }
  return params;
}

// ** {{{ Utils.getLocalUrl() }}} **
//
// This function synchronously retrieves the content of the given
// local URL, such as a {{{file:}}} or {{{chrome:}}} URL, and returns
// it.

Utils.getLocalUrl = function getLocalUrl(url) {
  var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
            .createInstance(Ci.nsIXMLHttpRequest);
  req.open("GET", url, false);
  req.overrideMimeType("text/plain");
  req.send(null);
  if (req.status == 0)
    return req.responseText;
  else
    throw new Error("Failed to get " + url);
};

// ** {{{ Utils.trim() }}} **
//
// This function removes all whitespace surrounding a string and
// returns the result.

// See http://blog.stevenlevithan.com/archives/faster-trim-javascript
Utils.trim = function trim(str) {
  var i = str.search(/\S/);
  if (i < 0) return "";
  var j = str.length;
  while (/\s/.test(str[--j]));
  return str.slice(i, j + 1);
};

// ** {{{ Utils.isArray() }}} **
//
// This function returns whether or not its parameter is an instance
// of a JavaScript Array object.

Utils.isArray = function isArray(val) {
  return (val != null &&
          typeof val === "object" &&
          (val.constructor || 0).name === "Array");
}

// == {{{ Utils.History }}} ==
//
// This object contains functions that make it easy to access
// information about the user's browsing history.

Utils.History = {

  // ** {{{ Utils.History.visitsToDomain() }}} **
  //
  // This function returns the number of times the user has visited
  // the given domain name.

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
};

// ** {{{ Utils.computeCryptoHash() }}} **
//
// Computes and returns a cryptographic hash for a string given an
// algorithm.
//
// {{{algo}}} is a string corresponding to a valid hash algorithm.  It
// can be any one of {{{MD2}}}, {{{MD5}}}, {{{SHA1}}}, {{{SHA256}}},
// {{{SHA384}}}, or {{{SHA512}}}.
//
// {{{str}}} is the string to be hashed.

Utils.computeCryptoHash = function computeCryptoHash(algo, str) {
  var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                  .createInstance(Ci.nsIScriptableUnicodeConverter);
  converter.charset = "UTF-8";
  var result = {};
  var data = converter.convertToByteArray(str, result);
  var crypto = Cc["@mozilla.org/security/hash;1"]
               .createInstance(Ci.nsICryptoHash);
  crypto.initWithString(algo);
  crypto.update(data, data.length);
  var hash = crypto.finish(false);

  function toHexString(charCode) {
    return ("0" + charCode.toString(16)).slice(-2);
  }
  var hashString = [toHexString(hash.charCodeAt(i))
                    for (i in hash)].join("");
  return hashString;
};

// ** {{{ Utils.escapeHtml() }}} **
//
// This function returns a version of the string safe for
// insertion into HTML. Useful when you just want to
// concatenate a bunch of strings into an HTML fragment
// and ensure that everything's escaped properly.

Utils.escapeHtml = function escapeHtml(str) {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/\'/g, "&#39;");
};


// ** {{{ Utils.convertFromUnicode() }}} **
//
// Encodes the given unicode text to a given character set and
// returns the result.
//
// {{{toCharset}}} is a string corresponding to the character set
// to encode to.
//
// {{{text}}} is a unicode string.

Utils.convertFromUnicode = function convertFromUnicode(toCharset, text) {
  var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                  .getService(Ci.nsIScriptableUnicodeConverter);
  converter.charset = toCharset;
  return converter.ConvertFromUnicode(text);
};

// ** {{{ Utils.convertToUnicode() }}} **
//
// Decodes the given text from a character set to unicode and returns
// the result.
//
// {{{fromCharset}}} is a string corresponding to the character set to
// decode from.
//
// {{{text}}} is a string encoded in the character set
// {{{fromCharset}}}.

Utils.convertToUnicode = function convertToUnicode(fromCharset, text) {
  var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                  .getService(Ci.nsIScriptableUnicodeConverter);
  converter.charset = fromCharset;
  return converter.ConvertToUnicode(text);
};

// == {{{ Utils.tabs }}} ==
//
// This Object contains functions related to Firefox tabs.

Utils.tabs = {

  // ** {{{ Utils.tabs.get() }}} **
  //
  // Gets an array of open tabs.
  //
  // {{{name}}} is an optional string tab name (title or URL).
  // If supplied, this function returns exactly matched tabs with it.

  get: function Utils_tabs_get(name) {
    var tabs = [], {push} = tabs;
    for each (let win in Utils.Application.windows)
      push.apply(tabs, win.tabs);
    return (name == null
            ? tabs
            : tabs.filter(function({document: d})(d.title === name ||
                                                  d.URL   === name)));
  },

  // ** {{{ Utils.tabs.search() }}} **
  //
  // Searches for tabs by title or URL and returns an array of tab references.
  //
  // {{{matcher}}} is a string or RegExp object to match with.
  //
  // {{{maxResults = 2147483647}}} is an optinal integer specifying
  // the maximum number of results to return.

  search: function Utils_tabs_search(matcher, maxResults) {
    var matches = [], tester;
    try {
      tester = (typeof matcher.test === "function"
                ? matcher
                : RegExp(matcher, "i"));
    } catch (e if e instanceof SyntaxError) {
      matcher = matcher.toLowerCase();
      tester = {test: function(str) ~str.toLowerCase().indexOf(matcher)};
    }
    if (maxResults == null) maxResults = -1 >>> 1;
    for each (let win in Utils.Application.windows)
      for each (let tab in win.tabs) {
        let {title, URL} = tab.document;
        if (tester.test(title) || tester.test(URL))
          if (matches.push(tab) >= maxResults)
            break;
      }
    return matches;
  }
};

function AutoCompleteInput(aSearches) {
    this.searches = aSearches;
}

AutoCompleteInput.prototype = {
    constructor: AutoCompleteInput,

    searches: null,

    minResultsForPopup: 0,
    timeout: 10,
    searchParam: "",
    textValue: "",
    disableAutoComplete: false,
    completeDefaultIndex: false,

    get searchCount() {
        return this.searches.length;
    },

    getSearchAt: function(aIndex) {
        return this.searches[aIndex];
    },

    onSearchBegin: function() {},
    onSearchComplete: function() {},

    popupOpen: false,

    popup: {
        setSelectedIndex: function(aIndex) {},
        invalidate: function() {},

        // nsISupports implementation
        QueryInterface: function(iid) {
            if (iid.equals(Ci.nsISupports) || iid.equals(Ci.nsIAutoCompletePopup)) return this;

            throw Components.results.NS_ERROR_NO_INTERFACE;
        }
    },

    // nsISupports implementation
    QueryInterface: function(iid) {
        if (iid.equals(Ci.nsISupports) || iid.equals(Ci.nsIAutoCompleteInput)) return this;

        throw Components.results.NS_ERROR_NO_INTERFACE;
    }
};

Utils.history = {

     __createController : function createController(onSearchComplete){
          var controller = Components.classes["@mozilla.org/autocomplete/controller;1"].getService(Components.interfaces.nsIAutoCompleteController);

          var input = new AutoCompleteInput(["history"]);
          input.onSearchComplete = function(){
             onSearchComplete(controller);
          };
          controller.input = input;
          return controller;
     },

     search : function searchHistory(query, maxResults, callback){

        var ctrlr = this.__createController(function(controller){
           for (var i = 0; i < controller.matchCount; i++) {
              var url = controller.getValueAt(i);
              var title = controller.getCommentAt(i);
              if (title.length == 0) { title = url; }
              var favicon = controller.getImageAt(i);

              callback({url : url, title : title, favicon : favicon })
           }
        });

        ctrlr.startSearch(query);
     }
};

// ** {{{ Utils.appName }}} **
//
// This property provides the chrome application name
// found in {{{nsIXULAppInfo.name}}}.
// Examples values are "Firefox", "Songbird", "Thunderbird".

Utils.__defineGetter__("appName", function() {
  delete this.appName;
  return this.appName = (Cc["@mozilla.org/xre/app-info;1"].
                         getService(Ci.nsIXULAppInfo).
                         name);
});

// ** {{{ Utils.appWindowType }}} **
//
// This property provides the name of "main" application windows for the chrome
// application.
// Examples values are "navigator:browser" for Firefox", and
// "Songbird:Main" for Songbird.

Utils.__defineGetter__("appWindowType", function() {
  switch (Utils.appName) {
    case "Songbird":
      return "Songbird:Main";
    default:
      return "navigator:browser";
  }
});

// ** {{{ Utils.currentChromeWindow }}} **
//
// This property is a reference to the application chrome window
// that currently has focus.

Utils.__defineGetter__("currentChromeWindow", function() {
  var wm = Cc["@mozilla.org/appshell/window-mediator;1"].
           getService(Ci.nsIWindowMediator);
  return wm.getMostRecentWindow(Utils.appWindowType);
});

// ** {{{ Utils.OS }}} **
//
// This property provides the platform name found in {{{nsIXULRuntime.OS}}}.
// See: https://developer.mozilla.org/en/OS_TARGET

Utils.__defineGetter__("OS", function() {
  delete this.OS;
  return this.OS = (Cc["@mozilla.org/xre/app-info;1"].
                    getService(Ci.nsIXULRuntime).
                    OS);
});
