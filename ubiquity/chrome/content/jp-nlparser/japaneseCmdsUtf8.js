CreateCommand({
  name: "計算して",
  takes: {"巣学の表現": arbText},
  icon: "http://www.metacalc.com/favicon.ico",
  execute: function( expr ) {
    if( expr.length > 0 ) {
      var result = eval( expr );
      setTextSelection( result );
      setLastResult( result );
    } else
      displayMessage( "巣学の表現が必要です。");
  },
  preview: function( pblock, expr ) {
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
  takes: {"翻訳するテキスト": arbText},
  modifiers: {
    "に": jpLanguageNounType,
    "から": jpLanguageNounType
  },
  execute: function( textToTranslate, languages ) {
    var toLang = languages["に"] || "日本語";
    var fromLang = languages["から"] || "";
    translateTo( textToTranslate, {to:Languages[toLang] } );
    //from:Languages[fromLang]} );
  },

  preview: function( pblock, textToTranslate, languages ) {
    var toLang = languages["に"] || "日本語";
    var fromLang = languages["から"] || "";

    var toLangCode = JLanguages[toLang];

    pblock.innerHTML = "選択したテキストを" + toLang + "の翻訳で置き換える:<br/>";
    translateTo( textToTranslate, {to:toLangCode}, function( translation ) {
      pblock.innerHTML =  "選択したテキストを" + toLang + "の翻訳で置き換える:<br/>";
      pblock.innerHTML += "<i style='padding:10px;color: #CCC;display:block;'>" + translation + "</i>";
      });
  }
});
