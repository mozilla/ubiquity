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
    }
    return true; // assume yes
  },
  _quitWithFlags: function app__quitWithFlags(aFlags, event) {
    if (this._warnOnClose(event)) {
      var appStartup = (Cc["@mozilla.org/toolkit/app-startup;1"]
                        .getService(Ci.nsIAppStartup));
      appStartup.quit(aFlags);
      return true;
    }
    return false;
  },
  quit: function app_quit() {
    return this._quitWithFlags(Ci.nsIAppStartup.eAttemptQuit, "quit");
  },
  restart: function app_restart() {
    return this._quitWithFlags((Ci.nsIAppStartup.eAttemptQuit |
                                Ci.nsIAppStartup.eRestart),
                               "restart");
  },
  close: function app_close() {
    if (this._warnOnClose("close")) {
      (Cc["@mozilla.org/appshell/window-mediator;1"]
       .getService(Ci.nsIWindowMediator)
       .getMostRecentWindow(null)
       .close());
      return true;
    }
    return false;
  }
};

// -----------------------------------------------------------------
// WINDOW COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  names: ["exit firefox"],
  description: "Exits Firefox.",
  execute: function exit_execute() {
    extApplication.quit();
  }
});

CmdUtils.CreateCommand({
  names: ["restart firefox"],
  description: "Restarts Firefox.",
  execute: function restart_execute() {
    extApplication.restart();
  }
});

// TODO: if last window is closed, we should offer to save session
CmdUtils.CreateCommand({
  names: ["close window"],
  description: "Closes current window.",
  execute: function closewin_execute() {
    extApplication.close();
  }
});

CmdUtils.CreateCommand({
  names: ["fullscreen"],
  description: "Toggles fullscreen mode.",
  execute: function fullscreen_execute() {
    CmdUtils.getWindow().fullScreen ^= 1;
  }
});

// -----------------------------------------------------------------
// TAB COMMANDS
// -----------------------------------------------------------------

function tabPreview(msg) {
  const PlaceHolder = "%tab%";
  msg = _(msg + " " + PlaceHolder);
  return function tab_preview(pblock, {object: {html, data: tab}}) {
    pblock.innerHTML = (
      tab
      ? ('<div class="tab">' +
         msg.replace(PlaceHolder, html.bold()) +
         '<p><img src="' +
         Utils.escapeHtml(CmdUtils.getTabSnapshot(tab, {width: 480})) +
         '"/></p></div>')
      : this.description);
  };
}

CmdUtils.CreateCommand({
  name: "switch to tab",
  argument: noun_type_tab,
  icon: "chrome://ubiquity/skin/icons/tab_go.png",
  description: "Switches to the tab whose title or URL matches the input.",
  execute: function swtab_execute({object: {data: tab}}) {
    if (!tab) return;
    Utils.setTimeout(function delayedFocus() {
      var win = tab._window._window;
      win.focus();
      tab.focus();
      win.content.focus();
    });
  },
  preview: tabPreview("Changes to"),
});

CmdUtils.CreateCommand({
  name: "close tab",
  argument: noun_type_tab,
  icon: "chrome://ubiquity/skin/icons/tab_delete.png",
  description: ("Closes the tab whose title or URL matches the input " +
                "or the current tab if no tab matches."),
  execute: function cltab_execute(args) {
    (args.object.data || Application.activeWindow.activeTab).close();
  },
  preview: tabPreview("Closes"),
});

