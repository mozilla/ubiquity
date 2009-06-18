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
  description: "Treats your selection as program source code, guesses its language, and colors it based on syntax.",
  execute: function({object: {text: code}}) {
    if (code) {
      var url = "http://azarask.in/services/syntaxhighlight/color.py";
      var params = {
        code: code,
        style: "native"
      };

      jQuery.post( url, params, function( html ) {
                     html = html.replace( /class="highlight"/,
                     "style='background-color:#222;padding:3px'");
                     CmdUtils.setSelection( html );
                   });
    } else {
      displayMessage("You must select some code to syntax-hilight.");
    }
    },
  preview: "Syntax highlights your code."
});

// -----------------------------------------------------------------
// CONVERSION COMMANDS
// -----------------------------------------------------------------
var noun_conversion_options = new CmdUtils.NounType( "conversion-options",
                                                     ["pdf",
                                                      "html",
                                                      "rich-text"]);

function convert_page_to_pdf() {
  var url = "http://www.htm2pdf.co.uk/?url=";
  url += escape( CmdUtils.getWindowInsecure().location );

  Utils.openUrlInBrowser(url);
  /*jQuery.get( url, function(html){
    //displayMessage( html );
    CmdUtils.getWindowInsecure().console.log( jQuery(html).filter(a) );

  })*/
}

function convert_to_rich_text( html ) {
  if (html) {
    var doc = context.focusedWindow.document;
    if (doc.designMode == "on")
      doc.execCommand("insertHTML", false, html);
    else
      displayMessage("You're not in a rich text editing field.");
  }
}

function convert_to_html( html ) {
  if (html) {
    var doc = context.focusedWindow.document;
    if (doc.designMode == "on") {
      html = html.replace(/&/g, "&amp;");
      html = html.replace(/>/g, "&gt;");
      html = html.replace(/</g, "&lt;");
      doc.execCommand("insertHTML", false, html);
    } else
      displayMessage("You're not in a rich text editing field.");
  }
}

CmdUtils.CreateCommand({
  names:["convert (text to format)"],
  arguments: [{role: "object",
               nountype:noun_arb_text,
               label: "text"},
              {role: "goal",
               nountype:noun_conversion_options,
               label: "format"}],
  icon: "chrome://ubiquity/skin/icons/convert.png",
  description:"Converts a selection to a PDF, to rich text, or to html.",
  preview: function(pBlock, arguments) {
    if (arguments.goal && arguments.goal.text) {
      pBlock.innerHTML = "Converts your selection to " + arguments.goal.text;
    } else {
      pBlock.innerHTML = "Converts a selection to a PDF, to rich text, or to html.";
    }
  },
  execute: function(arguments) {
    if (arguments.goal && arguments.goal.text) {
      switch( arguments.goal.text) {
      case "pdf":
        convert_page_to_pdf();
	break;
      case "html":
	if (arguments.object.html)
          convert_to_html(arguments.object.html);
	else
	  displayMessage("There is nothing to convert!");
	break;
      case "rich-text":
	if (arguments.object.html)
          convert_to_rich_text(arguments.object.html);
	else
	  displayMessage("There is nothing to convert!");
	break;
      }
    } else {
      displayMessage("You must specify what you want to convert to: pdf, html, or rich-text.");
    }
  }
});


// -----------------------------------------------------------------
// MISC COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  names: ["view source", "view page source"],
  description: "Shows you the source-code of the web page you're looking at.",
  icon: "chrome://ubiquity/skin/icons/page_code.png",
  execute: function(args) {
    var url = Application.activeWindow.activeTab.document.location.href;
    Utils.openUrlInBrowser("view-source:" + url);
  }
});

