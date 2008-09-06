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
 *   Jono DiCarlo <jdicarlo@mozilla.com>
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

function cmd_test_mapping() {

}

cmd_test_mapping.preview = function(pblock) {
  var iframe = pblock.ownerDocument.createElement("iframe");
  iframe.setAttribute("src", "chrome://ubiquity/content/mapping/mapping.xul");
  iframe.style.border = "none";
  iframe.setAttribute("width", 500);
  iframe.setAttribute("height", 300);
  function onXulLoad() {
    var ioSvc = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
    var extMgr = Components.classes["@mozilla.org/extensions/manager;1"]
                 .getService(Components.interfaces.nsIExtensionManager);
    var loc = extMgr.getInstallLocation("ubiquity@labs.mozilla.com");
    var extD = loc.getItemLocation("ubiquity@labs.mozilla.com");
    var uri = ioSvc.newFileURI(extD).spec;
    uri += "chrome/content/mapping/mapping.html";
    var browser = iframe.contentDocument.createElement("browser");
    browser.setAttribute("src", uri);
    browser.setAttribute("width", 500);
    browser.setAttribute("height", 300);
    function onBrowserLoad() {
      //window.console.log(browser.wrappedJSObject.contentDocument);
    }
    browser.addEventListener("load", Utils.safeWrapper(onBrowserLoad),
                             true);
    iframe.contentDocument.documentElement.appendChild(browser);
  }
  iframe.addEventListener("load", Utils.safeWrapper(onXulLoad), true);
  pblock.innerHTML = "";
  pblock.appendChild(iframe);
};
