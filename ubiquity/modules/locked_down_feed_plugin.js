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

let EXPORTED_SYMBOLS = ["LockedDownFeedPlugin"];

Components.utils.import("resource://ubiquity-modules/codesource.js");
Components.utils.import("resource://ubiquity-modules/sandboxfactory.js");
Components.utils.import("resource://ubiquity-modules/feed_plugin_utils.js");
Components.utils.import("resource://ubiquity-modules/contextutils.js");

function LockedDownFeedPlugin(feedManager, messageService, hiddenWindow) {
  this.type = "locked-down-commands";

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

  this.makeFeed = function LDFP_makeFeed(baseFeedInfo, eventHub) {
    return new LDFPFeed(baseFeedInfo, eventHub, messageService,
                        hiddenWindow.html_sanitize);
  };

  let sanitizerUrl = "resource://ubiquity-scripts/html-sanitizer-minified.js";
  hiddenWindow.Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
              .getService(Components.interfaces.mozIJSSubScriptLoader)
              .loadSubScript(sanitizerUrl);

  feedManager.registerPlugin(this);
}

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
    self.commandNames = [];
    self.commands = {};
  }

  // Public attributes.
  self.pageLoadFuncs = [];
  self.nounTypes = [];

  // Public methods.
  self.refresh = function refresh() {
    let code = codeSource.getCode();
    if (code != codeCache) {
      reset();
      codeCache = code;

      let sandbox = sandboxFactory.makeSandbox(codeSource);

      function displayMessage(text) {
        if (typeof(text) == "string")
          messageService.displayMessage(text);
      }
      sandbox.importFunction(displayMessage);

      function setSelection(content, options) {
        if (typeof(options) != "undefined")
          options = new XPCSafeJSObjectWrapper(options);
        if (typeof(content) != "string" || !currentContext)
          return;

        content = htmlSanitize(content);
        ContextUtils.setSelection(currentContext, content, options);
      }
      sandbox.importFunction(setSelection);

      function _verb_add(info) {
        info = new XPCSafeJSObjectWrapper(info);
        let cmd = {
          execute: function execute(context, directObject, modifiers) {
            currentContext = context;
            info.execute();
            currentContext = null;
          },
          DOLabel: null,
          DOType: null,
          DODefault: null,
          synonyms: null,
          modifiers: {},
          modifierDefaults: {}
        };
        if (info.preview) {
          cmd.preview = function preview(context, directObject, modifiers,
                                         previewBlock) {
            let preview = info.preview;
            if (typeof(preview) == "string")
              previewBlock.textContent = preview;
          };
        }
        cmd.__proto__ = info;
        cmd = finishCommand(cmd);

        self.commands[cmd.name] = cmd;
        self.commandNames.push({id: cmd.name,
                                name: cmd.name,
                                icon: cmd.icon});
      }
      sandbox.importFunction(_verb_add);

      let preamble = "Verbs = { add: _verb_add };";
      let preambleFilename = ("data:application/x-javascript," +
                              escape(preamble));
      sandboxFactory.evalInSandbox(preamble,
                                   sandbox,
                                   [{length: preamble.length,
                                     filename: preambleFilename,
                                     lineNumber:  1}]);

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
