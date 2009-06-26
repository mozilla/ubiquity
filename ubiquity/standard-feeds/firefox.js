// -----------------------------------------------------------------
// HELPER OBJECT FOR CLOSING WINDOWS
// -----------------------------------------------------------------

Cu.import("resource://gre/modules/utils.js");

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
  names: ["exit firefox"],
  description: "Exits Firefox.",
  execute: function() {
    extApplication.quit();
  }
});

CmdUtils.CreateCommand({
  names: ["restart firefox"],
  description: "Restarts Firefox.",
  execute: function() {
    extApplication.restart();
  }
});

// TODO: if last window is closed, we should offer to save session
CmdUtils.CreateCommand({
  names: ["close window"],
  description: "Closes current window.",
  execute: function() {
    extApplication.close();
  }
});

// TODO this should maybe become a 'toggle' command, i.e. the verb is
// 'turn on' or 'turn off'.
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
    msg = _(msg); // "Changes to" / "Closes"
    pblock.innerHTML = (
      tab
      ? <div class="tab">
          {msg} <b>{text}</b>
          <p><img src={CmdUtils.getTabSnapshot(tab, {width: 480})}/></p>
        </div>
      : this.description);
  });

CmdUtils.CreateCommand({
  name: "switch to tab",
  argument: noun_type_tab,
  icon: "chrome://ubiquity/skin/icons/tab_go.png",
  description: "Switches to the tab whose title or URL matches the input.",
  execute: function({object: {data: tab}}) {
    if (!tab) return;
    // TODO: window.focus() is missing on 1.9.2pre
    var win = tab._window;
    if (win && win.focus) win.focus();
    tab.focus();
    // Focus on tab content
    if (win && win.content) win.content.focus();
  },
  preview: tabPreview("Changes to"),
});

CmdUtils.CreateCommand({
  name: "close tab",
  argument: noun_type_tab,
  icon: "chrome://ubiquity/skin/icons/tab_delete.png",
  description: ("Closes the tab whose title or URL matches the input " +
                "or the current tab if no tab matches."),
  execute: function(args) {
    (args.object.data || Application.activeWindow.activeTab).close();
  },
  preview: tabPreview("Closes"),
});

CmdUtils.CreateCommand({
  names: ["close all tabs with"],
  arguments: {"object related word": noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/tab_delete.png",
  description: "Closes all open tabs that have the given word in common.",
  execute: function({object: {text}}) {
    if (!text) return;
    var tabs = Utils.tabs.search(text);
    for each (var t in tabs) t.close();
    displayMessage(_("${num} tabs closed.", {num: tabs.length}), this);
  },
  preview: function(pblock, {object: {text, html}}) {
    if (!text) {
      pblock.innerHTML = this.description;
      return;
    }
    pblock.innerHTML = _(
      <><![CDATA[
        <div class="close-all-tabs">
        {if tabs.length}
          Closes tabs related to <b>${html}</b> :
          <ul>{for tab in tabs}${tab|asList}{/for}</ul>
        {else}
          No tabs are related to <b>${html}</b>.
        {/if}
        </div>
        ]]></> + "",
      { tabs: Utils.tabs.search(text),
        html: html,
        _MODIFIERS: {asList: this._lister} });
  },
  _lister: function({document}) "" + (
    <li>{document.title}<br/><code><small>{document.URL}</small></code></li>),
});

CmdUtils.CreateCommand({
  names: ["count tabs"],
  description: "Counts the number of opened tabs. Takes an optional " +
                "filter term to count number of tabs matching filter term.",
  arguments: {object: noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/tab_go.png",
  execute: function(args) {
    displayMessage($(this._count(args)).text(), this);
  },
  preview: function(pblock, args) {
    pblock.innerHTML = this._count(args);
  },
  _count: function({object: {text, html}}) {
    var count = (text ? Utils.tabs.search(text) : Utils.tabs.get()).length;
    return _('<div class="count-tabs"><b>${count}</b> ' +
             'tab{if count > 1}s{/if} ' +
             '{if html}matching <b>${html}</b>{else}total{/if}.</div>',
             {count: count, html: html});
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
        text: _("Page could not be bookmarked!"),
        exception: e,
      }, this);
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
    names: ["go " + way],
    description: "Goes " + way + " in history.",
    arguments: {object_steps: noun_type_number},
    preview: function(pblock, args) {
      pblock.innerHTML = _(
        "Go " + way + " ${num} step{if num > 1}s{/if} in history.",
        {num: args.object.data});
    },
    execute: function(args) {
      CmdUtils.getWindow().history.go(args.object.data * sign);
    }
  });
  return arguments.callee;
})("back", -1)("forward", 1);

