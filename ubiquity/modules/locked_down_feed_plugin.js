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
 *   Michael Yoshitaka Erlewine <mitcho@mitcho.com>
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

// = Locked-Down Feed Plugin =
//
// The Locked-Down Feed Plugin (LDFP) is a proof-of-concept example of
// a Ubiquity Feed Plugin. The focus of the implementation here is on
// security and simplicity of implementation, so it's easy for readers
// to understand how to create their own feed plugins.

let EXPORTED_SYMBOLS = ["LockedDownFeedPlugin"];

Components.utils.import("resource://ubiquity/modules/codesource.js");
Components.utils.import("resource://ubiquity/modules/sandboxfactory.js");
Components.utils.import("resource://ubiquity/modules/feed_plugin_utils.js");
Components.utils.import("resource://ubiquity/modules/contextutils.js");
Components.utils.import("resource://ubiquity/modules/nounutils.js");
Components.utils.import("resource://ubiquity/modules/utils.js");

// == The Plugin Class ==
//
// This is the only public symbol exposed by the module.  The LDFP
// constructor takes three parameters:
//
//   * {{{feedManager}}} is an instance of a {{{FeedManager}}} class.
//   * {{{messageService}}} is an object that exposes a {{{MessageService}}}
//     interface.
//   * {{{webJsm}}} is a {{{WebJsModule}}} instance.
//
// When instantiated, the LDFP automatically registers itself with the
// feed manager that's passed to it.

function LockedDownFeedPlugin(feedManager, messageService, webJsm) {
  // === {{{LDFP#type}}} ===
  //
  // Ubiquity uses the value of the {{{rel}}} attribute contained in a
  // HTML page's {{{<link>}}} tag to determine what, if any, the feed
  // type of the page's command feed is.  This public property
  // specifies that value; thus this feed plugin will process any
  // HTML page with a tag of the form {{{<link rel="locked-down-commands">}}}
  // in it.

  this.type = "locked-down-commands";

  // === {{{LDFP#onSubscribeClick()}}} ===
  //
  // This method is called by the feed manager whenever the user clicks
  // the "Subscribe..." button for any LDFP feed that they're presented
  // with.
  //
  //   * {{{targetDoc}}} is the HTML document of the page with a
  //     {{{<link rel="locked-down-commands">}}} tag.
  //   * {{{commandsUrl}}} is the URL pointed to by the {{{href}}}
  //     attribute of the aforementioned {{{<link>}}} tag.
  //   * {{{mimetype}}} is the MIME type specified by the {{{type}}}
  //     attribute of the aforementioned {{{<link>}}} tag.
  //
  // This function has no return value.
  //
  // Because LDFP feeds are secure and can't harm the end-user's
  // system, this method simply tells the feed manager to subscribe
  // the user to the feed and then displays a non-modal message
  // confirming the subscription.

  this.onSubscribeClick = function LDFP_onSubscribeClick(targetDoc,
                                                         commandsUrl,
                                                         mimetype) {
    feedManager.addSubscribedFeed({url: targetDoc.location.href,
                                   title: targetDoc.title,
                                   sourceUrl: commandsUrl,
                                   type: this.type,
                                   canAutoUpdate: true});
    //errorToLocalize
    messageService.displayMessage("Subscription successful!");
  };

  // === {{{LDFP#makeFeed()}}} ===
  //
  // This factory method is called by the feed manager whenever it
  // needs to instantiate a feed that the user is subscribing to.
  //
  // Feeds are encapsulated by feed objects, and it's the goal of this
  // method to create a new one and return it.
  //
  //   * {{{baseFeedInfo}}} is a {{{Feed}}} object that contains basic
  //     information about the feed. It's expected that the feed
  //     object returned by this function will have {{{baseFeedInfo}}}
  //     as its prototype.
  //   * {{{eventHub}}} is an {{{EventHub}}} instance that the feed
  //     object should use to broadcast events related to it.

  this.makeFeed = function LDFP_makeFeed(baseFeedInfo, eventHub) {
    return new LDFPFeed(baseFeedInfo, eventHub, messageService,
                        webJsm.html_sanitize);
  };

  // Load the Caja HTML sanitizer in our hidden window so we can use it
  // whenever we need it.
  webJsm.importScript("resource://ubiquity/scripts/html-sanitizer-minified.js");

  feedManager.registerPlugin(this);
}

