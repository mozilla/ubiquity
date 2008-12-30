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

var EXPORTED_SYMBOLS = ["FeedAggregator"];

Components.utils.import("resource://ubiquity-modules/eventhub.js");

function FeedAggregator(feedManager, messageService, disabledCommands) {
  let self = this;
  let commands = {};
  let commandNames = [];
  let nounTypes = [];
  let pageLoadFuncLists = [];
  let feedsChanged = true;

  let hub = new EventHub();
  hub.attachMethods(this);

  function onFeedManagerChange(eventName, uri) {
    feedsChanged = true;
  }

  feedManager.addListener("unsubscribe", onFeedManagerChange);
  feedManager.addListener("subscribe", onFeedManagerChange);
  feedManager.addListener("feed-change", onFeedManagerChange);

  function makeCmdWithDisabler(cmd) {
    let newCmd = {
      get disabled() {
        return disabledCommands[cmd.name];
      },
      set disabled(value) {
        if (disabledCommands[cmd.name] != value) {
          disabledCommands[cmd.name] = value;
          hub.notifyListeners("disabled-command-change",
                              {name: name,
                               value: value});
        }
      }
    };

    newCmd.__proto__ = cmd;
    return newCmd;
  }

  self.onPageLoad = function FA_onPageLoad(window) {
    if (feedsChanged)
      self.refresh();

    for (let i = 0; i < pageLoadFuncLists.length; i++)
      for (let j = 0; j < pageLoadFuncLists[i].length; j++) {
        let pageLoadFunc = pageLoadFuncLists[i][j];
        try {
          pageLoadFunc(window);
        } catch (e) {
          messageService.displayMessage(
            {text: "An exception occurred while running page-load code.",
             exception: e}
          );
        }
      }
  };

  self.refresh = function FA_refresh() {
    commands = {};
    commandNames = [];
    nounTypes = [];
    pageLoadFuncLists = [];

    let feeds = feedManager.getSubscribedFeeds();

    feeds.forEach(function(feed) { feed.refresh(); });

    if (feedsChanged) {
      feedsChanged = false;
      feeds.forEach(
        function processFeed(feed) {
          commandNames = commandNames.concat(feed.commandNames);
          nounTypes = nounTypes.concat(feed.nounTypes);
          for (name in feed.commands)
            commands[name] = makeCmdWithDisabler(feed.commands[name]);
          if (feed.pageLoadFuncs.length > 0)
            pageLoadFuncLists.push(feed.pageLoadFuncs);
        }
      );
      // TODO: This should really be renamed to 'feeds-reloaded'...
      hub.notifyListeners("commands-reloaded", null);
    }
  };

  self.__defineGetter__("commandNames",
                        function() { return commandNames; });

  self.getAllCommands = function FA_getAllCommands() {
    if (feedsChanged)
      self.refresh();

    return commands;
  };

  self.getAllNounTypes = function FA_getAllNounTypes() {
    if (feedsChanged)
      self.refresh();

    return nounTypes;
  };

  self.getCommand = function FA_getCommand(name) {
    if (feedsChanged)
      self.refresh();

    return commands[name] ? commands[name] : null;
  };
}
