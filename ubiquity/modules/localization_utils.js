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

var EXPORTED_SYMBOLS = ["LocalizationUtils"];

Components.utils.import("resource://ubiquity/modules/utils.js");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Application = (Cc["@mozilla.org/fuel/application;1"]
                     .getService(Ci.fuelIApplication));

const BUNDLE_SVC = Components.classes['@mozilla.org/intl/stringbundle;1']
                   .getService(Components.interfaces.nsIStringBundleService);

var LocalizationUtils = {
  __lastCommand: null,
  __stringBundle : null,

  // getLocalizedString code from http://www.xuldev.org/blog/?p=45
  // TODO: there is only one stringbundle available right now.
  getLocalizedString: function LU_getLocalizedString (key, string, replacements) {
    if ( !this._stringBundle ) {
      this.__stringBundle = BUNDLE_SVC.createBundle("resource://ubiquity/standard-feeds/localization/firefox.properties");
    }
    try {
      if ( !replacements ) {
        dump('getstringfromname\n') ;
        return this.__stringBundle.GetStringFromName(key);
      }else
        dump('formatStringFromName\n') ;
        return this.__stringBundle.formatStringFromName(key, replacements, replacements.length);
    } catch(ex) {
      dump('key '+key+' not found\n');
      return string;
    }
  },
  
  setCommandContext: function LU_setCommandContext (cmdName) {
    this.__lastCommand = cmdName;
  },
  
  getCommandContext: function LU_getCommandContext () {
    return this.__lastCommand;
  },
  
  getLocalized: function LU_getLocalized(string, replacements) {
  
    // check if we're in an execute context, preview context, or neither.
    // TODO: there must be a better way of doing this...
    myCSCaller = LocalizationUtils.getLocalized.caller.caller.caller;
    let context = null;
    if (myCSCaller.name.indexOf('preview') > -1)
      context = 'preview';
    if (myCSCaller.name.indexOf('execute') > -1)
      context = 'execute';
  
    let key = this.getCommandContext() + '.' + (context ? context+'.' : '') + (string.toUpperCase().replace(/\s+/g,'_'));
    
    if (!replacements)
      return this.getLocalizedString(key, string);
    else
      return this.getLocalizedString(key, string, replacements);
  }


};

// TODO: make set/getCommandContext actually work
// i.e. make this not hard-coded to 'zoom'
LocalizationUtils.__lastCommand = 'zoom';

