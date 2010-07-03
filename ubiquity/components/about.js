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

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyGetter(this, "newChannel", function () (
  Cu.import("resource://ubiquity/modules/utils.js", null).
  Utils.IOService.newChannel));

function UbiquityAboutHandler() {}
UbiquityAboutHandler.prototype = {
  classDescription: "About Ubiquity Pages",
  classID: Components.ID("{3a54db0f-281a-4af7-931c-de747c37b423}"),
  contractID: "@mozilla.org/network/protocol/about;1?what=ubiquity",
  QueryInterface: XPCOMUtils.generateQI(["nsIAboutModule"]),

  newChannel: function UAH_newChannel(uri) {
    var name = /\?([\w.-]+)/.test(uri.spec) ? RegExp.$1 : "about";
    if (!/\./.test(name)) name += ".xhtml";
    var channel = newChannel("chrome://ubiquity/content/" + name, null, null);
    channel.originalURI = uri;
    return channel;
  },
  getURIFlags: function UAH_getURIFlags(uri)
    Ci.nsIAboutModule.URI_SAFE_FOR_UNTRUSTED_CONTENT,
};

const NSG = "NSGet" + ("generateModule" in XPCOMUtils ? "Module" : "Factory");
this[NSG] = XPCOMUtils["generate" + NSG]([UbiquityAboutHandler]);
