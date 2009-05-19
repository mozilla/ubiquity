/***** BEGIN LICENSE BLOCK *****
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
 *   Michael Yoshitaka Erlewine <mitcho@mitcho.com>
 *   Christian Sonne <cers@geeksbynature.dk>
 *   Felipe Gomes <felipc@gmail.com>
 *   Kim Ahlström <kim.ahlstrom@gmail.com>
 *   Toni Hermoso Pulido <toniher@softcatala.cat>
 *   Sandro Della Giustina <sandrodll@yahoo.it>
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

// set up fake verbs

var EXPORTED_SYMBOLS = ["sampleVerbs"];

var sampleVerbs = {
  add: {
    names: {
      ca: ['afegeix', 'afegix', 'afig', 'inclou'],
      da: ['tilføj', 'indsæt'],
      sv: ['lägg till', 'addera', 'plussa'],
      en: ['add'],
      ja: ['追加する','追加しろ','追加して','ついかする','ついかしろ','ついかして'],
      pt: ['adicionar', 'incluir', 'marcar'],
      it: ['aggiungi']
    },
    arguments: [
      {role: 'object', nountype: fake_noun_text},
      {role: 'position', nountype: fake_noun_time},
      {role: 'goal', nountype: fake_noun_service}
    ]
  },
  buy: {
    names: {
      ca: ['compra'],
      da: ['køb'],
      sv: ['köp', 'handla'],
      en: ['buy','purchase'],
      ja: ['買う','買え','買って','かう','かえ','かって'],
      pt: ['comprar', 'compre'],
      it: ['acquista']
    },
    arguments: [
      {role: 'object', nountype: fake_noun_text},
      {role: 'source', nountype: fake_noun_service},
      {role: 'instrument', nountype: fake_noun_service}
    ]
  },
  say: {
    names: {
      ca: ['digues'],
      da: ['sig'],
      sv: ['säg'],
      en: ['say'],
      ja: ['言う','言え','言って','いう','いえ','いって'],
      pt: ['dizer', 'diga']
    },
    arguments: [
      {role: 'object', nountype: fake_noun_text}
    ]
  },
  move: {
    names: {
      ca: ['mou', 'vés'],
      da: ['flyt'],
      sv: ['flytta'],
      en: ['move'],
      ja: ['動かす','動かせ','動かして','うごかす','うごかせ','うごかして','移す','移せ','移して','うつす','うつせ','うつして'],
      pt: ['ir', 'vá', 'vai'],
      it: ['sposta']
    },
    arguments: [
      {role: 'object', nountype: fake_noun_text},
      {role: 'source', nountype: fake_noun_city},
      {role: 'goal', nountype: fake_noun_city}
    ]
  },
  translate: {
    names: {
      ca: ['tradueix', 'traduïx'],
      da: ['oversæt'],
      sv: ['översätt'],
      en: ['translate'],
      ja: ['訳す','訳せ','訳して','やくす','やくせ','やくして'],
      pt: ['traduzir', 'traduza'],
      it: ['traduci']
    },
    arguments: [
      {role: 'source', nountype: fake_noun_language},
      {role: 'goal', nountype: fake_noun_language},
      {role: 'object', nountype: fake_noun_text}
    ]
  }
};
