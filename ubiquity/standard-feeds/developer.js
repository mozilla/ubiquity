// -----------------------------------------------------------------
// DEVELOPER COMMANDS
// -----------------------------------------------------------------

// TODO: Add the ability to manually set the language being highlighted.
// TODO: Add the ability to select the style of code highlighting.
CmdUtils.CreateCommand({
  names: ["highlight syntax", "hilite syntax"],
  arguments: [{role: "object",
               nountype: noun_arb_text,
               label: "code"}],
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
  names: ["escape HTML entities"],
  arguments: {object: noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/html_go.png",
  description: Utils.escapeHtml("Replaces html entities (<, >, &, \" and ')" +
                                " with their escape sequences."),
  preview: function ehe_preview(pb, {object: {html}}) {
    pb.innerHTML = (
      html
      ? _("Replaces your selection with:${pre}",
          {pre: <pre>{html}</pre>.toXMLString()})
      : this.previewDefault());
  },
  execute: function ehe_execute({object: {html}}) {
    if (html)
      (CmdUtils.getSelection()
       ? CmdUtils.setSelection(Utils.escapeHtml(html), {text: html})
       : CmdUtils.copyToClipboard(html));
    else
       displayMessage(_("No text selected."));
  }
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
