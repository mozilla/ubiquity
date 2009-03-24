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
 *   Maria Emerson <memerson@mozilla.com>
 *   Blair McBride <unfocused@gmail.com>
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

var EXPORTED_SYMBOLS = ["CommandManager"];

Components.utils.import("resource://ubiquity/modules/utils.js");

var DEFAULT_PREVIEW_BROWSER_URL = (
  ('data:text/html,' +
   encodeURI('<html><body class="ubiquity-preview-content" ' +
             'style="overflow: hidden; margin: 0; padding: 0;">' +
             '</body></html>'))
);

function makePreviewBrowser(unsafePblock, cb) {
  var xulIframe = null;
  var browser = null;

  var width = 490;
  var height = 500;

  function onXulLoaded(event) {
    xulIframe.removeEventListener("load",
                                  onXulLoaded,
                                  true);

    browser = xulIframe.contentDocument.createElement("browser");
    browser.setAttribute("src", DEFAULT_PREVIEW_BROWSER_URL);
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

function CommandManager(cmdSource, msgService, parser, suggsNode,
                        previewPaneNode, helpNode) {
  this.__cmdSource = cmdSource;
  this.__msgService = msgService;
  this.__hilitedSuggestion = 0;
  this.__lastInput = "";
  this.__nlParser = parser;
  this.__queuedPreview = null;
  this.__previewBrowser = null;
  this.__previewBrowserCreatedCallback = null;
  this.__previewBrowserUrlLoadedCallback = null;
  this.__domNodes = {suggs: suggsNode,
                     preview: previewPaneNode,
                     help: helpNode};

  function onCommandsReloaded() {
    parser.setCommandList(cmdSource.getAllCommands());
    parser.setNounList(cmdSource.getAllNounTypes());
  }

  cmdSource.addListener("feeds-reloaded", onCommandsReloaded);
  onCommandsReloaded();

  this.setPreviewState("no-suggestions");

  this.finalize = function CM_finalize() {
    cmdSource.removeListener("feeds-reloaded", onCommandsReloaded);
    this.__cmdSource = null;
    this.__msgService = null;
    this.__nlParser = null;
    this.__queuedPreview = null;
    this.__previewBrowser = null;
    this.__previewBrowserCreatedCallback = null;
    this.__previewBrowserUrlLoadedCallback = null;
    this.__domNodes = null;
  };
}

CommandManager.prototype = {
  setPreviewState: function CM_setPreviewState(state) {
    switch (state) {
    case "with-suggestions":
      this.__domNodes.suggs.style.display = "block";
      this.__domNodes.preview.style.display = "block";
      this.__domNodes.help.style.display = "none";
      break;
    case "no-suggestions":
      this.__domNodes.suggs.style.display = "none";
      this.__domNodes.preview.style.display = "none";
      this.__domNodes.help.style.display = "block";
      if (this.__previewBrowser)
        this._queuePreview(null,
                           0,
                           function(pblock) { pblock.innerHTML = ""; });
      break;
    default:
      throw new Error("Unknown state: " + state);
    }
  },

  refresh : function CM_refresh() {
    this.__cmdSource.refresh();
    this.__hilitedSuggestion = 0;
    this.__lastInput = "";
  },

  moveIndicationUp : function CM_moveIndicationUp(context) {
    this.__hilitedSuggestion -= 1;
    if (this.__hilitedSuggestion < 0) {
      this.__hilitedSuggestion = this.__nlParser.getNumSuggestions() - 1;
    }
    this._previewAndSuggest(context, true);
  },

  moveIndicationDown : function CM_moveIndicationDown(context) {
    this.__hilitedSuggestion += 1;
    if (this.__hilitedSuggestion > this.__nlParser.getNumSuggestions() - 1) {
      this.__hilitedSuggestion = 0;
    }
    this._previewAndSuggest(context, true);
  },

  _renderSuggestions : function CMD__renderSuggestions() {
    var content = "";
    var suggList = this.__nlParser.getSuggestionList();
    var suggNumber = this.__nlParser.getNumSuggestions();


    for (var x = 0; x < suggNumber; x++) {
      var suggText = suggList[x].getDisplayText();
      var suggIconUrl = suggList[x].getIcon();
      var suggIcon = "";
      if(suggIconUrl) {
        suggIcon = "<img src=\"" + Utils.escapeHtml(suggIconUrl) + "\"/>";
      }
      suggText = "<div class=\"cmdicon\">" + suggIcon + "</div>&nbsp;" + suggText;
      if ( x == this.__hilitedSuggestion ) {
        content += "<div class=\"hilited\"><div class=\"hilited-text\">" + suggText + "</div>";
        content += "</div>";
      } else {
        content += "<div class=\"suggested\">" + suggText + "</div>";
      }
    }
    this.__domNodes.suggs.innerHTML = content;
  },

  _onPreviewBrowserCreate : function CM__onPreviewBrowserCreate(browser) {
    this.__previewBrowser = browser;
    var cb = this.__previewBrowserCreatedCallback;
    this.__previewBrowserCreatedCallback = null;
    cb();
  },

  _ensurePreviewBrowser : function CM__ensurePreviewBrowser(cb) {
    if (this.__previewBrowser)
      cb();
    else {
      if (this.__previewBrowserCreatedCallback) {
        this.__previewBrowserCreatedCallback = cb;
      } else {
        var self = this;
        this.__previewBrowserCreatedCallback = cb;
        makePreviewBrowser(this.__domNodes.preview,
                           function(browser) {
                             self._onPreviewBrowserCreate(browser);
                           });
      }
    }
  },

  _onPreviewBrowserLoadUrl : function CM__onPreviewBrowserLoadUrl() {
    var cb = this.__previewBrowserUrlLoadedCallback;
    this.__previewBrowserUrlLoadedCallback = null;
    cb();
  },

  _ensurePreviewBrowserUrlLoaded : function CM__EPBUL(url, cb) {
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

  _queuePreview : function CM__queuePreview(url, delay, cb) {
    var self = this;

    function showPreview() {
      self._ensurePreviewBrowser(
        function() {
          if (self.__queuedPreview == showPreview) {
            if (url)
              url = Utils.url(url).spec;
            else
              url = DEFAULT_PREVIEW_BROWSER_URL;

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

  _renderPreview : function CM__renderPreview(context) {
    var wasPreviewShown = false;

    try {
      var activeSugg = this.__nlParser.getSentence(this.__hilitedSuggestion);

      if (activeSugg) {
        var self = this;
        var previewUrl = activeSugg.previewUrl;

        this._queuePreview(
          previewUrl,
          activeSugg.previewDelay,
          function(pblock) { activeSugg.preview(context, pblock); }
        );

        wasPreviewShown = true;
      }
    } catch (e) {
      this.__msgService.displayMessage(
        {text: ("An exception occurred while previewing the command '" +
                this.__lastInput + "'."),
         exception: e}
        );
    }
    return wasPreviewShown;
  },

  _previewAndSuggest : function CM__previewAndSuggest(context) {
    this._renderSuggestions();

    return this._renderPreview(context);
  },

  reset : function CM_reset() {
    this.__nlParser.reset();
  },

  updateInput : function CM_updateInput(input, context, asyncSuggestionCb) {
    this.__lastInput = input;
    this.__nlParser.updateSuggestionList(input, context, asyncSuggestionCb);
    this.__hilitedSuggestion = 0;
    var previewState = "no-suggestions";
    if (this.__nlParser.getNumSuggestions() > 0 &&
        this._previewAndSuggest(context))
      previewState = "with-suggestions";
    this.setPreviewState(previewState);
  },

  onSuggestionsUpdated : function CM_onSuggestionsUpdated(input,
                                                          context) {
    // Called when we're notified of a newly incoming suggestion
    this.__nlParser.refreshSuggestionList(input);
    this._previewAndSuggest(context);
  },

  execute : function CM_execute(context) {
    var parsedSentence = this.__nlParser.getSentence(this.__hilitedSuggestion);
    if (!parsedSentence)
      this.__msgService.displayMessage("No command called " +
                                       this.__lastInput + ".");
    else
      try {
	this.__nlParser.strengthenMemory(this.__lastInput, parsedSentence);
        parsedSentence.execute(context);
      } catch (e) {
        this.__msgService.displayMessage(
          {text: ("An exception occurred while running the command '" +
                  this.__lastInput + "'."),
           exception: e}
        );
      }
  },

  hasSuggestions: function CM_hasSuggestions() {
    return (this.__nlParser.getNumSuggestions() > 0);
  },

  getSuggestionListNoInput: function CM_getSuggListNoInput(context,
                                                           asyncSuggestionCb) {
    this.__nlParser.updateSuggestionList("", context, asyncSuggestionCb);
    return this.__nlParser.getSuggestionList();
  },

  getHilitedSuggestionText : function CM_getHilitedSuggestionText(context) {
    if(!this.hasSuggestions())
      return null;

    var selObj = this.__nlParser.getSelectionObject(context);
    var suggText = this.__nlParser.getSentence(this.__hilitedSuggestion)
                                  .getCompletionText(selObj);
    this.updateInput(suggText,
                     context);

    return suggText;
  },

  makeCommandSuggester : function CM_makeCommandSuggester() {
    var self = this;

    function getAvailableCommands(context) {
      self.refresh();
      var suggestions = self.getSuggestionListNoInput( context );

      var retVal = {};
      for each (let parsedSentence in suggestions) {
        let sentenceClosure = parsedSentence;
        let titleCasedName = parsedSentence._verb._name;
        titleCasedName = (titleCasedName[0].toUpperCase() +
                          titleCasedName.slice(1));
        retVal[titleCasedName] = function execute() {
	  sentenceClosure.execute(context);
        };

        let suggestedCommand = self.__cmdSource.getCommand(
          parsedSentence._verb._name
        );
        if(suggestedCommand.icon)
          retVal[titleCasedName].icon = suggestedCommand.icon;
      }
      return retVal;
    }

    return getAvailableCommands;
  }
};
