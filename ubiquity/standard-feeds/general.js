// -----------------------------------------------------------------
// TEXT COMMANDS
// -----------------------------------------------------------------

/* Note that these text formatting commands are a little weird in that
 * they operate on a selection, but they don't take the selection as
 * an argument.  This is as intended, because if there is no text
 * selection, there is nothing for any of these commands to do.
 */
(function textFormattingCommand(format, desc, icon, name) {
  CmdUtils.CreateCommand({
    names: [name || format],
    description:
    "If you're in a rich-text-edit area, " + desc + ".",
    icon: "chrome://ubiquity/skin/icons/" + icon + ".png",
    execute: function () {
      var doc = context.focusedWindow.document;
      if (doc.designMode === "on")
        doc.execCommand(format, false, null);
      else
        displayMessage(_("You're not in a rich text editing field."), this);
    }
  });
  return arguments.callee;
})
("bold", "makes the selected text bold", "text_bold")
("italic", "makes the selected text italic", "text_italic", "italicize")
("underline", "underlines the selected text", "text_underline")
("undo", "undoes your latest style/formatting or page-editing changes",
 "arrow_undo", "undo text edit")
("redo", "redoes your latest style/formatting or page-editing changes",
 "arrow_redo", "redo text edit")
;

CmdUtils.CreateCommand({
  names: ["highlight", "hilite"],
  description: (
    'Highlights your current selection, ' +
    'like <span style="background: yellow; color: black;">this</span>.'),
  icon: "chrome://ubiquity/skin/icons/textfield_rename.png",
  execute: function () {
    var win = context.focusedWindow;
    var doc = win.document;
    var sel = win.getSelection();
    for (var i = sel.rangeCount; i--;) {
      var range = sel.getRangeAt(i);
      var newNode = doc.createElement("span");
      var {style} = newNode;
      style.background = "yellow";
      style.color = "black";
      range.surroundContents(newNode);
    }
  }
});

/* TODO should the object text instead be an "in" argument, as in
 * "count words in this" ?
 */
function wordCount(t) (t.match(/\S+/g) || "").length;

