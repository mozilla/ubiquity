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

let EXPORTED_SYMBOLS = ["WebPageFeedPlugin"];

Components.utils.import("resource://ubiquity/modules/feed_plugin_utils.js");
Components.utils.import("resource://ubiquity/modules/hiddenbrowser.js");
Components.utils.import("resource://ubiquity/modules/nounutils.js");

function WebPageFeedPlugin(feedManager, messageService, webJsm) {
  webJsm.importScript("resource://ubiquity/scripts/jquery.js");
  webJsm.importScript("resource://ubiquity/scripts/html-sanitizer-minified.js");

  this.type = "webpage-commands";

  var self = this;
  var hiddenBrowserFactory;

  makeHiddenBrowserFactory(
    function(aHiddenBrowserFactory) {
      hiddenBrowserFactory = aHiddenBrowserFactory;
      hiddenBrowserFactory.contentDocument.addEventListener(
        "UbiquityEvent",
        function(aEvt) { onUbiquityEvent(aEvt, true); },
        false,
        true
      );
      makeHiddenBrowser();
    });

  function onUbiquityEvent(aEvt, applyToShadow) {
    var loc = aEvt.target.ownerDocument.location;
    var feeds = feedManager.getSubscribedFeeds();
    for (var i = 0; i < feeds.length; i++) {
      let feed = feeds[i];
      if (feed.type == self.type &&
          feed.srcUri.spec == loc.href) {
        feed.processEvent(aEvt, applyToShadow);
        aEvt.target.ownerDocument.defaultView.addEventListener(
          "unload",
          function(aEvt) { feed.onUnload(applyToShadow); },
          false
        );
        return;
      }
    }
  }

  this.installToWindow = function WPFP_installToWindow(window) {
    window.document.addEventListener(
      "UbiquityEvent",
      function(aEvt) { onUbiquityEvent(aEvt, false); },
      false,
      true
    );
  };

  this.onSubscribeClick = function WPFP_onSubscribeClick(targetDoc,
                                                         commandsUrl,
                                                         mimetype) {
    feedManager.addSubscribedFeed({url: targetDoc.location.href,
                                   title: targetDoc.title,
                                   sourceUrl: commandsUrl,
                                   type: this.type,
                                   canAutoUpdate: true});
    messageService.displayMessage("Subscription successful!");
    targetDoc.location.reload();
  };

  var queuedHiddenBrowsers = [];

  // TODO: If a feed is unsubscribed-from, we need to be sure to
  // close its hidden browser.
  function makeHiddenBrowser(feed) {
    if (feed)
      queuedHiddenBrowsers.push(feed);
    if (hiddenBrowserFactory)
      queuedHiddenBrowsers.forEach(
        function(feed) {
          hiddenBrowserFactory.makeBrowser(
            feed.srcUri.spec,
            function(browser) { feed.setShadowBrowser(browser); }
          );
        });
  }

  this.makeFeed = function WPFP_makeFeed(baseFeedInfo, eventHub) {
    var feed = new WPFPFeed(baseFeedInfo, eventHub, messageService,
                            webJsm.jQuery, webJsm.html_sanitize);
    makeHiddenBrowser(feed);
    return feed;
  };

  feedManager.registerPlugin(this);
}

function WPFPFeed(baseFeedInfo, eventHub, messageService, jQuery,
                  htmlSanitize) {
  let $ = jQuery;
  let self = this;

  self.pageLoadFuncs = [];

  self.nounTypes = [];

  var commands = null;
  var shadowCommands = {};
  var shadowBrowser;

  self.__defineGetter__(
    "commands",
    function() { return commands ? commands : shadowCommands; }
  );

  self.refresh = function refresh() {
  };

  self.onUnload = function onUnload(applyToShadow) {
    if (applyToShadow)
      shadowCommands = {};
    else {
      commands = null;
      if (shadowBrowser)
        shadowBrowser.reload();
    }
    eventHub.notifyListeners("feed-change", baseFeedInfo.uri);
  };

  self.setShadowBrowser = function setShadowBrowser(browser) {
    shadowBrowser = browser;
  };

  self.processEvent = function processEvent(aEvt, applyToShadow) {
    var newCommands = {};

    var target = aEvt.target;
    if (target.className == "commands") {
      $(".command", target).each(
        function() {
          var command = new Command(this, $, htmlSanitize);
          newCommands[command.name] = finishCommand(command);
        }
      );

      if (applyToShadow)
        shadowCommands = newCommands;
      else
        commands = newCommands;

      eventHub.notifyListeners("feed-change", baseFeedInfo.uri);
    } else if (target.className == "display-message") {
      // TODO: How to distinguish between the shadow sending a message
      // or the tab?  Or should we just assume that all messages result
      // from a command execution?
      $(target).remove();
      messageService.displayMessage($(target).text());
    }
  };

  // Set our superclass.
  self.__proto__ = baseFeedInfo;
}

