* ***** BEGIN LICENSE BLOCK *****
* Version: MPL 1.1/GPL 2.0/LGPL 2.1
*
* The contents of this file are subject to the Mozilla Public License Version
* 1.1 (the "License"); you may not use this file except in compliance with
* the License. You may obtain a copy of the License at
* http://www.mozilla.org/MPL/
*
* Software distributed under the License is distributed on an "AS IS" basis,
* WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
* for the specific language governing rights and limitations under the
* License.
*
* The Original Code is Ubiquity.
*
* The Initial Developer of the Original Code is Mozilla.
* Portions created by the Initial Developer are Copyright (C) 2007
* the Initial Developer. All Rights Reserved.
*
* Contributor(s):
*   Atul Varma <atul@mozilla.com>
*   Aza Raskin <aza@mozilla.com>
*   Maria Emerson <memerson@mozilla.com>
*   Abimanyu Raja <abimanyu@gmail.com>
*   Jono DiCarlo <jdicarlo@mozilla.com>
*   Blair McBride <blair@theunfocused.net>
*   Masahiko Imanaka <chimantaea_mirabilis@yahoo.co.jp>
*   Michael Yoshitaka Erlewine <mitcho@mitcho.com>
*
* Alternatively, the contents of this file may be used under the terms of
* either the GNU General Public License Version 2 or later (the "GPL"), or
* the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
* in which case the provisions of the GPL or the LGPL are applicable instead
* of those above. If you wish to allow use of your version of this file only
* under the terms of either the GPL or the LGPL, and not to allow others to
* use your version of this file under the terms of the MPL, indicate your
* decision by deleting the provisions above and replace them with the notice
* and other provisions required by the GPL or the LGPL. If you do not delete
* the provisions above, a recipient may use your version of this file under
* the terms of any one of the MPL, the GPL or the LGPL.
*
* ***** END LICENSE BLOCK ***** */

// -----------------------------------------------------------------
// SYSTEM COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  name: "ヘルプ",
  synonyms: ["help", "about", "?", "説明"],
  icon: "chrome://ubiquity/skin/icons/help.png",
  preview: "Provides help on using Ubiquity, as well as access to preferences, etc.",
  description: "Takes you to the Ubiquity <a href=\"about:ubiquity\">main help page</a>.",
  takes: { "コマンド名": noun_type_commands },
  modifiers: {"の": noun_type_commands},
  preview: function(pblock, input, modifiers){
    if (!input && modifiers["の"]) {
      input = modifiers["の"].text;
    }
    pblock.innerHTML = input.html;
  },
  execute: function(){
    Utils.openUrlInBrowser("about:ubiquity");
  }
});

CmdUtils.CreateCommand({
  name: "コマンドエディタ",
  synonyms: ["command-editor"],
  icon : "chrome://ubiquity/skin/icons/plugin_edit.png",
  preview: "Opens the editor for writing Ubiquity commands",
  description: "Takes you to the Ubiquity <a href=\"chrome://ubiquity/content/editor.html\">command editor</a> page.",
  execute: function(){
    Utils.openUrlInBrowser("chrome://ubiquity/content/editor.html");
  }
});

CmdUtils.CreateCommand({
  name: "コマンドリスト",
  synonyms: ["command-list"],
  icon : "chrome://ubiquity/skin/icons/application_view_list.png",
  preview: "Opens the list of all Ubiquity commands available and what they all do.",
  description: "Takes you to the page you're on right now.",
  execute: function(){
    Utils.openUrlInBrowser("chrome://ubiquity/content/cmdlist.html");
  }
});

CmdUtils.CreateCommand({
  name: "スキンリスト",
  synonyms: ["change-skin", "skin-editor", "スキン変更", "スキンエディタ"],
  icon : "chrome://ubiquity/skin/icons/favicon.ico",
  preview: "Opens the 'Your Skins' page where you can view, change and edit skins",
  description: "Takes you to the <a href=\"chrome://ubiquity/content/skinlist.html\">Your Skins</a> page.",
  execute: function(){
    Utils.openUrlInBrowser("chrome://ubiquity/content/skinlist.html");
  }
});


function startup_openUbiquityWelcomePage()
{
  var jsm = {};
  Components.utils.import("resource://ubiquity/modules/setup.js", jsm);

  if (jsm.UbiquitySetup.isNewlyInstalledOrUpgraded)
    cmd_help();
}


