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
 *   Aza Raskin <aza@mozilla.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Maria Emerson <memerson@mozilla.com>
 *   Blair McBride <unfocused@gmail.com>
 *   Abimanyu Raja <abimanyuraja@gmail.com>
 *   Christian Sonne <cers@geeksbynature.dk>
 *   Satoshi Murakami <murky.satyr@gmail.com>
 *   Michael Yoshitaka Erlewine <mitcho@mitcho.com>
 *   Louis-Remi Babe <lrbabe@gmail.com>
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

// = CmdUtils =
// A library of general utility functions for use by command code.
// Everything clients need is contained within the {{{CmdUtils}}} namespace.

var EXPORTED_SYMBOLS = ["CmdUtils"];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/setup.js");
Cu.import("resource://ubiquity/modules/nounutils.js");
Cu.import("resource://ubiquity/modules/contextutils.js");
Cu.import("resource://ubiquity/modules/localization_utils.js");

var L = LocalizationUtils.propertySelector(
  "chrome://ubiquity/locale/coreubiquity.properties");

var {commandSource} = UbiquitySetup.createServices();

var CmdUtils = {
  toString: function toString() "[object CmdUtils]",
  __globalObject: null,
  __nextId: null,

  // === {{{ CmdUtils.parserVersion }}} ===
  // This attribute contains the parser version that Ubiquity is
  // using. A command can provide different options to
  // {{{CmdUtils.CreateCommand()}}} and behave differently
  // depending on this value, allowing a single command feed to
  // cater to whatever parser the user is using.
  //
  // Ubiquity 0.1.x only supports parser version 1, while
  // Ubiquity 0.5.x supports parser versions 1 and 2.
  get parserVersion parserVersion() (
    Utils.prefs.getValue("extensions.ubiquity.parserVersion", 1)),

  // === {{{ CmdUtils.maxSuggestions }}} ===
  // The current number of max suggestions.
  get maxSuggestions maxSuggestions() (
    Cu.import("resource://ubiquity/modules/cmdmanager.js", null)
    .CommandManager.maxSuggestions),
};

for each (let f in this) if (typeof f === "function") CmdUtils[f.name] = f;
for each (let g in ["document", "documentInsecure",
                    "window", "windowInsecure", "hiddenWindow",
                    "geoLocation"]) {
  CmdUtils.__defineGetter__(g, this["get" + g[0].toUpperCase() + g.slice(1)]);
}

// == From NounUtils ==
// {{{CmdUtils}}} inherits [[#modules/nounutils.js|NounUtils]].

for (let k in NounUtils) CmdUtils[k] = NounUtils[k];

// == From ContextUtils ==
// {{{CmdUtils}}} imports and wraps the following properties/methods from
// [[#modules/contextutils.js|ContextUtils]].

// === {{{ CmdUtils.isSelected }}} ===
// Whether or not the user has one or more non-collapsed selections.

// === {{{ CmdUtils.getSelection() }}} ===
// Returns a string containing the text and just the text of the user's
// current selection, i.e. with HTML tags stripped out.

// === {{{ CmdUtils.getHtmlSelection() }}} ===
// Returns a string containing the HTML representation of the
// user's current selection, i.e. text including tags.

// === {{{ CmdUtils.getSelectedNodes(selector) }}} ===
// Returns selected nodes as filtered by {{{selector}}},
// which can be either a CSS string or a function.

// === {{{ CmdUtils.getSelectionObject() }}} ===
// Returns an object containing both the plain-text and HTML selections. Usage:
// {{{
// let {text, html} = CmdUtils.selectionObject;
// }}}

// === {{{ CmdUtils.setSelection(content, options) }}} ===
// Replaces the current selection with new content.
//
// {{{content}}} is the HTML string to set as the selection.
//
// {{{options}}} is a dictionary; if it has a {{{text}}} property then
// that value will be used in place of the html if we're in
// a plain-text-only editable field.

for each (let m in ["getSelection", "getHtmlSelection", "getSelectedNodes",
                    "getSelectionObject", "getIsSelected", "setSelection"]) {
  eval(<><![CDATA[
    CmdUtils.@ = function @(x, y) {
      var c = this.__globalObject.context || {};
      "focusedWindow" in c && "focusedElement" in c ||
        (c = Utils.currentChromeWindow.document.commandDispatcher);
      return ContextUtils.@(c, x, y);
    };
    ]]></>.toString().replace(/@/g, m));
  CmdUtils["__define" + m[0].toUpperCase() + "etter__"](
    m[3].toLowerCase() + m.slice(4), CmdUtils[m]);
}

// === {{{ CmdUtils.log(a, b, c, ...) }}} ===
// See [[#modules/utils.js|Utils]]{{{.log}}}.

function log() Utils.log.apply(Utils, arguments);

// === {{{ CmdUtils.getWindow() }}} ===
// === {{{ CmdUtils.getDocument() }}} ===
// Gets the window/document of the current tab in a secure way.

function getWindow() Utils.currentChromeWindow.content;
function getDocument() getWindow().document;

// === {{{ CmdUtils.getWindowInsecure() }}} ===
// === {{{ CmdUtils.getDocumentInsecure() }}} ===
// Gets the window/document object of the current tab, without the
// safe {{{XPCNativeWrapper}}}.
// While this allows access to scripts in the content,
// it is potentially **unsafe** and {{{getWindow()/getDocument()}}} should
// be used in place of this whenever possible.

function getWindowInsecure() getWindow().wrappedJSObject;
function getDocumentInsecure() getDocument().wrappedJSObject;

// === {{{ CmdUtils.getHiddenWindow() }}} ===

function getHiddenWindow() Utils.hiddenWindow;

// === {{{ CmdUtils.getCommand(id) }}} ===
// Gets a reference to a Ubiquity command by its ID or reference name
// (the first name in English).
// ID should be used whenever possible,
// as reference names aren't cannonical across feeds.
//
// {{{id}}} is the id or name of the command.
 
function getCommand(id) commandSource.getCommand(id);

// === {{{ CmdUtils.executeCommand(command, args) }}} ===
// === {{{ CmdUtils.previewCommand(command, pblock, args) }}} ===
// Executes/Previews an existing Ubiquity command.
//
// {{{command}}} is either the id or name of the Ubiquity command that will be
// executed or a direct reference to the command.
//
// {{{pblock}}} is the preview block.
//
// {{{args}}} is an object containing the modifiers values that will
// be passed to the execute function of the target command. e.g.:
// {{{
// {source: CmdUtils.makeSugg("English", null, "en"), goal: ...}
// }}}

