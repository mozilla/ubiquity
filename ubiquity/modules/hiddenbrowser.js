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

let EXPORTED_SYMBOLS = ["makeHiddenBrowserFactory"];

const Cc = Components.classes;
const Ci = Components.interfaces;

function makeHiddenBrowserFactory(callback, window) {
  if (!window)
    window = Cc["@mozilla.org/appshell/appShellService;1"]
             .getService(Ci.nsIAppShellService)
             .hiddenDOMWindow;

  var xulIframe;

  xulIframe = window.document.createElement("iframe");
  xulIframe.setAttribute("src",
                         "chrome://ubiquity/content/content-preview.xul");
  xulIframe.addEventListener("load", onLoad, true);

  function onLoad() {
    xulIframe.removeEventListener("load", onLoad, true);
    callback(xulIframe);
    callback = null;
    xulIframe = null;
  }
  window.document.documentElement.appendChild(xulIframe);
  window = null;

  xulIframe.makeBrowser = function makeBrowser(uri, callback) {
    var children = this.contentDocument.documentElement.childNodes;
    for (var i = 0; i < children.length; i++) {
      if (children[i].getAttribute("src") == uri) {
        callback(children[i]);
        return;
      }
    }
    makeNewBrowser(uri, callback, this);
  };
}

function makeNewBrowser(uri, callback, xulIframe) {
  var browser = xulIframe.contentDocument.createElement("browser");
  browser.setAttribute("src", uri);
  browser.setAttribute("disablesecurity", true);
  browser.setAttribute("type", "content");
  browser.addEventListener(
    "load",
    function onLoad() {
      browser.removeEventListener("load", onLoad, true);
      callback(browser);
      callback = null;
    },
    true
  );
  xulIframe.contentDocument.documentElement.appendChild(browser);
  xulIframe = null;
  browser.remove = function remove() {
    this.parentNode.removeChild(this);
  };
}
