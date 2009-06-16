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
 //
 // This is a small library of general utility functions
 // for use by command code.  Everything clients need is contained within
 // the {{{CmdUtils}}} namespace.

var EXPORTED_SYMBOLS = ["LocalizationUtils","localizeCommand"];

Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/setup.js");
Components.utils.import("resource://ubiquity/scripts/gettext/lib/Gettext.js");

const languageCode = UbiquitySetup.languageCode;
const Cc = Components.classes;
const Ci = Components.interfaces;

var commandContext = null;
var feedContext = null;
var displayContext = null;
var localStringBundles = {};
var loadedPo = {};

//var document = {getElementsByTagName: function()[]};
Gettext.prototype.get_lang_refs = function()[];

var myGettext = new Gettext();

var LocalizationUtils = {
  GETTEXT: myGettext,
/*  _initGettext: function() {
    this.GETTEXT.get_lang_refs = function() [];
  },*/
  BUNDLE_SVC: Components.classes['@mozilla.org/intl/stringbundle;1']
                   .getService(Components.interfaces.nsIStringBundleService),

  // this command only works with local standard-feeds commands
  loadLocalPo: function LU_loadLocalPo (feedKey) {
    if (!loadedPo[feedKey]) {
      var data;
      var url = "resource://ubiquity/standard-feeds/localization/"+feedKey+"."+languageCode+".po";
      try {
        
        var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                            .createInstance(Components.interfaces.nsIXMLHttpRequest);
        req.open('GET', url, false);
        req.overrideMimeType("text/plain; charset=utf-8");
        req.send(null);
        data = req.responseText;
      } catch(e) {
//        dump("there was a problem loading "+url+"\n");
        return false;
      }
      
      if (!data)
        return false;

      try {
        var parsed = this.GETTEXT.parse_po(req.responseText);
            
        rv = {};
        rv[feedKey] = parsed;

        this.GETTEXT.parse_locale_data(rv);
        
        loadedPo[feedKey] = parsed;
      } catch(e) {
        dump("couldn't parse "+url+"\n");
        return false;
      }
      dump("loaded "+url+"\n");
    }
    return true;
  },
  
  getLoadedPo: function LU_getLoadedPo() {
    return loadedPo;
  },
  
  getLocalFeedKey: function LU_getLocalFeedKey(path) {
    return path.replace(/^.*\/(\w+)\.\w+$/g,'$1');
  },
  
  getLocalizedString: function LU_getLocalizedString (feedKey, key) {
    try {
      //dump('gettext('+key+')\n');
      //dump('return: '+this.GETTEXT.dgettext(feedKey,key)+'\n');
      return this.GETTEXT.dgettext(feedKey,key);
    } catch(ex) {
      return key;
    }
  },
  
  getLocalizedStringFromContext: function LU_getLocalizedStringFromContext
                                 (feedKey, context, key) {
    try {
      dump('gettext('+context+','+key+')\n');
      let rv = this.GETTEXT.dpgettext(feedKey,context, key);
      if (rv == key) // if nothing was found in this context, try the general context
        rv = this.GETTEXT.dgettext(feedKey,key);
      dump('return: '+rv+'\n');
      return rv;
    } catch(ex) {
      dump('key '+key+' not found\n');
      return key;
    }
  },
  
  // ** {{{setLocalizationContext}}} **
  //
  // This is used to set the feed and command context for _().
  // {{{displayMode}}} is either "execute" or "preview" depending
  // on the context. These settings are used in constructing the
  // appropriate localization keys.
  setLocalizationContext: function LU_setLocalizationContext
                          (feedUri, cmdName, displayMode) {
    feedContext = feedUri;
    commandContext = cmdName;
    if (displayMode == 'execute' || displayMode == 'preview')
      displayContext = displayMode;
    else
      displayContext = null;
    dump('setLocalizationContext:\n'
         +' feed:    '+(feedUri.asciiSpec || feedUri)+'\n'
         +' command: '+cmdName+'\n'
         +' display: '+displayMode+'\n');
  },
  
  get commandContext() { return commandContext; },
  get feedContext() { return feedContext; },
  get displayContext() { return displayContext; },
  
  getLocalized: function LU_getLocalized(string) {
    
    let context = this.commandContext
              + (this.displayContext ? '.' + displayContext : '');
    
    let feedKey = this.getLocalFeedKey(this.feedContext.asciiSpec);
    
    this.loadLocalPo(feedKey);
    
    return this.getLocalizedStringFromContext(feedKey, context, string);
  }

};

// localizeCommand only works with Parser 2 commands.
// It might magically work with Parser 1, but it's not built to, and not
// tested that way.
var localizeCommand = function(cmd) {

  dump('localizing cmd '+cmd.referenceName+' now\n');

  let feedKey = LocalizationUtils.getLocalFeedKey(cmd.feedUri.asciiSpec);
  
  if (!LocalizationUtils.loadLocalPo(feedKey))
    return cmd;

  var arrayProperties = ['names','contributors'];
  for each (let key in arrayProperties) {
    cmd[key] = getLocalizedProperty(feedKey, cmd, key);
    if (typeof cmd[key] === "string")
      cmd[key] = cmd[key].split(/\s*\|\s{0,}/);
  }
      
  var stringProperties = ['help', 'description'];
  for each (let key in stringProperties)
    cmd[key] = getLocalizedProperty(feedKey, cmd, key);    

  return cmd;
}

var getLocalizedProperty = function(feedKey, cmd, property) {
  let key = cmd.referenceName + '.' + property;
  let rv = LocalizationUtils.getLocalizedString(feedKey, key);
  if (rv == key)
    rv = cmd[property];
  return rv;
}