// ToDo: If the command doesn't exist, should we notify and/or fail gracefully?

function executeCommand(command, args, mods) {
  if (typeof command === "string") command = CmdUtils.getCommand(command);
  return command.execute(this.__globalObject.context, args, mods);
}

function previewCommand(command, pblock, args, mods) {
  if (typeof command === "string") command = CmdUtils.getCommand(command);
  return command.preview(this.__globalObject.context, pblock, args, mods);
}

// === {{{ CmdUtils.geocodeAddress(location, callback) }}} ===
// This function uses the Yahoo geocoding service to take a text
// string of an address/location and turn it into a structured
// geo-location.
//
// Returns an array of possible matches, where each match is
// an object that includes {{{latitude}}} , {{{longitude}}},
// {{{address}}}, {{{city}}}, {{{state}}}, {{{zip}}}, and {{{country}}}.
//
// {{{location}}} is a plaintext string of the address or location
// to be geocoded.
//
// {{{callback}}} is a function which gets passed the return of
// the geocoding.

function geocodeAddress(location, callback) this.__globalObject.jQuery.ajax({
  url: "http://local.yahooapis.com/MapsService/V1/geocode",
  data: {
    appid: "YD-9G7bey8_JXxQP6rxl.fBFGgCdNjoDMACQA--",
    location: location,
  },
  dataType: "xml",
  success: function gA_success(xml) {
    callback(Array.map(
      xml.getElementsByTagName("Result"),
      function gA_eachResult(result) {
        var dict = {};
        Array.forEach(
          result.getElementsByTagName("*"),
          function gA_eachItem(item) {
            dict[item.nodeName.toLowerCase()] = item.textContent;
          });
        dict.lat = dict.latitude;
        dict.lon = dict.longitude;
        return dict;
      }));
  },
});

// === {{{ CmdUtils.injectCss(css) }}} ===
// Injects CSS source code into the current tab's document.
// Returns the injected style elment for later use.
//
// {{{css}}} is the CSS source code to inject, in plain text.

function injectCss(css) {
  var doc = getDocument();
  var style = doc.createElement("style");
  style.innerHTML = css;
  return doc.body.appendChild(style);
}

// === {{{ CmdUtils.injectHtml(html) }}} ===
// Injects HTML source code at the end of the current tab's document.
// Returns the injected elements as a jQuery object.
//
// {{{html}}} is the HTML source code to inject, in plain text.

function injectHtml(html) {
  const {jQuery} = this.__globalObject;
  var doc = getDocument();
  return jQuery("<div>" + html + "</div>").contents().appendTo(doc.body);
}

// === {{{ CmdUtils.injectJavascript(src, callback) }}} ===
// Injects Javascript from a URL into the current tab's document,
// and calls an optional callback function once the script has loaded.
//
// Note that this is **not** intended to be used as a
// way of importing Javascript into the command's sandbox.
//
// {{{src}}} is the source URL of the Javascript to inject.
//
// {{{callback}}} is an optional callback function to be called once the script
// has loaded in the document. The 1st argument will be the global object
// of the document (i.e. window).

function injectJavascript(src, callback) {
  var doc = getDocument();
  var script = doc.createElement("script");
  script.src = src;
  script.addEventListener("load", function onInjected() {
    doc.body.removeChild(script);
    if (typeof callback === "function")
      callback(doc.defaultView);
  }, true);
  doc.body.appendChild(script);
}

// === {{{ CmdUtils.loadJQuery(callback) }}} ===
// Injects the jQuery javascript library into the current tab's document.
//
// {{{callback}}} gets passed back the {{{jQuery}}} object once it is loaded.

function loadJQuery(callback) {
  injectJavascript(
    "resource://ubiquity/scripts/jquery.js",
    callback && this.safeWrapper(function onJQuery(win) {
      callback(win.wrappedJSObject.jQuery);
    }));
}

// === {{{ CmdUtils.copyToClipboard(text) }}} ===
// This function places the passed-in text into the OS's clipboard.
// If the text is empty, the copy isn't performed.
//
// {{{text}}} is a plaintext string that will be put into the clipboard.

function copyToClipboard(text) (
  (text = String(text)) && (Utils.clipboard.text = text));

// === {{{ CmdUtils.onPageLoad(callback, includes = "*", excludes = []) }}} ===
// Sets up a function to be run whenever a page is loaded.
//
// {{{callback}}} is the callback function called each time a new page is
// loaded; it is passed a single argument, which is the page's document object.
//
// {{{includes}}}/{{{excludes}}} are optional regexps/strings
// (or arrays of them) that select pages to include/exclude by their URLs
// a la [http://wiki.greasespot.net/Include_and_exclude_rules|GreaseMonkey].
// * if string, it matches the whole URL with asterisks as wildcards.

function onPageLoad(callback, includes, excludes) {
  var {pageLoadFuncs} = this.__globalObject;
  if (!includes && !excludes) return pageLoadFuncs.push(callback);

  function enwild(a)
    Utils.regexp.quote(String(a).replace(/[*]/g, "\0")).replace(/\0/g, ".*?");
  [includes, excludes] = [includes || /^/, excludes].map(
    function toRegExps(filters) [
      Utils.classOf(f) === "RegExp" ? f : RegExp("^" + enwild(f) + "$")
      for each (f in [].concat(filters || []))]);
  return pageLoadFuncs.push(function pageLoadProxy(document) {
    var {href} = document.location;
    for each (let r in excludes) if (r.test(href)) return;
    for each (let r in includes) if (r.test(href)) return callback(document);
  });
}

// === {{{ CmdUtils.onUbiquityLoad(callback) }}} ===
// Sets up a function to be run whenever a Ubiqutiy instance is created.
//
// {{{callback}}} is the callback function called each time a new
// [[#chrome/content/ubiquity.js|Ubiquity]] instance is created;
// it is passed two arguments, which are the Ubiquity instance and
// the chrome window associated with it.

function onUbiquityLoad(callback) {
  this.__globalObject.ubiquityLoadFuncs.push(callback);
}

// ** {{{ CmdUtils.setLastResult(result) }}} **
// **//Deprecated. Do not use.//**
//
// Sets the last result of a command's execution, for use in command piping.