// == The Feed Subclass ==
//
// This private class is created by {{{LDFP#makeFeed()}}}. Its
// constructor takes the base {{{Feed}}} object that it will use as
// its prototype.
//
// === Notifying Listeners of Changes ===
//
// At any time, a feed object may use its event hub to notify
// listeners that its source code has changed.  To do this, it should
// use its event hub to notify listeners of an event of type
// {{{feed-change}}}, passing the feed's URI as its parameter.

function LDFPFeed(baseFeedInfo, eventHub, messageService, htmlSanitize) {
  let self = this;

  // Private instance variables.
  let codeSource;
  if (RemoteUriCodeSource.isValidUri(baseFeedInfo.srcUri))
    codeSource = new RemoteUriCodeSource(baseFeedInfo);
  else
    codeSource = new LocalUriCodeSource(baseFeedInfo.srcUri.spec);

  let feedUri = baseFeedInfo.srcUri;

  var codeCache;
  var sandboxFactory = new SandboxFactory({}, "http://www.mozilla.com",
                                          true);
  var currentContext = null;

  // Private methods.
  function reset() {
    self.commands = {};
  }

  // === {{{LDFPFeed#pageLoadFuncs}}} ===
  //
  // This public property is an array of page-load functions that are called
  // whenever a web page has finished loading. Each page-load function is
  // passed an instance of the page's {{{document}}} object.
  //
  // LDFP feeds can't expose page-load functions, so this property will
  // always be empty.

  self.pageLoadFuncs = [];

  // === {{{LDFPFeed#commands}}} ===
  //
  // This public property is an object that maps command names to command
  // objects, for each command defined by the feed.

  self.commands = {};
  
  // === {{{LDFPFeed#refresh(anyway)}}} ===
  //
  // This public method is called whenever Ubiquity would like the feed
  // to check for any changes in itself. It has no return value.
  //
  // If {{{anyway}}}, the feed is refreshed regardless of code-change.

  self.refresh = function refresh(anyway) {
    let code = codeSource.getCode();
    if (anyway || code !== codeCache) {
      reset();
      codeCache = code;

      let sandbox = sandboxFactory.makeSandbox(codeSource);

      function safe(obj) {
        return makeSafeObj(obj, sandboxFactory, sandbox);
      };

      function safeDirectObj(directObject) {
        if (directObject === null)
          return null;
        return safe({text: directObject.text});
      };

      function safeModifiers(modifiers) {
        var safeMods = {};
        for (var modLabel in modifiers) {
          if (typeof(modLabel) != "string")
            throw new Error("Assertion error: expected string!");
          safeMods[modLabel] = {text: modifiers[modLabel].text};
        }
        return safe(safeMods);
      }

      // === Global Functions for LDFP Feeds ===
      //
      // The following functions are available at the global scope to
      // all LDFP feeds. They're specifically meant to be a strict
      // subset of what's available to default command feeds, so that
      // any locked-down command feed actually works fine as a
      // default command feed too (albeit running with vastly
      // escalated privileges).

      // ==== {{{displayMessage()}}} ====
      //
      // Displays a non-modal, unintrusive message to the user with
      // the given text.

      function displayMessage(text) {
        if (typeof(text) == "string")
          messageService.displayMessage(text);
      }
      sandbox.importFunction(displayMessage);

      // ==== {{{CmdUtils.getSelection()}}} ====
      //
      // This function returns the user's currently-selected text, if
      // any, as a plain string.

      function CmdUtils_getSelection() {
        if (!currentContext)
          return "";

        return ContextUtils.getSelection(currentContext);
      }
      sandbox.importFunction(CmdUtils_getSelection);

      // ==== {{{CmdUtils.setSelection()}}} ====
      //
      // This function replaces the current selection with new content.
      //
      //   * {{{content}}} is the text or html to set as the selection.
      //   * {{{options}}} is a dictionary-like object; if it has a
      //     {{{text}}} property then that value will be used in place
      //     of the html specified by {{{content}}} if the current
      //     selection doesn't support HTML.

      function CmdUtils_setSelection(content, options) {
        if (typeof(options) != "undefined")
          options = new XPCSafeJSObjectWrapper(options);
        if (typeof(content) != "string" || !currentContext)
          return;

        content = htmlSanitize(content);
        ContextUtils.setSelection(currentContext, content, options);
      }
      sandbox.importFunction(CmdUtils_setSelection);

      // ==== {{{CmdUtils.CreateCommand()}}} ====
      //
      // This function creates a new command.  The dictionary-like object
      // passed to it must contain the following keys:
      //
      //   * {{{name}}} is the name of the verb.
      //
      //   * {{{execute}}} is the function which gets run when the
      //     user executes the command.  If the command takes
      //     arguments (see below), the execute method will be passed
      //     the direct object as its first argument, and a modifiers
      //     dictionary as its second argument.
      //
      // The following properties are used if you want the command to
      // accept arguments:
      //
      //   * {{{takes}}} defines the primary argument of the command,
      //     a.k.a. the direct-object of the verb.  It's a dictionary
      //     object with a single property.  The name of the property
      //     will be the display name of the primary argument.  The
      //     value of the property must be a regular expression that
      //     filters what the argument can consist of.
      //
      //   * {{{modifiers}}} Defines any number of secondary arguments
      //     of the command, a.k.a. indirect objects of the verb.  A
      //     dictionary object with any number of properties; the name
      //     of each property should be a preposition-word ('to',
      //     'from', 'with', etc.), and the value is a regular
      //     expression for the argument.  The name of the property is
      //     the word that the user will type on the command line to
      //     invoke the modifier, and the noun type or regular
      //     expression determines the range of valid values.
      //
      // The following keys are optional:
      //
      //   * {{{preview}}} is either an HTML string containing preview text
      //     that is displayed before the user executes the command, or
      //     a function that takes a preview HTML block and a direct
      //     object. The preview HTML block is actually just a fake
      //     DOM object, and its {{{innerHTML}}} attribute is expected to
      //     be filled-in by the preview function.
      //
      //   * {{{description}}} is a string containing a short
      //     description of the command, to be displayed on the
      //     command-list page. It can include HTML tags.
      //
      //   * {{{help}}} is a string containing a longer
      //     description of the command, also displayed on the
      //     command-list page, which can go into more depth, include
      //     examples of usage, etc. It can include HTML tags.
      //
      //   * {{{icon}}} is a string containing the URL of a small
      //     image (favicon-sized) to be displayed alongside the name
      //     of the command in the interface.
      //
      //   * {{{author}}} is a dictionary object describing the
      //     command's author.  It can have {{{name}}}, {{{email}}},
      //     and {{{homepage}}} properties, all strings.
      //
      //   * {{{homepage}}} is the URL of the command's homepage, if any.
      //
      //   * {{{contributors}}} is an array of strings naming other people
      //     who have contributed to the command.
      //
      //   * {{{license}}} is a string naming the license under which the
      //     command is distributed, for example "MPL".
      //
      // This function has no return value.

      function CmdUtils_CreateCommand(originalInfo) {

        Components.utils.import("resource://ubiquity/modules/localization_utils.js");

        let originalNames = [];
        if (originalInfo.names) {
          for each (let n in originalInfo.names)
            if (typeof n == 'string')
              originalNames.push(n);
        } else {
          originalNames = [originalInfo.name];
        }

        // For some reason the XPCSafeJSObjectWrapper would take some 
        // string properties in info (for example some of the names)
        // and give them the constructor Array, rather than String,
        // so they wouldn't behave correctly later.
        // We're keeping a copy of info so we can replace the names
        // out later.
        let info = new XPCSafeJSObjectWrapper(originalInfo);

        if (!info.execute)
          //errorToLocalize
          throw new Error("Command execute function not provided.");
      
        let cmd = {
          feedUri: feedUri,
          execute: function LDFP_execute(context, args) {
            LocalizationUtils.setLocalizationContext(feedUri, cmd.referenceName, 'execute');
            currentContext = context;
            info.execute(safeModifiers(args));
            currentContext = null;
          }
        };

        // TODO: This might not be *safe*.
        // ensure name, names and synonyms
        { let names = originalNames;
          if (!names)
            //errorToLocalize
            throw Error("CreateCommand: name or names is required.");
          if (!Utils.isArray(names))
            names = (names + "").split(/\s{0,}\|\s{0,}/);
      
          // we must keep the first name from the original feed around as an
          // identifier. This is used in the command id and in localizations
          cmd.referenceName = names[0];
          cmd.id = feedUri.spec + "#" + cmd.referenceName;
      
          if (names.length > 1)
            cmd.synonyms = names.slice(1);
          cmd.name = names[0];
          cmd.names = names;
        }

        // Returns the first key in a dictionary.
        function getKey(dict) {
          for (var key in dict) return key;
          // if no keys in dict:
          return null;
        }

        if (info.takes)
          for (var directObjLabel in info.takes) {
            if (typeof(directObjLabel) != "string")
              //errorToLocalize
              throw new Error("Direct object label is not a string: " +
                              directObjLabel);
            var regExp = safeConvertRegExp(info.takes[directObjLabel]);
            cmd.DOLabel = directObjLabel;
            cmd.DOType = NounUtils.NounType(regExp);
            break;
          }
        if (info.modifiers) {
          cmd.modifiers = {};
          for (var modLabel in info.modifiers) {
            if (typeof(modLabel) != "string")
              //errorToLocalize
              throw new Error("Modifier label is not a string: " +
                              directObjLabel);
            cmd.modifiers[modLabel] = toSafeNounType(info.modifiers[modLabel]);
          }
        }
        
        // TODO: This might not be *safe*.
        { let args = info.arguments || info.argument;
          /* NEW IMPROVED ARGUMENT API */
          if (args) {
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
            // we have to go pick these one by one by key, as 
            // XPCSafeJSObjectWrapper makes them inaccessible directly
            // via "for each". Ask satyr or mitcho for details.
            for (let key in args) toSafeNounType(args[key], "nountype");
          }

          // This extra step here which admittedly looks redundant is to
          // "fix" arrays to enable proper enumeration. This is due to some
          // weird behavior which has to do with XPCSafeJSObjectWrapper.
          // Ask satyr or mitcho for details.
          cmd.arguments = [args[key] for (key in args)];
          
        }
        
        function toSafeNounType(obj, key) {
          var val = obj[key];
          if (!val) return;
          val = safeConvertRegExp(val);
          var noun = obj[key] = NounUtils.NounType(val);
          return noun;
        }
        
        let preview = info.preview;
        if (typeof(preview) == "string") {
          preview = htmlSanitize(preview);
          cmd.preview = function LDFP_preview(context, previewBlock) {
            LocalizationUtils.setLocalizationContext(feedUri, cmd.referenceName, 'preview');
            previewBlock.innerHTML = preview;
          };
        } else if (typeof(preview) == "function") {
          cmd.preview = function LDFP_preview(context, previewBlock, args) {
            LocalizationUtils.setLocalizationContext(feedUri, cmd.referenceName, 'preview');
            var fakePreviewBlock = safe({innerHTML: ""});
            info.preview(fakePreviewBlock,
                         safeModifiers(args));
            var html = fakePreviewBlock.innerHTML;
            if (typeof(html) == "string")
              previewBlock.innerHTML = htmlSanitize(html);
          };
        }

        var CMD_METADATA_SCHEMA = {
          name: "text",
          icon: "url",
          license: "text",
          description: "html",
          help: "html",
          author: {name: "text",
                   email: "text",
                   homepage: "url"},
          contributors: "array"
        };

        setMetadata(info, cmd, CMD_METADATA_SCHEMA, htmlSanitize);

        cmd.proto = info;

        self.commands[cmd.id] = finishCommand(cmd);
      }
      sandbox.importFunction(CmdUtils_CreateCommand);

      var setupCode = ("var CmdUtils = {};" +
                       "CmdUtils.getSelection = CmdUtils_getSelection;" +
                       "CmdUtils.setSelection = CmdUtils_setSelection;" +
                       "CmdUtils.CreateCommand = CmdUtils_CreateCommand;" +
                       "delete CmdUtils_getSelection;" +
                       "delete CmdUtils_setSelection;" +
                       "delete CmdUtils_CreateCommand;");

      sandboxFactory.evalInSandbox(setupCode,
                                   sandbox,
                                   [{length: setupCode.length,
                                     filename: "<setup code>",
                                     lineNumber: 1}]);

      try {
        sandboxFactory.evalInSandbox(code,
                                     sandbox,
                                     [{length: code.length,
                                       filename: codeSource.id,
                                       lineNumber: 1}]);
      } catch (e) {
        //errorToLocalize
        messageService.displayMessage(
          {text:  "An exception occurred while loading code.",
           exception: e}
        );
      }

      eventHub.notifyListeners("feed-change", baseFeedInfo.uri);
    }
  };

  // Initialization.
  reset();

  // Set our superclass.
  self.__proto__ = baseFeedInfo;
}

