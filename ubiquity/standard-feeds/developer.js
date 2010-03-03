// -----------------------------------------------------------------
// DEVELOPER COMMANDS
// -----------------------------------------------------------------

// TODO: Add the ability to manually set the language being highlighted.
// TODO: Add the ability to select the style of code highlighting.
CmdUtils.CreateCommand({
  names: ["highlight syntax", "hilite syntax"],
  arguments: [{role: "object", nountype: noun_arb_text, label: "code"}],
  icon: "chrome://ubiquity/skin/icons/color_wheel.png",
  description: ("Treats your selection as program source code, " +
                "guesses its language, and colors it based on syntax."),
  execute: function slh_execute({object: {text: code}}) {
    if (!code) {
      displayMessage(_("You must select some code to syntax-hilight."));
      return;
    }
    jQuery.post(
      "http://azarask.in/services/syntaxhighlight/color.py",
      {code: code, style: "native"},
      function hls_success(html) {
        CmdUtils.setSelection(
          html.replace(/\bclass="highlight"/,
                       "style='background-color:#222;padding:3px'"));
      });
  },
  preview: "Syntax highlights your code."
});


// -----------------------------------------------------------------
// MISC COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  names: ["view source", "view page source"],
  description: "Shows you the source-code of the specified URL.",
  icon: "chrome://ubiquity/skin/icons/page_code.png",
  argument: noun_type_url,
  execute: function vs_execute(args) {
    Utils.openUrlInBrowser("view-source:" + args.object.text);
  },
  preview: function vs_preview(pb, {object: {html, data}}) {
    pb.innerHTML = (
      this.previewDefault() +
      (!data || !data.title ? "" :
       "<p>" + Utils.escapeHtml(data.title) + "</p>") +
      (html && "<pre>" + html.link(html) + "</pre>"));
  }
});

CmdUtils.CreateCommand({
  name: "view selection source",
  description: "Shows you the source-code of the selected HTML.",
  author: "satyr",
  license: "MIT",
  icon: "chrome://ubiquity/skin/icons/page_code.png",
  execute: function vss_execute() {
    context.chromeWindow.nsContextMenu.prototype
      .viewPartialSource.call(0, "selection");
  },
  preview: function vss_preview(pb) {
    var {window} = CmdUtils, sel = window.getSelection();
    if (sel.isCollapsed) return void this.previewDefault(pb);

    XML.prettyPrinting = true;
    XML.prettyIndent = 2;
    XML.ignoreWhitespace = XML.ignoreComments = false;
    var pretties = [], xs = new window.XMLSerializer;
    var re_ns = / xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"(?=\/?>)/g;
    for (let i = 0, c = sel.rangeCount; i < c; ++i) {
      let xml = xs.serializeToString(sel.getRangeAt(i).cloneContents());
      if (xml) pretties.push(
        XML("<_>" + xml + "</_>").*.toXMLString().replace(re_ns, ""));
    }
    pb.innerHTML = ('<pre id="selection-source">' +
                    pretties.map(Utils.escapeHtml).join("<hr/>"));
  },
});

const REP_WITH = _("Replaces your input with:");
const COPIED = _("Copied: %s");

function copyAndShow(text, self) {
  Utils.clipboard.text = text;
  displayMessage(COPIED.replace("%s", Utils.ellipsify(text, 80)), self);
}