CmdUtils.CreateCommand({
  names: ["close all tabs with"],
  arguments: [{
    role: "object",
    nountype: noun_arb_text,
    label: "related word"}],
  icon: "chrome://ubiquity/skin/icons/tab_delete.png",
  description: "Closes all open tabs that have the given word in common.",
  execute: function clatab_execute({object: {text}}) {
    if (!text) return;
    var tabs = Utils.tabs.search(text);
    for each (var t in tabs) t.close();
    displayMessage(_("${num} tabs closed.", {num: tabs.length}), this);
  },
  preview: function clatab_preview(pblock, {object: {text, html}}) {
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
  _lister: function clatab__lister({document}) "" + (
    <li>{document.title}<br/><code><small>{document.URL}</small></code></li>),
});

CmdUtils.CreateCommand({
  names: ["count tabs"],
  description: "Counts the number of opened tabs. Takes an optional " +
                "filter term to count number of tabs matching filter term.",
  arguments: {object: noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/tab_go.png",
  execute: function cntab_execute(args) {
    displayMessage($(this._count(args)).text(), this);
  },
  preview: function cntab_preview(pblock, args) {
    pblock.innerHTML = this._count(args);
  },
  _count: function cntab__count({object: {text, html}}) {
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
  execute: function reload_execute() {
    CmdUtils.getWindow().location.reload(true);
  }
});

CmdUtils.CreateCommand({
  names: ["bookmark"],
  description: "Adds the current page to bookmarks.",
  execute: function bookmark_execute() {
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
  execute: function print_execute() {
    CmdUtils.getWindow().print();
  }
});

// goes back/forward in history
(function historyCommand(way, sign) {
  var tmpl = _("Go " + way + " ${num} step{if num > 1}s{/if} in history.");
  CmdUtils.CreateCommand({
    names: ["go " + way],
    description: "Goes " + way + " in history.",
    arguments: {object_steps: noun_type_number},
    preview: function go_preview(pblock, args) {
      pblock.innerHTML =
        CmdUtils.renderTemplate(tmpl, {num: args.object.data});
    },
    execute: function go_execute(args) {
      CmdUtils.getWindow().history.go(args.object.data * sign);
    }
  });
  return arguments.callee;
})("back", -1)("forward", 1);

CmdUtils.CreateCommand({
  names: ["go home"],
  description: "Goes to home page.",
  execute: function home_execute() {
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
  preview: function zoom_preview(pBlock, args) {
    pBlock.innerHTML = _(
      "Zooms the Firefox window to ${text} of its normal size.",
      args.object);
  },
  execute: function zoom_execute(args) {
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
  preview: function tag_preview(aEl, args) {
    aEl.innerHTML = _(
      ("Describes the current page with" +
       "{if html} these tags:<p><b>${html}</b></p>{else} tags.{/if}"),
      args.object);
  },
  execute: function tag_execute({object: {text, data}}) {
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
  execute: function bml_execute({object}) {
    if (object.data) CmdUtils.getWindow().location = object.data;
    else {
      noun_type_bookmarklet.load();
      displayMessage("Reloaded", this);
    }
  },
  preview: function bml_preview(pbl, {object: {data}}) {
    pbl.innerHTML = (
      data
      ? (<pre class="bookmarklet" style="white-space:pre-wrap">{data}</pre>)
      : this.previewDefault());
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
  execute: function uct_execute(args) {
    for each(var {id} in this._find(args.object.text)) this._undo(id);
  },
  preview: function uct_preview(pbl, args) {
    var me = this;
    if (!me._SS.getClosedTabCount(context.chromeWindow)) {
      me._puts(pbl, _("No closed tabs."));
      return;
    }
    var tabs = me._find(args.object.text);
    if (!tabs.length) {
      me._puts(pbl, _("No matched tabs."));
      return;
    }
    CmdUtils.previewList(pbl, tabs.map(me._html), function(i, ev) {
      $(ev.target).closest("li").slideUp();
      me._undo(tabs[i].id);
    }, me._css);
  },
  previewDelay: 256,
  _list: null,
  _html: function uct__html({title, image, url}) (
    <><img class="icon" src={image}/> <span class="title">{title}</span>
      <code class="url">{url}</code></>),
  _puts: function uct__puts(pbl, msg) {
    pbl.innerHTML = <i>{msg}</i>.toXMLString() + this.help;
  },
  _find: function uct__find(txt) {
    var list = this._list =
      eval(this._SS.getClosedTabData(context.chromeWindow));
    list.forEach(this._mark);
    if (txt) {
      var re = Utils.regexp(txt, "i");
      list = [t for each (t in list) if (re.test(t.title) || re.test(t.url))];
    }
    return list;
  },
  _mark: function uct__mark(tab, i) {
    tab.id = i;
    tab.url = tab.state.entries[0].url;
  },
  _undo: function uct__undo(id) {
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
  license: "MIT",
  icon: "chrome://browser/skin/livemark-folder.png",
  argument: noun_type_livemark,
  execute: function clm_execute({object: {data}}) {
    if (data) this._open(data.site);
  },
  preview: function clm_preview(pb, {object: {data}}) {
    if (!data) {
      pb.innerHTML = this.description;
      return;
    }
    var dict = {};
    for each (var it in data.items)
      dict[it.uri] = <span><a href={it.uri}>{it.title}</a></span>;
    CmdUtils.previewList(pb, dict, this._open);
  },
  _open: function clm__open(u) { Utils.openUrlInBrowser(u) },
});

CmdUtils.CreateCommand({
  names: ["view extension"],
  description: "Accesses extensions.",
  author: {name: "satyr", email: "murky.satyr@gmail.com"},
  license: "MIT",
  icon: "chrome://mozapps/skin/xpinstall/xpinstallItemGeneric.png",
  argument: noun_type_extension,
  execute: function ve_execute({object: {data}}) {
    Utils.setTimeout(this._open, 7, this, data && data.id);
  },
  preview: function ve_preview(pb, {object: {data}}) {
    if (!data) return void this.previewDefault(pb);

    var xdata = this._extraData(data.id);
    XML.prettyPrinting = XML.ignoreWhitespace = false;
    pb.innerHTML = <div class="extension" enabled={data.enabled}/>.appendChild(
      (<style><![CDATA[
        .extension[enabled=false] {opacity:0.7}
        .icon {float:left; vertical-align:top; border:none; margin-right:1ex}
        .version {margin-left:1ex}
        .creator {font-size: 88%}
        .creator, .description {margin-top:0.5ex}
        button {display:none}
       ]]></style>) +
      <a class="homepage" accesskey="h"/>.appendChild(
        (<img class="icon" src={xdata.iconURL || this.icon}/>) +
        (<strong class="name">{data.name}</strong>)) +
      (<span class="version">{data.version}</span>) +
      ("creator" in xdata ?
       <div class="creator">{xdata.creator}</div> : <></>) +
      ("description" in xdata ?
       <div class="description">{xdata.description}</div> : <></>) +
      <p class="buttons"/>.appendChild(
        (<button id="options"   accesskey="o">-</button>) +
        (<button id="directory" accesskey="d">-</button>)));
    if ("homepageURL" in xdata)
      pb.getElementsByClassName("homepage")[0].href = xdata.homepageURL;
    if (data.enabled && "optionsURL" in xdata) {
      var opt = pb.ownerDocument.getElementById("options");
      opt.innerHTML = _("<u>O</u>ptions");
      opt.addEventListener("focus", function ve_options() {
        this.blur();
        context.chromeWindow.openDialog(xdata.optionsURL, "", "");
      }, false);
      opt.style.display = "inline";
    }
    var file = (Cc["@mozilla.org/file/directory_service;1"]
                .getService(Ci.nsIProperties)
                .get("ProfD", Ci.nsIFile));
    file.append("extensions");
    file.append(data.id);
    if (file.exists() && file.isDirectory()) {
      var dir = pb.ownerDocument.getElementById("directory");
      dir.innerHTML = _("<u>D</u>irectory");
      dir.addEventListener("focus", function ve_dir() {
        this.blur();
        Utils.openUrlInBrowser(Utils.IOService.newFileURI(file).spec);
      }, false);
      dir.style.display = "inline";
    }
  },
  _urn: function ve__urn(id) "urn:mozilla:item:" + id,
  _open: function ve__open(self, id) {
    const Pane = "extensions";
    var em = (Cc["@mozilla.org/appshell/window-mediator;1"]
              .getService(Ci.nsIWindowMediator)
              .getMostRecentWindow("Extension:Manager"));
    if (em) {
      em.focus();
      em.showView(Pane);
      id && self._select(self, em, id);
    }
    else {
      em = context.chromeWindow.openDialog(
        "chrome://mozapps/content/extensions/extensions.xul", "", "", Pane);
      id && Utils.listenOnce(em, "load", function onEmLoad() {
        Utils.setTimeout(self._select, 7, self, em, id);
      });
    }
  },
  _select: function ve__select(self, em, id) {
    em.gExtensionsView.selectItem(em.document.getElementById(self._urn(id)));
  },
  _extraData: function ve__extraData(id) {
    const PREFIX_NS_EM = "http://www.mozilla.org/2004/em-rdf#";
    var rdfs = (Cc["@mozilla.org/rdf/rdf-service;1"]
                .getService(Ci.nsIRDFService));
    var {datasource} = (Cc["@mozilla.org/extensions/manager;1"]
                        .getService(Ci.nsIExtensionManager));
    var itemResource = rdfs.GetResource(this._urn(id));
    var data = {};
    for each (var key in ["creator", "description",
                          "homepageURL", "iconURL", "optionsURL"]) {
      var target = datasource.GetTarget(itemResource,
                                        rdfs.GetResource(PREFIX_NS_EM + key),
                                        true);
      if (target instanceof Ci.nsIRDFLiteral) data[key] = target.Value;
    }
    return data;
  },
});
