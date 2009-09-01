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
 *   Satoshi Murakami <murky.satyr@gmail.com>
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

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

var Utils = {
  // === {{{ Utils.currentChromeWindow }}} ===
  //
  // This property is a reference to the application chrome window
  // that currently has focus.

  get currentChromeWindow currentChromeWindow() (
    Cc["@mozilla.org/appshell/window-mediator;1"]
    .getService(Ci.nsIWindowMediator)
    .getMostRecentWindow(Utils.appWindowType)),

  __globalObject: this,
};

[
  // === {{{ Utils.Application }}} ===
  //
  // Shortcut to
  // [[https://developer.mozilla.org/en/FUEL/Application|Application]].
  function Application() (Cc["@mozilla.org/fuel/application;1"]
                          .getService(Ci.fuelIApplication)),

  // === {{{ Utils.json }}} ===
  //
  // Shortcut to {{{nsIJSON}}}.

  function json() Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON),

  // === {{{ Utils.appName }}} ===
  //
  // This property provides the chrome application name
  // found in {{{nsIXULAppInfo}}}.
  // Examples values are "Firefox", "Songbird", "Thunderbird".

  function appName() (Cc["@mozilla.org/xre/app-info;1"]
                      .getService(Ci.nsIXULAppInfo)
                      .name),

  // === {{{ Utils.appWindowType }}} ===
  //
  // This property provides the name of "main" application windows for the chrome
  // application.
  // Examples values are "navigator:browser" for Firefox", and
  // "Songbird:Main" for Songbird.

  function appWindowType() ({
    Songbird: "Songbird:Main",
  })[Utils.appName] || "navigator:browser",

  // === {{{ Utils.OS }}} ===
  //
  // This property provides the platform name found in {{{nsIXULRuntime}}}.
  // See: https://developer.mozilla.org/en/OS_TARGET

  function OS() (Cc["@mozilla.org/xre/app-info;1"]
                 .getService(Ci.nsIXULRuntime)
                 .OS),

  ].forEach(function eachGetter(func) {
    Utils.__defineGetter__(func.name, function lazyGetter() {
      delete Utils[func.name];
      return Utils[func.name] = func();
    });
  });

for each (let f in this) if (typeof f === "function") Utils[f.name] = f;

// === {{{ Utils.log(a, b, c, ...) }}} ===
//
// One of the most useful functions to know both for development
// and debugging. This logging function takes
// an arbitrary number of arguments and will log them to the most
// appropriate output. If you have Firebug, the output will go to its
// console. Otherwise, the output will be routed to the Javascript
// Console.
//
// {{{Utils.log()}}} implements smart pretty print, so you
// can use it for inspecting arrays and objects.
// For details, see: http://getfirebug.com/console.html
//
// {{{a, b, c, ...}}} is an arbitrary list of things to be logged.

function log(what) {
  if (!arguments.length) return;

  var args = Array.slice(arguments), logPrefix = "Ubiquity:";
  if (typeof what === "string") logPrefix += " " + args.shift();

  var {Firebug} = Utils.currentChromeWindow;
  if (Firebug && Firebug.toggleBar(true)) {
    args.unshift(logPrefix);
    Firebug.Console.logFormatted(args);
    return;
  }

  Utils.Application.console.log(
    args.reduce(
      function log_acc(msg, arg) msg + " " + pp(arg),
      logPrefix.replace(/%[sdifo]/g, function format($) {
        if (!args.length) return $;
        var a = args.shift();
        switch ($) {
          case "%s": return a;
          case "%d":
          case "%i": return parseInt(a);
          case "%f": return parseFloat(a);
        }
        return pp(a);
      })));
  function pp(o) {
    try { return uneval(o) } catch (e) {
      try { return Utils.encodeJson(o) }
      catch (e) { return o }
    }
  }
}

// === {{{ Utils.reportWarning(aMessage, stackFrameNumber) }}} ===
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

