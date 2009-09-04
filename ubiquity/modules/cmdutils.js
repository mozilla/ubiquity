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
//
// This is a small library of general utility functions
// for use by command code.  Everything clients need is contained within
// the {{{CmdUtils}}} namespace.

var EXPORTED_SYMBOLS = ["CmdUtils"];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/nounutils.js");
Cu.import("resource://ubiquity/modules/contextutils.js");
Cu.import("resource://ubiquity/modules/localization_utils.js");

var L = LocalizationUtils.propertySelector(
  "chrome://ubiquity/locale/coreubiquity.properties");

const {Application} = Utils;

var CmdUtils = {
  __globalObject: null,
  __nextId: null,

  // === {{{ CmdUtils.parserVersion }}} ===
  //
  // This attribute contains the parser version that Ubiquity is
  // using. A command can provide different options to
  // {{{CmdUtils.CreateCommand()}}} and behave differently
  // depending on this value, allowing a single command feed to
  // cater to whatever parser the user is using.
  //
  // Ubiquity 0.1.x only supports parser version 1, while
  // Ubiquity 0.5.x supports parser versions 1 and 2.

  get parserVersion parserVersion() (
    Application.prefs.getValue("extensions.ubiquity.parserVersion", 1)),

  // === {{{ CmdUtils.maxSuggestions }}} ===
  //
  // Gets the current number of max suggestions.

  get maxSuggestions maxSuggestions() (
    Cu.import("resource://ubiquity/modules/cmdmanager.js", null)
    .CommandManager.maxSuggestions),
};

for each (let f in this) if (typeof f === "function") CmdUtils[f.name] = f;

// == From NounUtils ==
//
// {{{CmdUtils}}} inherits [[#modules/nounutils.js|NounUtils]].

for (let k in NounUtils) CmdUtils[k] = NounUtils[k];

// == From ContextUtils ==
//
// {{{CmdUtils}}} imports and wraps the following three methods from
// [[#modules/contextutils.js|ContextUtils]].

// === {{{ CmdUtils.getHtmlSelection() }}} ===
//
// Returns a string containing the html representation of the
// user's current selection, i.e. text including tags.

// === {{{ CmdUtils.getSelection() }}} ===
//
// Returns a string containing the text and just the text of the user's
// current selection, i.e. with html tags stripped out.

// === {{{ CmdUtils.setSelection(content, options) }}} ===
//
// Replaces the current selection with new content.
//
// {{{content}}} The html string to set as the selection.
//
// {{{options}}} is a dictionary; if it has a {{{text}}} property then
// that value will be used in place of the html if we're in
// a plain-text-only editable field.

for each (let m in ["getHtmlSelection", "getSelection", "setSelection"]) {
  eval(<><![CDATA[
    CmdUtils.@ = function @(x, y) {
      var c = this.__globalObject.context || {};
      "focusedWindow" in c && "focusedElement" in c ||
        (c = Utils.currentChromeWindow.document.commandDispatcher);
      return ContextUtils.@(c, x, y);
    };
    ]]></>.toString().replace(/@/g, m));
}

// === {{{ CmdUtils.log(a, b, c, ...) }}} ===
//
// See [[#modules/utils.js|Utils]]{{{.log}}}.

function log() {
  Utils.log.apply(Utils, arguments);
}

// === {{{ CmdUtils.getDocument() }}} ===
// === {{{ CmdUtils.getWindow() }}} ===
//
// Gets the document/window of the current tab in a secure way.

function getDocument() Application.activeWindow.activeTab.document;

function getWindow() getDocument().defaultView;

// === {{{ CmdUtils.getDocumentInsecure() }}} ===
// === {{{ CmdUtils.getWindowInsecure() }}} ===
//
// Gets the document/window object of the current tab, without the
// safe {{{XPCNativeWrapper}}}.
// While this allows access to scripts in the content,
// it is potentially **unsafe** and {{{getDocument()/getWindow()}}} should
// be used in place of this whenever possible.

function getDocumentInsecure() getDocument().wrappedJSObject;

function getWindowInsecure() getDocumentInsecure().defaultView;

// ** {{{ CmdUtils.__getUbiquity( ) }}} **
//
// Get a reference to Ubiquity. This is used by
// {{{ CmdUtils.closeUbiquity() }}} and {{{ CmdUtils.getCommandByName() }}}, but
// probably doesn't need to be used directly by command feeds.
 
function __getUbiquity() {
  // TODO: Understand why it doesn't work with a simple test.
  try {
    return context.chromeWindow.gUbiquity;
  } catch(e) {
    return Utils.currentChromeWindow.gUbiquity;
  }
};

// ** {{{ CmdUtils.__getCommandByName( ) }}} **
//
// Get a reference to a Ubiquity command. This is used by
// alias related functions, but probably doesn't need to be used directly
// by command feeds.
//
// {{{ name }}} The ID or name of the command.
 
function __getCommandByName( name ) {
  var cs = CmdUtils.__getUbiquity().__cmdManager.__cmdSource;
  // try to find it by ID first and then by referenceName
  return cs.getCommand( name ) || cs.getCommandByName( name );
};

// ** {{{ CmdUtils.executeCommand }}} **
//
// Execute an existing Ubiquity command.
//
// {{{ command }}} either the id or name of the Ubiquity command that will be
// executed or a direct reference to the command itself.
// TODO: test direct reference
//
// {{{ args }}} An object containing the modifiers values that will
// be passed to the execute function of the target command. Example:
// {source: {data: 'en', text: 'english'}, goal: {data: 'fr', text: 'french'}}
 
