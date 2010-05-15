// -----------------------------------------------------------------
// HELPER OBJECT FOR CLOSING WINDOWS
// -----------------------------------------------------------------

try { Cu.import("resource://gre/modules/PlacesUtils.jsm") }
catch ([]) { Cu.import("resource://gre/modules/utils.js") }

XML.prettyPrinting = XML.ignoreWhitespace = false;

var extApplication = { // helper method for correct quitting/restarting
  _warnOnClose: function app__warnOnClose(event) {
    var prefs = {
      close:   "browser.tabs.warnOnClose",
      restart: "browser.warnOnRestart",
      quit:    "browser.warnOnQuit"
    };
    if (!(event in prefs) || Utils.prefs.getValue(prefs[event], true)) {
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
  icon: "chrome://global/skin/icons/Close.gif",
  execute: function exit_execute() {
    extApplication.quit();
  }
});

CmdUtils.CreateCommand({
  names: ["restart firefox"],
  description: "Restarts Firefox.",
  icon: "chrome://global/skin/icons/Restore.gif",
  execute: function restart_execute() {
    extApplication.restart();
  }
});

// TODO: if last window is closed, we should offer to save session
CmdUtils.CreateCommand({
  names: ["close window"],
  description: "Closes current window.",
  icon: "chrome://ubiquity/skin/icons/delete.png",
  execute: function closewin_execute() {
    extApplication.close();
  }
});

CmdUtils.CreateCommand({
  names: ["fullscreen"],
  description: "Toggles fullscreen mode.",
  icon: "chrome://global/skin/icons/monitor.png",
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
    if (tab) Utils.setTimeout("_.focus()", 0, tab);
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
    (args.object.data || Utils.currentTab).close();
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
    displayMessage(_("${num} tab(s) closed.", {num: tabs.length}), this);
  },
  preview: function clatab_preview(pblock, {object: {text, html}}) {
    if (!text) {
      this.previewDefault(pblock);
      return;
    }
    pblock.innerHTML = _(
      "" + <><![CDATA[
        <div class="close-all-tabs">
        {if tabs.length}
          Closes tabs related to <b>${html}</b> :
          <ul>{for tab in tabs}${tab|asList}{/for}</ul>
        {else}
          No tabs are related to <b>${html}</b>.
        {/if}
        </div>
        ]]></>,
      { tabs: Utils.tabs.search(text),
        html: html,
        _MODIFIERS: {asList: this._lister} });
  },
  _lister: function clatab__lister({document: d})
    String(<li>{d.title}<br/><code>{d.location.href}</code></li>),
});