function setLastResult(result) {
  // TODO: This function was used for command piping, which has been
  // removed for the time being; we should probably consider removing this
  // function and anything that uses it.
  //globals.lastCmdResult = result;
}

// === {{{ CmdUtils.getGeoLocation(callback) }}} ===
// Uses Geo-IP lookup to get the user's physical location.
// Will cache the result.
// If a result is already in the cache, this function works both
// asyncronously and synchronously (for backwards compatability).
// Otherwise it works only asynchronously.
//
// {{{callback}}} Optional callback function.  Will be called back
// with a geolocation object. If specified, {{{getGeoLocation}}} returns
// the {{{XMLHTTPRequest}}} instance instead of the geolocation object.
//
// The geolocation object has the following properties:
// {{{ city }}}, {{{ state }}}, {{{ country }}}, {{{ country_code }}},
// {{{ lat }}}, {{{ lon }}}.
// (For a list of country codes, refer to http://www.maxmind.com/app/iso3166)
//
// You can choose to use the function synchronously: do not pass in any
// callback, and the geolocation object will instead be returned
// directly.

function getGeoLocation(callback) {
  if (callback) {
    var xhr = Utils.currentChromeWindow.XMLHttpRequest();
    xhr.mozBackgroundRequest = true;
    xhr.open("GET", "http://j.maxmind.com/app/geoip.js", true);
    xhr.overrideMimeType("text/plain");
    xhr.onload = function getGL_onload() {
      eval(xhr.responseText);
      var lon = geoip_longitude();
      callback(getGeoLocation.cache = {
        city: geoip_city(),
        state: geoip_region_name(),
        country: geoip_country_name(),
        country_code: geoip_country_code(),
        lat: geoip_latitude(),
        lon: lon, "long": lon,
      });
    };
    xhr.send(null);
    return xhr;
  }
  if ("cache" in getGeoLocation) return getGeoLocation.cache;
  getGeoLocation(function fetch(){});
  return null;
}
getGeoLocation(); // prefetch

// TODO: UserCode is only used by experimental-commands.js.  Does it still
// need to be included here?
CmdUtils.UserCode = {
  //Copied with additions from chrome://ubiquity/content/prefcommands.js
  COMMANDS_PREF : "extensions.ubiquity.commands",
  EDITOR_RE: RegExp(
    "^(?:" +
    ["chrome://ubiquity/content/editor.xhtml",
     "about:ubiquity?editor"].map(Utils.regexp.quote).join("|") +
    ")$"),

  setCode: function UC_setCode(code) {
    Utils.prefs.setValue(this.COMMANDS_PREF, code);
    //Refresh any code editor tabs that might be open
    Utils.tabs.reload(this.EDITOR_RE);
  },

  getCode: function UC_getCode()
    Utils.prefs.getValue(this.COMMANDS_PREF, ""),

  appendCode: function UC_appendCode(code){
    this.setCode(this.getCode() + code);
  },

  prependCode: function UC_prependCode(code){
    this.setCode(code + this.getCode());
  }
};

// == SNAPSHOT ==

// === {{{ CmdUtils.getTabSnapshot(tab, options) }}} ===
// Creates a thumbnail image of the contents of a given tab.
//
// {{{tab}}} is a {{{BrowserTab}}} instance.
//
// See {{{getWindowSnapshot()}}} for {{{options}}}.

function getTabSnapshot(tab, options) (
  getWindowSnapshot(tab.document.defaultView, options));

// === {{{ CmdUtils.getWindowSnapshot(win, options) }}} ===
// Creates a thumbnail image of the contents of the given window.
//
// {{{window}}} is a {{{Window}}} object.
//
// {{{options}}} is an optional dictionary which can contain any or all
// of the following properties:
// *{{{width (= 200)}}}\\
// Height will be determined automatically to maintain the aspect ratio.
// *{{{type (= "jpeg")}}}\\
// *{{{quality (= 80)}}}\\
// *{{{background (= "rgb(255,255,255)")}}}\\

function getWindowSnapshot(win, options) {
  var opts = {
    width: 200,
    type: "jpeg",
    quality: 80,
    background: "rgb(255,255,255)",
  };
  for (let k in options) opts[k] = options[k];

  var {width} = opts, {innerWidth, innerHeight} = win;
  var canvas = getHiddenWindow().document.createElementNS(
    "http://www.w3.org/1999/xhtml", "canvas");
  canvas.mozOpaque = true;
  canvas.width = width;
  canvas.height = width * innerHeight / innerWidth;

  var widthScale =  width / innerWidth;
  var ctx = canvas.getContext("2d");
  ctx.scale(widthScale, widthScale);
  ctx.drawWindow(win, win.scrollX, win.scrollY, innerWidth, innerWidth,
                 opts.background);

  return canvas.toDataURL(
    "image/" + opts.type,
    opts.type === "jpeg" ? "quality=" + opts.quality : "");
}

// === {{{ CmdUtils.getImageSnapshot(url, callback) }}} ===
// Takes a snapshot of an image residing at the passed-in URL. This
// is useful for when you want to get the bits of an image when it
// is hosted elsewhere. The bits can then be manipulated at will
// without worry of same-domain restrictions.
//
// {{{url}}} is where the image is located.
//
// {{{callback}}} gets passed back the bits of the
// image, in the form of {{{data:image/png;base64,}}}.

function getImageSnapshot(url, callback) {
  var {document, Image} = getHiddenWindow();
  var canvas = document.createElementNS("http://www.w3.org/1999/xhtml",
                                        "canvas");
  var img = Image();
  img.src = url;
  img.addEventListener("load", function gIS_load(){
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    callback(canvas.toDataURL());
  }, true);
}

// == PASSWORDS AND OTHER SENSITIVE INFORMATION ==

// === {{{ CmdUtils.savePassword(opts) }}} ===
// Saves a pair of username/password (or username/api key) to the password
// manager.
//
// {{{opts}}} is a dictionary object which must have the following properties:
// *{{{name}}} : a unique string used to identify this username/password
// pair (for instance, you can use the name of your command)
// *{{{username}}} : the username to store
// *{{{password}}} : the password (or other private data, such as an API key)
// corresponding to the username