// -----------------------------------------------------------------
// CALCULATE COMMANDS
// from /standard-feeds/general.js
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  name: "計算して",
  synonyms: ["計算"],
  takes: {"expression": noun_arb_text},
  modifiers: {"を": noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/calculator.png",
  description: "数式を計算します。",
  help: "Try it out: issue &quot;calc 22/7 - 1&quot;.",
  preview: function(previewBlock, directObject, modifiers) {
    var expression = directObject.text;
    if (!expression && modifiers["を"]) {
      expression = (modifiers["を"] || "").text;
    }

    if(expression.length < 1) {
      previewBlock.innerHTML = "数式を計算します。例: 22/7-1";
       return;
    }
 
    var previewTemplate = "${expression} = <b>${result}</b>" +
      "{if error}<p><b>エラー:</b> ${error}</p>{/if}";

    var result = "?";
    var error = null;
    try {
      var parser = new MathParser();
      result = parser.parse(expression);

      if(isNaN(result))
        throw new Error("無効な式です");
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

  execute: function( directObject, modifiers ) {
    var expression = directObject.text;
    if (!expression && modifiers["を"]) {
      expression = (modifiers["を"] || "").text;
    }

    if(expression.length < 1) {
      displayMessage("式が必要です");
      return;
    }

    try {
      var parser = new MathParser();
      var result = parser.parse(expression) + "";

      if(isNaN(result))
        throw new Error("無効な式です");

      CmdUtils.setSelection(result);
      CmdUtils.setLastResult(result);
    } catch(e) {
      displayMessage("計算エラー: " + expression);
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


function translateTo( text, langCodePair, callback ) {
  var url = "http://ajax.googleapis.com/ajax/services/language/translate";

  if( typeof(langCodePair.from) == "undefined" ) langCodePair.from = "";
  if( typeof(langCodePair.to) == "undefined" ) langCodePair.to = "";

  var params = {
    v: "1.0",
    q: text,
    langpair: langCodePair.from + "|" + langCodePair.to
  };

  jQuery.get(url, params, function(data){
    //var data = Utils.decodeJson(jsonData);

    // The usefulness of this command is limited because of the
    // length restriction enforced by Google. A better way to do
    // this would be to split up the request into multiple chunks.
    // The other method is to contact Google and get a special
    // account.

    try {
      var translatedText = data.responseData.translatedText;
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
          translateTo( text, {from:"en", to:langCodePair.to}, callback );
        return;
      }
      else {
        displayMessage( "Translation Error: " + data.responseDetails );
      }
      return;
    }

    if( typeof callback == "function" )
      callback( translatedText );
    else
      CmdUtils.setSelection( translatedText );

    CmdUtils.setLastResult( translatedText );
  }, "json");
}


mdUtils.CreateCommand({
  DEFAULT_LANG_PREF : "extensions.ubiquity.default_translation_lang",
  name: "翻訳して",
  synonyms: ["翻訳", "訳して"],
  description: "テキストを他の言語へ翻訳します。例：&quot;motherを英語からロシア語に翻訳して&quot;。言語を省略した場合は英語から日本語に翻訳します。",
  icon: "http://www.google.com/favicon.ico",
  takes: {"翻訳するテキスト": noun_arb_text},
  modifiers: {
   "を": noun_arb_text,
   "に": noun_type_language,
   "から": noun_type_language
  },
  execute: function( directObject, modifiers ) {
    var textToTranslate = directObject.text;
    if (!textToTranslate && modifiers["を"]) {
      textToTranslate = modifiers["を"].text;
    }
    var toLangCode = modifiers["に"].data || this._getDefaultLang();
    var fromLangCode = modifiers["から"].data || "en";

    translateTo( textToTranslate, {from:fromLangCode, to:toLangCode} );
  },
  // Returns the default language for translation. order of defaults:
  // extensions.ubiquity.default_translation_lang > general.useragent.locale > "ja"
  // And also, if there unknown language code is found any of these preference, we fall back to Japanese.
  _getDefaultLang: function() {
      var userLocale = Application.prefs.getValue("general.useragent.locale", "ja");
      var defaultLang = Application.prefs.getValue(this.DEFAULT_LANG_PREF, userLocale);
      // If defaultLang is invalid lang code, fall back to Japanese.
      if (noun_type_language.getLangName(defaultLang) == null) {
           return "ja";
      }
      return defaultLang;
  },
  preview: function( pblock, directObject, modifiers ) {
    var defaultLang = this._getDefaultLang();
    var toLang = modifiers["に"].text || noun_type_language.getLangName(defaultLang);
//    var toLang = modifiers["に"].text || "日本語";
    var toLangCode = modifiers["に"].data || defaultLang;
    var textToTranslate = directObject.text;
    if (!textToTranslate && modifiers["を"]) {
      textToTranslate = modifiers["を"].text;
    }
    pblock.innerHTML = "選択したテキストを" + toLang + "の翻訳で置き換えます:<br/>";
    translateTo( textToTranslate, {to:toLangCode}, function( translation ) {
    pblock.innerHTML =  "選択したテキストを" + toLang + "の翻訳で置き換えます:<br/>";
    pblock.innerHTML += "<i style='padding:10px;color: #CCC;display:block;'>" + translation + "</i>";
    });
  }
);