CmdUtils.CreateCommand({
  names: ["escape HTML entities"],
  arguments: {object: noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/html_go.png",
  description: Utils.escapeHtml(
    "Replaces HTML entities (<, >, &, \" and ')" +
    " with their entity references."),
  preview: function ehe_preview(pb, {object: {html}}) {
    if (!html) return void this.previewDefault(pb);
    pb.innerHTML = REP_WITH + <pre>{html}</pre>.toXMLString();
  },
  execute: function ehe_execute({object: {html}}) {
    if (!html) return;
    if (CmdUtils.isSelected)
      CmdUtils.setSelection(Utils.escapeHtml(html), {text: html});
    else copyAndShow(html, this);
  },
});

CmdUtils.CreateCommand({
  names: ["unescape HTML entities"],
  arguments: {object: noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/html_go.png",
  description: Utils.escapeHtml(
    "Replaces HTML character references" +
    " (e.g. &spades;, &#x2665;, &9827;, ...)" +
    " with their corresponding Unicode characters."),
  preview: function uhe_preview(pb, {object: {html}}) {
    if (!html) return void this.previewDefault(pb);
    pb.innerHTML = REP_WITH + "<br/><br/>" + this._unescape(html);
  },
  execute: function uhe_execute({object: {html}}) {
    if (!html) return;
    var uhtml = this._unescape(html);
    var uuhtml = this._unescape(uhtml);
    if (CmdUtils.isSelected)
      CmdUtils.setSelection(uhtml, {text: uuhtml});
    else copyAndShow(uuhtml, this);
  },
  _unescape: function uhe_unescape(text) {
    var div = Utils.hiddenWindow.document.createElement("div");
    return text.replace(/&#?\w+;/g, function uhe_parse(ref) {
      div.innerHTML = ref;
      return div.textContent;
    });
  },
});

var {slice} = Array, gXS = Utils.hiddenWindow.XMLSerializer();
function qsaa(lm, sl) slice(lm.querySelectorAll(sl));
function qstc(lm, sl) (lm = lm.querySelector(sl)) ? lm.textContent : "";
function qsxs(lm, sl) (
  (lm = lm.querySelector(sl)) ? gXS.serializeToString(lm) : "");

const JQAPI = "http://api.jquery.com/";
var jQACmd = CmdUtils.CreateCommand({
  name: "jQuery API",
  description: "Browses " + "jQuery API".link(JQAPI) + ".",
  author: "satyr",
  license: "MIT",
  icon: "chrome://ubiquity/skin/icons/jquery.ico",
  argument: {
    name: JQAPI,
    label: "category/method/selector",
    default: function jqa_default(cb) {
      var me = this;
      function jqa_scs(xml) {
        var {makeSugg} = CmdUtils, list = me._list, cdic = {__proto__: null};
        for each (let c in qsaa(xml, "categories, categories category")) {
          if (c.hasChildNodes()) c.categories = slice(c.children);
          let name = c.getAttribute("name");
          if (name) {
            cdic[name] = c;
            let path = name.toLowerCase().replace(/ /g, "-");
            c.url = JQAPI + "category/" + path + "/";
            c.entries = [];
          }
          else name = "All", c.url = JQAPI;
          list.push(makeSugg(c.text = name, null, c));
        }
        for each (let e in qsaa(xml, "entries > entry")) {
          for each (let ec in qsaa(e, "category")) {
            let name = ec.getAttribute("name");
            if (name in cdic) cdic[name].entries.push(e);
          }
          let name = e.name = e.getAttribute("name");
          let type = e.type = e.getAttribute("type");
          let path = name, text;
          if (type === "selector") {
            path = name.replace(/[A-Z]/g, "-$&").toLowerCase() + "-selector";
            text = qstc(e, "sample");
          }
          else let (arg = e.querySelector("signature > argument"))
            text = name + "(" + (arg ? arg.getAttribute("name") : "") + ")";
          e.url = JQAPI + path + "/";
          e.desc = qsxs(e, "signature + desc");
          e.longdesc = qsxs(e, "longdesc");
          list.push(makeSugg(e.text = text, null, e));
        }
        delete jQACmd.icon;
        [me.default] = list;
        cb && cb();
      }
      function jqa_err(x) {
        Utils.reportInfo(
          "Failed to get <" + this.url + ">.\n" +
          x.status + " " + x.statusText + "\n" + x.responseText);
        Utils.setTimeout(
          function jqa_r() { me.default = me._default },
          1e3 * (1 << ++me._retries));
      }
      $.ajax({
        url: JQAPI + "api/", dataType: "xml",
        success: jqa_scs, error: jqa_err,
      });
      me._default = jqa_default;
      jQACmd.icon = "chrome://global/skin/icons/loading_16.png";
      return me.default = {text: "", summary: "..."};
    },
    suggest: function jqa_suggest(txt, htm, cb, sx) {
      var me = this, suggs = me._grep(txt);
      if (txt) {
        if (typeof this.default === "function")
          this.default(function jqa_async() { cb(me._grep(txt)) });
        suggs.push(CmdUtils.makeSugg(txt, null, null, .1, sx));
      }
      return suggs;
    },
    _grep: function jqa_grep(txt) CmdUtils.grepSuggs(txt, this._list),
    _list: [],
    _retries: 0,
  },
  execute: function jqa_execute({object: {text, data}}) {
    Utils.openUrlInBrowser(
      data ? data.url : JQAPI + encodeURIComponent(text));
  },
  preview: function jqa_preview(pb, {object: {data}}) {
    if (!data) return void this.previewDefault(pb);
    pb.ownerDocument.defaultView.scrollTo(0, 0);
    let nodes = data.categories || data.entries;
    if (nodes) {
      let htmls = [], div = function (s) s && "<div>" + s + "</div>";
      for each (let n in nodes) let (t = n.text.link(n.url).bold())
        htmls.push(
          "categories" in n
          ? t + div([c.text for each (c in n.categories)].join("&nbsp; ")) :
          "entries" in n
          ? t + div(["<code>" + e.text + "</code>"
                     for each (e in n.entries)].join("&nbsp; "))
          : "<code>" + t + "</code> " + div(n.desc));
      if (data.nodeName === "category") htmls.push("<b>..</b>");
      CmdUtils.previewList(pb, htmls, function jqa_browse(i) {
        jQACmd.preview(pb, {object: {data: nodes[i] || data.parentNode}});
      }, "div {text-indent:0em; padding-bottom:0.4ex; font-size:88%}");
      return;
    }
    var ttl, lst = "", sel = data.type === "selector";
    if (sel) ttl = data.name + " selector";
    else {
      ttl = data.text;
      let r = data.getAttribute("return");
      if (r) ttl +=
        " \u226B <em class='type'>" + r.replace(/\w+/g, this._type) + "</em>";
    }
    for each (let sig in qsaa(data, "signature")) {
      let args = [], dds = "";
      for each (let a in qsaa(sig, "argument")) {
        let n = a.getAttribute("name"), o = a.hasAttribute("optional");
        dds += (
          "<dd><var class='argument" + (o ? " optional'>" : "'>") + n +
          "</var> " + gXS.serializeToString(a.firstElementChild) + "</dd>");
        sel || args.push(o ? "[" + n + "]" : n);
      }
      let t = (sel
               ? "$('" + data.text + "')"
               : data.name + "(" + args.join(", ") + ")");
      lst += "<dt><code>" + t + "</code>" + this._added(sig) + "</dt>" + dds;
    }
    pb.innerHTML = (
      "<div id='jquery-api' class='" + data.type +"'>" + this._style +
      "<h1>" + ttl + "</h1><dl>" + lst + "</dl>" +
      (data.longdesc.length > 23 ? data.longdesc : data.desc) + "</div>");
    CmdUtils.absUrl($("a", pb), JQAPI);
  },
  _type: function jqa_type(t) t.link("http://docs.jquery.com/Types#" + t),
  _added: function jqa_added(lm) let(v = qstc(lm, "added")) (
    "<span class='added'>" +
    v.link(JQAPI + "category/version/" + v + "/") + "</span>"),
  _style: "<style>" + <![CDATA[
    h1 {margin:0.3ex 0 0; font-size:116%}
    dl {margin-top:0; padding:0 0.5em}
    dt {margin-top:0.3ex; border-bottom:solid 1px; font-size:108%}
    dd {margin-left:0em}
    dd, longdesc, div > desc, .type, h1 > .added {font-size:92%}
    dt, .argument {font-weight:bold}
    .added {float:right}
    ]]> + "</style>",
});

CmdUtils.CreateCommand({
  names: ["run selector-selector"],
  description: "" + (
    <ul style="list-style-image:none">
    <li>Lets you type a jQuery selector and highlights matched elements.</li>
    <li>Hovering on an element generates a matching selector.</li>
    </ul>),
  help: "" + [
    [<b>Left-click / Enter</b>,
     "Copy and Quit"],
    [<b>Middle-click / <u>C</u></b>,
     "Copy"],
    [<b>Right-click / Esc / <u>Q</u></b>,
     "Quit"],
    [<b><u>M</u></b>,
     "Move"],
    [<b>PageUp/Dn</b>,
     "Scroll vertically"],
    [<b>shift + PageUp/Dn</b>,
     "Scroll horizontally"],
    [<b><u>F</u></b>,
     "Force element names"],
    ].reduce(function (l, [t, d]) l.appendChild(<dt>{t}</dt> + <dd>{d}</dd>),
             <dl/>),
  authors: [{name: "cers",  email: "cers@geeksbynature.dk"},
            {name: "satyr", email: "murky.satyr@gmail.com"}],
  license: "MIT",
  icon: "chrome://ubiquity/skin/icons/jquery.ico",
  execute: function ss_execute() {
    const Me = this, Key = Me._key, Doc = CmdUtils.getDocument();
    if (Doc.getElementById(Key)) return;

    XML.prettyPrinting = XML.ignoreWhitespace = false;
    var $i = $(<iframe id={Key} src={"data:text/html;charset=utf8," + Me._htm}
               width="0" style="left:0; top:0"/>.toXMLString()).load(load);
    ($(Doc.createElement("div"))
     .append($i, $("<style>" + Me._css.replace(/\$/g, Key) + "</style>"))
     .appendTo(Doc.body));

    function load() {
      var {contentDocument: IDoc, style: IStyle} = this;
      var [ebox] = $("#edit", IDoc).keypress(onkey);
      breadcrumbs.lmnn = $("#lmnn", IDoc)[0];

      ebox.style.width = Doc.defaultView.innerWidth * .7;
      this.height = IDoc.height;
      $i.animate({width: IDoc.width}, 333,
                 function focus_delayed() { Utils.setTimeout(focus) });
      $(Doc).mouseover(hover).click(click);
      $(IDoc).click(onbutton);

      function copy() { copydisp(ebox.value) }
      function focus() { ebox.focus() }
      function onbutton({target}) {
        switch (target.id) {
          case "quit": quit(); return;
          case "copy": copy(); break;
          case "move":
          var props = ["top", "bottom"], texts = ["\u2193", "\u2191"];
          var which = +/^0/.test(IStyle[props[0]]);
          IStyle[props[which ^ 1]] = "";
          IStyle[props[which ^ 0]] = 0;
          target.textContent = texts[which];
        }
        focus();
      }
      function onkey(e) {
        switch (e.keyCode) {
          case 33: // PageUp
          case 34: // PageDn
          scroll(.8 * (e.keyCode * 2 - 67), e.shiftKey);
          return false;
          case 13: copy(); // Enter
          case 27: quit(); // Escape
          return false;
        }
        var me = this;
        delay(function onkey_delayed() {
          if (me.v !== (me.v = me.value))
            me.style.fontStyle = hilite(me.value) ? "" : "oblique";
        }, 123);
      }
      function hover({target}) {
        if (target === $i[0]) return;
        delay(function hilite_delayed() {
          var path = breadcrumbs(target);
          hilite(path);
          ebox.value = path;
        }, 42);
      }
      function click({button, target}) {
        if (button !== 2) copydisp(breadcrumbs(target));
        if (button !== 1) quit();
        return false;
      }
      function quit() {
        $(Doc).unbind("mouseover", hover).unbind("click", click);
        $i.parent().remove();
        hilite({});
      }
    }
    function scroll(rate, horiz) {
      with (Doc.defaultView)
        scrollBy(innerWidth * rate * horiz, innerHeight * rate * !horiz)
    }
    function delay(cb, ms) {
      Utils.clearTimeout(delay.tid);
      delay.tid = Utils.setTimeout(cb, ms);
    }
    function breadcrumbs(it) {
      var doc = it.ownerDocument, htm = doc.documentElement, sels = [], i = -1;
      var flmnn = breadcrumbs.lmnn.checked;
      do {
        var lname = it.nodeName.toLowerCase();
        if (it.id) {
          sels[++i] = (flmnn ? lname : "") + "#" + it.id;
          break;
        }
        var m = (it.className.replace(Key, "")
                 .match(/[_a-zA-Z\u0080-\uffff][-\w\u0080-\uffff]{0,}/g));
        sels[++i] = m ? (flmnn ? lname : "") + "." + m.join(".") : lname;
      } while ((it = it.parentNode) !== htm && it !== doc);
      return sels.reverse().join(" > ");
    }
    function hilite(path) {
      (hilite.cache || $("." + Key, Doc)).removeClass(Key);
      try { hilite.cache = $(path, Doc).addClass(Key) }
      catch (_) { return false }
      return true;
    }
    function copydisp(txt) {
      txt && displayMessage(CmdUtils.copyToClipboard(txt), Me);
    }
  },
  _key: "_" + String.slice(Math.random(), 2),
  _css: <><![CDATA[
    .$ {outline:2px blue solid;}
    #$ {position:fixed; z-index:2147483647; border:none; opacity:0.9;}
    ]]></>.toString().replace(/;/g, " !important;"),
  _htm: (
    <body><style><![CDATA[
      body {display:inline-block; overflow:hidden; margin:0; background:menu}
      button {font-weight:bolder}
    ]]></style><nobr
    ><input id="edit"/><input id="lmnn" type="checkbox"
    title="Force element names" accesskey="f"></input
    ><button id="copy" title="Copy" accesskey="c"><u>C</u>opy</button
    ><button id="move" title="Move" accesskey="m">&#x2193;</button
    ><button id="quit" title="Quit" accesskey="q">&#xD7;</button
    ></nobr></body>),
});