CmdUtils.CreateCommand({
  names: ["go home"],
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
  argument: noun_type_percentage,
  icon: "chrome://ubiquity/skin/icons/magnifier.png",
  description: "Zooms the Firefox window in or out.",
  preview: function(pBlock, args) {
    pBlock.innerHTML = _(
      "Zooms the Firefox window to ${text} of its normal size.",
      args.object);
  },
  execute: function(args) {
    setFullPageZoom(args.object.data);
  }
});

// -----------------------------------------------------------------
// TAGGING COMMANDS
// -----------------------------------------------------------------

// command to tag the currently loaded URI via the humane prompt
CmdUtils.CreateCommand({
  names: ["tag"],
  description: "Adds tags to describe the current page.",
  help: "If the page is currently bookmarked, adds a tag or tags " +
        "(separated by spaces) to the current bookmark.  If the page " +
        "is not bookmarked, adds a bookmark to 'Unsorted bookmarks' and " +
        "also adds the tag or tags to that bookmark.",
  author: {
    name: "Dietrich Ayala",
    email: "dietrich@mozilla.com",
    homepage: "http://autonome.wordpress.com/"},
  license: "MPL/GPL/LGPL",
  icon: "chrome://mozapps/skin/places/tagContainerIcon.png",
  argument: noun_type_tag,
  preview: function(aEl, args) {
    aEl.innerHTML = _(
      ("Describes the current page with" +
       "{if html} these tags:<p><b>${html}</b></p>{else} tags.{/if}"),
      args.object);
  },
  execute: function({object: {text, data}}) {
    var doc = CmdUtils.getDocument();
    var {tagging, bookmarks} = PlacesUtils;
    var currentURI = Utils.url(doc.URL);

    if (!bookmarks.isBookmarked(currentURI)) {
      // create unfiled bookmark
      bookmarks.insertBookmark(bookmarks.unfiledBookmarksFolder, currentURI,
                               bookmarks.DEFAULT_INDEX, doc.title);
    }
    tagging.tagURI(currentURI, data);
  }
});

CmdUtils.CreateCommand({
  names: ["run bookmarklet", "bml"],
  description: "Runs a bookmarklet from your favorites.",
  help: "Enter nothing to reload the list.",
  author: {name: "satyr", email: "murky.satyr@gmail.com"},
  license: "MIT",
  icon: "chrome://ubiquity/skin/icons/application_view_list.png",
  argument: noun_type_bookmarklet,
  execute: function({object}) {
    if (object.data) CmdUtils.getWindow().location = object.data;
    else {
      noun_type_bookmarklet.load();
      displayMessage("Reloaded", this);
    }
  },
  preview: function(pbl, {object: {data}}) {
    pbl.innerHTML = (
      data
      ? (<pre class="bookmarklet" style="white-space:pre-wrap">{data}</pre>)
      : this.description + "<p>" + this.help + "</p>");
  }
});

CmdUtils.CreateCommand({
  names: ["undo closed tabs", "uct"],
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
      me._puts(pbl, _("No closed tabs."));
      return;
    }
    var tabs = me._find(args.object.text);
    if (!tabs[0]) {
      me._puts(pbl, _("No matched tabs."));
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
  names: ["check livemark"],
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
