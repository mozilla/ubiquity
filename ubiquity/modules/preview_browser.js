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

function makePreviewBrowser(unsafePblock, url, cb) {
  var xulIframe = null;
  var browser = null;

  var width = 490;
  var height = 500;

  function onXulLoaded(event) {
    xulIframe.removeEventListener("load",
                                  onXulLoaded,
                                  true);

    browser = xulIframe.contentDocument.createElement("browser");

    // Possible fix for #633. At the very least, it allows this component to
    // be used from within a chrome URL that's loaded in a browser tab, though
    // I'm not sure why it's XPCNativeWrapped in the first place. -AV
    if (browser.wrappedJSObject)
      browser = browser.wrappedJSObject;

    browser.setAttribute("src", url);
    browser.setAttribute("disablesecurity", true);
    browser.setAttribute("type", "content");
    browser.setAttribute("width", width);
    browser.setAttribute("height", width);
    browser.addEventListener("load",
                             onPreviewLoaded,
                             true);

    xulIframe.contentDocument.documentElement.appendChild(browser);
  }

  function onPreviewLoaded() {
    browser.removeEventListener("load",
                                onPreviewLoaded,
                                true);

    cb(browser);
    unsafePblock = null;
    browser = null;
    xulIframe = null;
  }

  xulIframe = unsafePblock.ownerDocument.createElement("iframe");
  xulIframe.setAttribute("src",
                         "chrome://ubiquity/content/content-preview.xul");
  xulIframe.style.border = "none";
  xulIframe.setAttribute("width", width);
  xulIframe.setAttribute("height", width);

  xulIframe.addEventListener("load",
                             onXulLoaded,
                             true);
  unsafePblock.innerHTML = "";
  unsafePblock.appendChild(xulIframe);
}

function PreviewBrowser(previewPaneNode, defaultUrl) {
  this.__isActive = false;
  this.__defaultUrl = defaultUrl;
  this.__queuedPreview = null;
  this.__previewBrowser = null;
  this.__previewBrowserCreatedCallback = null;
  this.__previewBrowserUrlLoadedCallback = null;
  this.__containingNode = previewPaneNode;

  this.__containingNode.addEventListener(
    "DOMMouseScroll",
    function(evt) {
      if (self.__previewBrowser &&
          self.__previewBrowser.contentWindow) {
        self.__previewBrowser.contentWindow.scrollBy(0, evt.detail);
      }
    },
    true
  );
}

PreviewBrowser.prototype = {
  get isActive() {
    return this.__isActive;
  },

  _onPreviewBrowserCreate : function PB__onPreviewBrowserCreate(browser) {
    this.__previewBrowser = browser;
    var cb = this.__previewBrowserCreatedCallback;
    this.__previewBrowserCreatedCallback = null;
    cb();
  },

  _ensurePreviewBrowser : function PB__ensurePreviewBrowser(cb) {
    if (this.__previewBrowser)
      cb();
    else {
      if (this.__previewBrowserCreatedCallback) {
        this.__previewBrowserCreatedCallback = cb;
      } else {
        var self = this;
        this.__previewBrowserCreatedCallback = cb;
        makePreviewBrowser(this.__containingNode,
                           this.__defaultUrl,
                           function(browser) {
                             self._onPreviewBrowserCreate(browser);
                           });
      }
    }
  },

  _onPreviewBrowserLoadUrl : function PB__onPreviewBrowserLoadUrl() {
    var cb = this.__previewBrowserUrlLoadedCallback;
    this.__previewBrowserUrlLoadedCallback = null;
    cb();
  },

  _ensurePreviewBrowserUrlLoaded : function PB__EPBUL(url, cb) {
    var currUrl = this.__previewBrowser.getAttribute("src");
    if (url == currUrl) {
      if (this.__previewBrowserUrlLoadedCallback)
        // The URL is still loading.
        this.__previewBrowserUrlLoadedCallback = cb;
      else
        // The URL is already loaded.
        cb();
    } else {
      var self = this;
      function onLoad() {
        self.__previewBrowser.removeEventListener("load", onLoad, true);
        // The source URL may actually have changed while our URL was loading,
        // if the user switched command previews really fast, so make sure that
        // we're still on the same URL.
        if (self.__previewBrowser.getAttribute("src") == url)
          self._onPreviewBrowserLoadUrl();
      }
      this.__previewBrowserUrlLoadedCallback = cb;
      this.__previewBrowser.addEventListener("load", onLoad, true);
      this.__previewBrowser.setAttribute("src", url);
    }
  },

  activateAccessKey: function PB_activateAccessKey(number) {
    if (this.__previewBrowser &&
        this.__previewBrowser.contentDocument) {
      var doc = this.__previewBrowser.contentDocument;
      for (var i = 0; i < doc.links.length; i++) {
        var elem = doc.links[i];
        if (elem.getAttribute("accesskey") == number) {
          var evt = doc.createEvent("MouseEvents");
          evt.initMouseEvent("click", true, true, doc.defaultView,
                             0, 0, 0, 0, 0, false, false, false, false, 0,
                             null);
          elem.dispatchEvent(evt);
          return;
        }
      }
    }
  },

  queuePreview : function PB__queuePreview(url, delay, cb) {
    var self = this;

    self.__isActive = true;

    function showPreview() {
      self._ensurePreviewBrowser(
        function() {
          if (self.__queuedPreview == showPreview) {
            if (url)
              url = Utils.url(url).spec;
            else
              url = self.__defaultUrl;

            self._ensurePreviewBrowserUrlLoaded(
              url,
              function() {
                if (self.__queuedPreview == showPreview) {
                  self.__queuedPreview = null;
                  cb(self.__previewBrowser.contentDocument.body);
                }
              });
          }
        });
    }

    this.__queuedPreview = showPreview;

    if (this.__previewBrowser &&
        this.__previewBrowser.contentDocument) {
      var previewPane = this.__previewBrowser.contentDocument.body;
      if (previewPane) {
        var evt = previewPane.ownerDocument.createEvent("HTMLEvents");
        evt.initEvent("preview-change", false, false);
        previewPane.dispatchEvent(evt);
      }
    }

    if (delay)
      Utils.setTimeout(showPreview, delay);
    else
      showPreview();
  },

  finalize: function finalize() {
    this.__queuedPreview = null;
    this.__previewBrowser = null;
    this.__previewBrowserCreatedCallback = null;
    this.__previewBrowserUrlLoadedCallback = null;
    this.__containingNode = null;
  }
};
