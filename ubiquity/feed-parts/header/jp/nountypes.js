/* ***** BEGIN LICENSE BLOCK *****
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
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Blair McBride <unfocused@gmail.com>
 *   Abimanyu Raja <abimanyuraja@gmail.com>
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

var JLanguageCodes = {
  'アラビア語' : 'ar',
  'ブルガリア語' : 'bg',
  'カタルーニャ語' : 'ca',
  '中国語(簡体)' : 'zh',
  '中国語(繁體)' : 'zh-TW',
  'クロアチア語': 'hr',
  'チェコ語': 'cs',
  'デンマーク語' : 'da',
  'オランダ語': 'nl',
  '英語' : 'en',
  'タガログ語' : 'tl',
  'フィンランド語' : 'fi',
  'フランス語' : 'fr',
  'ドイツ語' : 'de',
  'ギリシャ語' : 'el',
  'ヘブライ語' : 'he',
  'ヒンディー語' : 'hi',
  'イタリア語' : 'it',
  '日本語' : 'ja',
  '韓国語' : 'ko',
  'ラトビア語' : 'lv',
  'リトアニア語' : 'lt',
  'ノルウェー語' : 'no',
  'ポーランド語' : 'pl',
  'ポルトガル語' : 'pt',
  'ルーマニア語' : 'ro',
  'ロシア語' : 'ru',
  'セルビア語' : 'sr',
  'スロバキア語' : 'sk',
  'スロベニア語' : 'sl',
  'スペイン語' : 'es',
  'スウェーデン語' : 'sv',
  'ウクライナ語' : 'uk',
  'ベトナム語' : 'vi',
  
  'arabic' : 'ar',
  'bulgarian' : 'bg',
  'catalan' : 'ca',
  'chinese' : 'zh',
  'chinese_traditional' : 'zh-TW',
  'croatian': 'hr',
  'czech': 'cs',
  'danish' : 'da',
  'dutch': 'nl',
  'english' : 'en',
  // Filipino should be 'fil', however Google
  // improperly uses 'tl', which is actually
  // the language code for tagalog. Using 'tl'
  // for now so that filipino translations work.
  'filipino' : 'tl',
  'finnish' : 'fi',
  'french' : 'fr',
  'german' : 'de',
  'greek' : 'el',
  'hebrew' : 'he',
  'hindi' : 'hi',
  'indonesian' : 'id',
  'italian' : 'it',
  'japanese' : 'ja',
  'korean' : 'ko',
  'latvian' : 'lv',
  'lithuanian' : 'lt',
  'norwegian' : 'no',
  'polish' : 'pl',
  'portuguese' : 'pt',
  'romanian' : 'ro',
  'russian' : 'ru',
  'serbian' : 'sr',
  'slovak' : 'sk',
  'slovenian' : 'sl',
  'spanish' : 'es',
  'swedish' : 'sv',
  'ukranian' : 'uk',
  'vietnamese' : 'vi'
};

var noun_type_language =  {
  _name: "言語",
  suggest: function( text, html ) {
    var suggestions = [];
    for ( var word in JLanguageCodes ) {
      // Do the match in a non-case sensitive way
      if ( word.indexOf( text.toLowerCase() ) > -1 ) {
        // Use the 2-letter language code as the .data field of the suggestion
        var sugg = CmdUtils.makeSugg(word, word, JLanguageCodes[word]);
        suggestions.push( sugg );
      }
    }
    return suggestions;
  },
   
  // Returns the language name for the given lang code.
  getLangName: function(langCode) {
 	var code = langCode.toLowerCase();
 	for ( var word in JLanguageCodes ) {
 		if (code == JLanguageCodes[word].toLowerCase()) {
 			return word;
 		}
 	}
 	return null;
  }
};

var noun_arb_text = {
  _name: "テキスト",
  rankLast: true,
  suggest: function( text, html, callback, selectionIndices ) {
    var suggestion = CmdUtils.makeSugg(text, html);
    /* If the input comes all or in part from a text selection,
     * we'll stick some html tags into the summary so that the part
     * that comes from the text selection can be visually marked in
     * the suggestion list.
     */
    if (selectionIndices) {
      var pre = suggestion.summary.slice(0, selectionIndices[0]);
      var middle = suggestion.summary.slice(selectionIndices[0],
					    selectionIndices[1]);
      var post = suggestion.summary.slice(selectionIndices[1]);
      suggestion.summary = pre + "<span class='selection'>" +
			     middle + "</span>" + post;
    }
    return [suggestion];
  }
};
