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

var EXPORTED_SYMBOLS = ["load", "set", "getDebugInfo"];

const Cc = Components.classes;
const Ci = Components.interfaces;

var extensions = {};
var extensionWeakRefs = [];

function log(msg) {
  //Components.utils.reportError(msg);
}

function trackExtension(extension) {
  var weakRefs = [];
  extensionWeakRefs.forEach(
    function(weakRef) {
      if (weakRef.get())
        weakRefs.push(weakRef);
    });
  weakRefs.push(Components.utils.getWeakReference(extension));
  extensionWeakRefs = weakRefs;
}

function getDebugInfo() {
  var weakRefs = [];
  extensionWeakRefs.forEach(
    function(weakRef) {
      if (weakRef.get())
        weakRefs.push(weakRef);
    });
  return {weakRefs: weakRefs};
}

function load(url, parentElement) {
  if (!extensions[url]) {
    if (!parentElement)
      parentElement = Cc["@mozilla.org/appshell/appShellService;1"]
                      .getService(Ci.nsIAppShellService)
                      .hiddenDOMWindow.document.documentElement;

    log("Creating a new iframe for " + url + ".");
    var iframe = parentElement.ownerDocument.createElement("iframe");
    iframe.setAttribute("src", url);
    parentElement.appendChild(iframe);
    extensions[url] = iframe.contentWindow;
    trackExtension(extensions[url]);
  }
}

function onExtensionUnload(event) {
  var url = event.originalTarget.location.href;
  if (extensions[url] == event.originalTarget.defaultView) {
    log("Extension at " + url + " is unloading.");
    delete extensions[url];
    load(url);
  } else
    log("Old extension is unloading at " + url + ".");
}

function set(window) {
  var url = window.location.href;
  if (extensions[url] == window)
    return;

  var oldExtension = extensions[url];
  extensions[url] = window;
  trackExtension(extensions[url]);
  if (oldExtension) {
    var iframe = oldExtension.frameElement;
    if (iframe) {
      log("Closing old extension iframe at " + url + ".");
      iframe.parentNode.removeChild(iframe);
    } else {
      log("Closing old extension window at " + url + ".");
      oldExtension.close();
    }
  }

  log("New extension window set for " + url + ".");
  extensions[url].addEventListener("unload", onExtensionUnload, false);
}