function executeCommand(command, args) {
  var context = this.__globalObject.context || {};
  if (command.constructor == String)
    return CmdUtils.__getCommandByName(command).execute(context, args);
  return command.execute(args);
};

// ** {{{ CmdUtils.previewCommand }}} **
//
// Preview an existing Ubiquity command.
//
// {{{ command }}} either the id or name of the Ubiquity command that will be
// previewed or a direct reference to the command itself.
// TODO: test direct reference
//
// {{{ args }}} An object containing the modifiers values that will
// be passed to the execute function of the target command. Example:
// {source: {data: 'en', text: 'english'}, goal: {data: 'fr', text: 'french'}}
 
function previewCommand(pblock, command, args) {
  var context = this.__globalObject.context || {};
  if (command.constructor == String)
    return CmdUtils.__getCommandByName(command).preview(context, pblock, args);
  return command.context(pblock, args);
};

// === {{{ CmdUtils.geocodeAddress(location, callback) }}} ===
//
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
        dict.lat  = dict.latitude;
        dict.long = dict.longitude;
        return dict;
      }));
  },
});

// === {{{ CmdUtils.injectCss(css) }}} ===
//
// Injects CSS source code into the current tab's document.
// Returns the injected style elment for later use.
//
// {{{ css }}} The CSS source code to inject, in plain text.

function injectCss(css) {
  var doc = getDocument();
  var style = doc.createElement("style");
  style.innerHTML = css;
  return doc.body.appendChild(style);
}

// === {{{ CmdUtils.injectHtml(html) }}} ===
//
// Injects HTML source code at the end of the current tab's document.
// Returns the injected elements as a jQuery object.
//
// {{{ html }}} The HTML source code to inject, in plain text.

function injectHtml(html) {
  const {jQuery} = this.__globalObject;
  var doc = getDocument();
  return jQuery("<div>" + html + "</div>").contents().appendTo(doc.body);
}

// === {{{ CmdUtils.copyToClipboard(text) }}} ===
//
// This function places the passed-in text into the OS's clipboard.
// If the text is empty, the copy isn't performed.
//
// {{{text}}} is a plaintext string that will be put into the clipboard.

function copyToClipboard(text) ((text = String(text)) &&
                                (Utils.clipboard.text = text));

// === {{{ CmdUtils.injectJavascript(src, callback) }}} ===
//
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
//
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

// === {{{ CmdUtils.onPageLoad(callback) }}} ===
//
// Sets up a function to be run whenever a page is loaded.
//
// {{{ callback }}} Non-optional callback function.  Each time a new
// page or tab is loaded in the window, the callback function will be
// called; it is passed a single argument, which is the window's document
// object.

function onPageLoad(callback) {
  this.__globalObject.pageLoadFuncs.push(callback);
}

// === {{{ CmdUtils.onUbiquityLoad(callback) }}} ===
//
// Sets up a function to be run whenever a Ubiqutiy instance is created.
//
// {{{ callback }}} Non-optional callback function. Each time a new
// Ubiquity instance is created, the callback function will be
// called; it is passed two arguments, which is the Ubiquity instance and
// the chromeWindow associated with it.

function onUbiquityLoad(callback) {
  this.__globalObject.ubiquityLoadFuncs.push(callback);
}