function Command(div, jQuery, htmlSanitize) {
  var self = this;
  var $ = jQuery;

  self.__defineGetter__(
    "name",
    function() { return $(".name", div).text(); }
  );

  var contentPreview;

  self.preview = function preview(context, directObject, modifiers,
                                  previewBlock) {
    var query = $(".preview", div);

    if (query.length) {
      var preview = query.get(0);
      if (preview.nodeName == "A") {
        if (!contentPreview)
          contentPreview = makeContentPreview(preview.href, self.name);
        contentPreview(previewBlock, directObject);
      } else
        previewBlock.innerHTML = htmlSanitize($(preview).html());
    }
  };

  self.__defineGetter__(
    "description",
    function() { return $(".description", div).text(); }
  );

  self.execute = function execute(context, directObject, modifiers) {
    var elem = div.ownerDocument.createElement('div');
    elem.className = 'execute';
    if (directObject && directObject.text)
      $(elem).text(directObject.text);
    div.appendChild(elem);
  };

  self.__defineGetter__(
    "DOLabel",
    function() { return $(".direct-object", div).text(); }
  );

  self.__defineGetter__(
    "DOType",
    function() {
      if ($(".direct-object", div).length)
        return noun_arb_text;
    }
  );
}

var noun_arb_text = {
  _name: "text",
  rankLast: true,
  suggest: function(text, html, callback, selectionIndices) {
    var suggestion = NounUtils.makeSugg(text, html);
    /* If the input comes all or in part from a text selection,
     * we'll stick some html tags into the summary so that the part
     * that comes from the text selection can be visually marked in
     * the suggestion list.
     */
    if (selectionIndices) {
      var pre = suggestion.summary.slice(0, selectionIndices[0]);
      var middle = suggestion.summary.slice(selectionIndices[0],
					    selectionIndices[1]);
      var post = suggestion.summary.slice(selectionIndices[1]);
      suggestion.summary = pre + "<span class='selection'>" +
			     middle + "</span>" + post;
    }
    return [suggestion];
  }
};

function makeContentPreview(url, commandName) {
  var previewWindow = null;
  var previewBlock = null;
  var xulIframe = null;
  var directObj;

  function showPreview() {
    if (previewBlock) {
      var elem = previewBlock.ownerDocument.createElement('div');
      elem.className = 'update-preview';
      elem.setAttribute('command', commandName);
      elem.setAttribute('directObjText', directObj.text);
      elem.setAttribute('directObjHtml', directObj.html);
      previewBlock.appendChild(elem);
    }
  }

  function contentPreview(pblock, aDirectObj) {
    if( !aDirectObj )
      aDirectObj = {text:"", html:""};

    // This is meant to be a global, so that it can affect showPreview().
    directObj = aDirectObj;

    if (previewWindow) {
      showPreview();
    } else if (xulIframe) {
      // We're in the middle of loading the preview window, just
      // wait and it'll eventually appear.
    } else {
      var browser;

      function onUbiquityEvent(event) {
        previewBlock = event.target;
      }

      function onXulLoaded(event) {
        xulIframe.contentDocument.addEventListener(
          "UbiquityEvent",
          onUbiquityEvent,
          false,
          true
        );

        browser = xulIframe.contentDocument.createElement("browser");
        browser.setAttribute("src", url);
        browser.setAttribute("disablesecurity", true);
        browser.setAttribute("type", "content");
        browser.setAttribute("width", 500);
        browser.setAttribute("height", 300);
        browser.addEventListener("load",
                                 onPreviewLoaded,
                                 true);
        browser.addEventListener("unload",
                                 onPreviewUnloaded,
                                 true);

        xulIframe.contentDocument.documentElement.appendChild(browser);
      }

      function onXulUnloaded(event) {
        if (event.target == pblock || event.target == xulIframe)
          xulIframe = null;
      }

      function onPreviewLoaded() {
        previewWindow = browser.contentWindow;
        showPreview();
      }

      function onPreviewUnloaded() {
        previewWindow = null;
        previewBlock = null;
      }

      xulIframe = pblock.ownerDocument.createElement("iframe");
      xulIframe.setAttribute("src",
                             "chrome://ubiquity/content/content-preview.xul");
      xulIframe.style.border = "none";
      xulIframe.setAttribute("width", 500);

      xulIframe.addEventListener("load",
                                 onXulLoaded,
                                 true);
      pblock.innerHTML = "";
      pblock.addEventListener("DOMNodeRemoved", onXulUnloaded, false);
      pblock.appendChild(xulIframe);
    }
  }

  return contentPreview;
};
