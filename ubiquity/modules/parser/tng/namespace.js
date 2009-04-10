var EXPORTED_SYMBOLS = ["NLParser2"];

Components.utils.import("resource://ubiquity/modules/parser/parser.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/parser.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/en.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/pt.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/fr.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/da.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/ja.js");
Components.utils.import("resource://ubiquity/modules/parser/tng/zh.js");

var NLParser2 = {
  // Namespace object
  parserFactories: {
    en: makeEnParser,
    pt: makePtParser,
    fr: makeFrParser,
    da: makeDaParser,
    ja: makeJaParser,
    zh: makeZhParser
  },

  makeParserForLanguage: function(languageCode, verbList, nounList,
                                           ContextUtils, suggestionMemory) {
    if ( ! NLParser2.parserFactories[languageCode] ) {
      throw "No parser is defined for " + languageCode;
    } else {
      let parser = NLParser2.parserFactories[languageCode]();
      // todo set verblist, nounlist, contextutils, and suggestionmemory on the
      // new parser object.
      let convertedVerbList = [];
      for each ( let v in verbList ) {
        let newVerbObj = NLParser.Verb( v );
        convertedVerbList.push( NLParser2._convertVerb( newVerbObj ) );
      }
      parser.setCommandList( convertedVerbList );
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