// ** {{{ CmdUtils.setLastResult(result) }}} **
//
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
//
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
// {{{ lat }}}, {{{ long }}}.
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
    xhr.onreadystatechange = function gGL_orsc() {
      if (xhr.readyState !== 4 || xhr.status !== 200) return;
      eval(xhr.responseText);
      callback(getGeoLocation.cache = {
        city: geoip_city(),
        state: geoip_region_name(),
        country: geoip_country_name(),
        country_code: geoip_country_code(),
        lat: geoip_latitude(),
        "long": geoip_longitude(),
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

  setCode: function UC_setCode(code) {
    Application.prefs.setValue(
      this.COMMANDS_PREF,
      code
   );
    //Refresh any code editor tabs that might be open
    Application.activeWindow.tabs.forEach(function (tab){
      if(tab.document.location == "chrome://ubiquity/content/editor.xhtml"){
        tab.document.location.reload(true);
      }
    });
  },

  getCode: function UC_getCode() {
    return Application.prefs.getValue(
      this.COMMANDS_PREF,
      ""
   );
  },

  appendCode: function UC_appendCode(code){
    this.setCode(this.getCode() + code);
  },

  prependCode: function UC_prependCode(code){
    this.setCode(code + this.getCode());
  }
};

// == SNAPSHOT ==

// === {{{ CmdUtils.getHiddenWindow() }}} ===
//
// Returns the application's hidden window.  (Every Mozilla
// application has a global singleton hidden window.  This is used by
// {{{ CmdUtils.getWindowSnapshot() }}}, but probably doesn't need
// to be used directly by command feeds.

function getHiddenWindow() (Cc["@mozilla.org/appshell/appShellService;1"]
                            .getService(Ci.nsIAppShellService)
                            .hiddenDOMWindow);

// === {{{ CmdUtils.getTabSnapshot(tab, options) }}} ===
//
// Creates a thumbnail image of the contents of a given tab.
// {{{ tab }}} a tab object.
// {{{ options }}} see getWindowSnapshot().

function getTabSnapshot(tab, options) {
  var win = tab.document.defaultView;
  return getWindowSnapshot(win, options);
}

// === {{{ CmdUtils.getWindowSnapshot(win, options) }}} ===
//
// Creates a thumbnail image of the contents of the given window.
// {{{ window }}} a window object.
// {{{ options }}} an optional dictionary which can contain any or all
// of the following properties:
// {{{ options.width }}} the desired width of the image.  Height will be
// determined automatically to maintain the aspect ratio.
// If not provided, the default width is 200 pixels.
// {{{ options.callback }}} A function which, if provided, will be
// called back with the image data.
//
// If a callback is not provided, this function will return a URL
// pointing to a JPEG of the image data.

function getWindowSnapshot(win, options) {
  if(!options) options = {};

  var hiddenWindow = getHiddenWindow();
  var thumbnail = hiddenWindow.document.createElementNS(
    "http://www.w3.org/1999/xhtml", "canvas");

  var width = options.width || 200; // Default to 200px width

  var widthScale =  width / win.innerWidth;
  var aspectRatio = win.innerHeight / win.innerWidth;

  thumbnail.mozOpaque = true;
  thumbnail.width = width;
  thumbnail.height = thumbnail.width * aspectRatio;
  var ctx = thumbnail.getContext("2d");
  ctx.scale(widthScale, widthScale);
  ctx.drawWindow(win, win.scrollX, win.scrollY,
                 win.innerWidth, win.innerWidth, "rgb(255,255,255)");

  var data = thumbnail.toDataURL("image/jpeg", "quality=80");
  if (options.callback) {
    options.callback(data);
  } else {
    return data;
  }
}

// === {{{ CmdUtils.getImageSnapshot(url, callback) }}} ===
//
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
//
// Saves a pair of username/password (or username/api key) to the password
// manager.
//
// {{{opts}}} A dictionary object which must have the following properties:
// {{{opts.name}}} a unique string used to identify this username/password
// pair; for instance, you can use the name of your command.
// {{{opts.username}}} the username to store
// {{{opts.password}}} the password (or other private data, such as an API key)
// corresponding to the username

function savePassword(opts) {
  var passwordManager = Cc["@mozilla.org/login-manager;1"].
                        getService(Ci.nsILoginManager);
  var nsLoginInfo = new Components.
                        Constructor("@mozilla.org/login-manager/loginInfo;1",
                                    Ci.nsILoginInfo,
                                    "init");
  //var loginInfo = new nsLoginInfo(hostname,
  //                                formSubmitURL,
  //                                httprealm,
  //                                username,
  //                                password,
  //                                usernameField,
  //                                passwordField);
  var loginInfo = new nsLoginInfo("chrome://ubiquity/content",
                                  "UbiquityInformation" + opts.name,
                                  null,
                                  opts.username,
                                  opts.password,
                                  "",
                                  "");

  try {
     passwordManager.addLogin(loginInfo);
  } catch (e) {
    // "This login already exists."
    var logins = passwordManager.findLogins({},
                                            "chrome://ubiquity/content",
                                            "UbiquityInformation" + opts.name,
                                            null);
    for each (var login in logins) {
      if (login.username === opts.username) {
        //modifyLogin(oldLoginInfo, newLoginInfo);
        passwordManager.modifyLogin(login, loginInfo);
        break;
      }
    }
  }
}

// === {{{ CmdUtils.retrieveLogins(name) }}} ===
//
// Retrieves one or more username/password saved with
// {{{CmdUtils.savePassword()}}}
// as an array of objects, each of which takes the form
// {{{{username: "", password: ""}}}}.
//
// {{{name}}} The identifier of the username/password pair to retrieve.
// This must match the {{{opts.name}}} that was passed in to
// {{{savePassword()}}} when the password was stored.

function retrieveLogins(name) [
  {username: login.username, password: login.password}
  for each (login in (Cc["@mozilla.org/login-manager;1"]
                      .getService(Ci.nsILoginManager)
                      .findLogins({},
                                  "chrome://ubiquity/content",
                                  "UbiquityInformation" + name,
                                  null)))];

// == COMMAND CREATION ==

// === {{{ CmdUtils.CreateCommand(options) }}} ===
//
// Creates and registers a Ubiquity command.
//
// {{{ options }}} is a dictionary object which ** must have the following
// properties: **
//
// {{{ options.name }}} The name of your command, which the user will
// type into the command line, or choose from the context menu, to
// activate it.  Cannot contain spaces.  DEPRECATED; use {{{ options.names }}}
// for Parser2 compatibility.
//
// {{{ options.execute }}} The function which gets run when the user
// executes your command, or the string which is notified or opened (if URL).
// If your command takes arguments (see below),
// your execute method will be passed an dictionary object containing
// the arguments assigned by the parser.
//
// ** The following properties are used if you want your command to
// accept arguments: **
//
// {{{ options.takes }}} Defines the primary argument of the command,
// a.k.a. the direct-object of the verb.  A dictionary object with a
// single property.  The name of the property will be the display name
// of the primary argument.  The value of the property must be either a
// noun type (see
// https://wiki.mozilla.org/Labs/Ubiquity/Ubiquity_0.1_Nountypes_Reference
//) which defines what type of values are valid for the argument,
// a regular expression that filters what the argument can consist of,
// , a dictionary of keys and values, or simply an array of strings.
// DEPRECATED!  Use {{{ options.arguments }}} for Parser2 compatibility.
//
// {{{ options.modifiers }}} Defines any number of secondary arguments
// of the command, a.k.a. indirect objects of the verb.  A dictionary
// object with any number of properties; the name of each property
// should be a preposition-word ('to', 'from', 'with', etc.), and the
// value is either the noun type or regular expression for the
// argument.  The name of the property is the word that the user will
// type on the command line to invoke the modifier, and the noun type
// or regular expression determines the range of valid values.
// DEPRECATED!  Use {{{ options.arguments }}} for Parser2 compatibility.
//
// For more about the use of arguments in your command, see
// https://wiki.mozilla.org/Labs/Ubiquity/Ubiquity_0.1_Author_Tutorial#Commands_with_Arguments
//
// ** The following properties are optional but strongly recommended to
// make your command easier for users to learn: **
//
// {{{ options.description }}} A string containing a short description
// of your command, to be displayed on the command-list page. Can include
// HTML tags.
//
// {{{ options.help }}} A string containing a longer description of
// your command, also displayed on the command-list page, which can go
// into more depth, include examples of usage, etc. Can include HTML
// tags.
//
// === The following properties are optional: ===
//
// {{{ options.icon }}} A string containing the URL of a small image (favicon-sized) to
// be displayed alongside the name of your command in the interface.
//
// {{{ options.author }}} A dictionary object describing the command's
// author.  Can have {{{options.author.name}}}, {{{options.author.email}}},
// and {{{options.author.homepage}}} properties, all strings.
//
// {{{ options.homepage }}} The URL of the command's homepage, if any.
//
// {{{ options.contributors }}} An array of strings naming other people
// who have contributed to your command.
//
// {{{ options.license }}} A string naming the license under which your
// command is distributed, for example "MPL".
//
// {{{ options.preview }}} A description of what your command will do,
// to be displayed to the user before the command is executed.  Can be
// either a string or a function.  If a string, it will simply be
// displayed as-is. If preview is a function, it will be called and
// passed a {{{pblock}}} argument, which is a reference to the
// preview display element.  Your function can generate and display
// arbitrary HTML by setting the value of {{{pblock.innerHTML}}}. If
// your command takes arguments (see above), your preview method will
// be passed the direct object as its second argument, and a modifiers
// dictionary as its third argument.
//
// {{{ options.previewDelay }}} Specifies the amount in time, in
// milliseconds, to wait before calling the preview function defined
// in {{{options.preview}}}. If the user presses a key before this
// amount of time has passed, then the preview function isn't
// called. This option is useful, for instance, if displaying the
// preview involves a round-trip to a server and you only want to
// display it once the user has stopped typing for a bit. If
// {{{options.preview}}} isn't a function, then this option is
// ignored.
//
// {{{ options.previewUrl }}} Specifies the URL which the preview
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
      throw Error("CreateCommand: name or names is required.");
    if (!Utils.isArray(names))
      names = (names + "").split(/\s{0,}\|\s{0,}/);
    if (Utils.isArray(options.synonyms)) // for old API
      names.push.apply(names, options.synonyms);

    // we must keep the first name from the original feed around as an
    // identifier. This is used in the command id and in localizations
    command.referenceName = names[0];

    /* If there are parenthesis in any name, separate the part in the
     * parens and store it separately... this is to support multiple distinct
     * commands with the same verb.
     * For the time being, attempt both verb-initial and verb-final variants.*/

    let verbInitialParensPattern = /^([^\(\)]+?)\s*\((.+)\)$/;
    let verbFinalParensPattern = /^\((.+)\)\s*([^\(\)]+?)$/;
    let nameArgs = [];
    for (let x = 0; x < names.length; x++) {
      let aName = names[x];
      let viMatches;
      if (viMatches = verbInitialParensPattern(aName)) {
        names[x] = viMatches[1];
        nameArgs[x] = viMatches[2];
      }

      let vfMatches;
      if (vfMatches = verbFinalParensPattern(aName)) {
        names[x] = vfMatches[2];
        nameArgs[x] = vfMatches[1];
      }
    }
    if (nameArgs.length > 0)
      command.nameArg = nameArgs[0]; // other nameArgs not used
    command.name = names[0];
    command.names = names;
  }
  OLD_DEPRECATED_ARGUMENT_API:
  { let {takes, modifiers} = options;
    if (takes || modifiers) command.oldAPI = true;
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
    if (!args) break NEW_IMPROVED_ARGUMENT_API;
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

  if (options.previewUrl)
    // Call our "patched" Utils.url(), which has the ability
    // to base a relative URL on the current feed's URL.
    command.previewUrl = global.Utils.url(options.previewUrl);

  global.commands.push(command);
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
//
// NEW with Ubiquity 0.5.5
// 
// Creates and registers an alias to another (target) Ubiquity command. Aliases
// can be simple synonyms, but they can also specify certain pre-defined
// argument values to be used in the parse/preview/execution.
//
// {{{ options }}} is a dictionary object which ** must have the following
// properties: **
//
// {{{ options.names }}} An array of names for the alias. Do not use the same
// name as the verb itself.
//
// {{{ options.verb }}} (string) the canonical name of the verb which is being
// aliased. Note, the "canonical name" is the first element of the verb's
// {{{names}}}. TODO (maybe): let this also accept verb objects or ID's directly.
//
// ** The following property is used to specify arguments for the target verb: **
//
// {{{ options.givenArgs }}} Specifies pre-determined arguments for the target
// verb. This is a hash keyed by semantic roles. The values are the text input
// value for that argument. The parser will then run that value through the
// nountype associated with that semantic role for the target verb and use that
// argument in parse/preview/execution.
//
// === The following properties are optional: ===
// 
// {{{ options.help }}} A string containing a longer description of
// your alias, also displayed on the command-list page, which can go
// into more depth, include examples of usage, etc. Can include HTML
// tags.
// 
// {{{ options.description }}} A string containing a short description
// of your alias, to be displayed on the command-list page. Can include
// HTML tags.
//
// {{{ options.icon }}} A string containing the URL of a small image (favicon-sized) to
// be displayed alongside the name of your alias in the interface.
//
// {{{ options.author }}} A dictionary object describing the alias's
// author.  Can have {{{options.author.name}}}, {{{options.author.email}}},
// and {{{options.author.homepage}}} properties, all strings.
//
// {{{ options.homepage }}} The URL of the alias's homepage, if any.
//
// {{{ options.contributors }}} An array of strings naming other people
// who have contributed to your alias.
//
// {{{ options.license }}} A string naming the license under which your
// alias is distributed, for example "MPL".

function CreateAlias(options) {
  dump('creating alias now\n');
  var me = this;
  var global = this.__globalObject;

  var alias = {
    __proto__: options,
    proto: options,
    thisIsAnAlias: true,
    get targetVerb() {
      try {
        if (this.verb.constructor == String)
          return CmdUtils.__getCommandByName(this.verb);
        return this.verb;
      } catch(e) {
        return null;
      }
    },
    get arguments() {
      var args = this.targetVerb ? this.targetVerb.arguments : [];
      var realArgSpecs = [];
      for (var key in args) {
        var takeThisArgSpec = true;
        for (var role in this.givenArgs)
          if (args[key].role == role)
            takeThisArgSpec = false;
        if (takeThisArgSpec)
          realArgSpecs.push(args[key]);
      }
      return realArgSpecs;
    },
    get cachedGivenArgs() {
      var args = this.targetVerb ? this.targetVerb.arguments : [];
      var cachedGivenArgs = {};
      for (var role in this.givenArgs) {
        var nounTypeId = null;
        var givenText = this.givenArgs[role];
        // if we don't have the necessary fields, find the appropriate nountype
        for each (var targetArgSpec in args) {
          if (targetArgSpec.role == role) {
            nounTypeId = targetArgSpec.nountype.id;
            break;
          }
        }
        var nc = CmdUtils.__getUbiquity().__cmdManager.__nlParser._nounCache;
        cachedGivenArgs[role] = nc.getBestSugg(givenText, nounTypeId);
      }
      return cachedGivenArgs;
    },
    get serviceDomain() (this.targetVerb.serviceDomain)
  };

  var names = alias.names;
  // ensure name and names
  if (!names)
    //errorToLocalize
    throw Error("CreateCommand: name or names is required.");
  if (!Utils.isArray(alias.names))
    names = (names + "").split(/\s{0,}\|\s{0,}/);

  // we must keep the first name from the original feed around as an
  // identifier. This is used in the command id and in localizations
  alias.referenceName = names[0];
  alias.name = names[0];

  alias.preview = function(pblock,args) {
    for (var role in this.cachedGivenArgs)
      args[role] = this.cachedGivenArgs[role];
    var context = alias.preview.caller.arguments[0];
    if (this.targetVerb.preview == null) {
      CreateCommand.previewDefault.apply(this,[pblock]);
    } else {
      this.targetVerb.preview.apply(this,[context,pblock,args]);
    }
  };
  
  alias.execute = function(pblock,args) {
    for (var role in this.cachedGivenArgs)
      args[role] = this.cachedGivenArgs[role];
    var context = alias.execute.caller.arguments[0];
    this.targetVerb.execute.apply(this.targetVerb,[context,pblock,args]);
  }
  
  global.commands.push(alias);
}

// === {{{ CmdUtils.makeSearchCommand(options) }}} ===
//
// A specialized version of {{{CmdUtils.CreateCommand()}}}, this lets
// you make commands that interface with search engines, without
// having to write so much boilerplate code.
//
// {{{options}}} as the argument of {{{CmdUtils.CreateCommand()}}},
// except that instead of {{{options.arguments}}}, {{{options.execute}}},
// and {{{options.preview}}} you only need a single property:
//
// {{{options.url}}} The url of a search results page from the search
// engine of your choice.  Must contain the literal string
// {{{{QUERY}}}}, which will be replaced with the user's search term
// to generate a URL that should point to the correct page of search
// results.  (We're assuming that the user's search term appears in
// the URL of the search results page, which is true for most search
// engines.)  For example: {{{http://www.google.com/search?q={QUERY}}}}
//
// Also note that {{{options.icon}}} if not passed, will be generated from
// the url passed in {{{options.url}}}, and {{{options.description}}} if
// not passed, will be auto generated from a template and
// {{{options.name}}}.
//
// The {{{options.execute}}}, {{{options.preview}}}, and
// {{{options.takes}}} properties are all automatically generated for you
// from {{{options.url}}}, so all you need to provide is {{{options.url}}}
// and {{{options.name}}}.  You can choose to provide other optional
// properties, which work the same way as they do for
// {{{CmdUtils.CreateCommand()}}}.  You can also override the auto-generated
// {{{preview()}}} function by providing your own as {{{options.preview}}}.
//
// {{{options.postData}}} will make the command use POST instead of GET,
// and the data (key:value pairs or string) are all passed to the url passed in
// {{{options.url}}}. Instead of passing the search params in the url, pass
// it (along with any other params) like so:
//
//   {{{postData: {"q": "{QUERY}", "hl": "en"}}}}
//
//   {{{postData: "q={QUERY}&hl=en"}}}
//
// When this is done, the query will be substituted in as usual.
//
// {{{options.defaultUrl}}} specifies the URL that will be opened in the case
// where the user has not provided a search string.
//
// An extra option {{{options.parser}}} can be passed, which will make
// Ubiquity automatically generate a keyboard navigatable preview of
// the results. It is passed as an object containing at the very least
// {{{options.parser.title}}}, a jQuery selector that matches the
// titles of the results. Optionally, you can include members It is
// highly recommended that you include {{{options.parser.container}}},
// a jQuery selector that will match an element that groups
// result-data.  If this is not passed, Ubiquity will fall back to a
// fragile method of pairing titles, previews and thumbnails, which
// might not always work.  {{{options.parser.preview}}} can either be a
// jQuery selector that will match the preview returned by the search
// provider or a function that will receive a single argument (the
// container grouping the result-data) and must return a string that will
// be used as preview; {{{options.parser.baseurl}}}, a string that will
// be prefixed to relative links, such that relative paths will still
// work out of context. If not passed, it will be auto-generated from
// {{{options.url}}} (and thus //may// be incorrect)
// {{{options.parser.thumbnail}}}, a jQuery selector that will match a
// thumbnail which will automatically be displayed in the
// preview. Note: if it doesn't point to an {{{<img>}}} element,
// ubiquity will try and find a child of the node of type {{{img}}}
// inside the element, and use the first-found one.
// {{{options.parser.maxResults (= 4)}}} specifies the max number of results.
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
// }}}
// {{{
// CmdUtils.makeSearchCommand({
//   name: "Google",
//   url: "http://www.google.com/search?q={QUERY}",
//   parser: {container: "li.g.w0",
//            title: "h3.r",
//            preview: "div.s"}
// });
// }}}
// {{{
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
// }}}

function makeSearchCommand(options) {
  const {jQuery, noun_arb_text} = this.__globalObject, CU = this;
  function insertQuery (target, query) {
    var re = /%s|{QUERY}/g;
    if (typeof target === "object") {
      var ret = {};
      for (var key in target) ret[key] = target[key].replace(re, query);
      return ret;
    }
    return target && target.replace(re, encodeURIComponent(query));
  }
  options.arguments = {"object search term": noun_arb_text};
  options.execute = function searchExecute({object: {text}}) {
    if (!text && "defaultUrl" in options)
      Utils.openUrlInBrowser(options.defaultUrl);
    else
      Utils.openUrlInBrowser(insertQuery(options.url, text),
                             insertQuery(options.postData, text));
  };
  var [baseurl, domain] = /^.*?:\/\/([^?#/]+)/(options.url) || [""];
  var name = (options.names || 0)[0] || options.name;
  if (!name) name = options.name = domain;
  var htmlName = Utils.escapeHtml(name);
  if (!("icon" in options)) {
    // guess where the favicon is
    options.icon = baseurl + "/favicon.ico";
  }
  if (!("description" in options)) {
    // generate description from the name of the seach command
    // options.description = "Searches " + htmlName + " for your words.";
    options.description = L("ubiquity.cmdutils.searchdescription", htmlName);
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
    if (!text) {
      pblock.innerHTML = this.description;
      return;
    }
    var {parser} = options;
    //errorToLocalize
    pblock.innerHTML = (
      "<div class='" + Klass + "'>" +
      L("ubiquity.cmdutils.searchcmd", htmlName, html) +
      (parser ? "<p class='loading'>Loading results...</p>" : "") +
      "</div>");
    if (!parser) return;
    var url = insertQuery(parser.url || options.url, text);
    if ("postData" in options)
      var postData = insertQuery(options.postData, text);
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
        let doc = jQuery(data);
        if ("container" in parser) {
          doc.find(parser.container).each(function eachContainer() {
            let result = {}, $this = jQuery(this);
            result.title = $this.find(parser.title);
            if ("preview" in parser)
              result.preview = (typeof parser.preview === "function"
                                ? parser.preview(this)
                                : $this.find(parser.preview));
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
          var {title, thumbnail, preview} = result;
          if (!(title || 0).length) return false;
          if (title[0].nodeName !== "A") title = title.find("A:first");
          result.href = title.attr("href");
          result.title = title.html();
          if ((thumbnail || 0).length) {
            if (thumbnail[0].nodeName !== "IMG")
              thumbnail = thumbnail.find("img:first");
            result.thumbnail = thumbnail.attr("src");
          }
          if (preview) result.preview = preview.html();
          return true;
        });
      }
      if (data && results.length) {
        template = "<dl class='list'>";
        let max = Math.min(results.length, parser.maxResults || 4);
        let {baseurl} = parser;
        let {escapeHtml, url} = Utils;
        for (let i = 0; i < max; ++i) {
          let result = results[i], key = i < 35 ? (i+1).toString(36) : "-";
          template += (
            "<dt class='title'><kbd>" + key + "</kbd> <a href='" +
            escapeHtml(url({uri: result.href, base: baseurl}).spec) +
            "' accesskey='" + key + "'>" + result.title + "</a></dt>");
          if ("thumbnail" in result)
            template += (
              "<dd class='thumbnail'><img src='" +
              escapeHtml(url({uri: result.thumbnail, base: baseurl}).spec) +
              "'/></dd>");
          if ("preview" in result)
            template += "<dd class='preview'>" + result.preview + "</dd>";
        }
        template += "</dl>";
        if (!sane)
          // we did not find an equal amount of titles, previews
          // and thumbnails
          //errorToLocalize
          template += (
            "<p class='error'>Note: no previews have been generated, " +
            "because an error occured while parsing the " +
            "results</p>");
      }
      //errorToLocalize
      else template = "<p class='empty'>No results.</p>";
      pblock.innerHTML = ("<div class='" + Klass + "'>" +
                          "Results for <strong>" + html + "</strong>:" +
                          template +
                          "</div>");
    }
    var params = {
      url: url,
      success: searchParser,
      dataType: parser.type || "html",
    };
    if (postData) {
      params.type = "POST";
      params.data = postData;
    }
    CU.previewAjax(pblock, params);
  });
  this.CreateCommand(options);
}

// === {{{ CmdUtils.makeBookmarkletCommand(options) }}} ===
//
// Creates and registers a Ubiquity command based on a bookmarklet.
// When the command is run, it will invoke the bookmarklet.
//
// {{{options}}} as the argument of CmdUtils.CreateCommand, except that
// you must provide a property called:
//
// {{{options.url}}} the url of the bookmarklet code.
// Must start with "javascript:".
//
// {{{options.execute}}} and {{{options.preview}}} are generated for you
// from the url, so all you need to provide is {{{options.url}}} and
// {{{options.name}}}.
//
// You can choose to provide other optional properties, which work the
// same way as they do for {{{CmdUtils.CreateCommand}}}, except that
// since bookmarklets can't take arguments, there's no reason to provide
// {{{options.arguments}}}.

function makeBookmarkletCommand(options) {
  options.execute = function bookmarklet_execute() {
    getWindow().location = options.url;
  };

  if (!options.preview)
    options.preview = function bookmarklet_preview(pblock) {
      pblock.innerHTML = L("ubiquity.cmdutils.bookmarkletexec", this.name);
    };

  this.CreateCommand(options);
}

// == TEMPLATING ==

// === {{{ CmdUtils.renderTemplate(template, data) }}} ===
//
// Renders a template by substituting values from a dictionary into
// a template string or file. The templating language used is
// trimpath, which is defined here:
// http://code.google.com/p/trimpath/wiki/JavaScriptTemplates
//
// {{{template}}} can be either a string, in which case the string is used
// for the template, or else it can be {file: "filename"}, in which
// case the following happens:
//    * If the feed is on the user's local filesystem, the file's path
//      is assumed to be relative and the file's contents are read and
//      used as the template.
//
//    * Otherwise, the file's path is assumed to be a key into a global
//      object called Attachments, which is defined by the feed.  The
//      value of this key is used as the template.
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
//
// Returns a string containing the result of processing the template.

function renderTemplate(template, data) {
  var templStr;
  if (typeof template == "string")
    templStr = template;
  else if (template.file) {
    if (Utils.url(feed.id).scheme == "file") {
      var url = Utils.url({uri: template.file, base: feed.id});
      templStr = Utils.getLocalUrl(url.spec);
    } else {
      templStr = Attachments[template.file];
    }
  }

  var templateObject = this.__globalObject.Template.parseTemplate(templStr);
  return templateObject.process(data);
}

// == PREVIEW ==

// === {{{ CmdUtils.previewAjax(pblock, options) }}} ===
//
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
  var newOptions = {};
  function abort() {
    if (xhr)
      xhr.abort();
  }
  for (var key in options) {
    if (typeof options[key] === "function")
      newOptions[key] = CmdUtils.previewCallback(pblock,
                                                 options[key],
                                                 abort);
    else
      newOptions[key] = options[key];
  }

  var wrappedXhr;
  if (newOptions.xhr)
    wrappedXhr = newOptions.xhr;
  else
    wrappedXhr = jQuery.ajaxSettings.xhr; // see: scripts/jquery_setup.js

  function backgroundXhr() {
    var newXhr = wrappedXhr.apply(this, arguments);
    newXhr.mozBackgroundRequest = true;
    return newXhr;
  }
  newOptions.xhr = backgroundXhr;

  xhr = jQuery.ajax(newOptions);
  return xhr;
}

// === {{{ CmdUtils.previewGet(pblock, url, data, callback, type) }}} ===
//
// Does an asynchronous request to a remote web service.  It is used
// just like {{{jQuery.get()}}}, which is documented at
// http://docs.jquery.com/Ajax/jQuery.get.
// The difference is that {{{CmdUtils.previewGet()}}} is designed to handle
// command previews, which can be canceled by the user between the
// time that it's requested and the time it displays.  If the preview
// is canceled, the given callback will not be called.

function previewGet(pblock, url, data, callback, type) {
  if (typeof data === "function") {
    callback = data;
    data = null;
  }

  return this.previewAjax(pblock,
                          { type: "GET",
                            url: url,
                            data: data,
                            success: callback,
                            dataType: type});
}

// === {{{ CmdUtils.previewPost(pblock, url, data, callback, type) }}} ===
//
// Does an asynchronous request to a remote web service.  It is used
// just like {{{jQuery.post()}}}, which is documented at
// http://docs.jquery.com/Ajax/jQuery.post.
// The difference is that {{{CmdUtils.previewPost()}}} is designed to handle
// command previews, which can be canceled by the user between the
// time that it's requested and the time it displays.  If the preview
// is canceled, the given callback will not be called.

function previewPost(pblock, url, data, callback, type) {
  if (typeof data === "function") {
    callback = data;
    data = {};
  }

  return this.previewAjax(pblock,
                          { type: "POST",
                            url: url,
                            data: data,
                            success: callback,
                            dataType: type});
}

// === {{{ CmdUtils.previewCallback(pblock, callback, abortCallback) }}} ===
//
// Creates a 'preview callback': a wrapper for a function which
// first checks to see if the current preview has been canceled,
// and if not, calls the real callback.
//
// {{{pblock}}}: the preview display element (the same one which is
// passed in as the first argument to the {{{preview()}}} method of every
// command.
//
// {{{callback}}}: the function to be called if the preview is not
// cancelled.
//
// {{{abortCallback}}}: (optional) a function that will be called instead
// if the preview is cancelled.

function previewCallback(pblock, callback, abortCallback) {
  var previewChanged = false;

  function onPreviewChange() {
    pblock.removeEventListener("preview-change",
                               onPreviewChange,
                               false);
    previewChanged = true;
    if (abortCallback)
      abortCallback();
  }

  pblock.addEventListener("preview-change", onPreviewChange, false);

  return function wrappedCallback() {
    if (!previewChanged) {
      pblock.removeEventListener("preview-change",
                                 onPreviewChange,
                                 false);
      return callback.apply(this, arguments);
    }
    return null;
  };
}

// === {{{ CmdUtils.previewList(block, htmls, callback, css) }}} ===
//
// Creates a simple clickable list in the preview block and
// returns the list element.
//
// {{{block}}} is the DOM element the list will be placed into.
//
// {{{htmls}}} is the array/dictionary of HTML string to be listed.
//
// {{{callback(id, ev)}}} is the function called
// when one of the list item becomes focused.
// * {{{id}}} : one of the keys of {{{htmls}}}
// * {{{ev}}} : the event object
//
// {{{css}}} is an optional CSS string inserted along with the list.

function previewList(block, htmls, callback, css) {
  var list = "", i = -1, {escapeHtml} = Utils;
  for (let id in htmls) {
    let k = ++i < 35 ? (i+1).toString(36) : "0-^@;:[],./\\"[i - 35] || "_";
    list += ('<li><label for="' + i + '"><button id="' + i + '" accesskey="' +
             k + '" value="' + escapeHtml(id) + '">' + k + '</button>' +
             htmls[id] + '</label></li>');
  }
  block.innerHTML = ('<ol class="preview-list"><style>' +
                     previewList.CSS + (css || "") +
                     '</style>' + list + '</ol>');
  var [ol] = block.getElementsByClassName("preview-list");
  if (typeof callback === "function")
    ol.addEventListener("focus", function previewListFocused(ev) {
      var {target} = ev;
      if (!/^button$/i.test(target.nodeName)) return;
      target.blur();
      target.disabled = true;
      callback(target.value, ev);
    }, true);
  return ol;
}
previewList.CSS = "" + <![CDATA[
  .preview-list {margin: 0; padding: 0; list-style-type: none}
  .preview-list > li:hover {outline: 1px solid; -moz-outline-radius: 8px}
  .preview-list label {display: block; cursor: pointer}
  .preview-list button {
    margin-right: 0.3em; padding: 0; border-width: 1px;
    font: bold 108% monospace; text-transform: uppercase}
  ]]>;

// === {{{ CmdUtils.absUrl(data, sourceUrl) }}} ===
//
// Fixes relative urls in data (e.g. as returned by AJAX call).
// Useful for displaying fetched content in command previews.
//
// {{{data}}}: The data containing relative urls, which can be
// a HTML string or a jQuery/DOM/XML object.
//
// {{{sourceUrl}}}: The url used to fetch the data (that is to say; the url to
// which the relative paths are relative to).

function absUrl(data, sourceUrl) {
  switch (typeof data) {
    case "string": {
      return data.replace(
        /\b(href|src|action)=(?![\"\']?https?:\/\/)([\"\']?)([^\s>\"\']+)\2/ig,
        function au_repl(_, a, q, path) (
          a + "=" + q + Utils.url({uri: path, base: sourceUrl}).spec + q));
    }
    case "object": {
      (this.__globalObject.jQuery(data)
       .find("*").andSelf()
       .filter("a, img, form, link, embed")
       .each(function au_each() {
         var attr, path = (this.getAttribute(attr = "href") ||
                           this.getAttribute(attr = "src" ) ||
                           this.getAttribute(attr = "action"));
         if (path !== null && /^(?!https?:\/\/)/.test(path))
           this.setAttribute(attr,
                             Utils.url({uri: path, base: sourceUrl}).spec);
       }));
      return data;
    }
    case "xml": {
      return XML(arguments.callee.call(this, data.toXMLString(), sourceUrl));
    }
  }
  return null;
}

// === {{{ CmdUtils.safeWrapper(func) }}} ===
//
// Wraps a function so that exceptions from it are suppressed and notified.

function safeWrapper(func) {
  var {displayMessage} = this.__globalObject;
  return function safeWrappedFunc() {
    try {
      func.apply(this, arguments);
    } catch (e) {
      displayMessage({
        //errorToLocalize
        text: ("An exception occurred while running " +
               func.name + "()."),
        exception: e,
      });
    }
  };
}

// CmdUtils.pluginRegistry
// A registry of provider plugins for overlord verbs
// Tricky part is that it must work even if the plugin is registered
// after the pluginNoun is created.
CmdUtils._pluginRegistry = {};

CmdUtils._getPluginsForCmd = function(cmdId) {
  return CmdUtils._pluginRegistry[cmdId];
};

CmdUtils.registerPlugin = function(cmdId,
                                   argumentName,
                                   executeFunction) {
  if (!CmdUtils._pluginRegistry[cmdId]) {
    CmdUtils._pluginRegistry[cmdId] = {};
  }
  CmdUtils._pluginRegistry[cmdId][argumentName] = executeFunction;
};

/* TODO: make this rank super high. */
CmdUtils.pluginNoun = function(cmdId) {
  var newNoun = {
    _cmdId: cmdId,
    _getPlugins: function() {
      var plugins = CmdUtils._getPluginsForCmd(newNoun._cmdId);
      // suggestion.data will contain the execute function.
      var name;
      return [CmdUtils.makeSugg(name, null, plugins[name])
              for (name in plugins)];
    },

    suggest: function(text, html, callback, selectionIndices) {
      return CmdUtils.grepSuggs(text, newNoun._getPlugins());
    },
    default: function() {
      // Default to returning all.
      return newNoun._getPlugins();
    }
  };
  return newNoun;
};

CmdUtils.executeBasedOnPlugin = function(cmdId, argRole) {
  return (function(args) {
    if (args.argRole.text) {
      var plugins = CmdUtils._getPluginsForCmd(cmdId);
      var pluginFunction = plugins[args.argRole.text];
      if (pluginFunction) {
        return pluginFunction(args);
      }
    }
  });
};
