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

const Cc = Components.classes;
const Ci = Components.interfaces;

var CmdUtils = {};

CmdUtils.__globalObject = this;

// ** {{{ CmdUtils.log(a, b, c, ...) }}} **
//
// One of the most useful functions to know both for development 
// and debugging. This logging function takes
// an arbitrary number of arguments and will log them to the most
// appropriate output. If you have Firebug, the output will go to its
// console. Otherwise, it the output will be routed to the Javascript
// Console.
//
// {{{CmdUtils.log}}} implements smart pretty print, so you
// can use it for inspecting arrays and objects.
//
// {{{a, b, c, ...}}} is an arbitrary list of things to be logged.


CmdUtils.log = function log(what) {
  var args = Array.prototype.slice.call(arguments);
  if(args.length == 0)
    return;

  var logPrefix = "Ubiquity: ";
  var windowManager = Cc["@mozilla.org/appshell/window-mediator;1"]
    .getService(Ci.nsIWindowMediator);
  var browserWindow = windowManager.getMostRecentWindow("navigator:browser");

  if("Firebug" in browserWindow && "Console" in browserWindow.Firebug) {
    args.unshift(logPrefix);
    browserWindow.Firebug.Console.logFormatted(args);
  } else {
    var logMessage = "";
    if(typeof args[0] == "string") {
      var formatStr = args.shift();
      while(args.length > 0 && formatStr.indexOf("%s") > -1) {
        formatStr = formatStr.replace("%s", "" + args.shift());
      }
      args.unshift(formatStr);
    }
    args.forEach(function(arg) {
      if(typeof arg == "object") {
        logMessage += " " + Utils.encodeJson(arg) + " ";
      } else {
        logMessage += arg;
      }
    });
    Application.console.log(logPrefix + logMessage);
  }
};

// ** {{{ CmdUtils.getHtmlSelection( context ) }}} **
//
// Returns the HTML representation of the current selection.
//
// {{{context}}} is an optional argument that contains the execution
// context (which is automatically generated inside of command code).

CmdUtils.getHtmlSelection = function getHtmlSelection(context) {
  var ctu = {};
  Components.utils.import("resource://ubiquity/modules/contextutils.js",
                          ctu);

  if (typeof(context) == "undefined")
    context = CmdUtils.__globalObject.context;

  return ctu.ContextUtils.getHtmlSelection(context);
};

// ** {{{ CmdUtils.getSelection( context ) }}} **
//
// Returns the text representation of the current selection.
//
// {{{context}}} is an optional argument that contains the execution
// context (which is automatically generated inside of command code).


CmdUtils.getSelection = function getSelection(context) {
  var ctu = {};
  Components.utils.import("resource://ubiquity/modules/contextutils.js",
                          ctu);

  if (typeof(context) == "undefined")
    context = CmdUtils.__globalObject.context;

  return ctu.ContextUtils.getSelection(context);
};

// ** {{{ CmdUtils.getTextFromHtml( html ) }}} **
//
// Strips out all HTML tags from a chunk of html &mdash; leaving the text.
//
// {{{html}}} is a string containing an html fragment.

CmdUtils.getTextFromHtml = function getTextFromHtml(html) {
  var newNode = context.focusedWindow.document.createElement("p");
  newNode.innerHTML = html;
  return newNode.textContent;
}


// ** {{{ CmdUtils.setSelection( content, options ) }}} **
//
// Replaces the current selection with new content.
// See {{{ ContextUtils.setSelection }}}
//
// {{{content}}} The text (or html) to see at the selection.
// 
// {{{options}}} options is a dictionary; if it has a "text" property then
// that value will be used in place of the html if we're in
// a plain-text only editable field.

CmdUtils.setSelection = function setSelection(content, options) {
  var ctu = {};
  Components.utils.import("resource://ubiquity/modules/contextutils.js",
                          ctu);

  var context = CmdUtils.__globalObject.context;

  ctu.ContextUtils.setSelection(context, content, options);
};


