CreateCommand({
  name: "計算して",
  takes: {},
  modifiers: {"を": arbText},
  icon: "http://www.metacalc.com/favicon.ico",
  execute: function( unused, modifiers ) {
    var expr = modifiers["を"];
    if( expr.length > 0 ) {
      var result = eval( expr );
      setTextSelection( result );
      setLastResult( result );
    } else
      displayMessage( "巣学の表現が必要です。");
  },
  preview: function( pblock, unused, modifiers ) {
    var expr = modifiers["を"];
    if( expr.length < 1 ){
      pblock.innerHTML = "巣学の表現を計算する。例えば、 22/7.";
      return;
    }

    pblock.innerHTML = expr + " = ";
    try{ pblock.innerHTML += eval( expr ); }
    catch(e) { pblock.innerHTML += "?"; }
  }
});


CreateCommand({
  name: "翻訳して",
  takes: {},
  modifiers: {
    "を": arbText,
    "に": jpLanguageNounType,
    "から": jpLanguageNounType
  },
  execute: function( unused, modifiers ) {
    var toLang = modifiers["に"] || "日本語";
    var fromLang = modifiers["から"] || "";
    translateTo( textToTranslate, {to:JLanguages[toLang] } );
    //from:Languages[fromLang]} );
  },

  preview: function( pblock, unused, modifiers ) {
    var textToTranslate = modifiers["を"];
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
