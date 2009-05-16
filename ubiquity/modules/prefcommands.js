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

var EXPORTED_SYMBOLS = ["PrefCommands"];

var ubiquityProtocol = Components.utils.import(
  "resource://ubiquity/modules/ubiquity_protocol.js"
);

var Application = Components.classes["@mozilla.org/fuel/application;1"]
                  .getService(Components.interfaces.fuelIApplication);

var PrefCommands = {
  COMMANDS_PREF : "extensions.ubiquity.commands",
  FEED_TYPE_PREF : "extensions.ubiquity.commandsFeedType",

  __feedManager: null,

  __subscribeFeed: function subscribeFeed() {
    this.__feedManager.addSubscribedFeed({url: this.id,
                                          type: this.type,
                                          sourceUrl: this.id,
                                          canAutoUpdate: true,
                                          isBuiltIn: true});
  },

  init : function(feedManager) {
    this.__feedManager = feedManager;
    this.__subscribeFeed();
  },

  changeType : function(newType) {
    if (newType == this.type)
      return;

    var oldType = this.type;
    Application.prefs.setValue(
      this.FEED_TYPE_PREF,
      newType
    );
    // TODO: If we're storing the feed type in a preference, we really need
    // to attach an observer to the preference and have the following code
    // execute whenever the preference changes, so that we behave the same
    // way if e.g. the user uses about:config to change the pref instead
    // of calling this method.
    var self = this;
    var feed = self.__feedManager.getFeedForUrl(self.id);
    if (feed)
      feed.purge();
    self.__subscribeFeed();
  },

  setCode : function(code) {
    Application.prefs.setValue(
      this.COMMANDS_PREF,
      code
    );
  },

  getCode : function() {
    return Application.prefs.getValue(
      this.COMMANDS_PREF,
      ""
    );
  },

  get type() {
    return Application.prefs.getValue(
      this.FEED_TYPE_PREF,
      "commands"
    );
  },

  get id() {
    return "ubiquity://command-editor-code";
  }
};

ubiquityProtocol.setPath(
  "command-editor-code",
  function makeDataUri() {
    let uri = ("data:application/x-javascript," +
               encodeURIComponent(PrefCommands.getCode()));
    return uri;
  }
);