// ** {{{ CmdUtils.getDocument( ) }}} **
//
// This gets the document of the current tab in a secure way

CmdUtils.getDocument = function getDocument(){
  return CmdUtils.getWindow().document;
};


// ** {{{ CmdUtils.getWindow( ) }}} **
// 
// This gets the window object of the current tab in a secure way.

CmdUtils.getWindow = function getWindow() {
  return Application.activeWindow
                    .activeTab
                    .document
                    .defaultView;
};


// ** {{{ CmdUtis.getWindowInsecure( ) }}} **
//
// This gets the window object of the current tab, without the
// safe XPCNativeWrapper. While this allows access to scripts in the content,
// it is potentially **unsafe** and {{{ CmdUtils.getWindow( ) }}} should
// be used in place of this whenever possible.

CmdUtils.getWindowInsecure = function getWindowInsecure() {
  return Application.activeWindow
                    .activeTab
                    .document
                    .defaultView
                    .wrappedJSObject;
};


// ** {{{ CmdUtis.getDocumentInsecure( ) }}} **
//
// This gets the document of the current tab, without the
// safe XPCNativeWrapper. While this allows access to scripts in the content,
// it is potentially **unsafe** and {{{ CmdUtils.getDocument( ) }}} should
// be used in place of this whenever possible.

CmdUtils.getDocumentInsecure = function getDocumentInsecure() {
  return CmdUtils.getWindowInsecure().document;
};


// ** {{{ CmdUtils.geocodeAddress( address, callback ) }}} **
//
// This function uses the Yahoo geocoding service to take a text
// string of an address/location and turn it into a structured
// geo-location.
//
// {{{address}}} is a plaintext string of the address or location
// to be geocoded.
//
// {{{callback}}} is a function which gets passed the return of
// the geocoding.
//
// The function returns an array of possible matches, where each match is
// an object that includes {{{Latitude}}}, {{{Longitude}}},
// {{{Address}}}, {{{City}}}, {{{State}}}, {{{Zip}}}, and {{{Country}}}.

CmdUtils.geocodeAddress = function geocodeAddress( address, callback ) {
  var url = "http://local.yahooapis.com/MapsService/V1/geocode";
  var params = {
    appid: "YD-9G7bey8_JXxQP6rxl.fBFGgCdNjoDMACQA--",
    location: address
  };

  jQuery.get( url, params, function( doc ){
    var lats  = jQuery( "Latitude", doc );
    var longs = jQuery( "Longitude", doc );

    var addrs    = jQuery( "Address", doc );
    var citys    = jQuery( "City", doc );
    var states   = jQuery( "State", doc );
    var zips     = jQuery( "Zip", doc );
    var countrys = jQuery( "Country", doc );

    var points = [];
    for( var i=0; i<=lats.length; i++ ) {
      points.push({
        lat: jQuery(lats[i]).text(),
        "long": jQuery(longs[i]).text(),
        address: jQuery(addrs[i]).text(),
        city: jQuery(citys[i]).text(),
        state: jQuery(states[i]).text(),
        zips: jQuery(zips[i]).text(),
        country: jQuery(countrys[i]).text()
      });
    }

    callback( points );
  }, "xml");
}


// ** {{{ CmdUtils.injectCss( css ) }}} **
//
// Injects CSS source code into the current tab's document.
//
// {{{ css }}} The CSS source code to inject, in plain text.

CmdUtils.injectCss = function injectCss(css) {
  var doc = CmdUtils.getDocumentInsecure();
  var style = doc.createElement("style");
  style.innerHTML = css;
  doc.body.appendChild(style);
};


// ** {{{ CmdUtils.injectHTML( html ) }}} **
//
// Injects HTML source code into the current tab's document,
// at the end of the document.
//
// {{{ html }}} The HTML source code to inject, in plain text.

