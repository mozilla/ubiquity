// -----------------------------------------------------------------
// HELPER OBJECT FOR CLOSING WINDOWS
// -----------------------------------------------------------------

var extApplication = { // helper method for correct quitting/restarting
  _warnOnClose: function app__warnOnClose( event ) {
    var prefs = {
      close:   "browser.tabs.warnOnClose",
      restart: "browser.warnOnRestart",
      quit:    "browser.warnOnQuit"
    };
    if (!(event in prefs) || Application.prefs.getValue(prefs[event], true)) {
      var os = Cc["@mozilla.org/observer-service;1"]
               .getService(Ci.nsIObserverService);
      var cancelQuit = Cc["@mozilla.org/supports-PRBool;1"]
                       .createInstance(Ci.nsISupportsPRBool);
      os.notifyObservers(cancelQuit, "quit-application-requested", null);
      if (cancelQuit.data) return false; // somebody canceled our quit request
    } return true; // assume yes
  },
  _quitWithFlags: function app__quitWithFlags(aFlags, event) {
    if (this._warnOnClose(event)) {
      var appStartup = Cc['@mozilla.org/toolkit/app-startup;1']
                                 .getService(Ci.nsIAppStartup);
      appStartup.quit(aFlags);
      return true;
    } return false;
  },
  quit: function app_quit() {
    return this._quitWithFlags(Ci.nsIAppStartup.eAttemptQuit, "quit");
  },
  restart: function app_restart() {
    return this._quitWithFlags(Ci.nsIAppStartup.eAttemptQuit |
                               Ci.nsIAppStartup.eRestart, "restart");
  },
  close: function app_close() {
    if (this._warnOnClose("close")) {
      Cc["@mozilla.org/appshell/window-mediator;1"]
                .getService(Ci.nsIWindowMediator)
                .getMostRecentWindow(null)
                .close();
      return true;
    } return false;
  }
};

// -----------------------------------------------------------------
// WINDOW COMMANDS
// -----------------------------------------------------------------

// exit firefox entirely
CmdUtils.CreateCommand({
  name: "exit-firefox",
  description: "Exits firefox",
  execute: function() {
    extApplication.quit();
  }
});

// restarts firefox
CmdUtils.CreateCommand({
  name: "restart-firefox",
  description: "Restarts firefox",
  execute: function() {
    extApplication.restart();
  }
});

// closes current firefox window
// TODO: if last window is closed, we should offer to save session
CmdUtils.CreateCommand({
  name: "close-window",
  description: "Close current window",
  execute: function() {
    extApplication.close();
  }
});

// toggles fullscreen
CmdUtils.CreateCommand({
  name: "fullscreen",
  description: "Toggles fullscreen mode",
  execute: function() {
    var win = CmdUtils.getWindow();
    win.fullScreen = win.fullScreen ? false : true;
  }
});

// -----------------------------------------------------------------
// TAB COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  name: "tab",
  takes: {"tab name": noun_type_tab},
  icon: "chrome://ubiquity/skin/icons/tab_go.png",
  description: "Switches to the tab that matches the given name.",
  execute: function( tab ) {
    var tabName = tab.text;
    var tab = Utils.tabs.get(tabName);
    if (tab) {
      // TODO: window.focus() is missing on 1.9.2pre
      if (tab._window && tab._window.focus) {
        tab._window.focus();
      }
      tab.focus();
      // Focus on tab content
      // TODO: window.focus() is missing on 1.9.2pre
      if (tab._window && tab._window.content) {
        tab._window.content.focus();
      }
    }
  },

  preview: function(pblock, tab) {
    var tabName = tab.text;

    if (tabName == this._cacheKey) {
      pblock.innerHTML = this._cacheValue;
    }
    else if (tabName.length > 1 && (tab = Utils.tabs.get(tabName))) {
      var imgData = CmdUtils.getTabSnapshot(tab, {width:500});
      pblock.innerHTML = "Changes to <b style=\"color:yellow\">%s</b> tab."
                         .replace(/%s/, tabName);
      pblock.innerHTML += "<br/><img src='%s'>".replace(/%s/, imgData);
    }
    else {
      pblock.innerHTML = "Switch to tab by name.";
    }

    this._cacheKey = tabName;
    this._cacheValue = pblock.innerHTML;
  }
});

