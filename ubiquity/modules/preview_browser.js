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

var EXPORTED_SYMBOLS = ["PreviewBrowser"];

Components.utils.import("resource://ubiquity/modules/utils.js");

function PreviewBrowser(browser, defaultUrl) {
  this.__isActive = false;
  this.__defaultUrl = defaultUrl;
  this.__queuedPreview = null;
  this.__previewBrowser = browser;
  this.__previewBrowserUrlLoadedCallback = null;

  function resizeContainer(ev) {
    Utils.clearTimeout(resizeContainer.tid);
    resizeContainer.tid = Utils.setTimeout(resizeDelayed, 99, this);
  }
  function resizeDelayed(doc) {
    browser.parentNode.style.height = doc.height + "px";
  }
  browser.addEventListener("load", function bindResize(e) {
    for each (var h in ["load", "DOMSubtreeModified"])
      this.contentDocument.addEventListener(h, resizeContainer, true);
  }, true);

  browser.setAttribute("type", "content");
  browser.setAttribute("src", defaultUrl);
}

PreviewBrowser.prototype = {
  get isActive PB_isActive() this.__isActive,

  _onPreviewBrowserLoadUrl: function PB__onPreviewBrowserLoadUrl() {
    var cb = this.__previewBrowserUrlLoadedCallback;
    this.__previewBrowserUrlLoadedCallback = null;
    cb();
  },

  _ensurePreviewBrowserUrlLoaded: function PB__EPBUL(url, cb) {
    var currUrl = this.__previewBrowser.getAttribute("src");
    if (url === currUrl) {
      if (this.__previewBrowserUrlLoadedCallback)
        // The URL is still loading.
        this.__previewBrowserUrlLoadedCallback = cb;
      else
        // The URL is already loaded.
        cb();
    }
    else {
      var self = this;
      this.__previewBrowserUrlLoadedCallback = cb;
      this.__previewBrowser.setAttribute("src", url);
      Utils.listenOnce(this.__previewBrowser, "load", function onLoad() {
        // The source URL may actually have changed while our URL was loading,
        // if the user switched command previews really fast, so make sure that
        // we're still on the same URL.
        if (this.getAttribute("src") === url) self._onPreviewBrowserLoadUrl();
      }, true);
    }
  },

  activateAccessKey: function PB_activateAccessKey(code) {
    var doc = this.__previewBrowser.contentDocument;
    if (!doc) return false;
    var win = doc.defaultView;
    var key = String.fromCharCode(code).toLowerCase();
    var xpr = doc.evaluate('/html/body//*[@accesskey]', doc, null,
                           win.XPathResult.ORDERED_NODE_ITERATOR_TYPE , null);
    for (let lmn; (lmn = xpr.iterateNext());)
      if (lmn.getAttribute("accesskey").toLowerCase() === key) {
        if (/^a$/i.test(lmn.nodeName)) {
          let evt = doc.createEvent("MouseEvents");
          evt.initMouseEvent("click", true, true, win, 0, 0, 0, 0, 0,
                             false, false, false, false, 0, null);
          lmn.dispatchEvent(evt);
        }
        else lmn.focus();
        return true;
      }
    return false;
  },

  queuePreview: function PB__queuePreview(url, delay, cb) {
    var self = this;
    function showPreview() {
      if (self.__queuedPreview !== showPreview) return;

      self._ensurePreviewBrowserUrlLoaded(
        url ? Utils.url(url).spec : self.__defaultUrl,
        function PB___onUrlLoaded() {
          if (self.__queuedPreview === showPreview) {
            self.__queuedPreview = null;
            cb(self.__previewBrowser.contentDocument.body);
          }
        });
    }

    this.__isActive = true;
    this.__queuedPreview = showPreview;

    var {contentDocument} = this.__previewBrowser;
    if (contentDocument && contentDocument.body) {
      var evt = contentDocument.createEvent("HTMLEvents");
      evt.initEvent("preview-change", false, false);
      contentDocument.body.dispatchEvent(evt);
    }

    if (delay)
      Utils.setTimeout(showPreview, delay);
    else
      showPreview();
  },

  scroll: function PB_scroll(xRate, yRate) {
    var win = this.__previewBrowser.contentWindow;
    if (win) win.scrollBy(win.innerWidth * xRate, win.innerHeight * yRate);
  },

  finalize: function PB_finalize() {
    for (var key in new Iterator(this, true)) delete this[key];
  }
};