CmdUtils.injectHtml = function injectHtml( html ) {
  var doc = CmdUtils.getDocument();
  var div = doc.createElement("div");
  div.innerHTML = html;
  doc.body.appendChild(div.firstChild);
};


// ** {{{ CmdUtils.copyToClipboard( text ) }}} **
//
// This function places the passed-in text into the OS's clipboard.
//
// {{{text}}} is a plaintext string that will be put into the clipboard.
//
// Function based on:
// http://ntt.cc/2008/01/19/copy-paste-javascript-codes-ie-firefox-opera.html
CmdUtils.copyToClipboard = function copyToClipboard(text){
   var clipboard = Cc['@mozilla.org/widget/clipboard;1'].
                   createInstance(Ci.nsIClipboard);
   var transferArea = Cc['@mozilla.org/widget/transferable;1'].
                      createInstance(Ci.nsITransferable);
   var string = Cc["@mozilla.org/supports-string;1"].
                createInstance(Ci.nsISupportsString);
   transferArea.addDataFlavor('text/unicode');
   string.data = text;
   transferArea.setTransferData("text/unicode", string, text.length * 2);
   clipboard.setData(transferArea, null, Ci.nsIClipboard.kGlobalClipboard);
}


// ** {{{ CmdUtils.injectJavascript( src, callback ) }}} **
//
// Injects Javascript from a URL into the current tab's document,
// and calls an optional callback function once the script has loaded.
//
// Note that this is **not** intended to be used as a 
// way of importing Javascript into the command's sandbox.
//
// {{{ src }}} Source URL of the Javascript to inject.
//
// {{{ callback }}} Optional callback function to call once the script
// has loaded in the document.

CmdUtils.injectJavascript = function injectJavascript(src, callback) {
  var doc = CmdUtils.getDocument();

  var script = doc.createElement("script");
  script.src = src;
  doc.body.appendChild(script);

  script.addEventListener("load", function() {
    doc.body.removeChild( script );
    if (typeof(callback) == "function") {
      callback();
    }
  }, true);
};


// ** {{{ CmdUtils.loadJQuery( func ) }}} **
//
// Injects jQuery into the current tab's document.
//
// {{{ func }}} Non-optional callback function to call once jQuery has loaded.

CmdUtils.loadJQuery = function loadJQuery(func) {
  CmdUtils.injectJavascript(
    "resource://ubiquity/scripts/jquery.js",
    Utils.safeWrapper( function() {
      var contentJQuery = CmdUtils.getWindowInsecure().jQuery;
      func(contentJQuery);
    })
  );
};


// ** {{{ CmdUtils.onPageLoad( callback) }}} **
//
// Runs a given function whenever a browser tab is loaded.
//
// {{{ callback }}} Callback function to call.
// Will be passed the window's document object.

CmdUtils.onPageLoad = function onPageLoad( callback ) {
  var safeCallback = Utils.safeWrapper(callback);

  pageLoadFuncs.push(safeCallback);
};


// ** {{{ CmdUtils.setLastResult( result ) }}} **
//
// **Depreciated?**
//
// Sets the last result of a command's execution, for use in command piping.
//
// {{{ result }}} Result to remember (String?)

CmdUtils.setLastResult = function setLastResult( result ) {
  // TODO: This function was used for command piping, which has been
  // removed for the time being; we should probably consider removing this
  // function and anything that uses it.
  globals.lastCmdResult = result;
};


// ** {{{ CmdUtils.getGeoLocation( callback ) }}}
//
// Uses Geo-ip lookup to get your current location. Will cache the result.
// If a result is already in the cache, this function works both
// asyncronously and synchronously (for backwards compatability).
// Otherwise it works only asynchronously.
//
// {{{ callback }}} Callback function to run when the geolocation is found.
// This is not needed when the function is used only synchronously.

