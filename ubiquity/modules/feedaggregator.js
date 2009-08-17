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

Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/eventhub.js");

function FeedAggregator(feedManager, messageService, disabledCommands) {
  var self = this;
  var commands = {};
  var commandNames = [];
  var pageLoadFuncLists = [];
  var ubiquityLoadFuncLists = [];
  var feedsChanged = true;

  var hub = new EventHub();
  hub.attachMethods(this);

  function onFeedManagerChange(eventName, uri) {
    feedsChanged = true;
  }

  feedManager.addListener("unsubscribe", onFeedManagerChange);
  feedManager.addListener("subscribe", onFeedManagerChange);
  feedManager.addListener("purge", onFeedManagerChange);
  feedManager.addListener("feed-change", onFeedManagerChange);

  function makeCmdWithDisabler(cmd) {
    return {
      __proto__: cmd,
      get disabled() this.id in disabledCommands,
      set disabled(value) {
        if (value)
          disabledCommands[this.id] = 1;
        else
          delete disabledCommands[this.id];
        hub.notifyListeners("disabled-command-change");
      }
    };
  }

  self.onPageLoad = function FA_onPageLoad(document) {
    if (feedsChanged)
      self.refresh();

    for each (let pageLoadFuncList in pageLoadFuncLists)
      for each (let pageLoadFunc in pageLoadFuncList)
        try {
          pageLoadFunc(document);
        } catch (e) {
          messageService.displayMessage({
            //errorToLocalize
            text: ("An exception occurred while running " +
                   pageLoadFunc.name + "()"),
            exception: e});
        }
  };

  self.onUbiquityLoad = function FA_onUbiquityLoad(window) {
    if (feedsChanged)
      self.refresh();

    for each (let ubiquityLoadFuncList in ubiquityLoadFuncLists)
      for each (let ubiquityLoadFunc in ubiquityLoadFuncList)
        try {
          ubiquityLoadFunc(window.gUbiquity, window);
        } catch (e) {
          messageService.displayMessage({
            //errorToLocalize
            text: ("An exception occurred while running " +
                   ubiquityLoadFunc.name + "()"),
            exception: e});
        }
  };

  self.refresh = function FA_refresh() {
    var feeds = feedManager.getSubscribedFeeds();
    for each (let feed in feeds) feed.refresh();
    if (!feedsChanged) return;

    commands = {};
    commandNames = [];
    pageLoadFuncLists = [];
    ubiquityLoadFuncLists = [];
    feedsChanged = false;

    for each (let feed in feeds) {
      for each (let cmd in feed.commands) {
        // if the command specifies limited application compatibility,
        // then check against current app name.
        if (cmd.application && cmd.application.indexOf(Utils.appName) === -1)
          continue;
        commandNames.push({id: cmd.id, name: cmd.name, icon: cmd.icon});
        commands[cmd.id] = makeCmdWithDisabler(cmd);
      }
      if ((feed.pageLoadFuncs || '').length)
        pageLoadFuncLists.push(feed.pageLoadFuncs);
      if ((feed.ubiquityLoadFuncs || '').length)
        ubiquityLoadFuncLists.push(feed.ubiquityLoadFuncs);
    }
    hub.notifyListeners("feeds-reloaded", null);

    var deleted = false;
    for (let id in disabledCommands) {
      if (id in commands) continue;
      delete disabledCommands[id];
      deleted = true;
    }
    if (deleted) hub.notifyListeners("disabled-command-change");
  };

  self.__defineGetter__("commandNames",
                        function() { return commandNames; });

  self.getAllCommands = function FA_getAllCommands() {
    if (feedsChanged)
      self.refresh();

    return commands;
  };

  self.getCommand = function FA_getCommand(name) {
    if (feedsChanged)
      self.refresh();

    return commands[name] || null;
  };
}