// == Helper Functions ==

// === {{{safeConvertRegExp()}}} ===
//
// This function takes what's expected to be a regular expression
// object from an untrusted JS context and returns a safe {{{RegExp}}}
// object that's equivalent to it. The passed-in object is expected
// to be wrapped with {{{XPCSafeJSObjectWrapper}}}.

function safeConvertRegExp(regExp) {
  var pattern = regExp.source;
  var flags = "";

  if (regExp.global)
    flags += "g";
  if (regExp.ignoreCase)
    flags += "i";
  if (regExp.multiline)
    flags += "m";

  if (typeof(pattern) != "string" ||
      typeof(flags) != "string")
    //errorToLocalize
    throw new Error("Parameter was not a RegExp object.");

  return new RegExp(pattern, flags);
}

// === {{{makeSafeObj()}}} ===
//
// Takes an object that can be serialized to JSON and returns a
// safe version of it native to the given sandbox.

function makeSafeObj(obj, sandboxFactory, sandbox) {
  var json = Utils.encodeJson(obj);
  var code = "(" + json + ")";
  var newObj = sandboxFactory.evalInSandbox(
    code,
    sandbox,
    [{length: code.length,
      filename: "<makeSafeObj code>",
      lineNumber: 1}]
  );
  return XPCSafeJSObjectWrapper(newObj);
}

