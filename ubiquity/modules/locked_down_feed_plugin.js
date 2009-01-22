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

// == The Plugin Class ==
//
// This is the only public symbol exposed by the module.  The LDFP
// constructor takes three parameters:
//
//   * {{{feedManager}}} is an instance of a {{{FeedManager}}} class.
//   * {{{messageService}}} is an object that exposes a message service
//     interface.
//   * {{{hiddenWindow}}} is an instance of a hidden chrome HTML window.
//
// When instantiated, the LDFP automatically registers itself with the
// feed manager that's passed to it.

function LockedDownFeedPlugin(feedManager, messageService, hiddenWindow) {
  // === {{{LDFP.type}}} ===
  //
  // Ubiquity uses the value of the {{{rel}}} attribute contained in a
  // HTML page's {{{<link>}}} tag to determine what, if any, the feed
  // type of the page's command feed is.  This public property
  // specifies that value; thus this feed plugin will process any
  // HTML page with a tag of the form {{{<link rel="locked-down-commands">}}}
  // in it.

  this.type = "locked-down-commands";

  // === {{{LDFP.onSubscribeClick()}}} ===
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
    messageService.displayMessage("Subscription successful!");
  };

  // === {{{LDFP.makeFeed()}}} ===
  //
  // This factory method is called by the feed manager whenever it
  // needs to instantiate a feed that the user is subscribing to.
  //
  // Feeds are encapsulated by feed objects, and it's the goal of this
  // method to create a new one and return it.
  //
  //   * {{{baseFeedInfo}}} is an object that contains basic information
  //     about the feed. It's expected that the feed object returned by
  //     this function will have {{{baseFeedInfo}}} as its prototype.
  //   * {{{eventHub}}} is an {{{EventHub}}} instance that the feed
  //     object should use to broadcast events related to it.

  this.makeFeed = function LDFP_makeFeed(baseFeedInfo, eventHub) {
    return new LDFPFeed(baseFeedInfo, eventHub, messageService,
                        hiddenWindow.html_sanitize);
  };

  // Load the Caja HTML sanitizer in our hidden window so we can use it
  // whenever we need it.
  hiddenWindow.importScripts(
    ["resource://ubiquity/scripts/html-sanitizer-minified.js"]
  );

  feedManager.registerPlugin(this);
}

// == The Feed Class ==
//
// This private class is created by {{{LDFP.makeFeed()}}}.
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
  let codeCache;
  let sandboxFactory = new SandboxFactory({}, "http://www.mozilla.com",
                                          true);
  let currentContext = null;

  // Private methods.
  function reset() {
    self.commands = {};
  }

  // === {{{LDFPFeed.pageLoadFuncs}}} ===
  //
  // This public property is an array of page-load functions that are called
  // whenever a web page has finished loading. Each page-load function is
  // passed an instance of the page's {{{window}}} object.
  //
  // LDFP feeds can't expose page-load functions, so this property will
  // always be empty.

  self.pageLoadFuncs = [];

  // === {{{LDFPFeed.nounTypes}}} ===
  //
  // This public property is an array of noun types defined by the
  // feed.
  //
  // LDFP feeds can't define their own noun-types, so this property will
  // always be empty.

  self.nounTypes = [];

  // === {{{LDFPFeed.commands}}} ===
  //
  // This public property is an object that maps command names to command
  // objects, for each command defined by the feed.

  self.commands = {};

  // === {{{LDFPFeed.refresh()}}} ===
  //
  // This public method is called whenever Ubiquity would like the feed
  // to check for any changes in itself. It has no return value.

  self.refresh = function refresh() {
    let code = codeSource.getCode();
    if (code != codeCache) {
      reset();
      codeCache = code;

      let sandbox = sandboxFactory.makeSandbox(codeSource);

      // === Global Functions for LDFP Feeds ===
      //
      // The following functions are available at the global scope to
      // all LDFP feeds.

      // ==== {{{displayMessage()}}} ====
      //
      // Displays a non-modal, unintrusive message to the user with
      // the given text.

      function displayMessage(text) {
        if (typeof(text) == "string")
          messageService.displayMessage(text);
      }
      sandbox.importFunction(displayMessage);

      // ==== {{{getSelection()}}} ====
      //
      // This function returns the user's currently-selected text, if
      // any, as a plain string.

      function getSelection() {
        if (!currentContext)
          return "";

        return ContextUtils.getSelection(currentContext);
      }
      sandbox.importFunction(getSelection);

      // ==== {{{setSelection()}}} ====
      //
      // This function replaces the current selection with new content.
      //
      //   * {{{content}}} is the text or html to set as the selection.
      //   * {{{options}}} is a dictionary-like object; if it has a
      //     {{{text}}} property then that value will be used in place
      //     of the html specified by {{{content}}} if the current
      //     selection doesn't support HTML.

      function setSelection(content, options) {
        if (typeof(options) != "undefined")
          options = new XPCSafeJSObjectWrapper(options);
        if (typeof(content) != "string" || !currentContext)
          return;

        content = htmlSanitize(content);
        ContextUtils.setSelection(currentContext, content, options);
      }
      sandbox.importFunction(setSelection);

      // ==== {{{defineVerb()}}} ====
      //
      // This function creates a new verb.  The dictionary-like object
      // passed to it should contain the following keys:
      //
      //   * {{{name}}} is the name of the verb.
      //   * {{{execute}}} is a function that is called when the verb is
      //     executed. It takes no parameters and has no return value.
      //   * {{{preview}}} is an HTML string containing preview text
      //     that is displayed before the user executes the command.
      //
      // This function has no return value.

      function defineVerb(info) {
        info = new XPCSafeJSObjectWrapper(info);
        let cmd = {
          name: info.name,
          execute: function execute(context, directObject, modifiers) {
            currentContext = context;
            info.execute();
            currentContext = null;
          }
        };
        let previewHtml = info.preview;
        if (typeof(previewHtml) == "string") {
          previewHtml = htmlSanitize(previewHtml);
          cmd.preview = function preview(context, directObject, modifiers,
                                         previewBlock) {
            previewBlock.innerHTML = previewHtml;
          };
          cmd.description = previewHtml;
        }
        cmd = finishCommand(cmd);

        self.commands[cmd.name] = cmd;
      }
      sandbox.importFunction(defineVerb);

      sandboxFactory.evalInSandbox(code,
                                   sandbox,
                                   [{length: code.length,
                                     filename: codeSource.id,
                                     lineNumber: 1}]);

      eventHub.notifyListeners("feed-change", baseFeedInfo.uri);
    }
  };

  // Initialization.
  reset();

  // Set our superclass.
  self.__proto__ = baseFeedInfo;
}
