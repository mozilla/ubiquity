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
  names: ["exit-firefox"],
  description: "Exits firefox",
  execute: function() {
    extApplication.quit();
  }
});

// restarts firefox
CmdUtils.CreateCommand({
  names: ["restart-firefox"],
  description: "Restarts firefox",
  execute: function() {
    extApplication.restart();
  }
});

// closes current firefox window
// TODO: if last window is closed, we should offer to save session
CmdUtils.CreateCommand({
  names: ["close-window"],
  description: "Close current window",
  execute: function() {
    extApplication.close();
  }
});

// toggles fullscreen
CmdUtils.CreateCommand({
  names: ["fullscreen"],
  description: "Toggles fullscreen mode",
  execute: function() {
    var win = CmdUtils.getWindow();
    win.fullScreen = win.fullScreen ? false : true;
  }
});

// -----------------------------------------------------------------
// TAB COMMANDS
// -----------------------------------------------------------------

function tabPreview(msg)(
  function preview(pblock, {object: {text, data: tab}}) {
    pblock.innerHTML = (
      tab
      ? <div class="tab">
          {msg} <b>{text}</b>
          <p><img src={CmdUtils.getTabSnapshot(tab, {width: 480})}/></p>
        </div>
      : this.description);
  });

CmdUtils.CreateCommand({
  names: ["switch-tab"],
  arguments: [{role: 'object', label: 'name', nountype: noun_type_tab}],
  icon: "chrome://ubiquity/skin/icons/tab_go.png",
  description: "Switches to the tab that matches the given name.",
  execute: function(args) {
    var tab = args.object.data;
    if (!tab) return;
    // TODO: window.focus() is missing on 1.9.2pre
    if (tab._window && tab._window.focus) {
      tab._window.focus();
    }
    tab.focus();
    // Focus on tab content
    if (tab._window && tab._window.content) {
      tab._window.content.focus();
    }
  },
  preview: tabPreview("Changes to"),
});

CmdUtils.CreateCommand({
  names: ["close-tab"],
  arguments: [{role: 'object', label: 'name', nountype: noun_type_tab}],
  icon: "chrome://ubiquity/skin/icons/tab_delete.png",
  description: ("Closes the tab that matches the given name, " +
                "or the current tab if no name is supplied."),
  execute: function(args) {
    var tab = args.object.data;
    (tab || Application.activeWindow.activeTab).close();
  },
  preview: tabPreview("Closes"),
});

CmdUtils.CreateCommand({
  names: ["close-related-tabs"],
  arguments: [{role: 'object', label: 'related word', nountype: noun_arb_text}],
  icon: "chrome://ubiquity/skin/icons/tab_delete.png",
  description: "Closes all open tabs that have the given word in common.",
  execute: function(args) {
    if (!args.object) return;
    var text = args.object.text;
    var tabs = Utils.tabs.search(text);
    for each (let t in tabs) t.close();
    displayMessage({
      icon: this.icon,
      title: this.name,
      text: tabs.length + " tabs closed"});
  },
  preview: function(pblock, args) {
    if (!args.object) {
      pblock.innerHTML = this.description;
      return;
    }
    var text = args.object.text;
    var tabs = Utils.tabs.search(text);
    var div = this._div();
    pblock.innerHTML = (
      tabs.length
      ? div.appendChild(
        <>Closes tabs related to <b>{text}</b>:</> +
          tabs.reduce(this._lister, <ul/>))
      : div.appendChild(<>No tabs are related to <b>{text}</b>.</>));
  },
  _div: function() <div class={this.name}/>,
  _lister: function(list, {document})(
    list.appendChild(<li>{document.title}
                     <code><small>{document.URL}</small></code></li>)),
});

CmdUtils.CreateCommand({
  names: ["count-tabs"],
  description: "Counts the number of opened tabs.",
  arguments: [{role: 'instrument', label: 'filter', nountype: noun_arb_text}],
  icon: "chrome://ubiquity/skin/icons/tab_go.png",
  execute: function(args) {
    var {text} = args.instrument || {text: null};
    displayMessage({
      icon: this.icon,
      title: this.name,
      text: this._count(text, true)});
  },
  preview: function(pblock, args) {
    var {text} = args.instrument || {text: null};
    pblock.innerHTML = this._count(text);
  },
  _count: function(text, plain) {
    var count = (text ? Utils.tabs.search(text) : Utils.tabs.get()).length;
    var ord = count > 1 ? " tabs " : " tab ";
    var msg = text ? "matching " + text : "total";
    return (plain
            ? count + ord + msg + "."
            : <div class={this.name}><b>{count}</b>{ord}<b>{msg}</b>.</div>);
  }
});