function savePassword(opts) {
  var loginManager =
    Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);
  var nsLoginInfo = new Components.Constructor(
    "@mozilla.org/login-manager/loginInfo;1",
    Ci.nsILoginInfo,
    "init");
  var hostname = "chrome://ubiquity/content";
  var formSubmitURL = "UbiquityInformation" + opts.name;
  var loginInfo = new nsLoginInfo(
    hostname, formSubmitURL, null, opts.username, opts.password, "", "");

  try { loginManager.addLogin(loginInfo) } catch (e) {
    // "This login already exists."
    var logins = loginManager.findLogins(
      {}, hostname, formSubmitURL, null);
    for each (var login in logins) if (login.username === opts.username) {
      loginManager.modifyLogin(login, loginInfo);
      break;
    }
  }
}

// === {{{ CmdUtils.retrieveLogins(name) }}} ===
// Retrieves one or more username/password saved with
// {{{CmdUtils.savePassword()}}}
// as an array of objects, each of which takes the form
// {{{{username: "", password: ""}}}}.
//
// {{{name}}} is the identifier of the username/password pair to retrieve.
// This must match the {{{opts.name}}} that was passed in to
// {{{savePassword()}}} when the password was stored.

function retrieveLogins(name) [
  {username: login.username, password: login.password}
  for each (login in (
    Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager)
    .findLogins({}, "chrome://ubiquity/content",
                "UbiquityInformation" + name, null)))];

// == COMMAND CREATION ==

// === {{{ CmdUtils.CreateCommand(options) }}} ===
// Creates and registers a Ubiquity command.
//
// {{{options}}} is a dictionary object which
// ** must have the following properties: **
// *{{{name}}}/{{{names}}}\\
// The string or array of strings which will be the name or
// names of your command the user will type into the command line,
// or choose from the context menu, to activate it.
// *{{{execute}}}\\
// The function which gets run when the user executes your command,
// or the string which is notified or opened (if URL).
// If your command takes arguments (see below),
// your execute method will be passed an dictionary object containing
// the arguments assigned by the parser.
//
// ** The following properties are used if you want your command to
// accept arguments: **
// *{{{arguments}}}\\
// Defines the primary arguments of the command.
// See [[http://bit.ly/Ubiquity05_AuthorTutorial#Commands_with_Arguments]].
//
// ** The following properties are optional but strongly recommended to
// make your command easier for users to learn: **
//
// *{{{description}}}\\
// An XHTML string containing a short description of your command, to be displayed
// on the command-list page.
// *{{{help}}}\\
// An XHTML string containing a longer description of
// your command, also displayed on the command-list page, which can go
// into more depth, include examples of usage, etc.
//
// ** The following properties are optional: **
// *{{{icon}}}\\
// A URL string pointing to a small image (favicon-sized) to
// be displayed alongside the name of your command in the interface.
// *{{{author}}}/{{{authors}}}, {{{contributor}}}/{{{contributors}}}\\
// A plain text or dictionary object (which can have {{{name}}}, {{{email}}},
// and {{{homepage}}} properties, all plain text)
// describing the command's author/contributor.
// Can be an array of them if multiple.
// *{{{homepage}}}\\
// A URL string of the command's homepage, if any.
// *{{{license}}}\\
// A string naming the license under which your
// command is distributed, for example {{{"MPL"}}}.
// *{{{preview}}}\\
// A description of what your command will do,
// to be displayed to the user before the command is executed.  Can be
// either a string or a function.  If a string, it will simply be
// displayed as-is. If preview is a function, it will be called and
// passed a {{{pblock}}} argument, which is a reference to the
// preview display element.  Your function can generate and display
// arbitrary HTML by setting the value of {{{pblock.innerHTML}}}.
// Use {{{this.previewDefault(pblock)}}} to set the default preview.
// If your command takes arguments (see above), your preview method will
// be passed the dictionary as the second argument.
// *{{{previewDelay}}}\\
// Specifies the amount in time, in
// milliseconds, to wait before calling the preview function defined
// in {{{options.preview}}}. If the user presses a key before this
// amount of time has passed, then the preview function isn't
// called. This option is useful, for instance, if displaying the
// preview involves a round-trip to a server and you only want to
// display it once the user has stopped typing for a bit. If
// {{{options.preview}}} isn't a function, then this option is
// ignored.
// *{{{previewUrl}}}\\
// Specifies the URL which the preview
// pane's browser should load before calling the command's preview
// function. When the command's preview function is called, its
// {{{pblock}}} argument will be the {{{<body>}}} node of this URL's
// document. This can also be a relative URL, in which case it will be
// based off the URL from which the feed is being retrieved.

function CreateCommand(options) {
  var me = this;
  var global = this.__globalObject;
  var command = {
    __proto__: options,
    proto: options,
    previewDefault: CreateCommand.previewDefault,
  };

  function toNounType(obj, key) {
    var val = obj[key];
    if (!val) return;
    var noun = obj[key] = me.NounType(val);
    if (!noun.id) noun.id = global.feed.id + "#n" + me.__nextId++;
  }

  // ensure name and names
  { let names = options.names || options.name;
    if (!names)
      //errorToLocalize
      throw Error("CreateCommand: name or names is required");
    if (!Utils.isArray(names))
      names = String(names).split(/\s{0,}\|\s{0,}/);
    if (Utils.isArray(options.synonyms)) // for old API
      names.push.apply(names, options.synonyms);

    // We must keep the first name from the original feed around as an
    // identifier. This is used in the command id and in localizations
    command.referenceName = command.name = names[0];
    command.names = names;
  }
  OLD_DEPRECATED_ARGUMENT_API:
  { let {takes, modifiers} = options;
    command.oldAPI = !!(takes || modifiers);
    for (let label in takes) {
      command.DOLabel = label;
      command.DOType = takes[label];
      toNounType(command, "DOType");
      break;
    }
    for (let label in modifiers) toNounType(modifiers, label);
  }
  NEW_IMPROVED_ARGUMENT_API:
  { let args = options.arguments || options.argument;
    if (!args) {
      command.arguments = [];
      break NEW_IMPROVED_ARGUMENT_API;
    }
    // handle simplified syntax
    if (typeof args.suggest === "function")
      // argument: noun
      args = [{role: "object", nountype: args}];
    else if (!Utils.isArray(args)) {
      // arguments: {role: noun, ...}
      // arguments: {"role label": noun, ...}
      let a = [];
      for (let key in args) {
        let [role, label] = /^[a-z]+(?=(?:[$_:\s]([^]+))?)/(key) || 0;
        if (role) a.push({role: role, label: label, nountype: args[key]});
      }
      args = a;
    }
    for each (let arg in args) toNounType(arg, "nountype");
    command.arguments = args;
  }
  { let {execute, preview} = options;
    if (typeof execute !== "function") {
      let uri;
      try { uri = global.Utils.url(execute) } catch(e) {}
      command.execute = uri ? function executeOpen() {
        Utils.focusUrlInBrowser(uri.spec);
      } : function executeDisplay() {
        //errorToLocalize
        global.displayMessage(execute || "No action defined.");
      };
    }
    if (preview == null)
      command.preview = CreateCommand.previewDefault;
    else if (typeof preview !== "function") {
      // wrap it in a function that does what you'd expect it to.
      command.preview = function previewHtml(pblock) {
        pblock.innerHTML = this._previewString;
      };
      command._previewString = String(preview);
    }
  }

  if ("previewUrl" in options && !options.__lookupGetter__("previewUrl"))
    // Call our "patched" Utils.url(), which has the ability
    // to base a relative URL on the current feed's URL.
    command.previewUrl = global.Utils.url(options.previewUrl);

  global.commands.push(command);
  return command;
}
CreateCommand.previewDefault = function previewDefault(pb) {
  var html = "";
  if ("description" in this)
    html += '<div class="description">' + this.description + '</div>';
  if ("help" in this)
    html += '<p class="help">' + this.help + '</p>';
  if (!html)
    html = ('Executes the <b class="name">' +
            Utils.escapeHtml(this.name) + '</b> command.');
  html = '<div class="default">' + html + '</div>';
  if (pb) pb.innerHTML = html;
  return html;
};