CmdUtils.getGeoLocation = function getGeoLocation(callback) {
  if (globals.geoLocation) {
    if (callback)
      callback(globals.geoLocation);
    return globals.geoLocation;
  }

  jQuery.ajax({
    type: "GET",
    url: "http://j.maxmind.com/app/geoip.js",
    dataType: "text",
    async: false,
    success: function( js ) {
      eval( js );
      var loc = geoip_city() + ", " + geoip_region();
      globals.geoLocation = {
        city: geoip_city(),
        state: geoip_region_name(),
        country: geoip_country_name(),
        //for list of country codes, refer to http://www.maxmind.com/app/iso3166
        country_code: geoip_country_code(),
        lat: geoip_latitude(),
        "long": geoip_longitude()
      };
      if (callback)
        callback(globals.geoLocation);
    }
  });

  return null;
};


// ** {{{ CmdUtils.UserCode }}} **
//Copied with additions from chrome://ubiquity/content/prefcommands.js
CmdUtils.UserCode = {
  COMMANDS_PREF : "extensions.ubiquity.commands",

  setCode : function(code) {
    Application.prefs.setValue(
      this.COMMANDS_PREF,
      code
    );
    //Refresh any code editor tabs that might be open
    Application.activeWindow.tabs.forEach(function (tab){
      if(tab.document.location == "chrome://ubiquity/content/editor.html"){
        tab.document.location.reload(true);
      }
    });
  },

  getCode : function() {
    return Application.prefs.getValue(
      this.COMMANDS_PREF,
      ""
    );
  },

  appendCode : function(code){
    this.setCode(this.getCode() + code);
  },

  prependCode : function(code){
    this.setCode(code + this.getCode());
  }
};

// -----------------------------------------------------------------
// SNAPSHOT RELATED
// -----------------------------------------------------------------

CmdUtils.getHiddenWindow = function getHiddenWindow() {
  return Cc["@mozilla.org/appshell/appShellService;1"]
                   .getService(Ci.nsIAppShellService)
                   .hiddenDOMWindow;
}

CmdUtils.getTabSnapshot = function getTabSnapshot( tab, options ) {
  var win = tab.document.defaultView;
  return CmdUtils.getWindowSnapshot( win, options );
}

CmdUtils.getWindowSnapshot = function getWindowSnapshot( win, options ) {
  if( !options ) options = {};

  var hiddenWindow = CmdUtils.getHiddenWindow();
  var thumbnail = hiddenWindow.
                  document.
                  createElementNS("http://www.w3.org/1999/xhtml", "canvas" );

  width = options.width || 200; // Default to 200px width

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
  if(options.callback) options.callback( imgData );
  else return data;
}


// ** {{{ CmdUtils.getImageSnapshot( url, callback ) }}} **
//
// Takes a snapshot of an image residing at the passed-in URL. This
// is useful for when you want to get the bits of an image when it
// is hosted elsewhere. The bits can then be manipulated at will
// without worry of same-domain restrictions.
//
// {{{url}}} The URL where the image is located.
//
// {{{callback}}} A function that get's passed back the bits of the
// image, in DataUrl form.
CmdUtils.getImageSnapshot = function getImageSnapshot( url, callback ) {
  var hiddenWindow = CmdUtils.getHiddenWindow();
  var body = hiddenWindow.document.body;

  var canvas = hiddenWindow.
               document.
               createElementNS("http://www.w3.org/1999/xhtml", "canvas" );

  var img = new hiddenWindow.Image();
  img.src = url;
  img.addEventListener("load", function(){
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext( "2d" );
    ctx.drawImage( img, 0, 0 );

    callback( canvas.toDataURL() );
	}, true);
}

// ---------------------------
// FUNCTIONS FOR STORING AND RETRIEVING PASSWORDS AND OTHER SENSITIVE INFORMATION
// ---------------------------