CmdUtils.CreateCommand({
  names: ["escape HTML entities"],
  arguments: {object: noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/html_go.png",
  description: Utils.escapeHtml("Replaces html entities (<, >, &, \" and ')" +
                                " with their escape sequences."),
  preview: function(pb, {object: {html}}) {
    pb.innerHTML = (html
                    ? (<>Replaces your selection with:
                       <pre>{Utils.escapeHtml(html)}</pre></>)
                    : this.description);
  },
  execute: function({object: {html}}) {
    if (html) {
      var esch = Utils.escapeHtml(html);
      CmdUtils.setSelection(esch, {text: esch});
    } else {
      displayMessage("No text selected.");
    }
  }
});

CmdUtils.CreateCommand({
  names: ['run selector-selector'],
  description: ''+ (
    <ul style="list-style-image:none">
    <li>Lets you type a jQuery selector and highlights matched elements.</li>
    <li>Hovering on an element generates a matching selector.</li>
    </ul>),
  help: ''+ [
    [<b>Left-click / Enter</b>,
     'Copy and Quit'],
    [<b>Middle-click / <u>C</u></b>,
     'Copy'],
    [<b>Right-click / Esc / <u>Q</u></b>,
     'Quit'],
    [<b><u>M</u></b>,
     'Move'],
    [<b>PageUp/Dn</b>,
     'Scroll vertically'],
    [<b>shift + PageUp/Dn</b>,
     'Scroll horizontally'],
    ].reduce(function(l, [t, d]) l.appendChild(<><dt>{t}</dt><dd>{d}</dd></>),
             <dl/>),
  authors: [{name: 'cers',  email: 'cers@geeksbynature.dk'},
            {name: 'satyr', email: 'murky.satyr@gmail.com'}],
  license: 'MIT',
  icon: 'http://jquery.com/favicon.ico',
  execute: function ss_execute(){
    const Me = this, Key = "_" + Me._key, Doc = CmdUtils.getDocument();
    if(Doc.getElementById(Key)) return;

    XML.prettyPrinting = XML.ignoreWhitespace = false;
    var $i = jQuery(Doc.body).append(
      <div><style>
      {(Me._css +'').replace(/\$/g, Key)
        .replace(/\s*\}/g, ';}').replace(/;+/g, ' !important;')}
      </style><iframe id={Key} src={'data:text/html;charset=utf8,'+ Me._htm}
      width="0" style="left:0; top:0"/></div>+'')
      .find('#'+ Key).load(load);

    function load(){
      var {contentDocument: IDoc, style: IStyle} = this,
      [ebox] = jQuery('#edit', IDoc).keypress(onkey);

      ebox.style.width = Doc.defaultView.innerWidth * .7;
      this.height = IDoc.height;
      $i.animate({width: IDoc.width}, 333,
                 function focus_delayed(){ Utils.setTimeout(focus) });
      jQuery(Doc).mouseover(hover).click(click);
      jQuery(IDoc).click(onbutton);

      function copy(){ copydisp(ebox.value) }
      function focus(){ ebox.focus() }
      function onbutton({target}){
        switch(target.id){
          case 'quit': quit(); return;
          case 'copy': copy(); break;
          case 'move':
          var props = ['top', 'bottom'], texts = ['\u2193', '\u2191'],
          which = +/^0/.test(IStyle[props[0]]);
          IStyle[props[which ^ 1]] = '';
          IStyle[props[which ^ 0]] = 0;
          target.textContent = texts[which];
        }
        focus();
      }
      function onkey(e){
        switch(e.keyCode){
          case 33: // PageUp
          case 34: // PageDn
          scroll(.8 * (e.keyCode * 2 - 67), e.shiftKey);
          return false;
          case 13: copy(); // Enter
          case 27: quit(); // Escape
          return false;
        }
        var me = this;
        delay(function onkey_delayed(){
          if(me.v !== (me.v = me.value))
            me.style.fontStyle = hilite(me.value) ? '' : 'oblique';
        }, 123);
      }
      function hover({target}){
        if(target === $i[0]) return;
        delay(function hilite_delayed(){
          var path = breadcrumbs(target);
          hilite(path);
          ebox.value = path;
        }, 42);
      }
      function click({button, target}){
        if(button !== 2) copydisp(breadcrumbs(target));
        if(button !== 1) quit();
        return false;
      }
    }
    function scroll(rate, horiz){
      with(Doc.defaultView)
        scrollBy(innerWidth * rate * horiz, innerHeight * rate * !horiz)
    }
    function delay(cb, ms){
      Utils.clearTimeout(delay.tid);
      delay.tid = Utils.setTimeout(cb, ms);
    }
    function breadcrumbs(it){
      var doc = it.ownerDocument, htm = doc.documentElement, sels = [], i = -1;
      do {
        if(it.id){
          sels[++i] = '#'+ it.id;
          break;
        }
        var m = (it.className.replace(Key, '')
                 .match(/[_a-zA-Z\u0080-\uffff][-\w\u0080-\uffff]{0,}/g));
        sels[++i] = m ? '.'+ m.join('.') : it.nodeName.toLowerCase();
      } while((it = it.parentNode) !== htm && it !== doc);
      return sels.reverse().join(' > ');
    }
    function hilite(path) {
      (hilite.cache || jQuery('.'+ Key, Doc)).removeClass(Key);
      try { hilite.cache = jQuery(path, Doc).addClass(Key) }
      catch(_){ return false }
      return true;
    }
    function copydisp(txt){
      if(!txt) return;
      CmdUtils.copyToClipboard(txt);
      displayMessage({icon: Me.icon, title: Me.name, text: txt});
    }
    function quit(){
      jQuery(Doc).unbind();
      $i.parent().remove();
      hilite({});
    }
  },
  _key: String.slice(Math.random(), 2),
  _css: <><![CDATA[
    .$ {outline:2px blue solid}
    #$ {position:fixed; z-index:2147483647; border:none; opacity:0.9}
    ]]></>,
  _htm: <body><style><![CDATA[
    body {display:inline-block; overflow:hidden; margin:0em; background:menu}
    button {font-weight:bolder}
    ]]></style><nobr
    ><input id="edit"></input
    ><button id="copy" title="Copy" accesskey="c"><u>C</u>opy</button
    ><button id="move" title="Move" accesskey="m">&#x2193;</button
    ><button id="quit" title="Quit" accesskey="q">&#xD7;</button
    ></nobr></body>,
});
