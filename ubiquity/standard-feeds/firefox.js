// -----------------------------------------------------------------
// HELPER OBJECT FOR CLOSING WINDOWS
// -----------------------------------------------------------------

XML.prettyPrinting = XML.ignoreWhitespace = false;

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

CmdUtils.CreateCommand({
  names: ["exit-firefox"],
  description: "Exits Firefox.",
  execute: function() {
    extApplication.quit();
  }
});

CmdUtils.CreateCommand({
  names: ["restart-firefox"],
  description: "Restarts Firefox.",
  execute: function() {
    extApplication.restart();
  }
});

// TODO: if last window is closed, we should offer to save session
CmdUtils.CreateCommand({
  names: ["close-window"],
  description: "Closes current window.",
  execute: function() {
    extApplication.close();
  }
});

CmdUtils.CreateCommand({
  names: ["fullscreen"],
  description: "Toggles fullscreen mode.",
  execute: function() {
    CmdUtils.getWindow().fullScreen ^= 1;
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
  arguments: {"object related word": noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/tab_delete.png",
  description: "Closes all open tabs that have the given word in common.",
  execute: function({object: {text}}) {
    var tabs = Utils.tabs.search(text);
    for each (let t in tabs) t.close();
    displayMessage({
      icon: this.icon,
      title: this.name,
      text: tabs.length + " tabs closed"});
  },
  preview: function(pblock, args) {
    var {text} = args.object;
    if (!text) {
      pblock.innerHTML = this.description;
      return;
    }
    var tabs = Utils.tabs.search(text);
    pblock.innerHTML =
      <div class={this.names[0]}/>.appendChild(
        tabs.length
        ? (<>Closes tabs related to
           <b>{text}</b>:</> + tabs.reduce(this._lister, <ul/>))
        : <>No tabs are related to <b>{text}</b>.</>);
  },
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


CmdUtils.CreateCommand({
  names: ["refresh", "reload"],
  description: "Refreshes the current page.",
  execute: function() {
    var win = CmdUtils.getWindow();
    win.location.reload(true);
  }
});

CmdUtils.CreateCommand({
  names: ["bookmark"],
  description: "Adds the current page to bookmarks.",
  execute: function() {
    var {title, URL} = CmdUtils.getDocument();
    try {
      Application.bookmarks.unfiled.addBookmark(title, Utils.url(URL));
    } catch (e) {
      displayMessage({
        text: "Page could not be bookmarked!",
        exception: e,
      });
    }
  }
});

CmdUtils.CreateCommand({
  names: ["print"],
  description: "Prints the current page.",
  execute: function() {
    var win = CmdUtils.getWindow();
    win.print();
  }
});

// goes back/forward in history
(function historyCommand(way, sign) {
  CmdUtils.CreateCommand({
    names: ["go-" + way],
    description: "Goes " + way + " in history.",
    arguments: [{role: "object", label: "steps", nountype: noun_type_number}],
    preview: function(pblock, args) {
      var num = args.object.data;
      pblock.innerHTML =
        <>Go {way} <b>{num}</b> step{num > 1 ? "s" : ""} in history.</>;
    },
    execute: function(args) {
      CmdUtils.getWindow().history.go(args.object.data * sign | 0);
    }
  });
  return arguments.callee;
})("back", -1)("forward", 1);

CmdUtils.CreateCommand({
  names: ["go-home"],
  description: "Goes to home page.",
  execute: function() {
    CmdUtils.getWindow().home();
  }
});

// -----------------------------------------------------------------
// ZOOM RELATED
// -----------------------------------------------------------------


function setFullPageZoom(level) {
  var navigator1 = context.chromeWindow.
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
    var replacement = args.object.text || "a given percentage";
    pBlock.innerHTML = CmdUtils.renderTemplate(_("Zooms the Firefox window to ${replacement} of its normal size."),{replacement: replacement});
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
  description: "Adds a tag to describe the current page.",
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
  names: "bookmarklet | bml | js",
  description: "Runs a bookmarklet from your favorites.",
  help: "Enter nothing to reload the list.",
  author: {name: "satyr", email: "murky.satyr@gmail.com"},
  license: "MIT",
  icon: "chrome://ubiquity/skin/icons/application_view_list.png",
  arguments: {object_title: noun_type_bookmarklet},
  execute: function({object}) {
    if (object.data) CmdUtils.getWindow().location = object.data;
    else {
      noun_type_bookmarklet.load();
      displayMessage({icon: this.icon, title: this.name, text: "Reloaded"});
    }
  },
  preview: function(pbl, {object}) {
    pbl.innerHTML = (
      object.data
      ? (<pre class={this.name}
         style="white-space:pre-wrap">{decodeURI(object.data)}</pre>)
      : this.description + "<p>" + this.help + "</p>");
  }
});

const UCT = "undo-closed-tabs";
CmdUtils.CreateCommand({
  names: [UCT, "uct"],
  description: "Reopens tabs you've closed recently.",
  help: "" + (
    <ul style="list-style-image:none">
    <li>Use accesskey or click to undo.</li>
    <li>Type to filter, then execute to undo all.</li>
    </ul>),
  author: {name: "satyr", email: "murky.satyr@gmail.com"},
  contributor: {name: "powchin", homepage: "http://friendfeed.com/powchin"},
  license: "MIT",
  icon: "chrome://ubiquity/skin/icons/arrow_undo.png",
  arguments: {"object title or URL": noun_arb_text},
  execute: function(args) {
    for each(var {id} in this._find(args.object.text)) this._undo(id);
  },
  preview: function(pbl, args) {
    var me = this;
    if (!me._SS.getClosedTabCount(context.chromeWindow)) {
      me._puts(pbl, "No closed tabs.");
      return;
    }
    var tabs = me._find(args.object.text);
    if (!tabs[0]) {
      me._puts(pbl, "No matched tabs.");
      return;
    }
    CmdUtils.previewList(pbl, tabs.map(me._html), function(i, ev) {
      $(ev.target).closest("li").remove();
      me._undo(tabs[i].id);
    }, me._css);
  },
  previewDelay: 256,
  _list: null,
  _html: function({title, image, url})(
    <> <img class="icon" src={image}/> <span class="title">{title}</span>
       <code class="url">{url}</code></>),
  _puts: function(pbl, msg) {
    pbl.innerHTML = <i>{msg}</i>.toXMLString() + this.help;
  },
  _find: function(txt) {
    var list = this._list =
      eval(this._SS.getClosedTabData(context.chromeWindow));
    list.forEach(this._mark);
    if (txt) {
      try { var re = RegExp(txt, "i") }
      catch(e){ re = RegExp(txt.replace(/\W/g, "\\$&"), "i") }
      list = list.filter(function(t) re.test(t.title) || re.test(t.url));
    }
    return list;
  },
  _mark: function(tab, i) {
    tab.id = i;
    tab.url = tab.state.entries[0].url;
  },
  _undo: function(id) {
    this._list.every(function(tab, i, list) {
      if (id !== tab.id) return true;
      this._SS.undoCloseTab(context.chromeWindow, i);
      list.splice(i, 1);
      return false;
    }, this);
  },
  _css: <><![CDATA[
    li {white-space: nowrap}
    .icon {width: 16px; height: 16px; vertical-align: middle}
    .url {font-size: smaller}
    ]]></>,
  _SS: (Cc["@mozilla.org/browser/sessionstore;1"]
        .getService(Ci.nsISessionStore)),
});

CmdUtils.CreateCommand({
  name: "check-livemark",
  description: "Checks your livemarks.",
  help: "Execute to open the site.",
  author: {name: "satyr", email: "murky.satyr@gmail.com"},
  icon: "chrome://browser/skin/livemark-folder.png",
  argument: noun_type_livemark,
  execute: function({object: {data}}) {
    if (data) this._open(data.site);
  },
  preview: function(pb, {object: {data}}) {
    if (!data) {
      pb.innerHTML = this.description;
      return;
    }
    var dict = {};
    for each (var it in data.items)
      dict[it.uri] = <span> <a href={it.uri}>{it.title}</a> </span>;
    CmdUtils.previewList(pb, dict, this._open);
  },
  _open: function(u) { Utils.openUrlInBrowser(u) },
});
