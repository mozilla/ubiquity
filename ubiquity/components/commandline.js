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

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

function UbiquityCommandLineHandler() {}
UbiquityCommandLineHandler.prototype = {
  classDescription: "Ubiquity Command Line Flags",
  classID: Components.ID("{bef32df0-b9f6-4833-a3c6-ad361137ae69}"),
  contractID:
  "@mozilla.org/commandlinehandler/general-startup;1?type=ubiquity",
  QueryInterface:
  XPCOMUtils.generateQI(["nsICommandLineHandler", "nsIFactory"]),
  _xpcom_categories: [
    {category: "command-line-handler", entry: "m-ubiquity"}],

  // * flag descriptions should start at character 24
  // * lines should be wrapped at 72 characters with embedded newlines
  // * the string should end with a newline
  helpInfo: (
    // -foo <bar>           description
    "  -ubiq[uity] [<...>]  Executes <...> with Ubiquity.\n" +
    "  -ubip[uity] [<...>]  Previews <...> with Ubiquity.\n"),
  handle: function UCLH_handle(cmdln) {
    var handled = false;
    var opts = {execute: ["ubiquity", "ubiq"], preview: ["ubipuity", "ubip"]};
    for (let [method, flags] in new Iterator(opts))
      for each (let flag in flags) {
        let param = "";
        try {
          param = cmdln.handleFlagWithParam(flag, false);
          if (param === null) continue;
        } catch (e if e.result === Cr.NS_ERROR_INVALID_ARG) {
          cmdln.handleFlag(flag, false);
        }
        if (!handled) {
          Cu.import("resource://ubiquity/modules/utils.js");
          rendezvous(method, param);
        }
        handled = true;
      }
  },
};

function rendezvous(method, param, i) {
  if (i > 999) return;
  var {gUbiquity} = Utils.currentChromeWindow || 0;
  if (gUbiquity) gUbiquity[method](param);
  else Utils.setTimeout(rendezvous, 99, method, param, -~i);
}

const NSG = "NSGet" + ("generateModule" in XPCOMUtils ? "Module" : "Factory");
this[NSG] = XPCOMUtils["generate" + NSG]([UbiquityCommandLineHandler]);
