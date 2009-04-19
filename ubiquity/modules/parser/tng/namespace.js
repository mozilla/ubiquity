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

var EXPORTED_SYMBOLS = ["NLParser2"];

Components.utils.import("resource://ubiquity/modules/parser/parser.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/parser.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/en.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/pt.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/fr.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/da.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/sv.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/ja.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/zh.js");

//Components.utils.import("resource://ubiquity/modules/parser/tng/verbs.js");

var NLParser2 = {
  // Namespace object
  parserFactories: {
    en: makeEnParser,
    pt: makePtParser,
    fr: makeFrParser,
    da: makeDaParser,
    sv: makeSvParser,
    ja: makeJaParser,
    zh: makeZhParser
  },

  makeParserForLanguage: function(languageCode, verbList, nounList,
                                           ContextUtils, suggestionMemory) {
    if ( ! NLParser2.parserFactories[languageCode] ) {
      throw "No parser is defined for " + languageCode;
    } else {
      let parser = NLParser2.parserFactories[languageCode]();
      // todo set contextutils, and suggestionmemory on the
      // new parser object.

      // test by just using the sample verbs from verbs.js.
      //parser.setCommandList( sampleVerbs );

      parser.setCommandList( verbList );
      parser.setNounList( nounList );
      parser.initialCache();

      return parser;
    }
  },

  _convertVerb: function( oldVerb ) {
    // TODO: this code is temporary scaffolding: it turns old-style verbs
    // into new-style verbs.  The correct solution is to add the needed
    // new metadata directly to all verbs.
    let newVerb = {
      names: {
        en: []
      },
      arguments: []
    };

    // TODO actually this should work from the NLParser.Verb object
    newVerb.names.en.push( oldVerb.name );

    if (oldVerb.synonyms) {
      for (let i = 0; i < oldVerb.synonyms.length; i++) {
        newVerb.names.en.push( oldVerb.synonyms[i] );
      }
    }

    if (oldVerb.DOType) {
      newVerb.arguments.push( { role: 'object', nountype: oldVerb.DOType } );
    }

    if (oldVerb.arguments) {
    }

    if (oldVerb.modifiers) {
      for (let preposition in oldVerb.modifiers) {
        let role;
        switch (preposition) {
          case 'to':
            role = 'goal';
          break;
          case 'from':
            role = 'source';
          break;
          case 'at': case 'on':
            role = 'time';
          break;
          case 'with': case 'using':
            role = 'instrument';
          break;
          case 'in':
            // language, in the case of wikipedia.
          break;
          case 'near':
            role = 'location';
          break;
          case 'as':
            role = 'user';
          break;
        }
      }
    }
    return newVerb;
  }
};