// Closes a single tab
CmdUtils.CreateCommand({
  name: "close-tab",
  takes: {"tab name": noun_type_tab},
  icon: "chrome://ubiquity/skin/icons/tab_delete.png",
  description: "Closes the tab that matches the given name, "
             + "or if current tab if no name is supplied",
  execute: function(directObj) {
    var tabName = directObj.text;
    var tab = Utils.tabs.get(tabName);
    if (tabName && tab) {
      tab.close();
    }
    else {
      Application.activeWindow.activeTab.close();
    }
    displayMessage(tabName + " tab closed");
  },

  preview: function(pblock, tab) {
    var tabName = tab.text;
    if(tabName.length > 1 && (tab = Utils.tabs.get(tabName))) {
      var imgData = CmdUtils.getTabSnapshot(tab, {width:500});
      pblock.innerHTML = "Closes the <b style=\"color:yellow\">%s</b> tab."
                         .replace(/%s/, tabName);
      pblock.innerHTML += "<br/><img src='%s'>".replace(/%s/, imgData);
    }
    else {
      pblock.innerHTML = "Closes the tab by name.";
    }
  }
});


//Closes all tabs related to the specified word
CmdUtils.CreateCommand({
  name: "close-related-tabs",
  takes: {"related word": noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/tab_delete.png",
  description: "Closes all open tabs that have the given word in common.",
  preview: function(pblock, directObj) {
    var query = directObj.text;
    var relatedWord = query.toLowerCase();
    var html = null;
    if(relatedWord.length != 0) {
      html = "Closes the following tabs that are related to "
           + "<b style=\"color:yellow\">\"" + relatedWord + "\"</b> : <ul>";
      var numTabs = 0;

      Application.activeWindow.tabs.forEach(function(tab) {
        if (tab.uri.spec.toLowerCase().match(relatedWord) ||
            tab.document.title.toLowerCase().match(relatedWord)) {
      	  html += "<li>" + tab.document.title + "</li>";
      	  numTabs++;
        }
      } );

      if(numTabs == 0) {
        html = "No tabs related to <b style=\"color:yellow\">\""
             + relatedWord + "\"</b>";
      }
      else {
        html += "</ul>";
      }
    }
    else {
      html = "Closes all tabs related to the word";
    }
    jQuery(pblock).html(html);
  },

  execute: function(directObj) {
    var query = directObj.text;
    var relatedWord = query.toLowerCase();
    var numTabs = 0;

    Application.activeWindow.tabs.forEach(function(tab) {
      if (tab.uri.spec.toLowerCase().match(relatedWord) ||
          tab.document.title.toLowerCase().match(relatedWord)) {
        tab.close();
        numTabs++;
      }
    });

    displayMessage(numTabs + " tabs closed");
  }

});


function countTabs(filter, noHtml) {
  var count = 0;
  if (filter.length < 1) {
     count = Application.activeWindow.tabs.length;
  }
  else {
    Application.activeWindow.tabs.forEach(function(tab) {
      var title = tab.document.title;
      if (title.toLowerCase().indexOf(filter.toLowerCase()) != -1)
        count++;
    });
  }
  var tabTemplate = "tab";
  if (count > 1) {
    tabTemplate += "s";
  }
  if (noHtml) {
    var previewTemplate = "${count} "+tabTemplate
                        + "{if filter} matching '${filter}'{else} total{/if}.";
    }
  else {
    var previewTemplate = "<b>${count}</b> "+tabTemplate
                        + "{if filter} matching <i>${filter}</i>{else} total{/if}.";
  }
  var previewData = {
    count:  count,
    filter: filter
  };
  return CmdUtils.renderTemplate(previewTemplate, previewData);
}


CmdUtils.CreateCommand({
  name: "count-tabs",
  license: "MPL",
  description: "Counts the number of tabs you have open.",
  takes: { filter: noun_arb_text },
  preview: function(previewBlock, inputObject) {
    previewBlock.innerHTML = countTabs(inputObject.text);
  },
  execute: function(inputObject) {
    displayMessage(countTabs(inputObject.text, true));
  }
});


// refreshes current tab
CmdUtils.CreateCommand({
  name: "refresh",
  description: "Refresh current document",
  execute: function() {
    var win = CmdUtils.getWindow();
    win.location.reload(true);
  }
});

// bookmark current tab
CmdUtils.CreateCommand({
  name: "bookmark",
  description: "Add current document to bookmarks",
  execute: function() {
    var win = CmdUtils.getWindowInsecure();
    var doc = CmdUtils.getDocument();
    try {
      win.sidebar.addPanel(doc.title, win.location.href, "");
    }
    catch (e) {
      displayMessage("Page could not be bookmarked!" + ((e) ? " - "+e : "" ));
    }
  }
});

// print current tab
CmdUtils.CreateCommand({
  name: "print",
  description: "Print current page",
  execute: function() {
    var win = CmdUtils.getWindow();
    win.print();
  }
});

// goes back in history
CmdUtils.CreateCommand({
  name: "back",
  description: "Go back in history",
  takes: {steps: noun_type_number},

  preview: function(pblock, steps) {
    var template = "Go back ${steps} {if steps == '1'} "
                 + "step {else} steps {/if} in history";
    pblock.innerHTML = CmdUtils.renderTemplate(template, {"steps": steps.text});
  },
  execute: function(steps) {
    var win = CmdUtils.getWindow();
    win.history.go(-Math.abs(parseInt(steps.text)));
  }
});

// goes forward in history
CmdUtils.CreateCommand({
  name: "forward",
  description: "Go forward in history",
  takes: {steps: noun_type_number},

  preview: function(pblock, steps) {
    var template = "Go forward ${steps} {if steps == '1'} "
                 + "step {else} steps {/if} in history";
    pblock.innerHTML = CmdUtils.renderTemplate(template, {"steps": steps.text});
  },
  execute: function(steps) {
    var win = CmdUtils.getWindow();
    win.history.go(Math.abs(parseInt(steps.text)));
  }
});

// go to home page
CmdUtils.CreateCommand({
  name: "home",
  description: "Go to home page",
  execute: function() {
    var win = CmdUtils.getWindow();
    win.home();
  }
});

// -----------------------------------------------------------------
// ZOOM RELATED
// -----------------------------------------------------------------


function setFullPageZoom(level) {
  var navigator1 = window.
                   QueryInterface(Ci.nsIInterfaceRequestor).
                   getInterface(Ci.nsIWebNavigation);
  var docShell = navigator1.QueryInterface(Ci.nsIDocShell);
  var docviewer = docShell.
                  contentViewer.
                  QueryInterface(Ci.nsIMarkupDocumentViewer);
  docviewer.fullZoom = level;
}

CmdUtils.CreateCommand({
  name: "zoom",
  takes: {"percentage": noun_type_percentage},
  icon: "chrome://ubiquity/skin/icons/magnifier.png",
  description: "Zooms the Firefox window in or out.",
  preview: function(pBlock, directObj) {
    var replacement = "a given percentage";
    if (directObj.text) {
      replacement = directObj.text;
    }
    pBlock.innerHTML = "Zooms the Firefox window to " + replacement
                       + " of its normal size.";
  },
  execute: function(directObj) {
    if (directObj.data) {
      setFullPageZoom(directObj.data);
    }
    else {
      displayMessage("You must provide a percentage to zoom to.");
    }
  }
});

// -----------------------------------------------------------------
// TAGGING COMMANDS
// -----------------------------------------------------------------

// http://blog.stevenlevithan.com/archives/faster-trim-javascript
function trim (str) {
  var str = str.replace(/^\s\s*/, ''),
      ws  = /\s/,
      i   = str.length;
  while (ws.test(str.charAt(--i)));
  return str.slice(0, i + 1);
}

// command to tag the currently loaded URI via the humane prompt
CmdUtils.CreateCommand({
  name: "tag",
  homepage: "http://autonome.wordpress.com/",
  author: {name: "Dietrich Ayala", email: "dietrich@mozilla.com"},
  license: "MPL/GPL/LGPL",
  takes : {"text" : noun_arb_text},
  icon: "chrome://mozapps/skin/places/tagContainerIcon.png",
  description: "Adds a tag to describe the current page",
  preview: function(aEl, aTagsString) {
    aEl.innerHTML = ("Describe the current page with tags" +
                     (aTagsString.text.length ? " (" +
                      aTagsString.text + ")" : "."));
  },
  execute: function(aTagsString) {
    var recentWindow = Utils.currentChromeWindow;
    var doc = recentWindow.content.document;
    if (!doc)
      return;

    Utils.reportInfo("URI: " + doc.location);

    var iosvc = Cc["@mozilla.org/network/io-service;1"].
                getService(Ci.nsIIOService);
    var currentURI = iosvc.newURI(doc.location, null, null);

    var bookmarks = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].
                    getService(Ci.nsINavBookmarksService);
    if (!bookmarks.isBookmarked(currentURI)) {
      // create unfiled bookmark
      bookmarks.insertBookmark(bookmarks.unfiledBookmarksFolder, currentURI,
                               bookmarks.DEFAULT_INDEX, doc.title);
    }

    // if there's a comma, split on commas, otherwise use spaces
    var splitChar = " ";
    if (aTagsString.text.indexOf(",") != -1)
      splitChar = ",";
    var tags = aTagsString.text.split(splitChar);

    // trim leading/trailing spaces
    tags = tags.map(function(a) { return trim(a); });

    var tagging = Cc["@mozilla.org/browser/tagging-service;1"].
                  getService(Ci.nsITaggingService);
    tagging.tagURI(currentURI, tags);
  }
});

// TODO: Move this to developer.js on the next release of Ubiq.
// I'm leaving it here so that it gets pushed out to users
// now. -Aza
CmdUtils.CreateCommand({
  name: "report-bug",
  description: "Reports a Ubiquity bug.",
  execute: function() {
    Utils.openUrlInBrowser("chrome://ubiquity/content/report-bug.html");
  }
});