function reportWarning(aMessage, stackFrameNumber) {
  var stackFrame = Components.stack.caller;

  if (typeof stackFrameNumber !== "number")
    stackFrameNumber = 0;

  for (var i = 0; i < stackFrameNumber; i++)
    stackFrame = stackFrame.caller;

  var consoleService = (Cc["@mozilla.org/consoleservice;1"]
                        .getService(Ci.nsIConsoleService));
  var scriptError = (Cc["@mozilla.org/scripterror;1"]
                     .createInstance(Ci.nsIScriptError));
  var aSourceName = stackFrame.filename;
  var aSourceLine = stackFrame.sourceLine;
  var aLineNumber = stackFrame.lineNumber;
  var aColumnNumber = null;
  var aFlags = scriptError.warningFlag;
  var aCategory = "ubiquity javascript";
  scriptError.init(aMessage, aSourceName, aSourceLine, aLineNumber,
                   aColumnNumber, aFlags, aCategory);
  consoleService.logMessage(scriptError);
}

// === {{{ Utils.reportInfo(message) }}} ===
//
// Reports a purely informational {{{message}}} to the JS Error Console.
// Source code links aren't provided for informational messages, so
// unlike {{{Utils.reportWarning()}}}, a stack frame can't be passed
// in to this function.

function reportInfo(message) {
  (Cc["@mozilla.org/consoleservice;1"]
   .getService(Ci.nsIConsoleService)
   .logStringMessage("Ubiquity: " + message));
}

// === {{{ Utils.encodeJson(object) }}} ===
//
// This function serializes the given {{{object}}} using JavaScript Object
// Notation (JSON).

function encodeJson(object) Utils.json.encode(object);

// === {{{ Utils.decodeJson(string) }}} ===
//
// This function unserializes the given {{{string}}} in JavaScript Object
// Notation (JSON) format and returns the result.

function decodeJson(string) Utils.json.decode(string);

// === {{{Utils.ellipsify(node, characters)}}} ===
//
// Given a DOM {{{node}}} and a maximum number of {{{characters}}}, returns a
// new DOM node that has the same contents truncated to that number of
// characters. If any truncation was performed, an ellipsis is placed
// at the end of the content.

function ellipsify(node, chars) {
  var doc = node.ownerDocument;
  var copy = node.cloneNode(false);
  if (node.hasChildNodes()) {
    var children = node.childNodes;
    for (var i = 0; i < children.length && chars > 0; i++) {
      var childNode = children[i];
      var childCopy;
      if (childNode.nodeType === childNode.TEXT_NODE) {
        var value = childNode.nodeValue;
        if (value.length >= chars) {
          childCopy = doc.createTextNode(value.slice(0, chars) + "\u2026");
          chars = 0;
        }
        else {
          childCopy = childNode.cloneNode(false);
          chars -= value.length;
        }
      }
      else if (childNode.nodeType === childNode.ELEMENT_NODE) {
        childCopy = ellipsify(childNode, chars);
        chars -= childCopy.textContent.length;
      }
      copy.appendChild(childCopy);
    }
  }
  return copy;
}

// === {{{ Utils.setTimeout(callback, delay, arg0, arg1, ...) }}} ===
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
// {{{arg0, arg1, ...}}} are optional arguments that will be passed to
// the callback.
//
// This function returns a timer ID, which can later be given to
// {{{Utils.clearTimeout()}}} if the client decides that it wants to
// cancel the callback from being triggered.

// TODO: Allow strings for the first argument like DOM setTimeout() does.

function setTimeout(callback, delay /*, arg0, arg1, ...*/) {
  var timerClass = Cc["@mozilla.org/timer;1"];
  // emulate window.setTimeout() by incrementing next ID
  var timerID = __timerData.nextID++;
  (__timerData.timers[timerID] = timerClass.createInstance(Ci.nsITimer))
    .initWithCallback(
      new __TimerCallback(callback, Array.slice(arguments, 2)),
      delay,
      timerClass.TYPE_ONE_SHOT);
  return timerID;
}

// === {{{ Utils.clearTimeout(timerID) }}} ===
//
// This function behaves like the {{{window.clearTimeout()}}} function
// in content space, and cancels the callback with the given timer ID
// from ever being called.
// Returns {{{true}}} if the timer is cancelled, {{{false}}} if already fired.