/**
* Saves a pair of username/password (or username/api key) to the password 
* manager. You have to pass the name of your command (or other identifier) 
* as to the command like:
* CmdUtils.savePassword( {name:'my command', 
*                         username:'myUserName', 
*                         password:'gu3ssm3'} )
*/
CmdUtils.savePassword = function savePassword( opts ){
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
  var loginInfo = new nsLoginInfo('chrome://ubiquity/content', 
                                  'UbiquityInformation' + opts.name, 
                                  null, 
                                  opts.username, 
                                  opts.password, 
                                  "", 
                                  "");

  try {
     passwordManager.addLogin(loginInfo);
  } catch(e) {
     // "This login already exists."
     var logins = passwordManager.findLogins({}, 
                                             "chrome://ubiquity/content", 
                                             'UbiquityInformation' + opts.name, 
                                             null);
     for each(login in logins) {
        if (login.username == opts.username) {
           //modifyLogin(oldLoginInfo, newLoginInfo);
           passwordManager.modifyLogin(login, loginInfo);
           break;
        }
     }
  }
}

/*
* Retrieve one or more username/password saved with CmdUtils.savePassword
* All you have to pass is the identifier (the name option) used on the other 
* function.
* You will get as return an array of { username:'', password:'' } objects.
*/
CmdUtils.retrieveLogins = function retrieveLogins( name ){
  var passwordManager = Cc["@mozilla.org/login-manager;1"].
                        getService(Ci.nsILoginManager);

  var logins = passwordManager.findLogins({}, 
                                          "chrome://ubiquity/content", 
                                          "UbiquityInformation" + name, 
                                          null);
  var returnedLogins = [];

  for each(login in logins){
    loginObj = {
      username: login.username,
      password: login.password
    }
    returnedLogins.push(loginObj);
  }
  return returnedLogins;
}

// -----------------------------------------------------------------
// COMMAND CREATION FUNCTIONS
// -----------------------------------------------------------------


// Creates a command from a list of options
CmdUtils.CreateCommand = function CreateCommand( options ) {
  var globalObj = CmdUtils.__globalObject;
  var execute;

  // Returns the first key in a dictionary.
  function getKey( dict ) {
    for( var key in dict ) return key;
    // if no keys in dict:
    return null;
  }

  if (options.execute)
    execute = function() {
      options.execute.apply(options, arguments);
    };
  else
    execute = function() {
      displayMessage("No action defined.");
    };

  if( options.takes ) {
    execute.DOLabel = getKey( options.takes );
    execute.DOType = options.takes[execute.DOLabel];
  }

  // Reserved keywords that shouldn't be added to the cmd function.
  var RESERVED = ["takes", "execute", "name"];
  // Add all other attributes of options to the cmd function.
  for( var key in options ) {
    if( RESERVED.indexOf(key) == -1 )
      execute[key] = options[key];
  }

  // If preview is a string, wrap it in a function that does
  // what you'd expect it to.
  if( typeof execute["preview"] == "string" ) {
    var previewString = execute["preview"];
    execute["preview"] = function( pblock ){
      pblock.innerHTML = previewString;
    };
  }

  globalObj["cmd_" + options.name] = execute;
};

// -----------------------------------------------------------------
// TEMPLATING FUNCTIONS
// -----------------------------------------------------------------


CmdUtils.renderTemplate = function renderTemplate( template, data ) {
  /* template can be either a string, in which case the string is used
   * for the template, or else it can be {file: "filename"}, in which
   * case the following happens:
   *
   *   * If the feed is on the user's local filesystem, the file's path
   *     is assumed to be relative and the file's contents are read and
   *     used as the template.
   *
   *   * Otherwise, the file's path is assumed to be a key into a global
   *     object called Attachments, which is defined by the feed.  The
   *     value of this key is used as the template.
   *
   * The reason this is done is so that a command feed can be developed
   * locally and then easily deployed to a remote server as a single
   * human-readable file without requiring any manual code
   * modifications; with this system, it becomes straightforward to
   * construct a post-processing tool for feed deployment that
   * automatically generates the Attachments object and appends it to
   * the command feed's code.
   */

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

  var templateObject = Template.parseTemplate( templStr );
  return templateObject.process( data );
};

