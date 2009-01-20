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
      var os = Components.classes["@mozilla.org/observer-service;1"]
                         .getService(Components.interfaces.nsIObserverService);
      var cancelQuit = Components.classes["@mozilla.org/supports-PRBool;1"]
                                 .createInstance(Components.interfaces.nsISupportsPRBool);
      os.notifyObservers(cancelQuit, "quit-application-requested", null);
      if (cancelQuit.data) return false; // somebody canceled our quit request
    } return true; // assume yes
  },
  _quitWithFlags: function app__quitWithFlags(aFlags, event) {
    if (this._warnOnClose(event)) {
      var appStartup = Components.classes['@mozilla.org/toolkit/app-startup;1']
                                 .getService(Components.interfaces.nsIAppStartup);
      appStartup.quit(aFlags);
      return true;
    } return false;
  },
  quit: function app_quit() {
    return this._quitWithFlags(Components.interfaces.nsIAppStartup.eAttemptQuit, "quit");
  },
  restart: function app_restart() {
    return this._quitWithFlags(Components.interfaces.nsIAppStartup.eAttemptQuit |
                               Components.interfaces.nsIAppStartup.eRestart, "restart");
  },
  close: function app_close() {
    if (this._warnOnClose("close")) {
      Components.classes["@mozilla.org/appshell/window-mediator;1"]
                .getService(Components.interfaces.nsIWindowMediator)
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
  name: "exit",
  description: "Exits firefox",
  preview: function( pblock ) {pblock.innerHTML=this.description;},
  execute: function() {
    extApplication.quit();
  }
});

// restarts firefox
CmdUtils.CreateCommand({
  name: "restart",
  description: "Restarts firefox",
  preview: function( pblock ) {pblock.innerHTML=this.description;},
  execute: function() {
    extApplication.restart();
  }
});

// closes current firefox window
// TODO: if last window is closed, we should offer to save session
CmdUtils.CreateCommand({
  name: "close",
  description: "Close current window",
  preview: function( pblock ) {pblock.innerHTML=this.description},
  execute: function() {
    extApplication.close();
  }
});

// toggles fullscreen
CmdUtils.CreateCommand({
  name: "fullscreen",
  description: "Toggles fullscreen mode",
  preview: function( pblock ) {pblock.innerHTML=this.description},
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
      if (tab._window && tab._window.focus)
        tab._window.focus();
      tab.focus();
      // Focus on tab content
      // TODO: window.focus() is missing on 1.9.2pre
      if (tab._window && tab._window.content)
        tab._window.content.focus();
    }
  },

  preview: function( pblock, tab ) {
    var tabName = tab.text;

    if (tabName == this._cacheKey) {
      pblock.innerHTML = this._cacheValue;
    }
    else if( tabName.length > 1 ){
      var tab = Utils.tabs.get(tabName);
      if (tab) {
        var imgData = CmdUtils.getTabSnapshot( tab, {width:500} );
        pblock.innerHTML = "Changes to <b style=\"color:yellow\">%s</b> tab.".replace(/%s/, tabName);
        pblock.innerHTML += "<br/><img src='%s'>".replace(/%s/, imgData );
      }
      else
        pblock.innerHTML = "Switch to tab by name.";
    }
    else
      pblock.innerHTML = "Switch to tab by name.";

    this._cacheKey = tabName;
    this._cacheValue = pblock.innerHTML;
  }
});

// Closes a single tab
CmdUtils.CreateCommand({
  name: "close-tab",
  takes: {"tab name": noun_type_tab},
  icon: "chrome://ubiquity/skin/icons/tab_delete.png",
  description: "Closes the tab that matches the given name.",
  execute: function( directObj ) {
    var tabName = directObj.text;
    var tab = Utils.tabs.get(tabName);
    if(tab){
      tab.close();
    }else{
      Application.activeWindow.activeTab.close();
    }
    displayMessage(tabName + " tab closed");
  },

  preview: function( pblock, directObj ) {
    var tabName = directObj.text;

    if( tabName.length > 1 ) {
      var tab = Utils.tabs.get(tabName);
      if (tab) {
        var imgData = CmdUtils.getTabSnapshot( tabs[tabName], {width:500} );
        pblock.innerHTML = "Closes the <b style=\"color:yellow\">%s</b> tab.".replace(/%s/, tabName);
        pblock.innerHTML += "<br/><img src='%s'>".replace(/%s/, imgData );
      }
      else
        pblock.innerHTML = "Closes the tab by name.";
    }
    else
      pblock.innerHTML = "Closes the tab by name.";
  }
});


