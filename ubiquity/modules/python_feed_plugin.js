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

var EXPORTED_SYMBOLS = ["PythonFeedPlugin"];

Components.utils.import("resource://ubiquity/modules/codesource.js");
Components.utils.import("resource://ubiquity/modules/feed_plugin_utils.js");
Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/python_bootstrap.js");
Components.utils.import("resource://ubiquity/modules/python_feed_endpoint.js");

function PythonFeedPlugin(feedManager, messageService, webJsm) {
  var self = this;

  this.type = "python-commands";

  this.onSubscribeClick = function PFP_onSubscribeClick(targetDoc,
                                                        commandsUrl,
                                                        mimetype) {
    var scheme = Utils.url(commandsUrl).scheme;
    if (scheme == 'file') {
      var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"].
                       getService(Components.interfaces.nsIXULRuntime);
      if (xulRuntime.OS == "WINNT") {
        messageService.displayMessage(
          ("Sorry, Python command feeds aren't yet supported on " +
           "Windows.")
        );
        return;
      }

      var subscribeNow = true;

      function subscribe() {
        feedManager.addSubscribedFeed({url: targetDoc.location.href,
                                       title: targetDoc.title,
                                       sourceUrl: commandsUrl,
                                       type: self.type,
                                       canAutoUpdate: true});
        messageService.displayMessage("Subscription successful!");
      }

      if (!PyBootstrap.isJsbridgeStarted) {
        if (!PyBootstrap.startJsbridge(function log() {})) {
          messageService.displayMessage(
            ("Before subscribing to the feed, we need to set up " +
             "a few things. You can continue to use your computer " +
             "normally; we'll get back to you when everything is " +
             "ready.")
          );
          function onFinished(wasSuccessful) {
            if (wasSuccessful) {
              subscribe();
            } else
              messageService.displayMessage("Setup failed.");
          }
          PyBootstrap.install(function log() {}, onFinished);
          subscribeNow = false;
        }
      }

      if (subscribeNow)
        subscribe();
    } else {
      messageService.displayMessage("Subscription to " + scheme + " URLs " +
                                    "is not yet supported.");
    }
  };

  this.makeFeed = function PFP_makeFeed(baseFeedInfo, eventHub) {
    return new PFPFeed(baseFeedInfo, eventHub, messageService,
                        webJsm.html_sanitize);
  };

  feedManager.registerPlugin(this);
}

function PFPFeed(baseFeedInfo, eventHub, messageService, htmlSanitize) {
  var self = this;

  // Private instance variables.
  var codeSource;
  if (RemoteUriCodeSource.isValidUri(baseFeedInfo.srcUri))
    codeSource = new RemoteUriCodeSource(baseFeedInfo);
  else
    codeSource = new LocalUriCodeSource(baseFeedInfo.srcUri.spec);
  var codeCache;

  // Private methods.
  function reset() {
    self.commands = {};
  }

  self.pageLoadFuncs = [];

  self.nounTypes = [];

  self.commands = {};

  self.refresh = function refresh() {
    if (!PyBootstrap.isJsbridgeStarted) {
      if (!PyBootstrap.startJsbridge(function log() {}))
        return;
    }

    if (!Endpoint.isServerRegistered) {
      Endpoint.setServerRegistryCallback(baseFeedInfo.uri.spec,
                                         self.refresh);
      if (!Endpoint.serverProcess)
        Endpoint.startServer();
      return;
    }

    var code = codeSource.getCode();

    if (code != codeCache) {
      reset();
      codeCache = code;

      var api = {};

      api.displayMessage = function displayMessage(string) {
        messageService.displayMessage(string);
      };

      api.reportError = function reportError(string) {
        messageService.displayMessage({exception: new Error(string)});
      };

      api.defineVerb = function defineVerb(info) {
        var cmd = {
          name: info.name,
          execute: function execute(context, directObject, modifiers) {
            Endpoint.executeVerb({feed: baseFeedInfo.uri.spec,
                                  id: info.id});
          }
        };
        var previewHtml = info.preview;
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
        eventHub.notifyListeners("feed-change", baseFeedInfo.uri);
      };

      Endpoint.refreshServer({api: api,
                              info: {feed: baseFeedInfo.uri.spec,
                                     srcUri: baseFeedInfo.srcUri.spec,
                                     code: code}});
    }
  };

  // Initialization.
  reset();

  // Set our superclass.
  self.__proto__ = baseFeedInfo;
}