// Just like jQuery.ajax(), only for command previews; no
// callbacks in the options object are called if the preview is
// canceled.
CmdUtils.previewAjax = function previewAjax(pblock, options) {
  var xhr;
  var newOptions = {};
  function abort() {
    if (xhr)
      xhr.abort();
  }
  for (key in options) {
    if (typeof(options[key]) == 'function')
      newOptions[key] = CmdUtils.previewCallback(pblock,
                                                 options[key],
                                                 abort);
    else
      newOptions[key] = options[key];
  }
  xhr = jQuery.ajax(newOptions);
  return xhr;
};

// Just like jQuery.get(), only for command previews; the given
// callback isn't called if the preview is canceled.
CmdUtils.previewGet = function previewGet(pblock,
                                          url,
                                          data,
                                          callback,
                                          type) {
  var xhr;
  function abort() {
    if (xhr)
      xhr.abort();
  }
  var cb = CmdUtils.previewCallback(pblock, callback, abort);
  xhr = jQuery.get(url, data, cb, type);
  return xhr;
};

// Creates a 'preview callback': a wrapper for a function which
// first checks to see if the current preview has been canceled,
// and if not, calls the real callback.
CmdUtils.previewCallback = function previewCallback(pblock,
                                                    callback,
                                                    abortCallback) {
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

  function wrappedCallback() {
    if (!previewChanged) {
      pblock.removeEventListener("preview-change",
                                 onPreviewChange,
                                 false);
      return callback.apply(this, arguments);
    }
    return null;
  }

  return wrappedCallback;
};

CmdUtils.makeContentPreview = function makeContentPreview(filePathOrOptions) {
  // TODO: Figure out when to kill this temp file.
  if( typeof(filePathOrOptions) == "object" ) {
    if( filePathOrOptions.file != null ) var filePath = filePathOrOptions.file;
    if( filePathOrOptions.html != null) {
      var data = filePathOrOptions.html;
      var file = Components.classes["@mozilla.org/file/directory_service;1"]
                           .getService(Components.interfaces.nsIProperties)
                           .get("TmpD", Components.interfaces.nsIFile);
      file.append("preview.tmp");
      file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);

      // file is nsIFile, data is a string
      var foStream = Components.
                     classes["@mozilla.org/network/file-output-stream;1"].
                     createInstance(Components.interfaces.nsIFileOutputStream);

      // use 0x02 | 0x10 to open file for appending.
      foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
      // write, create, truncate
      // In a c file operation, we have no need to set file mode with or 
      // operation, directly using "r" or "w" usually.
      foStream.write(data, data.length);
      foStream.close();
      var filePath = file.path;
    }
  } else {
    filePath = filePathOrOptions;
  }

  var previewWindow = null;
  var xulIframe = null;
  var query = "";

  function showPreview() {
    previewWindow.Ubiquity.onPreview(query);
  }

  function contentPreview(pblock, directObj) {
    // TODO: This is a hack. Not sure that we should even
    // be doing something with getting a query in here. It's
    // command specifc. This function shouldn't be? -- Aza
    if( !directObj ) directObj = {text:"", html:""};

    // This is meant to be a global, so that it can affect showPreview().
    query = directObj;

    if (previewWindow) {
      showPreview();
    } else if (xulIframe) {
      // TODO
    } else {
      var browser;

      function onXulLoaded(event) {
        var uri = Utils.url({uri: filePath, base: feed.id}).spec;
        browser = xulIframe.contentDocument.createElement("browser");
        browser.setAttribute("src", uri);
        browser.setAttribute("disablesecurity", true);
        browser.setAttribute("width", 500);
        browser.setAttribute("height", 300);
        browser.addEventListener("load", 
                                 Utils.safeWrapper(onPreviewLoaded),
                                 true);
        browser.addEventListener("unload", 
                                 Utils.safeWrapper(onPreviewUnloaded),
                                 true);
        xulIframe.contentDocument.documentElement.appendChild(browser);
      }

      function onXulUnloaded(event) {
        if (event.target == pblock || event.target == xulIframe)
          xulIframe = null;
      }

      function onPreviewLoaded() {
        // TODO: Security risk -- this is very insecure!
        previewWindow = browser.contentWindow;

        previewWindow.Ubiquity.context = context;

        previewWindow.Ubiquity.resizePreview = function(height) {
          xulIframe.setAttribute("height", height);
          browser.setAttribute("height", height);
        };

        previewWindow.Ubiquity.insertHtml = function(html) {
          var doc = context.focusedWindow.document;
          var focused = context.focusedElement;

          // This would be nice to store the map in the buffer...  But
	        // for now, it causes a problem with a large image showing
	        // up as the default.
          //CmdUtils.setLastResult( html );

          if (doc.designMode == "on") {
            // TODO: Remove use of query here?
            // The "query" here is useful so that you don't have to retype what
            // you put in the map command. That said, this is map-command
            // specific and should be factored out. -- Aza
            doc.execCommand("insertHTML", false, query.html + "<br/>" + html);
          }
          else if (CmdUtils.getSelection()) {
	          CmdUtils.setSelection(html);
      	  }
      	  else {
      	    displayMessage("Cannot insert in a non-editable space. Use " +
                           "'edit page' for an editable page.");
      	  }
        };

        showPreview();
      }

      function onPreviewUnloaded() {
        previewWindow = null;
      }

      xulIframe = pblock.ownerDocument.createElement("iframe");
      xulIframe.setAttribute("src",
                             "chrome://ubiquity/content/content-preview.xul");
      xulIframe.style.border = "none";
      xulIframe.setAttribute("width", 500);

      xulIframe.addEventListener("load",
                                 Utils.safeWrapper(onXulLoaded), 
                                 true);
      pblock.innerHTML = "";
      pblock.addEventListener("DOMNodeRemoved", onXulUnloaded, false);
      pblock.appendChild(xulIframe);
    }
  }

  return contentPreview;
};