//Closes all tabs related to the specified word
CmdUtils.CreateCommand({
  name: "close-related-tabs",
  takes: {"related word": noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/tab_delete.png",
  description: "Closes all open tabs that have the given word in common.",
  preview: function( pblock, directObj ) {
    var query = directObj.text;
    var relatedWord = query.toLowerCase();
    var html = null;
    if(relatedWord.length != 0){
      html = "Closes the following tabs that are related to <b style=\"color:yellow\">\"" + relatedWord + "\"</b> : <ul>";
      var numTabs = 0;

      Application.activeWindow.tabs.forEach(function(tab){
        if ( tab.uri.spec.toLowerCase().match(relatedWord) || tab.document.title.toLowerCase().match(relatedWord)){
      	  html += "<li>" + tab.document.title + "</li>";
      	  numTabs++;
        }
      });

      if(numTabs == 0){
        html = "No tabs related to <b style=\"color:yellow\">\"" + relatedWord + "\"</b>";
      }else{
        html += "</ul>";
      }
    }else{
      html = "Closes all tabs related to the word";
    }
    jQuery(pblock).html( html );
  },

  execute: function( directObj ) {
    var query = directObj.text;
    var relatedWord = query.toLowerCase();
    var numTabs = 0;

    Application.activeWindow.tabs.forEach(function(tab){
      if ( tab.uri.spec.toLowerCase().match(relatedWord) || tab.document.title.toLowerCase().match(relatedWord)){
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
  } else {
    filter = filter.toLowerCase();
    Application.activeWindow.tabs.forEach(function(tab) {
      var title = tab.document.title;
      if (title.toLowerCase().indexOf(filter) != -1)
        count++;
    });
  }
  if (noHtml) {
    var previewTemplate = "${count} tabs"
                          + "{if filter} matching '${filter}'{else} total{/if}.";
  } else {
    var previewTemplate = "<b>${count}</b> tabs"
                          + "{if filter} matching <i>${filter}</i>{else} total{/if}.";
  }
  var previewData = {
    count: count,
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
  preview: function( pblock ) {pblock.innerHTML=this.description},
  execute: function() {
    var win = CmdUtils.getWindow();
    win.location.reload( true );
  }
});

// bookmark current tab
CmdUtils.CreateCommand({
  name: "bookmark",
  description: "Add current document to bookmarks",
  preview: function( pblock ) {pblock.innerHTML=this.description},
  execute: function() {
    var win = CmdUtils.getWindowInsecure();
    var doc = CmdUtils.getDocument();
    try {
      win.sidebar.addPanel(doc.title, win.location.href,"");
    } catch ( e ) { displayMessage("Page could not be bookmarked!" + ((e)?" - "+e:"")); }
  }
});

// print current tab
CmdUtils.CreateCommand({
  name: "print",
  description: "Print current page",
  preview: function( pblock ) {pblock.innerHTML=this.description},
  execute: function() {
    var win = CmdUtils.getWindow();
    win.print();
  }
});

// goes back in history
CmdUtils.CreateCommand({
  name: "back",
  description: "Go back in history",
  takes: {steps: noun_arb_text},
  _parseSteps: function(s) {
    var s = parseInt(s);
    return isNaN(s) ? 1 : s;
  },
  preview: function( pblock, steps ) {
    var steps = this._parseSteps(steps.text);
    var template = "Go back ${steps} steps in history";
    pblock.innerHTML=CmdUtils.renderTemplate(template, {"steps": steps});
  },
  execute: function(steps) {
    var win = CmdUtils.getWindow();
    win.history.go(-this._parseSteps(steps.text));
  }
});

// goes forward in history
CmdUtils.CreateCommand({
  name: "forward",
  description: "Go forward in history",
  takes: {steps: noun_arb_text},
  _parseSteps: function(s) {
    var s = parseInt(s);
    return isNaN(s) ? 1 : s;
  },
  preview: function( pblock, steps ) {
    var steps = this._parseSteps(steps.text);
    var template = "Go forward ${steps} steps in history";
    pblock.innerHTML=CmdUtils.renderTemplate(template, {"steps": steps});
  },
  execute: function(steps) {
    var win = CmdUtils.getWindow();
    win.history.go(this._parseSteps(steps.text));
  }
});

// go to home page
CmdUtils.CreateCommand({
  name: "home",
  description: "Go to home page",
  preview: function( pblock ) {pblock.innerHTML=this.description},
  execute: function() {
    var win = CmdUtils.getWindow();
    win.home();
  }
});

// -----------------------------------------------------------------
// ZOOM RELATED
// -----------------------------------------------------------------


function setFullPageZoom( level ) {
  var navigator1 = window
                    .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                    .getInterface(Components.interfaces.nsIWebNavigation);
  var docShell = navigator1.QueryInterface(Components.interfaces.nsIDocShell);
  var docviewer = docShell.contentViewer.QueryInterface(Components.interfaces.nsIMarkupDocumentViewer);
  docviewer.fullZoom = level;
}

CmdUtils.CreateCommand({
  name:"zoom",
  takes:{"percentage": noun_type_percentage},
  icon: "chrome://ubiquity/skin/icons/magnifier.png",
  description:"Zooms the Firefox window in or out.",
  preview:function(pBlock, directObj) {
    if (directObj.text)
      pBlock.innerHTML = "Zooms the Firefox window to " +
        directObj.text + " of its normal size.";
    else
      pBlock.innerHTML = "Zooms the Firefox window to a given percentage " +
      "of its normal size.";
  },
  execute:function(directObj) {
    if (directObj.data)
      setFullPageZoom(directObj.data);
    else
      displayMessage("You must provide a percentage to zoom to.");
  }
});

// -----------------------------------------------------------------
// TAGGING COMMANDS
// -----------------------------------------------------------------

// http://blog.stevenlevithan.com/archives/faster-trim-javascript
function trim (str) {
  var str = str.replace(/^\s\s*/, ''),
    ws = /\s/,
    i = str.length;
  while (ws.test(str.charAt(--i)));
  return str.slice(0, i + 1);
}

// command to tag the currently loaded URI via the humane prompt
CmdUtils.CreateCommand({
  name: "tag",
  homepage: "http://autonome.wordpress.com/",
  author: { name: "Dietrich Ayala", email: "dietrich@mozilla.com"},
  license: "MPL/GPL/LGPL",
  takes : {"text" : noun_arb_text},
  icon: "chrome://mozapps/skin/places/tagContainerIcon.png",
  description: "Adds a tag to describe the current page",
  preview: function(aEl, aTagsString) {
    aEl.innerHTML = "Describe the current page with tags";
    aEl.innerHTML += aTagsString.text.length ? " (" + aTagsString.text + ")" : ".";
  },
  execute: function(aTagsString) {
    var Cc = Components.classes;
    var Ci = Components.interfaces;
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"].
             getService(Ci.nsIWindowMediator);
    var recentWindow = wm.getMostRecentWindow("navigator:browser");
    var doc = recentWindow.content.document;
    if (!doc)
      return;

    var iosvc = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
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



// -----------------------------------------------------------------
// BUG REPORT COMMANDS
// -----------------------------------------------------------------


function _getExtensionInfo( Application ){
  var extensions = {};
  Application.extensions.all.forEach(function( ext ){
    extensions[ext.name] = {
      version: ext.version,
      firstRun: ext.firstRun,
      enabled: ext._enabled
    };
  });
  return extensions;
}

function _getBrowserInfo( Application ){
  var numTabs = 0;
  Application.windows.forEach(function(win){
    numTabs += win.tabs.length;
  });

  var nav = CmdUtils.getWindow().navigator;

  return {
    name: Application.name,
    version: Application.version,
    numberOfWindows: Application.windows.length,
    numberOfTabs: numTabs,
    cookieEnabled: nav.cookieEnabled,
    language: nav.language,
    buildID: nav.buildID
  };
}

function _getOSInfo(){
  var hostJS = CmdUtils.getWindow().navigator;

  return {
    oscpu: hostJS.oscpu,
    platform: hostJS.platform
  };
}

function _getPluginInfo(){
  var plugins = [];
  var hostJS = CmdUtils.getWindow().navigator;
  for( var i=0; i < hostJS.plugins.length; i++){
    plugins.push({
      name: hostJS.plugins[i].name,
      //description: hostJS.plugins[i].description,
      filename: hostJS.plugins[i].filename
    });
  }
  return plugins;
}

function _getErrorInfo(){
  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
      .getService(Components.interfaces.nsIConsoleService);

  // Get the last five errors
  var errors = {};
  var count = {};
  consoleService.getMessageArray(errors, count);
  errors = errors.value.slice(-5);

  var errorList = [];
  errors.forEach(function(error){
    errorList.push( error.message );
  });

  return errorList;
}

// TODO: Move this to developer.js on the next release of Ubiq.
// I'm leaving it here so that it gets pushed out to users
// now. -Aza
CmdUtils.CreateCommand({
  name:"report-bug",
  _getDebugInfo: function(Application){
    return {
      browser: _getBrowserInfo(Application),
      extensions: _getExtensionInfo(Application),
      plugins: _getPluginInfo(),
      os: _getOSInfo(),
      errors: _getErrorInfo()
    };
  },
  preview: "Inserts Ubiquity debug information at the cursor. Use it when reporting bugs.",
  execute: function(){
    var debug = this._getDebugInfo(Application);
    CmdUtils.setSelection( Utils.encodeJson(debug) );
  }
});
