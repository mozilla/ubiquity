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