CmdUtils.makeSearchCommand = function makeSearchCommand( options ) {
  options.execute = function(directObject, modifiers) {
    var query = encodeURIComponent(directObject.text);
    var urlString = options.url.replace(/%s|{QUERY}/g, query);
    Utils.openUrlInBrowser(urlString);
    CmdUtils.setLastResult( urlString );
  };

  options.takes = {"search term": noun_arb_text};

  if (! options.preview ) {
    options.preview = function(pblock, directObject, modifiers) {
      var query = directObject.text;
      var content = "Performs a " + options.name + " search";
	  if(query.length > 0)
		content += " for <b>" + query + "</b>";
      pblock.innerHTML = content;
    };
    options.previewDelay = 10;
  }

  options.name = options.name.toLowerCase();

  CmdUtils.CreateCommand(options);
};

//Requires at least two arguments - name
//and url (which contains the bookmarklet code starting with "javascript:")

CmdUtils.makeBookmarkletCommand = function makeBookmarkletCommand( options ) {
  options.name = options.name.toLowerCase().replace(/ /g,'-');

  options.execute = function(directObject, modifiers) {
    var code = options.url;
    CmdUtils.getDocument().location = code;
  };

  if (! options.preview ){
    options.preview = function(pblock) {
      var content = "Executes the <b>" + options.name + "</b> bookmarklet";
      pblock.innerHTML = content;
    };
  }

  CmdUtils.CreateCommand(options);
};

(
  function() {
    var nu = {};
    Components.utils.import("resource://ubiquity/modules/nounutils.js",
                            nu);
    CmdUtils.NounType = nu.NounUtils.NounType;
    CmdUtils.makeSugg = nu.NounUtils.makeSugg;
  }
)();