// == COMMAND ALIAS CREATION ==

// === {{{ CmdUtils.CreateAlias(options) }}} ===
// Creates and registers an alias to another (target) Ubiquity command. Aliases
// can be simple synonyms, but they can also specify certain pre-defined
// argument values to be used in the parse/preview/execution.
//
// {{{options}}} is a dictionary object with following properties.
// *{{{name}}}/{{{names}}}\\
// The name string or array of strings for the alias.
// Don't use the same name as the verb itself.
// *{{{verb}}}\\
// The canonical name of the verb which is being aliased.
// Note, the "canonical name" is the first element of the verb's {{{names}}}.
// *{{{givenArgs}}} (optional)\\
// Specifies pre-determined arguments for the target
// verb. This is a hash keyed by semantic roles. The values are the text input
// value for that argument. The parser will then run that value through the
// nountype associated with that semantic role for the target verb and use that
// argument in parse/preview/execution.
//
// See {{{CmdUtils.CreateCommand()}}} for other properties available.

function CreateAlias(options) {
  var CU = this;
  var {verb} = options;
  var cmd = CU.CreateCommand(options);
  Utils.defineLazyGetter(cmd, "arguments", function alias_lazyArgs() {
    var target = getCommand(verb) || verb;
    if (!target) return [];
    var args = target.arguments;
    var {givenArgs} = cmd;
    if (givenArgs) {
      let as = [];
      for each (let arg in args) {
        let a = {};
        for (let k in arg) a[k] = arg[k];
        if (a.role in givenArgs) {
          a.input = givenArgs[a.role];
          a.hidden = true;
        }
        as.push(a);
      }
      args = as;
    }
    return args;
  });
  cmd.execute = function alias_execute(args) {
    CU.executeCommand(verb, args);
  };
  cmd.preview = function alias_preview(pb, args) {
    CU.previewCommand(verb, pb, args);
  };
  return cmd;
}

// === {{{ CmdUtils.makeSearchCommand(options) }}} ===
// A specialized version of {{{CmdUtils.CreateCommand()}}}, this lets
// you make commands that interface with search engines, without
// having to write so much boilerplate code.
//
// {{{options}}} as the argument of {{{CmdUtils.CreateCommand()}}},
// except that instead of {{{options.arguments}}}, {{{options.execute}}},
// and {{{options.preview}}} you only need a single property:
// *{{{url}}}\\
// The URL of a search results page from the search
// engine of your choice.  Must contain the literal string {{{{QUERY}}}} or
// {{{%s}}}, which will be replaced with the user's search term
// to generate a URL that should point to the correct page of search
// results.  (We're assuming that the user's search term appears in
// the URL of the search results page, which is true for most search
// engines.)  For example: {{{http://www.google.com/search?q={QUERY}}}}
//
// Also note that {{{options.icon}}} if not passed, will be generated from
// the URL passed in {{{options.url}}}, and {{{options.description}}} if
// not passed, will be auto generated from a template and {{{options.name}}}.
//
// The {{{options.execute}}}, {{{options.preview}}}, and
// {{{options.takes}}} properties are all automatically generated for you
// from {{{options.url}}}, so all you need to provide is {{{options.url}}}
// and {{{options.name}}}.  You can choose to provide other optional
// properties, which work the same way as they do for
// {{{CmdUtils.CreateCommand()}}}.  You can also override the auto-generated
// {{{preview()}}} function by providing your own as {{{options.preview}}}.
//
// *{{{postData}}}\\
// Will make the command use POST instead of GET,
// and the data (key:value pairs or string) are all passed to the URL passed in
// {{{options.url}}}. Instead of passing the search params in the URL, pass
// it (along with any other params) like so:
// {{{
//   postData: {"q": "{QUERY}", "hl": "en"}
//   postData: "q={QUERY}&hl=en"
// }}}
// When this is done, the query will be substituted in as usual.
//
// *{{{defaultUrl}}}\\
// Specifies the URL that will be opened in the case
// where the user has not provided a search string.
//
// An extra option {{{options.parser}}} can be passed, which will make
// Ubiquity automatically generate a keyboard navigatable preview of
// the results. It is passed as an object containing at the very least
// {{{options.parser.title}}}, either a jQuery selector that matches the
// titles of the results or a function given a single argument (the container 
// of the result) that must return a string to be used as title. 
// It is highly recommended that you include {{{options.parser.container}}},
// a jQuery selector that will match an element that groups
// result-data.  If this is not passed, Ubiquity will fall back to a
// fragile method of pairing titles, previews and thumbnails, which
// might not always work.  {{{options.parser.preview}}} can either be a
// jQuery selector that will match the preview returned by the search
// provider or a function that will receive a single argument (the
// container grouping the result-data) and must return a string that will
// be used as preview or a jQuery object; {{{options.parser.baseurl}}}, 
// a string that will be prefixed to relative links, such that relative paths 
// will still work out of context. If not passed, it will be auto-generated 
// from {{{options.url}}} (and thus //may// be incorrect)
// {{{options.parser.thumbnail}}}, a jQuery selector that will match a
// thumbnail which will automatically be displayed in the
// preview. Note: if it doesn't point to an {{{<img>}}} element,
// ubiquity will try and find a child of the node of type {{{img}}}
// inside the element, and use the first-found one.
// {{{options.parser.maxResults (= 4)}}} specifies the max number of results.
// {{{options.charset}}} specifies the query charset.
//
// Examples:
// {{{
// CmdUtils.makeSearchCommand({
//   name: "Yahoo",
//   url: "http://search.yahoo.com/search?p={QUERY}",
//   parser: {container: "div.res",
//            title: "div h3",
//            preview: "div.abstr, div.sm-abs"}
// });
//
// CmdUtils.makeSearchCommand({
//   name: "Google",
//   url: "http://www.google.com/search?q={QUERY}",
//   parser: {container: "li.g.w0",
//            title: "h3.r",
//            preview: "div.s"}
// });
//
// CmdUtils.makeSearchCommand({
//   name: "IMDb",
//   url: "http://www.imdb.com/find?s=all&q={QUERY}",
//   parser: {
//     container: "#main > table > tbody > tr",
//     title: "td + td + td > a",
//     thumbnail: "td:first > a > img",
//     maxResults: 8,
//   },
// });
//
// CmdUtils.makeSearchCommand({
//   names: ["video.baidu", "百度视频"],
//   url: "http://video.baidu.com/v?word={QUERY}",
//   charset: "gb2312",
//   parser: {
//     container: "#result td",
//     title: ".r a",
//     thumbnail: "img",
//     maxResults: 20,
//   },
// });
// }}}

