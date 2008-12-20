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

Utils.reportWarning = function reportWarning(aMessage, stackFrame) {
  if (!stackFrame)
    stackFrame = Components.stack.caller;

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

Utils.reportInfo = function reportInfo(aMessage) {
  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                       .getService(Components.interfaces.nsIConsoleService);
  var aCategory = "ubiquity javascript: ";
  consoleService.logStringMessage(aCategory + aMessage);
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
  let Application = Components.classes["@mozilla.org/fuel/application;1"]
                    .getService(Components.interfaces.fuelIApplication);

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
  function valueTypeIsOk(val) {
    if (typeof val == "function")
      return false;
    if (val === undefined)
      return false;
    if (val === null)
      return false;
    return true;
  }
  function addPair(key, value) {
    if (valueTypeIsOk(value)) {
      stringPairs.push(
        encodeURIComponent(key) + "=" + encodeURIComponent(value.toString())
      );
    }
  }
  for (key in params) {
    // note: explicitly ignoring values that are objects/functions/undefined!
    if (Utils.isArray(params[key])) {
      params[key].forEach(function(item) {
        addPair(key + "[]", item);
      });
    } else {
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

Utils.trim = function trim(str) {
  return str.replace(/^\s+|\s+$/g,"");
};

Utils.isArray = function isArray(val) {
  if (typeof val != "object")
    return false;
  if (val == null)
    return false;
  if (val.constructor.name != "Array")
    return false;
  return true;
}

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
};

// valid hash algorithms are: MD2, MD5, SHA1, SHA256, SHA384, SHA512
Utils.computeCryptoHash = function computeCryptoHash(algo, str) {
  var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                            .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
  converter.charset = "UTF-8";
  var result = {};
  var data = converter.convertToByteArray(str, result);
  var crypto = Components.classes["@mozilla.org/security/hash;1"]
                          .createInstance(Components.interfaces.nsICryptoHash);
  crypto.initWithString(algo);
  crypto.update(data, data.length);
  var hash = crypto.finish(false);

  function toHexString(charCode) {
    return ("0" + charCode.toString(16)).slice(-2);
  }
  var hashString = [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
  return hashString;
};

Utils.convertFromUnicode = function convertFromUnicode(toCharset, text) {
  var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                            .getService(Components.interfaces.nsIScriptableUnicodeConverter);
  converter.charset = toCharset;
  return converter.ConvertFromUnicode(text);
};

Utils.convertToUnicode = function convertToUnicode(fromCharset, text) {
  var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                            .getService(Components.interfaces.nsIScriptableUnicodeConverter);
  converter.charset = fromCharset;
  return converter.ConvertToUnicode(text);
};

Utils.tabs = {
  /**
   * Get open tabs.
   *
   * @param aName optional string tab name
   *        If supplied, will return the named tab or null.
   * @returns A hash of tab name -> tab reference, or if a
   *          name parameter is passed, returns the matching
   *          tab reference or null.
   */
  get: function Utils_tabs_get(aName) {
    if (aName)
      return this._cache[aName] || null;

    return this._cache;
  },

  /**
   * Search for tabs by tab name.
   *
   * @param aSearchText string
   * @param aMaxResults integer
   * @returns A hash of tab name -> tab reference
   */
  search: function Utils_tabs_search(aSearchText, aMaxResults) {
    var matches = {};
    var matchCount = 0;
    for (var name in this._cache) {
      //TODO: implement a better match algorithm
      if (name.match(aSearchText, "i")) {
        matches[name] = this._cache[name];
        matchCount++;
      }
      if (aMaxResults && aMaxResults == matchCount)
        break;
    }
    return matches;
  },

  /**
   * Handles TabOpen, TabClose and load events
   * clears tab cache
   */
  onTabEvent: function(aEvent, aTab) {
    switch ( aEvent.type ) {
      case "TabOpen":
        // this is received before the page content has loaded.
        // so need to find the new tab, and add a load
        // listener to it, and only then add it to the cache.
        // TODO: once bug 470163 is fixed, can move to a much
        // cleaner way of doing this.
        var self = this;
        var windowCount = this.Application.windows.length;
        for( var i=0; i < windowCount; i++ ) {
          var window = this.Application.windows[i];
          var tabCount = window.tabs.length;
          for (var j = 0; j < tabCount; j++) {
            let tab = window.tabs[j];
            if (!this.__cache[tab.document.title]) {
              // add a load listener to the tab
              // and add the tab to the cache after it has loaded.
              tab.events.addListener("load", function(aEvent) {
                self.onTabEvent(aEvent, tab);
              });
            }
          }
        }
        break;
      case "TabClose":
        // for TabClose events, invalidate the cache.
        // TODO: once bug 470163 is fixed, can just delete the tab from
        // from the cache, instead of invalidating the entire thing.
        this.__cache = null;
        break;
      case "load":
        // handle new tab page loads, and reloads of existing tabs
        if (aTab && aTab.document.title) {

          // if a tab with this title is not cached, add it
          if (!this._cache[aTab.document.title])
            this._cache[aTab.document.title] = aTab;

          // evict previous cache entries for the tab
          for (var title in this._cache) {
            if (this._cache[title] == aTab && title != aTab.document.title) {
              // if the cache contains an entry for this tab, and the title
              // differs from the tab's current title, then evict the entry.
              delete this._cache[title];
              break;
            }
          }
        }
        break;
    }
  },

  /**
   * smart-getter for fuel
   */
  get Application() {
    delete this.Application;
    return this.Application = Components.classes["@mozilla.org/fuel/application;1"].
                              getService(Components.interfaces.fuelIApplication);
  },

  /**
   * getter for the tab cache
   * manages reloading cache
   */
  __cache: null,
  get _cache() {
    if (this.__cache)
      return this.__cache;

    this.__cache = {};
    var windowCount = this.Application.windows.length;
    for( var j=0; j < windowCount; j++ ) {

      var win = this.Application.windows[j];
      win.events.addListener("TabOpen", function(aEvent) { self.onTabEvent(aEvent); });
      win.events.addListener("TabClose", function(aEvent) { self.onTabEvent(aEvent); });

      var tabCount = win.tabs.length;
      for (var i = 0; i < tabCount; i++) {

        let tab = win.tabs[i];

        // add load listener to tab
        var self = this;
        tab.events.addListener("load", function(aEvent) {
          self.onTabEvent(aEvent, tab);
        });

        // add tab to cache
        this.__cache[tab.document.title] = tab;
      }
    }

    return this.__cache;
  }
};
