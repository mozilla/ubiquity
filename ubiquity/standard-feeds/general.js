// -----------------------------------------------------------------
// TEXT COMMANDS
// -----------------------------------------------------------------

function cmd_bold() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("bold", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}
cmd_bold.description = "If you're in a rich-text-edit area, makes the selected text bold.";
cmd_bold.icon = "chrome://ubiquity/skin/icons/text_bold.png";

function cmd_italic() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("italic", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}
cmd_italic.description = "If you're in a rich-text-edit area, makes the selected text italic.";
cmd_italic.icon = "chrome://ubiquity/skin/icons/text_italic.png";

function cmd_underline() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("underline", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}
cmd_underline.description = "If you're in a rich-text-edit area, underlines the selected text.";
cmd_underline.icon = "chrome://ubiquity/skin/icons/text_underline.png";

function cmd_undo() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("undo", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}
cmd_undo.description = "Undoes your latest style/formatting or page-editing changes.";
cmd_undo.icon = "chrome://ubiquity/skin/icons/arrow_undo.png";

function cmd_redo() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("redo", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}
cmd_redo.description = "Redoes your latest style/formatting or page-editing changes.";
cmd_redo.icon = "chrome://ubiquity/skin/icons/arrow_redo.png";


function wordCount(text){
  var words = text.split(" ");
  var wordCount = 0;

  for(var i=0; i<words.length; i++){
    if (words[i].length > 0)
      wordCount++;
  }

  return wordCount;
}

CmdUtils.CreateCommand({
  name: "word-count",
  takes: {text: noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/sum.png",
  description: "Displays the number of words in a selection.",
  execute: function( directObj ) {
    if (directObj.text)
      displayMessage(wordCount(directObj.text) + " words");
    else
      displayMessage("No words selected.");
  },
  preview: function(pBlock, directObj) {
    if (directObj.text)
      pBlock.innerHTML = wordCount(directObj.text) + " words";
    else
      pBlock.innerHTML = "Displays the number of words in a selection.";
  }
});


function cmd_highlight() {
  var sel = context.focusedWindow.getSelection();
  var document = context.focusedWindow.document;

  if (sel.rangeCount >= 1) {
    var range = sel.getRangeAt(0);
    var newNode = document.createElement("span");
    newNode.style.background = "yellow";
    range.surroundContents(newNode);
  }
}
cmd_highlight.description = 'Highlights your current selection, like <span style="background: yellow; color: black;">this</span>.';
cmd_highlight.icon = "chrome://ubiquity/skin/icons/textfield_rename.png";
cmd_highlight.preview = function(pblock) {
  pblock.innerHTML = cmd_highlight.description;
};

CmdUtils.CreateCommand({
  name: "link-to-wikipedia",
  takes: {phrase: noun_arb_text},
  modifiers: {in: noun_type_language},
  description: "Turns a phrase into a link to the matching Wikipedia article.",
  icon: "http://www.wikipedia.org/favicon.ico",
  _link: function({text, html}, {in: {data}}){
    var url = ("http://" + (data || "en") +
               ".wikipedia.org/wiki/Special%3ASearch/" +
               encodeURIComponent(text.replace(/ /g, "_")));
    return ['<a href="' + url + '">' + html + "</a>", url];
  },
  execute: function(dob, mod) {
    var [htm, url] = this._link(dob, mod);
    CmdUtils.setSelection(htm, {text: url});
  },
  preview: function(pbl, dob, mod) {
    var [htm, url] = this._link(dob, mod);
    pbl.innerHTML = (this.description +
                     "<p>" + htm + "</p>" +
                     <code>{url}</code>.toXMLString());
  }
});


// -----------------------------------------------------------------
// CALCULATE COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  name: "calculate",
  names: {
    en: ['calculate'],
    ja: ['計算する','計算しろ','計算して','けいさんする','けいさんしろ','けいさんして']
  },
  arguments: [
    {role: 'object', nountype: /^[\d\.\+\-\*\/\^%~(, )]+$/}
  ],
  takes: {"expression": /^[\d\.\+\-\*\/\^%~(, )]*$/},
  icon: "chrome://ubiquity/skin/icons/calculator.png",
  description: "Calculates the value of a mathematical expression.",
  help: "Try it out: issue &quot;calc 22/7 - 1&quot;.",
  preview: function(previewBlock, arguments) {

    dump('typeof:'+(typeof previewBlock)+'\n');

    var expression = arguments.object.text;

    if(expression.length < 1) {
      previewBlock.innerHTML = "Calculates an expression. E.g., 22/7.";
      return;
    }

    var previewTemplate = "${expression} = <b>${result}</b>" +
      "{if error}<p><b>Error:</b> ${error}</p>{/if}";

    var result = "?";
    var error = null;
    try {
      var parser = new MathParser();

      result = parser.parse(expression);

      if(isNaN(result))
        throw new Error("Invalid expression");
    } catch(e) {
      error = e.message;
      result = "?";
    }
    var previewData = {
      "expression": expression,
      "result": result,
      "error": error
    };
    previewBlock.innerHTML = CmdUtils.renderTemplate(previewTemplate, previewData);
  },

  execute: function( arguments ) {
    var expression = arguments.object.text;

    if(expression.length < 1) {
      displayMessage("Requires a expression.");
      return;
    }

    try {
      var parser = new MathParser();
      var result = parser.parse(expression) + "";

      if(isNaN(result))
        throw new Error("Invalid expression");

      CmdUtils.setSelection(result);
      CmdUtils.setLastResult(result);
    } catch(e) {
      displayMessage("Error calculating expression: " + expression);
    }
  }
});

