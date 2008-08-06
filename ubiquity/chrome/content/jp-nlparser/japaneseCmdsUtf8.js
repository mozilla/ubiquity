CmdUtils.CreateCommand({
  name: "計算して",
  takes: {},
  modifiers: {"を": jpArbText},
  icon: "http://www.metacalc.com/favicon.ico",
  execute: function( unused, modifiers ) {
    var expr = modifiers["を"] || "";
    if( expr.length > 0 ) {
      var result = eval( expr );
      CmdUtils.setTextSelection( result );
      CmdUtils.setLastResult( result );
    } else
      displayMessage( "巣学の表現が必要です。");
  },
  preview: function( pblock, unused, modifiers ) {
    var expr = modifiers["を"] || "";
    if( expr.length < 1 ){
      pblock.innerHTML = "巣学の表現を計算する。例えば、 22/7.";
      return;
    }

    pblock.innerHTML = expr + " = ";
    try{ pblock.innerHTML += eval( expr ); }
    catch(e) { pblock.innerHTML += "?"; }
  }
});

function translateTo( text, langCodePair, callback ) {
  var url = "http://ajax.googleapis.com/ajax/services/language/translate";

  if( typeof(langCodePair.from) == "undefined" ) langCodePair.from = "";
  if( typeof(langCodePair.to) == "undefined" ) langCodePair.to = "";

  var params = Utils.paramsToString({
    v: "1.0",
    q: text,
    langpair: langCodePair.from + "|" + langCodePair.to
  });

  Utils.ajaxGet( url + params, function(jsonData){
    var data = eval( '(' + jsonData + ')' );

    // The usefulness of this command is limited because of the
    // length restriction enforced by Google. A better way to do
    // this would be to split up the request into multiple chunks.
    // The other method is to contact Google and get a special
    // account.

    try {
      var translatedText = data.responseData.translatedText;
    } catch(e) {

      // If we get this error message, that means Google wasn't able to
      // guess the originating language. Let's assume it was English.
      // TODO: Localize this.
      var BAD_FROM_LANG_GUESS_MSG = "invalid translation language pair";
      if( data.responseDetails == BAD_FROM_LANG_GUESS_MSG ){
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
      CmdUtils.setTextSelection( translatedText );

    CmdUtils.setLastResult( translatedText );
  });
}


CmdUtils.CreateCommand({
  name: "翻訳して",
  takes: {},
  modifiers: {
    "を": jpArbText,
    "に": jpLanguageNounType,
    "から": jpLanguageNounType
  },
  execute: function( unused, modifiers ) {
    var textToTranslate = modifiers["を"] || "";
    var toLang = modifiers["に"] || "日本語";
    var fromLang = modifiers["から"] || "";
    translateTo( textToTranslate, {to:JLanguages[toLang] } );
    //from:Languages[fromLang]} );
  },

  preview: function( pblock, unused, modifiers ) {
    var textToTranslate = modifiers["を"] || "";
    var toLang = modifiers["に"] || "日本語";
    var fromLang = modifiers["から"] || "";

    var toLangCode = JLanguages[toLang];

    pblock.innerHTML = "選択したテキストを" + toLang + "の翻訳で置き換える:<br/>";
    translateTo( textToTranslate, {to:toLangCode}, function( translation ) {
      pblock.innerHTML =  "選択したテキストを" + toLang + "の翻訳で置き換える:<br/>";
      pblock.innerHTML += "<i style='padding:10px;color: #CCC;display:block;'>" + translation + "</i>";
      });
  }
});