function clearTimeout(timerID) {
  var {timers} = __timerData;
  if (!(timerID in timers)) return false;
  timers[timerID].cancel();
  delete timers[timerID];
  return true;
}

// Support infrastructures for the timeout-related functions.
var __timerData = {nextID: 1, timers: {}};
function __TimerCallback(callback, args) {
  this._callback = callback;
  this._args = args;
}
__TimerCallback.prototype = {
  notify: function TC_notify(timer) {
    var {timers} = __timerData;
    for (let timerID in timers)
      if (timers[timerID] === timer) {
        delete timers[timerID];
        break;
      }
    this._callback.apply(null, this._args);
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsITimerCallback]),
};

// === {{{ Utils.uri(spec, defaultUrl) }}} ===
// === {{{ Utils.url() }}} ===
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

function uri(spec, defaultUri) {
  var base = null;
  if (typeof spec === "object") {
    if (spec instanceof Ci.nsIURI)
      // nsIURI object was passed in, so just return it back
      return spec;

    // Assume jQuery-style dictionary with keyword args was passed in.
    base = spec.base ? uri(spec.base, defaultUri) : null;
    spec = spec.uri || null;
  }

  var ios = (Cc["@mozilla.org/network/io-service;1"]
             .getService(Ci.nsIIOService));
  try {
    return ios.newURI(spec, null, base);
  } catch (e if (e.result === Components.results.NS_ERROR_MALFORMED_URI &&
                 defaultUri)) {
    return Utils.url(defaultUri);
  }
}
Utils.url = uri;

// === {{{ Utils.openUrlInBrowser(urlString, postData) }}} ===
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