CmdUtils.CreateCommand({
  names: ["count words", "word count"],
  arguments: {object: noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/sum.png",
  description: "Displays the number of words in a selection.",
  execute: function ({object: {text}}) {
    displayMessage((text
                    ? _("${num} words", {num: wordCount(text)})
                    : _("No words selected.")),
                   this);
  },
  preview: function (pb, {object: {text}}) {
    pb.innerHTML = (text
                    ? _("<b>${num}</b> words", {num: wordCount(text)})
                    : this.description);
  }
});

Components.utils.import("resource://ubiquity/modules/setup.js");
const defaultLang = UbiquitySetup.languageCode;

/* TODO the dummy argument "wikipedia" could become a plugin argument
 * and this command could become a general purpose "insert link"
 * command.
 */
CmdUtils.CreateCommand({
  names: ["link to wikipedia"],
  arguments: {
    object: noun_arb_text,
    format: noun_type_lang_wikipedia,
  },
  description:
  "Turns a phrase into a link to the matching Wikipedia article.",
  icon: "chrome://ubiquity/skin/icons/wikipedia.ico",
  _link: function({object: {text, html}, format: {data}}){
    var url = ("http://" + (data || defaultLang) +
               ".wikipedia.org/wiki/Special%3ASearch/" +
               encodeURIComponent(text.replace(/ /g, "_")));
    return ['<a href="' + Utils.escapeHtml(url) + '">' + html + "</a>", url];
  },
  execute: function (args) {
    var [htm, url] = this._link(args);
    CmdUtils.setSelection(htm, {text: url});
  },
  preview: function (pbl, args) {
    var [htm, url] = this._link(args);
    pbl.innerHTML = (this.description +
                     "<p>" + htm + "</p>" +
                     <code>{url}</code>.toXMLString());
  }
});

// -----------------------------------------------------------------
// CALCULATE COMMANDS
// -----------------------------------------------------------------

//+ Carlos R. L. Rodrigues
//@ http://jsfromhell.com/classes/math-parser [rev. #2]
function MathParser(){
  var o = this, p = o.operator = {};
  p["+"] = function(n, m){return n + m;};
  p["-"] = function(n, m){return n - m;};
  p["*"] = function(n, m){return n * m;};
  p["/"] = function(m, n){return n / m;};
  p["%"] = function(m, n){return n % m;};
  p["^"] = function(m, n){return Math.pow(n, m);};
  p["~"] = function(m, n){return Math.sqrt(n, m);};
  o.custom = {}, p.f = function(s, n){
    if(Math[s]) return Math[s](n);
    else if(o.custom[s]) return o.custom[s].apply(o, n);
    else throw new Error("Function \"" + s + "\" not defined.");
  }, o.add = function(n, f){this.custom[n] = f;}
};
MathParser.prototype.eval = function(e){
  var e = e.split(""), v = [], p = [], a, c = 0, s = 0, x, t, d = 0;
  var n = "0123456789.", o = "+-*/^%~", f = this.operator;
  for(var i = 0, l = e.length; i < l; i++)
    if(o.indexOf(e[i]) > -1)
      e[i] == "-" && (s > 1 || !d) && ++s, !s && d && (p.push(e[i]), s = 2), "+-".indexOf(e[i]) < (d = 0) && (c = 1);
    else if(a = n.indexOf(e[i]) + 1 ? e[i++] : ""){
      while(n.indexOf(e[i]) + 1) a += e[i++];
      v.push(d = (s & 1 ? -1 : 1) * a), c && v.push(f[p.pop()](v.pop(), v.pop())) && (c = 0), --i, s = 0;
    }
  for(c = v[0], i = 0, l = p.length; l--; c = f[p[i]](c, v[++i]));
  return c;
};
MathParser.prototype.parse = function(e){
  var p = [], f = [], ag, n, c, a, o = this, v = "0123456789.+-*/^%~(, )";
  for(var x, i = 0, l = e.length; i < l; i++){
    if(v.indexOf(c = e.charAt(i)) < 0){
      for(a = c; v.indexOf(c = e.charAt(++i)) < 0; a += c); f.push((--i, a));
    }
    else if(!(c == "(" && p.push(i)) && c == ")"){
      if(a = e.slice(0, (n = p.pop()) - (x = v.indexOf(e.charAt(n - 1)) < 0 ? y = (c = f.pop()).length : 0)), x)
        for(var j = (ag = e.slice(n, ++i).split(",")).length; j--; ag[j] = o.eval(ag[j]));
      l = (e = a + (x ? o.operator.f(c, ag) : o.eval(e.slice(n, ++i))) + e.slice(i)).length, i -= i - n + c.length;
    }
  }
  return o.eval(e);
};

const GCalcHelp = "http://www.googleguide.com/help/calculator.html";
const noun_calc = {
  name: "calc",
  label: "expression",
  rankLast: true,
  noExternalCalls: true,
  suggest: function n_calc_suggest(text, html, cb, selIndices) {
    var simple = this._simple.test(text);
    return [CmdUtils.makeSugg(text, "", simple, simple ? 1 : .5, selIndices)];
  },
  _simple: /^[\d.+\-*\/^%~(, )]+$/,
};

CmdUtils.CreateCommand({
  names: ["calculate", "gcalculate"],
  argument: noun_calc,
  description: "" + (
    <>Calculates using <a href={GCalcHelp}>Google Calculator</a>
    which has all the features of a scientific calculator,
    knows constants such as the speed of light,
    and can convert between units and currencies.<br/>
    Uses <a href="http://jsfromhell.com/classes/math-parser">MathParser</a>
    instead for simple expressions like <code>22/7</code>.</>),
  help: ("Try <code>22/7, 25% of 700, sin(sqrt(ln(pi))), (1+i)^3, " +
         "15 mod 9, (5 choose 2) / 3!, speed of light in miles per hour, " +
         "3 dollars in euros, 242 in hex, MCMXVI in decimal</code>."),
  icon: "chrome://ubiquity/skin/icons/calculator.png",
  author: {name: "Axel Boldt", email: "axelboldt@yahoo.com"},
  contributor: {name: "satyr", email: "murky.satyr@gmail.com"},
  homepage: "http://math-www.uni-paderborn.de/~axel/",
  license: "Public domain",
  _math_parser: new MathParser,
  // URL of Google page to which expression is to be appended.
  // We want only 1 result.
  _google_url: function (q) ("http://www.google.com/search?hl=en&num=1&q=" +
                             encodeURIComponent(q)),
  _calc: function ({text: exp, data: simple}, cb, pb) {
    if (simple) {
      try { var result = this._math_parser.parse(exp) } catch (e) {}
      if (result != null) {
        cb(result);
        return;
      }
    }
    var url = this._google_url(exp), fn = function gcalc(result_page) {
      cb((/\/calc_img\.gif.*?<b>(.*?)<\/b>/i(result_page) || ",?")[1]);
    };
    pb ? CmdUtils.previewGet(pb, url, fn) : $.get(url, fn);
  },
  execute: function ({object}) {
    this._calc(object, function (result) {
      CmdUtils.setSelection(result);
    });
  },
  preview: function (pb, {object}) {
    if (!object.text) {
      this.previewDefault(pb);
      return;
    }
    this._calc(object, function (result) {
      pb.innerHTML = (
        '<div class="calculate">' +
        '<b style="font-size:larger">' + result + '</b>' +
        (typeof result === "string"
         ? '<p><a href="' + GCalcHelp + '">Quick Reference</a></p>'
         : "") +
        '</div>');
    }, pb);
  }
});

// -----------------------------------------------------------------
// TRANSLATE COMMANDS
// -----------------------------------------------------------------

const GTRANSLATE_LIMIT = 5120;

function googleTranslate(html, langCodePair, callback, pblock) {
  var self = this;
  var options = {
    type: "POST",
    url: "http://ajax.googleapis.com/ajax/services/language/translate",
    data: {
      v: "1.0",
      q: html,
      langpair: (langCodePair.from || "") + "|" + (langCodePair.to || ""),
      format: "html",
    },
    dataType: "json",
    success: function onTranslateSuccess(data) {
      switch (data.responseStatus) {
        case 200: callback(data.responseData); return;
        case 400: {
          displayMessage(data.responseDetails, self);
          if (langCodePair.from === "en") return;
          langCodePair.from = "en";
          googleTranslate.call(self, html, langCodePair, callback, pblock);
          return;
        }
        default: displayMessage(data.responseDetails, self);
      }
    },
    error: function onTranslateError(xhr) {
      Utils.reportInfo("google translate: " +
                       xhr.status + " " + xhr.statusText);
    },
  };
  pblock ? CmdUtils.previewAjax(pblock, options) : jQuery.ajax(options);
}

CmdUtils.CreateCommand({
  DEFAULT_LANG_PREF: "extensions.ubiquity.default_translation_lang",
  names: ["translate"],
  arguments: [
    {role: "object", nountype: noun_arb_text, label: "text"},
    {role: "source", nountype: noun_type_lang_google},
    {role: "goal", nountype: noun_type_lang_google}],
  description: "Translates from one language to another.",
  icon: "chrome://ubiquity/skin/icons/google.ico",
  help: "" + (
    <>You can specify the language to translate to,
    and the language to translate from.
    For example, try issuing "translate mother from english to chinese".
    If you leave out the languages, it will try to guess what you want.
    It works on selected text in any web page,
    but there&#39;s a limit (a couple of paragraphs)
    to how much it can translate a selection at once.
    If you want to translate a lot of text, leave out the input and
    it will translate the whole page.</>),
  execute: function translate_execute({object: {html}, goal, source}) {
    var sl = source.data || "";
    var tl = goal.data || this._getDefaultLang();
    if (html && html.length <= GTRANSLATE_LIMIT)
      googleTranslate.call(
        this,
        html,
        {from: sl, to: tl},
        function translate_execute_onTranslate({translatedText}) {
          CmdUtils.setSelection(translatedText);
        });
    else
      Utils.openUrlInBrowser(
        "http://translate.google.com/translate" +
        Utils.paramsToString({
          u: CmdUtils.getWindow().location.href,
          sl: sl,
          tl: tl,
        }));
  },
  preview: function translate_preview(pblock, {object: {html}, goal, source}) {
    var defaultLang = this._getDefaultLang();
    var toLang = goal.text || noun_type_lang_google.getLangName(defaultLang);
    var toLangCode = goal.data || defaultLang;
    var fromLangCode = source.data || "";
    var limitExceeded = html.length > GTRANSLATE_LIMIT;
    if (!html || limitExceeded) {
      var ehref = Utils.escapeHtml(CmdUtils.getWindow().location);
      pblock.innerHTML = (
        _("Translates ${url} into <b>${toLang}</b>.",
          {url: ehref.link(ehref), toLang: toLang}) +
        (limitExceeded
         ? ('<p class="error">' +
            _("The text you selected exceeds the API limit.") +
            "</p>")
         : ""));
      return;
    }
    var phtml = pblock.innerHTML =  _(
      "Replaces the selected text with the <b>${toLang}</b> translation:",
      {toLang: toLang});
    googleTranslate.call(
      this,
      html,
      {from: fromLangCode, to: toLangCode},
      function translate_preview_onTranslate(
        {translatedText, detectedSourceLanguage: dsl}) {
        pblock.innerHTML = (
          phtml + "<br/><br/>" + translatedText +
          (dsl
           ? ("<p>(" + dsl + " \u2192 " + toLangCode + ")</p>")
           : ""));
      },
      pblock);
  },
  // Returns the default language for translation.  order of defaults:
  // extensions.ubiquity.default_translation_lang > general.useragent.locale > "en"
  // And also, if there unknown language code is found any of these preference,
  // we fall back to English.
  _getDefaultLang: function translate__getDefaultLang() {
    var {prefs} = Application;
    var userLocale = prefs.getValue("general.useragent.locale", "en");
    var defaultLang = prefs.getValue(this.DEFAULT_LANG_PREF, userLocale);
    // If defaultLang is invalid lang code, fall back to english.
    return (noun_type_lang_google.getLangName(defaultLang)
            ? defaultLang
            : "en");
  }
});

// -----------------------------------------------------------------
// COMMANDS THAT CREATE NEW COMMANDS
// -----------------------------------------------------------------

/* TODO: This command should take another optional argument to
 * provides an alternate name for the new command. */

/* TODO combine both of these into a single command with a provider
 * plugin?  i.e. "create command using/with/from bookmarklet",
 * "create command using/with/from search box"
 */
CmdUtils.CreateCommand({
  names: ["create bookmarklet command"],
  arguments: [{role: "source", nountype: noun_type_bookmarklet}],
  description: "Creates a new Ubiquity command from a bookmarklet.",
  help: ("For instance, if you have a bookmarklet called 'press this', " +
         "you can say 'create bookmarklet command from press this'."),
  author: {name: "Abimanyu Raja", email: "abimanyuraja@gmail.com"},
  license: "MPL",
  preview: function(previewBlock, {source: {text, data}}) {
    previewBlock.innerHTML = (
      data
      ? (<>Creates a new command called
         <b>{this._formatName(text)}</b> that runs the following bookmarklet:
         <pre style="white-space:pre-wrap">{decodeURI(data)}</pre></>)
      : this.description);
  },
  execute: function({source}) {
    var name = this._formatName(source.text);
    var url = source.data;

    //build the piece of code that creates the command
    var code =  [
      "// generated by " + this.name,
      "CmdUtils.makeBookmarkletCommand({",
      "  name: " + uneval(name) + ",",
      "  url: " + uneval(url) + ",",
      "});\n\n",
      ].join("\n");

    //prepend the code to Ubiqity's command editor
    CmdUtils.UserCode.prependCode(code);

    tellTheUserWeFinished(name, this);
  },
  _formatName: function(n) n.toLowerCase(),
});

CmdUtils.CreateCommand({
  names: ["create search command"],
  description: ("Creates a new Ubiquity command from a focused search-box " +
                "and lets you set the command name."),
  help: (<ol style="list-style-image:none">
         <li>Select a searchbox.</li>
         <li>Say 'create search command mysearch'.</li>
         <li>Execute.</li>
         <li>You now have a command called 'mysearch'.</li>
         </ol>) + "",
  author:
  {name: "Marcello Herreshoff", homepage: "http://stanford.edu/~marce110/"},
  contributors: ["Abimanyu Raja", "satyr"],
  icon: "chrome://ubiquity/skin/icons/search.png",
  license: "GPL/LGPL/MPL",
  homepage:
  "http://stanford.edu/~marce110/verbs/new-command-from-search-box.html",
  arguments: [{
    role: "object",
    nountype: noun_arb_text,
    label: "command name"}],
  preview: function csc_preview(pblock, {object: {html}}) {
    pblock.innerHTML = (
      html
      ? _("Creates a new search command called <b>${text}</b>", {text: html})
      : this.previewDefault());
  },
  execute: function csc_execute({object: {text: name}}) {
    var node = context.focusedElement || 0;
    var {form} = node;
    if (!node || !form) {
      displayMessage(
        _("You need to focus a searchbox before running this command."));
      return;
    }
    //1. Figure out what this searchbox does.
    const PLACEHOLDER = "{QUERY}";
    var formData = [];
    Array.forEach(form.elements, function(el) {
      if (!el.type) return; // happens with fieldsets
      if (el == node) {
        formData.push(this._encodePair(el.name, "") + PLACEHOLDER);
        return;
      }
      var type = el.type.toLowerCase();
      if (/^(?:text(?:area)?|hidden)$/.test(type) ||
          /^(?:checkbox|radio)$/.test(type) && el.checked)
        formData.push(this._encodePair(el.name, el.value));
      else if (/^select-(?:one|multiple)$/.test(type))
        Array.forEach(el.options, function(o) {
          if (o.selected)
            formData.push(this._encodePair(el.name, o.value));
        }, this);
    }, this);
    var doc = node.ownerDocument;
    var uri = Utils.url({uri: form.getAttribute("action"), base: doc.URL});
    var url = uri.spec;
    var data = formData.join("&");
    var post = form.method.toUpperCase() === "POST";
    if (!post) url += "?" + data;

    //2. Generate the name if not specified.
    if (!name) name = uri.host || doc.title;

    //3. Build the piece of code that creates the command
    var codes = [];
    codes.push(
      '// generated by ' + this.name,
      'CmdUtils.makeSearchCommand({',
      '  name: ' + uneval(name) + ',',
      '  url: ' + uneval(url) + ',');
    post && codes.push(
      '  postData: ' + uneval(data) + ',');
    codes.push(
      '});\n\n');

    //4. Prepend the code to command-editor
    CmdUtils.UserCode.prependCode(codes.join("\n"));

    //5. Tell the user we finished
    tellTheUserWeFinished(name, this);
  },
  _encodePair: function csc__encodePair(key, val)
    encodeURIComponent(key) + "=" + encodeURIComponent(val),
});

const MSG_CREATED = _("You have created the command: [ ${name} ]. " +
                      "You can edit its source-code with the command editor.");

function tellTheUserWeFinished(name, cmd) {
  displayMessage(CmdUtils.renderTemplate(MSG_CREATED, {name: name}),
                 cmd);
}
