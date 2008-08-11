var JLanguages = {
  'アラビア語' : 'ar',
  '中国語' : 'zh',
  '中国語（伝説）' : 'zh-TW',
  'デンマーク語' : 'da',
  'オランダ語': 'nl',
  '英語' : 'en',
  'フィンランド語' : 'fi',
  'フランス語' : 'fr',
  'ドイツ語' : 'de',
  'ギリシャ語' : 'el',
  'ヒンディ語' : 'hi',
  'イタリア語' : 'it',
  '日本語' : 'ja',
  '韓国語' : 'ko',
  'ノルウェーイ語' : 'no',
  'ポーランド語' : 'pl',
  'ポルツガル語' : 'pt-PT',
  'ロマニア語' : 'ro',
  'ロシア語' : 'ru',
  'スペイン語' : 'es',
  'スェーデン語' : 'sv'
};

var key;
var noun_type_jp_language = new NounType( "言葉", [key for (key in JLanguages)]);

var noun_jpArbText = {
 _name: "何でもテキスト",
 match: function( fragment ) {
    return true;
  },
 suggest: function( fragment ) {
    return [ fragment ];
  }
};