// refreshes current tab
CmdUtils.CreateCommand({
  names: ["refresh","reload"],
  description: "Refresh current document",
  execute: function() {
    var win = CmdUtils.getWindow();
    win.location.reload(true);
  }
});

// bookmark current tab
CmdUtils.CreateCommand({
  names: ["bookmark"],
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
  names: ["print"],
  description: "Print current page",
  execute: function() {
    var win = CmdUtils.getWindow();
    win.print();
  }
});

// goes back in history
CmdUtils.CreateCommand({
  names: ["back"],
  description: "Go back in history",
  arguments: [{role: 'object', label: 'steps', nountype: noun_type_number}],
  preview: function(pblock, args) {
    var steps = args.object;
    var template = "Go back ${steps} {if steps == '1'} "
                 + "step {else} steps {/if} in history";
    pblock.innerHTML = CmdUtils.renderTemplate(template, {"steps": steps.text});
  },
  execute: function(args) {
    var steps = args.object;
    var win = CmdUtils.getWindow();
    win.history.go(-Math.abs(parseInt(steps.text)));
  }
});

// goes forward in history
CmdUtils.CreateCommand({
  names: ["forward"],
  description: "Go forward in history",
  arguments: [{role: 'object', label: 'steps', nountype: noun_type_number}],
  preview: function(pblock, args) {
    var steps = args.object;
    var template = "Go forward ${steps} {if steps == '1'} "
                 + "step {else} steps {/if} in history";
    pblock.innerHTML = CmdUtils.renderTemplate(template, {"steps": steps.text});
  },
  execute: function(steps) {
    var steps = args.object;
    var win = CmdUtils.getWindow();
    win.history.go(Math.abs(parseInt(steps.text)));
  }
});

// go to home page
CmdUtils.CreateCommand({
  names: ["home"],
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
  names: ["zoom"],
  arguments: [{role: "object", nountype: noun_type_percentage}],
  icon: "chrome://ubiquity/skin/icons/magnifier.png",
  description: "Zooms the Firefox window in or out.",
  preview: function(pBlock, args) {
    var replacement = "a given percentage";
    if (args.object.text) {
      replacement = args.object.text;
    }
    pBlock.innerHTML = "Zooms the Firefox window to " + replacement
                       + " of its normal size.";
  },
  execute: function(args) {
    if (args.object.data) {
      setFullPageZoom(args.object.data);
    }
    else {
      displayMessage("You must provide a percentage to zoom to.");
    }
  }
});

// -----------------------------------------------------------------
// TAGGING COMMANDS
// -----------------------------------------------------------------

// command to tag the currently loaded URI via the humane prompt
CmdUtils.CreateCommand({
  names: ["tag"],
  homepage: "http://autonome.wordpress.com/",
  author: {name: "Dietrich Ayala", email: "dietrich@mozilla.com"},
  license: "MPL/GPL/LGPL",
  arguments: [{role: 'object', nountype: noun_arb_text}],
  icon: "chrome://mozapps/skin/places/tagContainerIcon.png",
  description: "Adds a tag to describe the current page",
  preview: function(aEl, args) {
    var aTagsString = args.object || {text: ''};
    aEl.innerHTML = ("Describe the current page with tags" +
                     (aTagsString.text.length ? " (" +
                      aTagsString.text + ")" : "."));
  },
  execute: function(args) {
    var aTagsString = args.object || {text: ''};
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
    tags = tags.map(Utils.trim);

    var tagging = Cc["@mozilla.org/browser/tagging-service;1"].
                  getService(Ci.nsITaggingService);
    tagging.tagURI(currentURI, tags);
  }
});

CmdUtils.CreateCommand({
  names: {en:["bookmarklet","bml","js"]},
  description: "Runs a bookmarklet from your favorites.",
  help: "Enter nothing to reload the list.",
  author: {name: "satyr", email: "murky.satyr@gmail.com"},
  license: "MIT",
  icon: "chrome://ubiquity/skin/icons/application_view_list.png",
  arguments: [{role: 'object', label: 'title', nountype: noun_type_bookmarklet}],
  execute: function(args) {
    if (args.object.data) CmdUtils.getWindow().location = args.object.data;
    else {
      noun_type_bookmarklet.load();
      displayMessage({icon: this.icon, title: this.name, text: "Reloaded"});
    }
  },
  preview: function(pbl, args) {
    CmdUtils.log(args);
    pbl.innerHTML = (
      args.object.data
      ? (<pre class={this.name}
         style="white-space:pre-wrap">{decodeURI(args.object.data)}</pre>)
      : this.description + "<p>" + this.help + "</p>");
  }
});