//+ Carlos R. L. Rodrigues
//@ http://jsfromhell.com/classes/math-parser [rev. #2]
MathParser = function(){
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

CmdUtils.CreateCommand({
    name: "gcalculate",
    takes: {"expression": noun_arb_text},

    description: "Calculate knows many functions, constants, units, currencies, etc.",
    help: "Try 5% of 700,  sin( sqrt( ln(pi))),  (1+i)^3,  15 mod 9, (5 choose 2) / 3!,  speed of light in miles per hour,  3 dollars in euros,  242 in hex, MCMXVI in decimal.",

    icon: "chrome://ubiquity/skin/icons/calculator.png",

    author: { name: "Axel Boldt", email: "axelboldt@yahoo.com"},
    homepage: "http://math-www.uni-paderborn.de/~axel/",
    license: "Public domain",

    // URL of Google page to which expression is to be appended. We want only 1 result.
    _google_url: "http://www.google.com/search?hl=en&num=1&q=",

    // Regular expression that matches a Google result page iff it is a calculator result;
    // first subexpression matches the actual result
    _calc_regexp: /\/calc_img\.gif.*?<b>(.*?)<\/b>/i,

    // Link to calculator command help:
    _calc_help: "Examples: 3^4/sqrt(2)-pi,&nbsp;&nbsp;3 inch in cm,&nbsp;&nbsp; speed of light,&nbsp;&nbsp; 0xAF in decimal<br><u><a href=\"http://www.googleguide.com/calculator.html\">(Command List)</a></u>",

    execute: function( directObj ) {
      var expression = directObj.text;
      var url = this._google_url + encodeURIComponent(expression);
      Utils.openUrlInBrowser( url );
    },

    preview: function( pblock, directObj ) {

      var expression = directObj.text;
      var cmd = this;

      pblock.innerHTML = this._calc_help;

      jQuery.get( this._google_url + encodeURIComponent(expression), {},
         function( result_page ) {
           var matchresult = result_page.match(cmd._calc_regexp);
           if (matchresult) {
              pblock.innerHTML = "<h2>" + matchresult[1] + "</h2>" + cmd._calc_help;
           } else {
              pblock.innerHTML = cmd._calc_help;
           }
       });
      }
  })



// -----------------------------------------------------------------
// SPARKLINE
// -----------------------------------------------------------------

function sparkline(data) {
  var p = data;

  var nw = "auto";
  var nh = "auto";


  var f = 2;
  var w = ( nw == "auto" || nw == 0 ? p.length * f : nw - 0 );
  var h = ( nh == "auto" || nh == 0 ? "1em" : nh );

  var doc = context.focusedWindow.document;
  var co = doc.createElement("canvas");

  co.style.height = h;
  co.style.width = w;
  co.width = w;

  var h = co.offsetHeight;
  h = 10;
  co.height = h;

  var min = 9999;
  var max = -1;

  for ( var i = 0; i < p.length; i++ ) {
    p[i] = p[i] - 0;
    if ( p[i] < min ) min = p[i];
    if ( p[i] > max ) max = p[i];
  }

  if ( co.getContext ) {
    var c = co.getContext("2d");
    c.strokeStyle = "red";
    c.lineWidth = 1.0;
    c.beginPath();

    for ( var i = 0; i < p.length; i++ ) {
      c.lineTo( (w / p.length) * i, h - (((p[i] - min) / (max - min)) * h) );
    }

    c.stroke();
  }

  return co.toDataURL();
}

CmdUtils.CreateCommand({
  name: "sparkline",
  synonyms: ["graph"],
  description: "Graphs the current selection, turning it into a sparkline.",
  takes: {"data": noun_arb_text},
  author: {name: "Aza Raskin", email:"aza@mozilla.com"},
  license: "MIT",
  help: "Select a set of numbers -- in a table or otherwise -- and use this command to graph them as a sparkline. Don't worry about non-numbers getting in there. It'll handle them.",

  _cleanData: function( string ) {
    var dirtyData = string.split(/\W/);
    var data = [];
    for(var i=0; i<dirtyData.length; i++){
      var datum = parseFloat( dirtyData[i] );
      if( datum.toString() != "NaN" ){
        data.push( datum );
      }
    }

    return data;
  },

  _dataToSparkline: function( string ) {
    var data = this._cleanData( string );
    if( data.length < 2 ) return null;

    var dataUrl = sparkline( data );
    return img = "<img src='%'/>".replace(/%/, dataUrl);
  },

  preview: function(pblock, input) {
    var img = this._dataToSparkline( input.text );

    if( !img )
      jQuery(pblock).text( "Requires numbers to graph." );
    else
      jQuery(pblock).empty().append( img ).height( "15px" );
  },

  execute: function( input ) {
    var img = this._dataToSparkline( input.text );
    if( img ) CmdUtils.setSelection( img );
  }
});

// -----------------------------------------------------------------
// TRANSLATE COMMANDS
// -----------------------------------------------------------------

function translateTo(text, langCodePair, callback, pblock) {
  var url = "http://ajax.googleapis.com/ajax/services/language/translate";
  var params = {
    v: "1.0",
    q: text,
    langpair: (langCodePair.from || "") + "|" + (langCodePair.to || ""),
  };
  function onsuccess(data) {
    // The usefulness of this command is limited because of the
    // length restriction enforced by Google. A better way to do
    // this would be to split up the request into multiple chunks.
    // The other method is to contact Google and get a special
    // account.
    try {
      var {translatedText} = data.responseData;
    } catch(e) {
      // If we get either of these error messages, that means Google wasn't
      // able to guess the originating language. Let's assume it was English.
      // TODO: Localize this.
      var BAD_FROM_LANG_1 = "invalid translation language pair";
      var BAD_FROM_LANG_2 = "could not reliably detect source language";
      var errMsg = data.responseDetails;
      if( errMsg == BAD_FROM_LANG_1 || errMsg == BAD_FROM_LANG_2 ) {
        // Don't do infinite loops. If we already have a guess language
        // that matches the current forced from language, abort!
        if( langCodePair.from != "en" )
          translateTo(text, {from: "en", to: langCodePair.to},
                      callback, pblock);
      }
      else {
        displayMessage( "Translation Error: " + data.responseDetails );
      }
      return;
    }
    callback(translatedText);
  }
  if (pblock) CmdUtils.previewGet(pblock, url, params, onsuccess, "json");
  else jQuery.get(url, params, onsuccess, "json");
}

CmdUtils.CreateCommand({
  DEFAULT_LANG_PREF : "extensions.ubiquity.default_translation_lang",
  name: "translate",
  names: {
    da: ['oversat'],
    en: ['translate'],
    fr: ['traduire','traduizez','traduis'],
    ca: ['tradueix', 'traduix'],
    da: ['oversat'],
    sv: ['oversatt'],
    ja: ['訳す','訳せ','訳して','やくす','やくせ','やくして'],
    pt: ['traduzir', 'traduza']
  },
  arguments: [
    {role: 'object', nountype: noun_arb_text},
    {role: 'source', nountype: noun_type_language},
    {role: 'goal', nountype: noun_type_language}
  ],
  description: "Translates from one language to another.",
  icon: "http://www.google.com/favicon.ico",
  help: "" + (
    <>You can specify the language to translate to,
    and the language to translate from.
    For example, try issuing "translate mother from english to chinese".
    If you leave out the languages, it will try to guess what you want.
    It works on selected text in any web page,
    but there&#39;s a limit (a couple of paragraphs)
    to how much it can translate at once.</>),
  takes: {text: noun_arb_text},
  modifiers: {to: noun_type_language, from: noun_type_language},
  execute: function({object, to, from, goal, source}) {
    if (object.text)
      translateTo(object.text,
                  { from: (source || from).data,
                    to: (goal || to).data || this._getDefaultLang()},
                  function(translation) {
                    CmdUtils.setSelection(translation);
                  });
  },
  preview: function(pblock, {object, to, from, goal, source}) {
    var textToTranslate = object.text;
    if (!textToTranslate) {
      pblock.innerHTML = this.description;
      return;
    }
    if (!goal) goal = to;
    var defaultLang = this._getDefaultLang();
    var toLang = goal.text || noun_type_language.getLangName(defaultLang);
    var toLangCode = goal.data || defaultLang;
    var html = pblock.innerHTML =
      "Replaces the selected text with the " + toLang + " translation:";
    translateTo(
      textToTranslate,
      {from: (source || from).data, to: toLangCode},
      function(translation) {
        pblock.innerHTML = html + <p><b>{translation}</b></p>;
      },
      pblock);
  },
  // Returns the default language for translation.  order of defaults:
  // extensions.ubiquity.default_translation_lang > general.useragent.locale > "en"
  // And also, if there unknown language code is found any of these preference,
  // we fall back to English.
  _getDefaultLang: function() {
    var userLocale = Application.prefs.getValue("general.useragent.locale", "en");
    var defaultLang = Application.prefs.getValue(this.DEFAULT_LANG_PREF, userLocale);
    // If defaultLang is invalid lang code, fall back to english.
    if (noun_type_language.getLangName(defaultLang) == null)  {
      return "en";
    }
    return defaultLang;
  }
});

// -----------------------------------------------------------------
// COMMANDS THAT CREATE NEW COMMANDS
// -----------------------------------------------------------------


CmdUtils.CreateCommand({
  name: "create-bookmarklet-command-from",
  takes: {"bookmarklet name": noun_type_bookmarklet},
  description: "Create a new command from a bookmarklet",
  author: {name: "Abimanyu Raja", email: "abimanyuraja@gmail.com"},
  license: "MPL",
  preview: function(previewBlock,directObj) {
    bookmarklet = directObj.text;
    if(bookmarklet) previewBlock.innerHTML = "Creates a new command called <b>" + bookmarklet + " </b> that runs the " + bookmarklet + " bookmarklet";
  },
  execute: function(directObj) {
    var name  = directObj.text;
    var url = directObj.data;

    //build the piece of code that creates the command
    var code =  '\n\n//Note: This command was automatically generated by the create-bookmarklet-command command.\n';
    code += 'CmdUtils.makeBookmarkletCommand({\n';
    code += '  name: "' + name + '",\n';
    code += '  url: "'+url.replace("\"","\\\"", "gi")+'" \n';
    code += '});\n';

    //append the code to Ubiqity's command editor
    CmdUtils.UserCode.appendCode(code);

    //tell the user we finished
    displayMessage("You have created the command: " + name +
                   ".  You can edit its source-code with the command-editor command.");

  }
});

CmdUtils.CreateCommand({
  name: "create-new-search-command",
  description: "Creates a new Ubiquity command from a search-box.",
  help: (<ol style="list-style-image:none">
         <li>Select a searchbox.</li>
         <li>Execute this command to create the new search command.</li>
         </ol>) + "",
  author: {name: "Marcello Herreshoff",
           homepage: "http://stanford.edu/~marce110/"},
  contributors: ["Abimanyu Raja", "satyr"],
  icon: "chrome://ubiquity/skin/icons/search.png",
  license: "GPL/LGPL/MPL",
  homepage:
  "http://stanford.edu/~marce110/verbs/new-command-from-search-box.html",
  takes: {"command name": noun_arb_text},
  preview: function(pblock, {text}) {
    pblock.innerHTML = (
      text
      ? "Creates a new search command called <b>" + text + "</b>"
      : this.description + this.help);
  },
  execute: function({text: name}) {
    var node = context.focusedElement || 0;
    var {form} = node;
    if (!node || !form) {
      displayMessage(
        "You need to focus a searchbox before running this command.");
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
    displayMessage("You have created the command: " + name +
                   ".  You can edit its source-code " +
                   "with the command-editor command.");
  },
  _encodePair: function(key, val)(encodeURIComponent(key) + "=" +
                                  encodeURIComponent(val)),
});
