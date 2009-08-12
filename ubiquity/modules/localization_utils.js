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
 *   Michael Yoshitaka Erlewine <mitcho@mitcho.com>
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

 // = LocalizationUtils =

var EXPORTED_SYMBOLS = ["LocalizationUtils", "localizeCommand"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/setup.js");
Cu.import("resource://ubiquity/scripts/gettext/lib/Gettext.js");

const LocalizableProperties = ["names", "help", "description"];
var commandContext = null;
var feedContext = null;
var displayContext = null;
var loadedPo = {};

Gettext.prototype.get_lang_refs = function () [];

var LocalizationUtils = {
  GETTEXT: new Gettext(),
  isLocalizable: function LU_isLocalizable(feedUrl) {
    Cu.import("resource://ubiquity/modules/utils.js");
    var baseUrl = UbiquitySetup.getBaseUri();
    if (feedUrl.indexOf(baseUrl) != 0)
      return false;
    var pathPart = feedUrl.slice(baseUrl.length);
    return (/^(?:standard|builtin)-feeds\b/.test(pathPart));
  },
  loadLocalPo: function LU_loadLocalPo(feedUrl) {
    if (!this.isLocalizable(feedUrl)) return false;

    var feedKey = this.getLocalFeedKey(feedUrl);
    if (feedKey in loadedPo) return true;

    var poUrl = ("resource://ubiquity/localization/" +
                 UbiquitySetup.languageCode + "/" +
                 feedKey + ".po");
    try { var po = Utils.getLocalUrl(poUrl, "utf-8"); } catch (e) {}
    if (!po) return false;

    try {
      let parsed = this.GETTEXT.parse_po(po);
      let rv = {};
      rv[feedKey] = parsed;
      this.GETTEXT.parse_locale_data(rv);
      loadedPo[feedKey] = parsed;
    } catch (e) {
      Utils.dump("couldn't parse " + poUrl);
      return false;
    }
    Utils.dump("loaded " + poUrl);
    return true;
  },

  getLoadedPo: function LU_getLoadedPo() {
    return loadedPo;
  },

  getLocalFeedKey: function LU_getLocalFeedKey(path) {
    return path.replace(/^.*\/(\w+)\.\w+$/g, "$1");
  },

  getLocalizedString: function LU_getLocalizedString (feedKey, key) {
    try {
      return this.GETTEXT.dgettext(feedKey,key);
    } catch (ex) {
      return key;
    }
  },

  getLocalizedStringFromContext:
  function LU_getLocalizedStringFromContext(feedKey, context, key) {
    try {
      let rv = this.GETTEXT.dpgettext(feedKey,context, key);
      if (rv == key)
        // nothing was found in this context. try the general context
        rv = this.GETTEXT.dgettext(feedKey,key);
      return rv;
    } catch (ex) {
      return key;
    }
  },

  // === {{{setLocalizationContext}}} ===
  //
  // This is used to set the feed and command context for _().
  // {{{displayMode}}} is either "execute" or "preview" depending
  // on the context. These settings are used in constructing the
  // appropriate localization keys.
  setLocalizationContext:
  function LU_setLocalizationContext(feedUri, cmdName, displayMode) {
    feedContext = feedUri;
    commandContext = cmdName;
    if (displayMode === "execute" || displayMode === "preview")
      displayContext = displayMode;
    else
      displayContext = null;
    Utils.dump("\n feed   : " + (feedUri.asciiSpec || feedUri),
               "\n command: " + cmdName,
               "\n display: " + displayMode);
  },

  get commandContext() { return commandContext; },
  get feedContext() { return feedContext; },
  get displayContext() { return displayContext; },

  getLocalized: function LU_getLocalized(string) {
    var context = (this.commandContext +
                   (this.displayContext ? "." + displayContext : ""));
    var feedKey = this.getLocalFeedKey(this.feedContext.asciiSpec);
    return this.getLocalizedStringFromContext(feedKey, context, string);
  },

  // === {{{ propertySelector(properties) }}} ===
  //
  // Creates a {{{nsIStringBundle}}} for the .{{{properties}}} file and
  // returns a wrapper function which will call {{{GetStringFromName}}} or
  // {{{formatStringFromName}}} (if extra argument is passed)
  // for the given name string. e.g.:
  // {{{
  // (foo.properties)
  // some.key=%S-%S
  // --------------
  // var L = propertySelector("foo.properties");
  // L("some.key") //=> "%S-%S"
  // L("some.key", "A", "Z") //=> "A-Z"
  // }}}

  propertySelector: function LU_propertySelector(properties) {
    var bundle = (Cc["@mozilla.org/intl/stringbundle;1"]
                  .getService(Ci.nsIStringBundleService)
                  .createBundle(properties));
    return function stringFor(name) (
      arguments.length > 1
      ? bundle.formatStringFromName(name,
                                    Array.slice(arguments, 1),
                                    arguments.length - 1)
      : bundle.GetStringFromName(name));
  },
};

// localizeCommand only works with Parser 2 commands.
// It might magically work with Parser 1, but it's not built to, and not
// tested that way.
function localizeCommand(cmd) {
  var url = cmd.feedUri.spec;
  if (!LocalizationUtils.isLocalizable(url)) return cmd;
  var feedKey = LocalizationUtils.getLocalFeedKey(url);

  for each (let key in LocalizableProperties) if (cmd[key]) {
    let val = getLocalizedProperty(feedKey, cmd, key);
    if (val) cmd[key] = val;
  }

  if (cmd._previewString) {
    let context = cmd.referenceName + ".preview";
    let key = cmd._previewString;
    let rv =
      LocalizationUtils.getLocalizedStringFromContext(feedKey, context, key);
    if (rv !== key) cmd._previewString = rv;
  }

  cmd.name = cmd.names[0];

  return cmd;
}

function getLocalizedProperty(feedKey, cmd, property) {
  var context = cmd.referenceName + "." + property;
  var key = cmd[property];
  var propIsArray = Utils.isArray(key);
  if (propIsArray) key = key.join("|");
  var rv =
    LocalizationUtils.getLocalizedStringFromContext(feedKey, context, key);
  return rv !== key && (propIsArray ? rv.split(/\s{0,}\|\s{0,}/) : rv);
}
