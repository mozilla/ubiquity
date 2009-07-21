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

var EXPORTED_SYMBOLS = ["NLParser2","parserRegistry"];

const Cu = Components.utils;

Cu.import("resource://ubiquity/modules/parser/parser.js");
Cu.import("resource://ubiquity/modules/parser/new/parser.js");

// load the parserRegistry
Cu.import("resource://ubiquity/modules/localeutils.js");
var parserRegistry = loadLocaleJson('resource://ubiquity/modules/parser/new/parser_registry.json');

var NLParser2 = {
  // Namespace object
  parserFactories: {},
  makeParserForLanguage: function(languageCode, verbList,
                                  ContextUtils, SuggestionMemory) {
    if ( ! NLParser2.parserFactories[languageCode] ) {
      throw "No parser is defined for " + languageCode;
    } else {
      let parser = NLParser2.parserFactories[languageCode]();
      parser.setCommandList(verbList);
      /* If ContextUtils and/or SuggestionMemory were provided, they are
       * stub objects for testing purposes.  Set them on the new parser
       * object; it will use them instead of the real modules.
       * Normally I would do this in the constructor, but because we use
       * parserFactories[]() it's easier to do it here:
       */
      if (ContextUtils) {
        parser._contextUtils = ContextUtils;
      } else {
        var ctu = {};
        Cu.import("resource://ubiquity/modules/contextutils.js", ctu);
        parser._contextUtils = ctu.ContextUtils;
      }
      if (SuggestionMemory) {
        parser._suggestionMemory = SuggestionMemory;
      } else {
        var sm = {};
        Cu.import("resource://ubiquity/modules/suggestion_memory.js", sm);
        parser._suggestionMemory = new sm.SuggestionMemory("main_parser");
      }

      return parser;
    }
  }
};

var self = this;

// load the resources for all the languages.
var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                    .createInstance(Components.interfaces.nsIXMLHttpRequest);
for (let code in parserRegistry) {
  req.open('GET', "resource://ubiquity/modules/parser/new/"+code+".js", false);
  req.overrideMimeType("text/plain; charset=utf-8");
  req.send(null);

  eval(req.responseText);

  NLParser2.parserFactories[code] = makeParser;
}