// === {{{setMetadata()}}} ===
//
// A helper function to securely set the metadata of an object given
// untrusted metadata, a schema, and an HTML sanitization function.

function setMetadata(metadata, object, schema, htmlSanitize) {
  for (var propName in schema) {
    var propVal = metadata[propName];
    var propType = schema[propName];
    if (typeof(propVal) == "string") {
      switch (propType) {
      case "text":
        object[propName] = propVal;
        break;
      case "html":
        object[propName] = htmlSanitize(propVal);
        break;
      case "url":
        var url = Utils.url(propVal);
        var SAFE_URL_PROTOCOLS = ["http", "https"];

        SAFE_URL_PROTOCOLS.forEach(
          function(protocol) {
            if (url.schemeIs(protocol))
              object[propName] = propVal;
          });
        if (typeof(object[propName]) == "undefined")
          //errorToLocalize
          Utils.reportWarning("URL scheme is unsafe: " + propVal);
        break;
      }
    } else if (typeof(propVal) == "object") {
      propVal = Utils.decodeJson(Utils.encodeJson(propVal));
      if (typeof(propType) == "object") {
        object[propName] = new Object();
        setMetadata(propVal, object[propName], propType, htmlSanitize);
      } else if (propType == "array" &&
                 propVal.constructor.name == "Array") {
        object[propName] = propVal;
      }
    }
  }
}