CmdUtils.CreateCommand({
  names: ["count tabs"],
  description: ("Counts the number of opened tabs. Takes an optional " +
                "filter term to count number of tabs matching filter term."),
  arguments: {object: noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/tab_go.png",
  execute: function cntab_execute(args) {
    displayMessage($(this._count(args)).text(), this);
  },
  preview: function cntab_preview(pblock, args) {
    pblock.innerHTML = this._count(args);
  },
  _count: function cntab__count({object: {text, html}}) {
    var count = (text ? Utils.tabs.search(text) : Utils.tabs).length;
    return _('<div class="count-tabs"><b>${count}</b> ' +
             'tab{if count > 1}s{/if} ' +
             '{if html}matching <b>${html}</b>{else}total{/if}.</div>',
             {count: count, html: html});
  }
});

CmdUtils.CreateCommand({
  names: ["stop"],
  description: "Stops the current page.",
  execute: function stop_execute() {
    CmdUtils.getWindow().stop();
  }
});

CmdUtils.CreateCommand({
  names: ["refresh", "reload"],
  description: "Refreshes the current page.",
  icon: "chrome://ubiquity/skin/icons/page_refresh.png",
  execute: function reload_execute() {
    CmdUtils.getWindow().location.reload(true);
  }
});

CmdUtils.CreateCommand({
  names: ["bookmark"],
  description: "Adds the current page to bookmarks.",
  icon: "chrome://browser/skin/places/starred48.png",
  execute: function bookmark_execute() {
    const NBS = (Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
                 .getService(Ci.nsINavBookmarksService));
    var {title, uri} = Utils.currentTab;
    try {
      NBS.insertBookmark(
        NBS.unfiledBookmarksFolder, uri, NBS.DEFAULT_INDEX, title);
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
  icon: "chrome://global/skin/icons/Portrait.png",
  execute: function print_execute() {
    CmdUtils.getWindow().print();
  }
});

CmdUtils.CreateCommand({
  names: ["print preview"],
  description: "Shows the print preview of the current page.",
  icon: "chrome://global/skin/icons/Print-preview.png",
  execute: function pprint_execute() {
    context.chromeWindow.document
      .getElementById("cmd_printPreview").doCommand();
  }
});

// goes back/forward in history
(function historyCommand(way, sign) {
  var tmpl = _("Go " + way + " ${num} step{if num > 1}s{/if} in history.");
  CmdUtils.CreateCommand({
    names: ["go " + way],
    description: "Goes " + way + " in history.",
    icon: "chrome://browser/skin/menu-" + way + ".png",
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

CmdUtils.CreateCommand({
  names: ["open error console"],
  description: "Opens Error Console.",
  icon: "chrome://global/skin/icons/error-16.png",
  execute: function errcon_execute() {
    var cwin = context.chromeWindow;
    (cwin.toErrorConsole || cwin.toJavaScriptConsole)(); // Console^2 or normal
  }
});

// -----------------------------------------------------------------
// ZOOM RELATED
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  names: ["zoom"],
  argument: noun_type_percentage,
  icon: "chrome://ubiquity/skin/icons/magnifier.png",
  description: "Zooms the current page in or out.",
  preview: function zoom_preview(pBlock, args) {
    pBlock.innerHTML = _(
      "Zooms the current page to ${text} of its normal size.",
      args.object);
  },
  execute: function zoom_execute(args) {
    var win = context.chromeWindow, ZM = win.ZoomManager;
    ZM.zoom = Math.max(ZM.MIN, Math.min(args.object.data, ZM.MAX));
    win.FullZoom._applySettingToPref();
  },
});

// -----------------------------------------------------------------
// TAGGING COMMANDS
// -----------------------------------------------------------------

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
    var currentURI = doc.documentURIObject;

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
  icon: "moz-icon://.js?size=16",
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
    var ids = [id for each ({id} in this._find(args.object.text))];
    if (ids.length) this._undo(ids);
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
    CmdUtils.previewList(pbl, tabs.map(me._html), function uct__act(i, ev) {
      $(ev.target).closest("li").remove();
      me._undo([tabs[i].id]);
    }, me._css);
  },
  previewDelay: 256,
  _html: function uct__html({title, image, url}) {
    var span = <span>{title} <code class="url">{url}</code></span>;
    if (image) span.prependChild(<><img class="icon" src={image}/> </>);
    return span;
  },
  _puts: function uct__puts(pbl, msg) {
    pbl.innerHTML = "<em>" + Utils.escapeHtml(msg) + "</em>" + this.help;
  },
  _find: function uct__find(txt) {
    var tabs = eval(this._SS.getClosedTabData(context.chromeWindow));
    for each (let tab in tabs)
      [{url: tab.url, ID: tab.id}] = tab.state.entries;
    if (txt) {
      var re = Utils.regexp(txt, "i");
      tabs = [t for each (t in tabs) if (re.test(t.title) || re.test(t.url))];
    }
    return tabs;
  },
  _undo: function uct__undo(ids) {
    var tabs = eval(this._SS.getClosedTabData(context.chromeWindow));
    for each (let id in ids)
      for (let [i, t] in new Iterator(tabs)) {
        if (id !== t.state.entries[0].ID) continue;
        this._SS.undoCloseTab(context.chromeWindow, i);
        tabs.splice(i, 1);
        break;
      }
  },
  _css: "" + <><![CDATA[
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
      this.previewDefault(pb);
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

    var xdata = this._extraData(data.id) || data;
    XML.prettyPrinting = XML.ignoreWhitespace = false;
    var div = <div class="extension"><style><![CDATA[
      .disabled {opacity:0.7}
      .icon {float:left; vertical-align:top; border:none; margin-right:1ex}
      .version {margin-left:1ex}
      .creator {font-size: 88%}
      .creator, .description {margin-top:0.5ex}
      .action:not([accesskey]) {display:none}
       ]]></style></div>;
    if (xdata.disabled) div.@class += " disabled";
    var name = <a class="homepage" accesskey="H"/>.appendChild(
      (<img class="icon" src={xdata.iconURL || this.icon}/>) +
      (<strong class="name">{data.name}</strong>));
    if (xdata.homepageURL) name.@href = xdata.homepageURL;
    div.appendChild(name);
    div.appendChild(<span class="version">{data.version}</span>);
    if (xdata.creator)
      div.appendChild(<div class="creator">{xdata.creator}</div>);
    if (xdata.description)
      div.appendChild(<div class="description">{xdata.description}</div>);
    pb.innerHTML = div.appendChild(
      <p class="buttons"/>.appendChild(
        (<input type="button" class="action" id="options"/>) +
        (<input type="button" class="action" id="directory"/>)));
    if (!xdata.disabled && xdata.optionsURL) {
      var opt = pb.ownerDocument.getElementById("options");
      opt.value = _("Options");
      opt.accessKey = "O";
      opt.addEventListener("click", function ve_options() {
        context.chromeWindow.openDialog(xdata.optionsURL, "", "");
        this.blur();
      }, false);
    }
    var file = Utils.DirectoryService.get("ProfD", Ci.nsIFile);
    file.append("extensions");
    file.append(data.id);
    if (file.exists() && file.isDirectory()) {
      var dir = pb.ownerDocument.getElementById("directory");
      dir.value = _("Directory");
      dir.accessKey = "D";
      dir.addEventListener("click", function ve_dir() {
        Utils.openUrlInBrowser(Utils.IOService.newFileURI(file).spec);
        this.blur();
      }, false);
    }
  },
  _urn: function ve__urn(id) "urn:mozilla:item:" + id,
  _open: function ve__open(self, id) {
    if ("AddonManager" in Utils) {
      Utils.focusUrlInBrowser("about:addons");
      //TODO: how do you select it in the new view?
      return;
    }
    const Pane = "extensions";
    var em = Utils.WindowMediator.getMostRecentWindow("Extension:Manager");
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
    if ("AddonManager" in Utils) return null;

    const {NS_EM} = Utils;
    var rdfs =
      Cc["@mozilla.org/rdf/rdf-service;1"].getService(Ci.nsIRDFService);
    var {datasource} = Utils.ExtensionManager;
    var itemResource = rdfs.GetResource(this._urn(id));
    var data = {
      creator: "", description: "", isDisabled: "",
      homepageURL: "", iconURL: "", optionsURL: "",
    };
    for (let key in data) {
      let target = datasource.GetTarget(
        itemResource, rdfs.GetResource(NS_EM + key), true);
      if (target instanceof Ci.nsIRDFLiteral) data[key] = target.Value;
    }
    data.disabled = data.isDisabled === "true";
    return data;
  },
});