function makeSearchCommand(options) {
  const {jQuery, noun_arb_text} = this.__globalObject, CU = this;
  function insertQuery(target, query, charset) {
    var re = /%s|{QUERY}/g;
    var fn = charset ? escape : encodeURIComponent;
    if (charset) query = Utils.convertFromUnicode(charset, query);
    if (typeof target === "object") {
      var ret = {};
      for (var key in target) ret[key] = target[key].replace(re, query);
      return ret;
    }
    return target && target.replace(re, fn(query));
  }
  options.arguments = {"object search term": noun_arb_text};
  options.execute = function searchExecute({object: {text}}) {
    if (!text && "defaultUrl" in options)
      Utils.openUrlInBrowser(options.defaultUrl);
    else
      Utils.openUrlInBrowser(
        insertQuery(options.url, text, charset),
        insertQuery(options.postData, text, charset));
  };
  var [baseurl, domain] = /^.*?:\/\/([^?#/]+)/(options.url) || [""];
  var [name] = [].concat(options.names || options.name);
  if (!name) name = options.name = domain;
  var htmlName = Utils.escapeHtml(name);
  var {charset} = options;
  if (!("icon" in options)) {
    // guess where the favicon is
    options.icon = baseurl + "/favicon.ico";
  }
  if (!("description" in options)) {
    // generate description from the name of the seach command
    // options.description = "Searches " + htmlName + " for your words.";
    options.description = L(
      "ubiquity.cmdutils.searchdescription",
      "defaultUrl" in options ? htmlName.link(options.defaultUrl) : htmlName);
  }
  if ("parser" in options) {
    let {parser} = options;
    if ("type" in parser) parser.type = parser.type.toLowerCase();
    if (!("baseurl" in parser)) parser.baseurl = baseurl;
  }
  "preview" in options || (options.preview = function searchPreview(pblock,
                                                                    args) {
    const Klass = "search-command";
    var {text, html} = args.object;
    if (!text) return void this.previewDefault(pblock);

    var {parser} = options;
    //errorToLocalize
    pblock.innerHTML = (
      "<div class='" + Klass + "'>" +
      L("ubiquity.cmdutils.searchcmd", htmlName, html) +
      (parser ? "<p class='loading'>Loading results...</p>" : "") +
      "</div>");
    if (!parser) return;

    var url = insertQuery(parser.url || options.url, text, charset);
    if ("postData" in options)
      var postData = insertQuery(options.postData, text, charset);
    function searchParser(data) {
      var template = "", results = [], sane = true;
      //errorToLocalize
      if (!data)
        template = "<p class='error'>Error parsing search results.</p>";
      else if (parser.type === "json") {
        for each (let p in parser.container.split(".")) data = data[p];
        for (let key in data) {
          let result = {}, d = data[key];
          result.title = d[parser.title];
          result.href = d[parser.href];
          if ("preview" in parser)
            result.preview = (typeof parser.preview === "function"
                              ? parser.preview(d)
                              : d[parser.preview]);
          if ("thumbnail" in parser)
            result.thumbnail = d[parser.thumbnail];
          results.push(result);
        }
      }
      else {
        let div = pblock.ownerDocument.createElement("div");
        div.innerHTML = data;
        let doc = jQuery(div);
        if ("container" in parser) {
          doc.find(parser.container).each(function eachContainer() {
            let result = {}, $this = jQuery(this);
            result.title = (typeof parser.title === "function"
                            ? parser.title(this)
                            : $this.find(parser.title));
            if ("preview" in parser)
              result.preview = (typeof parser.preview === "function"
                                ? parser.preview(this)
                                : $this.find(parser.preview));
            if ("href" in parser)
              result.href = (typeof parser.href === "function"
                             ? parser.href(this)
                             : $this.find(parser.href));
            if ("thumbnail" in parser)
              result.thumbnail = $this.find(parser.thumbnail);
            results.push(result);
          });
        }
        else {
          //errorToLocalize
          Utils.reportWarning(name + " : " +
                              "falling back to fragile parsing");
          let titles = doc.find(parser.title);
          if ("preview" in parser) {
            var previews = doc.find(parser.preview);
            sane = titles.length === previews.length;
          }
          if ("thumbnail" in parser) {
            var thumbnails = doc.find(parser.thumbnail);
            sane = titles.length === thumbnails.length;
          }
          for (let i = 0, len = titles.length; i < len; ++i) {
            let result = {title: titles.eq(i)};
            if (sane && previews)
              result.preview = previews.eq(i);
            if (sane && thumbnails)
              result.thumbnail = thumbnails.eq(i);
            results.push(result);
          }
        }
        results = results.filter(function filterResults(result) {
          var {title, thumbnail, preview, href} = result;
          if (!(title || "").length) return false;
          if (!href) {
            if (title[0].nodeName !== "A") title = title.find("A:first");
            result.href = title.attr("href");
          }
          result.title = title.html();
          if ((thumbnail || "").length) {
            if (thumbnail[0].nodeName !== "IMG")
              thumbnail = thumbnail.find("img:first");
            result.thumbnail = thumbnail.attr("src");
          }
          if (preview && typeof preview !== "string")
            result.preview = preview.html();
          return true;
        });
      }
      if (data && results.length) {
        template = "<dl class='list'>";
        let max = Math.min(results.length, parser.maxResults || 4);
        let {baseurl} = parser;
        let {escapeHtml, uri} = Utils;
        for (let i = 0; i < max; ++i) {
          let result = results[i], key = i < 35 ? (i+1).toString(36) : "-";
          template += (
            "<dt class='title'><kbd>" + key + "</kbd> <a href='" +
            escapeHtml(uri({uri: result.href, base: baseurl}).spec) +
            "' accesskey='" + key + "'>" + result.title + "</a></dt>");
          if ("thumbnail" in result)
            template += (
              "<dd class='thumbnail'><img src='" +
              escapeHtml(uri({uri: result.thumbnail, base: baseurl}).spec) +
              "'/></dd>");
          if ("preview" in result)
            template += "<dd class='preview'>" + result.preview + "</dd>";
        }
        template += "</dl>";
        sane || Utils.reportWarning(
          name + " : we did not find an equal amount of titles, " +
          "previews and thumbnails");
      }
      //errorToLocalize
      else template = "<p class='empty'>No results.</p>";
      pblock.innerHTML = (
        "<div class='" + Klass + "'>Results for <strong>" + html +
        "</strong>:" + template + "</div>");
    }
    var params = {
      url: url,
      dataType: parser.type || "html",
      success: searchParser,
      error: function searchError(xhr) {
        pblock.innerHTML = (
          "<div class='" + Klass + "'><span class='error'>" +
          xhr.status + " " + xhr.statusText + "</span></div>");
      },
    };
    if (postData) {
      params.type = "POST";
      params.data = postData;
    }
    CU.previewAjax(pblock, params);
  });
  return this.CreateCommand(options);
}

// === {{{ CmdUtils.makeBookmarkletCommand(options) }}} ===
// Creates and registers a Ubiquity command based on a bookmarklet.
// When the command is run, it will invoke the bookmarklet.
//
// {{{options}}} as the argument of CmdUtils.CreateCommand, except that
// you must provide a property called:
// *{{{url}}}\\
// The URL of the bookmarklet code. Must start with {{{javascript:}}}.
//
// {{{options.execute}}} and {{{options.preview}}} are generated for you
// from the URL., so all you need to provide is {{{options.url}}} and
// {{{options.name}}}.
//
// You can choose to provide other optional properties, which work the
// same way as they do for {{{CmdUtils.CreateCommand()}}}, except that
// since bookmarklets can't take arguments, there's no reason to provide
// {{{options.arguments}}}.

function makeBookmarkletCommand(options) {
  options.execute = function bookmarklet_execute() {
    getWindow().location = options.url;
  };
  "preview" in options ||
    (options.preview = function bookmarklet_preview(pblock) {
      pblock.innerHTML = L("ubiquity.cmdutils.bookmarkletexec", this.name);
    });
  return this.CreateCommand(options);
}

// == TEMPLATING ==

// === {{{ CmdUtils.renderTemplate(template, data) }}} ===
// Renders a {{{template}}} by substituting values from a dictionary.
// The templating language used is trimpath, which is defined at
// [[http://code.google.com/p/trimpath/wiki/JavaScriptTemplates]].
//
// {{{template}}} can be either a string, in which case the string is used
// for the template, or else it can be {file: "filename"}, in which
// case the following happens:
// * If the feed is on the user's local filesystem, the file's path
//   is assumed to be relative and the file's contents are read and
//   used as the template.
// * Otherwise, the file's path is assumed to be a key into a global
//   object called {{{Attachments}}}, which is defined by the feed.
//   The value of this key is used as the template.
//
// The reason this is done is so that a command feed can be developed
// locally and then easily deployed to a remote server as a single
// human-readable file without requiring any manual code
// modifications; with this system, it becomes straightforward to
// construct a post-processing tool for feed deployment that
// automatically generates the Attachments object and appends it to
// the command feed's code.
//
// {{{data}}} is a dictionary of values to be substituted.

function renderTemplate(template, data) {
  const {feed, Template, Attachments} = this.__globalObject;
  if (template.file)
    template = (
      Utils.uri(feed.id).scheme === "file"
      ? Utils.getLocalUrl(Utils.uri({uri: template.file, base: feed.id}).spec)
      : Attachments[template.file]);

  return Template.parseTemplate(template).process(data);
}

// == PREVIEW ==

// === {{{ CmdUtils.previewAjax(pblock, options) }}} ===
// Does an asynchronous request to a remote web service.  It is used
// just like {{{jQuery.ajax()}}}, which is documented at
// http://docs.jquery.com/Ajax/jQuery.ajax.
// The difference is that {{{CmdUtils.previewAjax()}}} is designed to handle
// command previews, which can be canceled by the user between the
// time that it's requested and the time it displays.  If the preview
// is canceled, no callbacks in the options object will be called.

function previewAjax(pblock, options) {
  const {jQuery} = this.__globalObject;
  var xhr;
  function abort() { if (xhr) xhr.abort() }

  var newOptions = {__proto__: options};
  for (var key in options) if (typeof options[key] === "function")
    newOptions[key] = previewCallback(pblock, options[key], abort);

  // see scripts/jquery_setup.js
  var wrappedXhr = newOptions.xhr || jQuery.ajaxSettings.xhr;
  newOptions.xhr = function backgroundXhr() {
    var newXhr = wrappedXhr.apply(this, arguments);
    newXhr.mozBackgroundRequest = true;
    return newXhr;
  }

  return xhr = jQuery.ajax(newOptions);
}

// === {{{ CmdUtils.previewGet(pblock, url, data, callback, type) }}} ===
// === {{{ CmdUtils.previewPost(pblock, url, data, callback, type) }}} ===
// Does an asynchronous request to a remote web service.
// It is used just like {{{jQuery.get()}}}/{{{jQuery.post()}}},
// which is documented at [[http://docs.jquery.com/Ajax]].
// The difference is that {{{previewGet()}}}/{{{previewPost()}}} is designed to
// handle command previews, which can be cancelled by the user between the
// time that it's requested and the time it displays.  If the preview
// is cancelled, the given callback will not be called.

for each (let m in ["Get", "Post"]) eval(<><![CDATA[
  CmdUtils.preview@ = function preview@(pblock, url, data, callback, type) {
    if (typeof data === "function") {
      callback = data;
      data = null;
    }
    return this.previewAjax(pblock, {
      type: "@",
      url: url,
      data: data,
      success: callback,
      dataType: type});
  }]]></>.toString().replace(/@/g, m));

// === {{{ CmdUtils.previewCallback(pblock, callback, abortCallback) }}} ===
// Creates a 'preview callback': a wrapper for a function which
// first checks to see if the current preview has been canceled,
// and if not, calls the real callback.
//
// {{{pblock}}} is the preview display element (the same one which is
// passed in as the first argument to the {{{preview()}}} method of every
// command.
//
// {{{callback}}} is the function to be called if the preview is not
// cancelled.
//
// {{{abortCallback}}} is an optional function that will be called instead
// if the preview is cancelled.

function previewCallback(pblock, callback, abortCallback) {
  var previewChanged = false;
  function onPreviewChange() {
    pblock.removeEventListener("preview-change", onPreviewChange, false);
    previewChanged = true;
    if (abortCallback) abortCallback();
  }
  pblock.addEventListener("preview-change", onPreviewChange, false);

  return function wrappedCallback() {
    if (previewChanged) return null;

    pblock.removeEventListener("preview-change", onPreviewChange, false);
    return callback.apply(this, arguments);
  };
}

// === {{{ CmdUtils.previewList(block, htmls, callback, css) }}} ===
// Creates a simple clickable list in the preview block and
// returns the list element.
// * Activating {{{accesskey="0"}}} rotates the accesskeys
//   in case the list is longer than the number of available keys.
// * The buttons are disabled upon activation to prevent duplicate calls.
//   To re-enable them, make {{{callback}}} return {{{true}}}.
//
// {{{block}}} is the DOM element the list will be placed into.
//
// {{{htmls}}} is the array/dictionary of HTML string to be listed.
//
// {{{callback(id, ev)}}} is the function called
// when one of the list item becomes focused.
// *{{{id}}} : one of the keys of {{{htmls}}}
// *{{{ev}}} : the event object
//
// {{{css}}} is an optional CSS string inserted along with the list.

function previewList(block, htmls, callback, css) {
  var {escapeHtml} = Utils, list = "", num = 0;
  for (let id in htmls) {
    let k = ++num < 36 ? num.toString(36) : "-";
    list += ('<li><label for="' + num + '"><button id="' + num +
             '" value="' + escapeHtml(id) + '" accesskey="' + k + '">' + k +
             '</button>' + htmls[id] + '</label></li>');
  }
  block.innerHTML = (
    '<ol class="preview-list">' +
    '<style>' + previewList.CSS + (css || "") + '</style>' +
    '<button id="keyshifter" accesskey="0">0</button>' +
    list + '</ol>');
  var ol = block.firstChild, start = 0;
  callback && ol.addEventListener("focus", function onPreviewListFocus(ev) {
    var {target} = ev;
    if (/^(?!button$)/i.test(target.nodeName)) return;
    target.blur();
    if (target.id === "keyshifter") {
      if (num < 36) return;
      let buttons = Array.slice(this.getElementsByTagName("button"), 1);
      start = (start + 35) % buttons.length;
      buttons = buttons.splice(start).concat(buttons);
      for (let i = 0, b; b = buttons[i];)
        b.textContent = b.accessKey = ++i < 36 ? i.toString(36) : "-";
      return;
    }
    target.disabled = true;
    if (callback(target.value, ev))
      Utils.setTimeout(function reenable() { target.disabled = false });
  }, true);
  return ol;
}
previewList.CSS = "" + <![CDATA[
  .preview-list {margin: 0; padding-left: 1.5em; list-style-type: none}
  .preview-list > li {line-height: 1.4; text-indent: -1.5em}
  .preview-list > li:hover {outline: 1px solid; -moz-outline-radius: 8px}
  .preview-list label {display: block; cursor: pointer}
  .preview-list button {
    margin-right: 0.3em; padding: 0; border-width: 1px;
    font: bold 108% monospace; text-transform: uppercase}
  #keyshifter {position:absolute; top:-9999px}
  ]]>;

// === {{{ CmdUtils.absUrl(data, sourceUrl) }}} ===
// Fixes relative URLs in {{{data}}} (e.g. as returned by AJAX call).
// Useful for displaying fetched content in command previews.
//
// {{{data}}} is the data containing relative URLs, which can be
// an HTML string or a jQuery/DOM/XML object.
//
// {{{sourceUrl}}} is the URL used to fetch the data (that is to say;
// the URL to which the relative paths are relative to).

function absUrl(data, sourceUrl) {
  var {uri} = Utils;
  switch (typeof data) {
    case "string": return data.replace(
      /\b(href|src|action)=(?![\"\']?[a-z]+:\/\/)([\"\']?)([^\s>\"\']+)\2/ig,
      function absUrl_gsub(_, a, q, path) (
        a + "=" + q + uri({uri: path, base: sourceUrl}).spec + q));
    case "object": {
      (this.__globalObject.jQuery(data)
       .find("*").andSelf()
       .each(function absUrl_iter() {
         if (!("getAttribute" in this)) return;
         var attr, path = (
           this.getAttribute(attr = "href") ||
           this.getAttribute(attr = "src" ) ||
           this.getAttribute(attr = "action"));
         if (path !== null)
           this.setAttribute(attr, uri({uri: path, base: sourceUrl}).spec);
       }));
      return data;
    }
    case "xml": return XML(absUrl.call(this, data.toXMLString(), sourceUrl));
  }
  return null;
}

// === {{{ CmdUtils.safeWrapper(func) }}} ===
// Wraps a function so that exceptions from it are suppressed and notified.

function safeWrapper(func) {
  var {displayMessage} = this.__globalObject;
  return function safeWrapped() {
    try { func.apply(this, arguments) } catch (e) {
      displayMessage({
        //errorToLocalize
        text: ("An exception occurred while running " + func.name + "()."),
        exception: e});
    }
  };
}