function openUrlInBrowser(urlString, postData) {
  var postInputStream = null;
  if (postData) {
    if (postData instanceof Ci.nsIInputStream)
      postInputStream = postData;
    else {
      if (typeof postData === "object") // json -> string
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

  if (browser.mCurrentBrowser.currentURI.spec === "about:blank" &&
      !browser.webProgress.isLoadingDocument)
    browserWindow.loadURI(urlString, null, postInputStream, false);
  else if (openPref === 3) {
    let {shiftKey} = (browserWindow.gUbiquity || 0).lastKeyEvent || 0;
    browser[shiftKey ? "addTab" : "loadOneTab"](
      urlString, null, null, postInputStream, false, false);
  }
  else if (openPref === 2)
    browserWindow.openDialog("chrome://browser/content", "_blank",
                             "all,dialog=no", urlString, null, null,
                             postInputStream);
  else
    browserWindow.loadURI(urlString, null, postInputStream, false);
}

// === {{{ Utils.focusUrlInBrowser(urlString) }}} ===
//
// This function focuses a tab with the given URL if one exists in the
// current window; otherwise, it delegates the opening of the URL in a
// new window or tab to {{{Utils.openUrlInBrowser()}}}.

function focusUrlInBrowser(urlString) {
  for each (let tab in Utils.Application.activeWindow.tabs)
    if (tab.uri.spec === urlString) {
      tab.focus();
      return;
    }
  Utils.openUrlInBrowser(urlString);
}

// === {{{ Utils.getCookie(domain, name) }}} ===
//
// This function returns the cookie for the given {{{domain}}} and with the
// given {{{name}}}.  If no matching cookie exists, {{{null}}} is returned.

function getCookie(domain, name) {
  var cookieManager = (Cc["@mozilla.org/cookiemanager;1"]
                       .getService(Ci.nsICookieManager));
  var iter = cookieManager.enumerator, {nsICookie} = Ci;
  while (iter.hasMoreElements()) {
    var cookie = iter.getNext();
    if (cookie instanceof nsICookie &&
        cookie.host === domain &&
        cookie.name === name)
      return cookie.value;
  }
  // if no matching cookie:
  return null;
}

// === {{{ Utils.paramsToString(params, prefix = "?") }}} ===
//
// This function takes the given Object containing keys and
// values into a querystring suitable for inclusion in an HTTP
// GET or POST request.
//
// {{{params}}} is the key-value pairs.
//
// {{{prefix}}} is an optional string prepended to the result,
// which defaults to {{{"?"}}}.

function paramsToString(params, prefix) {
  var stringPairs = [];
  function addPair(key, value) {
    // note: explicitly ignoring values that are functions/null/undefined!
    if (typeof value !== "function" && value != null)
      stringPairs.push(
        encodeURIComponent(key) + "=" + encodeURIComponent(value));
  }
  for (var key in params) {
    if (Utils.isArray(params[key])) {
      params[key].forEach(function p2s_each(item) {
        addPair(key, item);
      });
    } else {
      addPair(key, params[key]);
    };
  }
  return (prefix == null ? "?" : prefix) + stringPairs.join("&");
}

// === {{{ Utils.urlToParams(urlString) }}} ===
//
// This function takes the given url and returns an Object containing keys and
// values retrieved from its query-part.

function urlToParams(url) {
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

// === {{{ Utils.getLocalUrl(urlString, charset) }}} ===
//
// This function synchronously retrieves the content of the given
// local URL, such as a {{{file:}}} or {{{chrome:}}} URL, and returns
// it.
//
// {{{url}}} is the URL to retrieve.
//
// {{{charset}}} is an optional string to specify the character set.

function getLocalUrl(url, charset) {
  var req = (Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
             .createInstance(Ci.nsIXMLHttpRequest));
  req.open("GET", url, false);
  req.overrideMimeType("text/plain" + (charset ? ";charset=" + charset : ""));
  req.setRequestHeader("If-Modified-Since", "Thu, 01 Jun 1970 00:00:00 GMT");
  req.send(null);
  if (req.status === 0)
    return req.responseText;
  else
    throw new Error("Failed to get " + url);
}

// === {{{ Utils.trim(str) }}} ===
//
// This function removes all whitespace surrounding a string and
// returns the result.

Utils.trim = String.trim || function trim(str) {
  http://blog.stevenlevithan.com/archives/faster-trim-javascript
  var i = str.search(/\S/);
  if (i < 0) return "";
  var j = str.length;
  while (/\s/.test(str[--j]));
  return str.slice(i, j + 1);
};

// === {{{ Utils.sortBy(array, key, descending) }}} ===
//
// Sorts an array by specified {{{key}}} and returns it. e.g.:
// {{{
// Utils.sortBy(["abc", "d", "ef"], "length") //=> ["d", "ef", "abc"]
// Utils.sortBy([1, 2, 3], function (x) -x) //=> [3, 2, 1]
// }}}
//
// {{{array}}} is the target array.
//
// {{{key}}} is either a string specifying the key property,
// or a function that maps each of {{{array}}}'s item to a sort key.
//
// Sorts descending if {{{descending}}}.

function sortBy(array, key, descending) {
  var pluck = typeof key === "function" ? key : function pluck(x) x[key];
  var sortee = ([{key: pluck(v), val: v} for each (v in array)]
                .sort(descending ? sortBy.dSorter : sortBy.aSorter));
  for (let i in sortee) array[i] = sortee[i].val;
  return array;
}
// Because our Monkey uses Merge Sort, "swap the values if plus" works.
sortBy.aSorter = function byKeyAsc(a, b) a.key > b.key;
sortBy.dSorter = function byKeyDsc(a, b) a.key < b.key;

// === {{{ Utils.isArray(value) }}} ===
//
// This function returns whether or not the {{{value}}} is an instance
// of {{{Array}}}.

function isArray(val) (val != null &&
                       typeof val === "object" &&
                       (val.constructor || 0).name === "Array");

// === {{{ Utils.isEmpty(value) }}} ===
//
// This function returns whether or not the {{{value}}} has no own properties.

function isEmpty(val) val == null || !val.__count__;

// === {{{ Utils.classOf(value) }}} ===
//
// This function returns the internal {{{[[Class]]}}} property of
// the {{{value}}}.
// ref. http://bit.ly/CkhjS#instanceof-considered-harmful

function classOf(val) Object.prototype.toString.call(val).slice(8, -1);

// === {{{ Utils.powerSet(array) }}} ===
//
// The "power set" of a set
// is a set of all the subsets of the original set.
// For example: a power set of [1,2] is [[],[1],[2],[1,2]]
//
// This works by a reduce operation... it starts by setting last = [[]],
// then recursively looking through all of the elements of the original
// set. For each element e_n (current), it takes each set in the power set
// of e_{n-1} and makes a copy of each with e_n added in (that's the
// .concat[current]). It then adds those copies to last (hence last.concat)
// It starts with last = [[]] because the power set of [] is [[]]. ^^
//
// code from http://twitter.com/mitchoyoshitaka/status/1489386225

function powerSet(array) (
  array.reduce(
    function pS_acc(last, current) last.concat([a.concat(current)
                                                for each (a in last)]),
    [[]]));

// === {{{ Utils.computeCryptoHash(algo, str) }}} ===
//
// Computes and returns a cryptographic hash for a string given an
// algorithm.
//
// {{{algo}}} is a string corresponding to a valid hash algorithm.  It
// can be any one of {{{MD2}}}, {{{MD5}}}, {{{SHA1}}}, {{{SHA256}}},
// {{{SHA384}}}, or {{{SHA512}}}.
//
// {{{str}}} is the string to be hashed.

function computeCryptoHash(algo, str) {
  var converter = (Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                   .createInstance(Ci.nsIScriptableUnicodeConverter));
  converter.charset = "UTF-8";
  var data = converter.convertToByteArray(str, {});
  var crypto = (Cc["@mozilla.org/security/hash;1"]
                .createInstance(Ci.nsICryptoHash));
  crypto.initWithString(algo);
  crypto.update(data, data.length);
  var hash = crypto.finish(false);
  var hexHash = "";
  for each (var c in hash)
    hexHash += (c.charCodeAt(0) | 256).toString(16).slice(-2);
  return hexHash;
}

// === {{{ Utils.signHMAC(algo, key, str) }}} ===
//
// Computes and returns a cryptographicly signed hash for a string given an
// algorithm. It is derived from a given key.
//
// {{{algo}}} is a string corresponding to a valid hash algorithm.  It
// can be any one of {{{MD2}}}, {{{MD5}}}, {{{SHA1}}}, {{{SHA256}}},
// {{{SHA384}}}, or {{{SHA512}}}.
//
// {{{key}}} is a key (string) to use to sign
//
// {{{str}}} is the string to be hashed.

function signHMAC(algo, key, str) {
  var converter = (Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                   .createInstance(Ci.nsIScriptableUnicodeConverter));
  converter.charset = "UTF-8";
  var data = converter.convertToByteArray(str, {});
  var crypto = (Cc["@mozilla.org/security/hmac;1"]
                .createInstance(Ci.nsICryptoHMAC));
  var keyObject = (Cc["@mozilla.org/security/keyobjectfactory;1"]
                   .getService(Ci.nsIKeyObjectFactory)
                   .keyFromString(Ci.nsIKeyObject.HMAC, key));
  crypto.init(Ci.nsICryptoHMAC[algo], keyObject);
  crypto.update(data, data.length);
  var hash = crypto.finish(true);
  return hash;
}

// === {{{ Utils.escapeHtml(string) }}} ===
//
// This function returns a version of the {{{string}}} safe for
// insertion into HTML. Useful when you just want to
// concatenate a bunch of strings into an HTML fragment
// and ensure that everything's escaped properly.

function escapeHtml(string) (
  String(string)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/\'/g, "&#39;"));

// === {{{ Utils.convertFromUnicode(toCharset, text) }}} ===
//
// Encodes the given unicode text to a given character set and
// returns the result.
//
// {{{toCharset}}} is a string corresponding to the character set
// to encode to.
//
// {{{text}}} is a unicode string.

function convertFromUnicode(toCharset, text) {
  var converter = (Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                   .getService(Ci.nsIScriptableUnicodeConverter));
  converter.charset = toCharset;
  return converter.ConvertFromUnicode(text);
}

// === {{{ Utils.convertToUnicode(fromCharset, text) }}} ===
//
// Decodes the given text from a character set to unicode and returns
// the result.
//
// {{{fromCharset}}} is a string corresponding to the character set to
// decode from.
//
// {{{text}}} is a string encoded in the character set
// {{{fromCharset}}}.

function convertToUnicode(fromCharset, text) {
  var converter = (Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                   .getService(Ci.nsIScriptableUnicodeConverter));
  converter.charset = fromCharset;
  return converter.ConvertToUnicode(text);
}

// === {{{ Utils.dump(a, b, c, ...) }}} ===
//
// A nicer {{{dump()}}} that
// displays caller's name, concats arguments and appends a line feed.

Utils.dump = function niceDump() {
  var {caller} = arguments.callee;
  dump((caller ? caller.name + ": " : "") +
       Array.join(arguments, " ") + "\n");
};

// === {{{ Utils.notify(label, value, image, priority, buttons, target) }}} ===
//
// A wrapper function for
// [[https://developer.mozilla.org/en/XUL/notificationbox|notificationbox]]
// {{{#appendNotification}}}.
//
// * {{{label}}} : The text to show.
// * {{{value}}} : An optional identifier string. Defaults to {{{label}}}.
// * {{{image}}} : An optional URL string for the icon.
// * {{{priority}}} : An optional string to specify the priority.
//   Defaults to {{{"INFO_LOW"}}}.
// * {{{buttons}}} : The button descriptions. See the above link for details.
// * {{{target}}} : An optional browser/window/document element to which
//   the notification is appended. Defaults to the current page.
//
// For ease of use, the arguments can be passed as a dictionary in place of
// {{{label}}}. e.g.:
// {{{
// notify({label: "!", value: "foo", priority: "Critical_Block"});
// }}}

function notify(label, value, image, priority, buttons, target) {
  if (classOf(label) === "Object")
    // pseudo keyword arguments
    var {label, value, image, priority, buttons, target} = label;
  if (!target) {
    var tabbrowser = Utils.currentChromeWindow.gBrowser;
    var foundBrowser = tabbrowser.selectedBrowser;
  }
  else {
    taget = target.contentDocument || target.document || target;
    // Find the <browser> which contains notifyWindow, by looking
    // through all the open windows and all the <browsers> in each.
    var enumerator = (Cc["@mozilla.org/appshell/window-mediator;1"]
                      .getService(Ci.nsIWindowMediator)
                      .getEnumerator(Utils.appWindowType));
    while (!foundBrowser && enumerator.hasMoreElements()) {
      tabbrowser = enumerator.getNext().getBrowser();
      foundBrowser = tabbrowser.getBrowserForDocument(target);
    }
  }
  if (!foundBrowser) {
    Cu.reportError("Couldn't find tab for document");
    return null;
  }
  value || (value = label);
  var box = tabbrowser.getNotificationBox(foundBrowser);
  var oldNotification = box.getNotificationWithValue(value);
  if (oldNotification) box.removeNotification(oldNotification);
  return box.appendNotification(
    label,
    value,
    image || "chrome://ubiquity/skin/icons/favicon.ico",
    box[("PRIORITY_" + priority).toUpperCase()] || box.PRIORITY_INFO_LOW,
    buttons);
}

// == {{{ Utils.tabs }}} ==
//
// This Object contains functions related to Firefox tabs.

Utils.tabs = {
  // === {{{ Utils.tabs.get(name) }}} ===
  //
  // Gets an array of open tabs.
  //
  // {{{name}}} is an optional string tab name (title or URL).
  // If supplied, this function returns tabs that exactly match with it.

  get: function tabs_get(name) {
    var tabs = [], {push} = tabs;
    for each (let win in Utils.Application.windows) push.apply(tabs, win.tabs);
    return (name == null
            ? tabs
            : tabs.filter(function eachTab({document: d}) (d.title === name ||
                                                           d.URL   === name)));
  },

  // === {{{ Utils.tabs.search(matcher, maxResults) }}} ===
  //
  // Searches for tabs by title or URL and returns an array of tab references.
  // The match result is set to {{{tab.match}}}.
  //
  // {{{matcher}}} is a string or {{{RegExp}}} object to match with.
  //
  // {{{maxResults}}} is an optinal integer specifying
  // the maximum number of results to return.

  search: function tabs_search(matcher, maxResults) {
    var results = [];
    if (classOf(matcher) !== "RegExp") try {
      matcher = RegExp(matcher, "i");
    } catch (e if e instanceof SyntaxError) {
      matcher = RegExp(Utils.regexp.quote(matcher), "i");
    }
    if (maxResults == null) maxResults = 1/0;
    var keys = ["title", "URL"];
    for each (let win in Utils.Application.windows)
      for each (let tab in win.tabs) {
        for each (let key in keys) {
          let match = matcher(tab.document[key]);
          if (!match) continue;
          tab.match = match;
          if (results.push(tab) >= maxResults) return results;
          break;
        }
      }
    return results;
  },

  // === {{{ Utils.tabs.reload(matcher) }}} ===
  //
  // Reloads all matched tabs.
  //
  // {{{matcher}}} is a string or {{{RegExp}}} object to match with.

  reload: function tabs_reload(matcher) {
    for each (let tab in Utils.tabs.search(matcher))
      tab._browser.reload();
  },
};

// == {{{ Utils.clipboard }}} ==
//
// This object contains functions related to clipboard.

Utils.clipboard = {
  // === {{{ Utils.clipboard.text }}} ===
  //
  // Gets or sets the clipboard text.

  get text clipboard_getText() {
    var clip = (Cc["@mozilla.org/widget/clipboard;1"]
                .getService(Ci.nsIClipboard));
    var trans = (Cc["@mozilla.org/widget/transferable;1"]
                 .createInstance(Ci.nsITransferable));
    trans.addDataFlavor("text/unicode");
    clip.getData(trans, clip.kGlobalClipboard);
    var ss = {};
    trans.getTransferData("text/unicode", ss, {});
    return ss.value.QueryInterface(Ci.nsISupportsString).toString();
  },
  set text clipboard_setText(str) {
    (Cc["@mozilla.org/widget/clipboardhelper;1"]
     .getService(Ci.nsIClipboardHelper)
     .copyString(str));
  },
};

// == {{{ Utils.history }}} ==
//
// This object contains functions that make it easy to access
// information about the user's browsing history.

Utils.history = {
  // === {{{ Utils.history.visitsToDomain(domain) }}} ===
  //
  // This function returns the number of times the user has visited
  // the given {{{domain}}} string.

  visitsToDomain: function history_visitsToDomain(domain) {
    var hs = (Cc["@mozilla.org/browser/nav-history-service;1"]
              .getService(Ci.nsINavHistoryService));
    var query = hs.getNewQuery();
    var options = hs.getNewQueryOptions();
    query.domain = domain;
    options.maxResults = 10;
    // execute query
    var count = 0;
    var {root} = hs.executeQuery(query, options);
    root.containerOpen = true;
    for (let i = root.childCount; i--;)
      count += root.getChild(i).accessCount;
    root.containerOpen = false;
    return count;
  },

  // === {{{ Utils.history.search(query, callback) }}} ===
  //
  // Searches the pages the user has visited.
  // Given a query string and a callback function, passes an array of results
  // (objects with {{{url}}}, {{{title}}} and {{{favicon}}} properties)
  // to the callback.
  //
  // {{{query}}} is the query string.
  //
  // {{{callback}}} is the function called when the search is complete.

  search: function history_search(query, callback) {
    var awesome = (Cc["@mozilla.org/autocomplete/search;1?name=history"]
                   .getService(Ci.nsIAutoCompleteSearch));
    awesome.startSearch(query, "", null, {
      onSearchResult: function hs_onSearchResult(search, result) {
        switch (result.searchResult) {
          case result.RESULT_SUCCESS: {
            let results = [];
            for (let i = 0, l = result.matchCount; i < l; ++i)
              results.push({
                url: result.getValueAt(i),
                title: result.getCommentAt(i),
                favicon: result.getImageAt(i),
              });
            callback(results);
            break;
          }
          case result.RESULT_IGNORED:
          case result.RESULT_FAILURE:
          case result.RESULT_NOMATCH: {
            callback([]);
            break;
          }
        }
      }
    });
  },
};

// == {{{ Utils.regexp }}} ==
//
// Contains regular expressions related functions.

// === {{{ Utils.regexp(pattern, flags) }}} ===
//
// Creates a regexp just like {{{RegExp}}}, but without throwing exceptions.
// Falls back to a quoted version of {{{pattern}}} if it fails to compile.
// {{{
// RegExp("[")          // SyntaxError("unterminated character class")
// RegExp("@", "image") // SyntaxError("invalid regular expression flag a")
// RegExp(/:/, "y")     // TypeError("can't supply flags when ...")
// Utils.regexp("[")          // /\[/
// Utils.regexp("@", "image") // /@/gim
// Utils.regexp(/:/, "y")     // /:/y
// }}}

function regexp(pattern, flags) {
  if (classOf(pattern) === "RegExp") pattern = pattern.source;
  if (flags != null) flags = String.replace(flags, /[^gimy]/g, "");
  try {
    return RegExp(pattern, flags);
  } catch (e if e instanceof SyntaxError) {
    return RegExp(regexp.quote(pattern), flags);
  } catch (e) {
    return /(?:)/;
  }
}

// === {{{ Utils.regexp.quote(string) }}} ===
//
// Returns the {{{string}}} with all {{{RegExp}}} meta characters in it
// backslashed.

regexp.quote = function re_quote(string) (
  String(string).replace(/[.?*+^$|()\{\[\]\\]/g, "\\$&"));

// === {{{ Utils.regexp.Trie(strings, asPrefixes) }}} ===
//
// Creates a {{{RegexpTrie}}} object that builds an efficient regexp
// matching a specific set of {{{strings}}}.
// This is a JS port of
// [[http://search.cpan.org/~dankogai/Regexp-Trie-0.02/lib/Regexp/Trie.pm]]
// with a few additions.
//
// {{{strings}}} is a optional array of strings to {{{add()}}}
// on initialization.
// If {{{asPrefixes}}} evaluates to {{{true}}}, {{{addPrefixes()}}}
// is used instead.

regexp.Trie = function RegexpTrie(strings, asPrefixes) {
  var me = {$: {}, __proto__: arguments.callee.prototype};
  if (strings) {
    let add = asPrefixes ? "addPrefixes" : "add";
    for each (let str in strings) me[add](str);
  }
  return me;
};
regexp.Trie.prototype = {
  constructor: regexp.Trie,
  // ** {{{ RegexpTrie#add(string) }}} **
  //
  // Adds {{{string}}} to the Trie and returns self.
  add: function RegexpTrie_add(string) {
    var ref = this.$;
    for each (let char in string) ref = ref[char] || (ref[char] = {});
    ref[""] = 1; // {"": 1} as terminator
    return this;
  },
  // ** {{{ RegexpTrie#addPrefixes(string) }}} **
  //
  // Adds every prefix of {{{string}}} to the Trie and returns self. i.e.:
  // {{{
  // RegexpTrie().addPrefixes("ab") == RegexpTrie().add("a").add("ab")
  // }}}
  addPrefixes: function RegexpTrie_addPrefixes(string) {
    var ref = this.$;
    for each (let char in string) ref = ref[char] || (ref[char] = {"": 1});
    return this;
  },
  // ** {{{ RegexpTrie#toString() }}} **
  //
  // ** {{{ RegexpTrie#regexp }}} **
  //
  // Returns a string/regexp representation of the Trie.
  toString: function RegexpTrie_toString() this._regexp(this.$),
  get regexp RegexpTrie_regexp() RegExp(this),
  _regexp: function RegexpTrie__regexp($) {
    I_MISS___count__: if ("" in $) {
      for (let k in $) if (k) break I_MISS___count__;
      return "";
    }
    var alt = [], cc = [], q;
    var {quote} = Utils.regexp;
    for (let char in $) {
      if ($[char] !== 1) {
        let recurse = RegexpTrie__regexp($[char]);
        (recurse ? alt : cc).push(quote(char) + recurse);
      }
      else q = 1;
    }
    var cconly = !alt.length;
    if (cc.length) alt.push(1 in cc ?  "[" + cc.join("") + "]" : cc[0]);
    var result = 1 in alt ? "(?:" + alt.join("|") + ")" : alt[0];
    if (q) result = cconly ? result + "?" : "(?:" + result + ")?";
    return result || "";
  },
};
