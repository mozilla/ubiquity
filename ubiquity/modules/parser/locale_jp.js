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

EXPORTED_SYMBOLS = ["JpParser"];

Components.utils.import("resource://ubiquity-modules/parser/parser.js");
Components.utils.import("resource://ubiquity-modules/localeutils.js");

var dat = loadLocaleJson("resource://ubiquity-modules/parser/locale_jp.json");

var JpParser = {};

JpParser.JP_PARTICLES = dat.particles;

JpParser.PRONOUNS = dat.pronouns;

JpParser.DEFAULT_PREVIEW = dat.defaultPreview;

/* bad assumption: each particle appears at most once
 also bad assumption: strings that look like particles don't appear
 elsewhere.
 Later when we're doing this properly, we'll need to allow for multiple
 parsing possibilities to come out of each place where there's ambiguity
 in the parsing due to extra occurences of particles.

 We should also ultimately be able to suggest stuff even when expected
 particles are missing.*/
JpParser._splitByParticles = function( input ) {
  let oldDict = {};
  oldDict[dat.verb] = input;
  let newDict = oldDict;
  for each (let particle in JpParser.JP_PARTICLES ) {

    for (var y in oldDict) {
      let text = oldDict[y];
      let segments = text.split(particle);
      if (segments.length > 2 ) {
	// ERROR!  same particle appeared twice.  Blarggh!!
      } else if (segments.length == 2) {
	// particle appeared once...
	newDict[particle] = segments[0];
	newDict[y] = segments[1];
      }
    }
    oldDict = newDict;
  }
  return oldDict;
};

JpParser.parseSentence = function(inputString, nounList, verbList, selObj,
                                  asyncSuggestionCb) {
  // Returns a list of PartiallyParsedSentences.
  // Language-specific.  This one is for Japanese.
  let parsings = [];

  let newParsings = [];
  // Splitting on spaces won't work for Japanese, so split on all known
  // particles to get a dictionary of {particle: noun}
  let wordDict = JpParser._splitByParticles( inputString );
  for each ( let verb in verbList ) if (!verb.disabled) {
    let matchScore = verb.match( wordDict["動詞"]);
    if (matchScore == 0)
      continue;
    let argStrings = {};
    for (let argName in verb._arguments) {
      let particle = verb._arguments[argName].flag;
      if (wordDict[particle]) {
	argStrings[argName] = [wordDict[particle]];
      }
    }
    newParsings = [new NLParser.PartiallyParsedSentence(verb,
							argStrings,
							selObj,
							matchScore,
                                                        JpParser,
                                                        asyncSuggestionCb)];
    parsings = parsings.concat( newParsings );
  }
  return parsings;
};

NLParser.registerPluginForLanguage("jp", JpParser);

// TODO changing the key bindings for the japanese version!
// Is it right to do that here, or... elsewhere...?