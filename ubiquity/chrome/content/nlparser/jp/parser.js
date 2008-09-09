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

/* Split input on particles, not spaces:
 * ni, wo, kara, to, de, ga.
 *
 * selection pronouns are just "kore" for now.
 *
 * (There can be false splits because these can happen inside a word as well,
 * but ignore this for now.)
 * Take the last item as the verb.
 * Turn the rest into (noun, article) pairs.
 *
 * Not sure how abbreviation would be done.
 * Must not execute on enter key, enter key is needed as part of input.
 *
 * On load, need to check preferences, and if we have
 * extensions.ubiquity.language = 'jp' then we need to load
 * japaneseCmdsUtf8.js for builtincmds, and we need to substitute instance
 * of japaneseNLParser.js for nlParser.
 */

NLParser.JP_PARTICLES = ["に", "を", "から", "と", "で", "が", "まで"];

NLParser.JpParser = function(verbList, nounList) {
  this._init(verbList, nounList);
}
NLParser.JpParser.prototype = {
  /* bad assumption: each particle appears at most once
   also bad assumption: strings that look like particles don't appear
   elsewhere.
   Later when we're doing this properly, we'll need to allow for multiple
   parsing possibilities to come out of each place where there's ambiguity
   in the parsing due to extra occurences of particles.

   We should also ultimately be able to suggest stuff even when expected
   particles are missing.*/
  splitByParticles: function( input ) {
    var oldDict = {"動詞": input};
    var newDict = oldDict;
    for (var x in JP_PARTICLES ) {
      var particle = JP_PARTICLES[x];

      for (var y in oldDict) {
	var text = oldDict[y];
	var segments = text.split(particle);
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
  },

  nounFirstSuggestions: function( input, context ) {
    var suggs = [];
    var x, y, nounType, verb, words;

    for (x in this._nounTypeList) {
      nounType = this._nounTypeList[x];
      if (nounType.match(input)){
	for (y in this._verbList) {
	  verb = this._verbList[y];
	  var particle = verb.canPossiblyUseNounType(nounType);
	  if (particle) {
	    var newDict = {};
	    newDict[particle] = input;
	    suggs = suggs.concat(verb.getCompletions(newDict, context));
	  }
	}
      }
    }
    return suggs;
  },

  updateSuggestionList: function( query, context ) {
    var x, verb;
    var newSuggs = [];
    var wordDict = this.splitByParticles( query );
    for ( x in this._verbList ) {
      verb = this._verbList[x];
      if (verb.match( wordDict["動詞"])) {
	// TODO verb.getCompletions will barf on this wordDict because
	// verb is expecting to do recursiveParse.
	// If we move recursiveParse to EnglishNLParser then things will
	// be more better.
	newSuggs = newSuggs.concat(verb.getCompletions(wordDict, context));
      }
    }
    if (newSuggs.length == 0) {
      newSuggs = newSuggs.concat(this.nounFirstSuggestions(query,
							   context));
    }

    this._suggestionList = newSuggs;
    if (this._suggestionList.length > 0)
      this._hilitedSuggestion = 1;
    else
      this._hilitedSuggestion = 0;
  },

  setCommandList: function( commandList ) {
    this._verbList = [ new NLParser.JpVerb( commandList[x] ) for (x in commandList)];
  }
}
NLParser.JpParser.prototype.__proto__ = new NLParser.BaseParser();

NLParser.JpVerb = function( cmd ) {
  this._init( cmd );
}
NLParser.JpVerb.prototype = {
  substitutePronoun: function(parseDict, context ) {
    var gotOne = false;
    var selection = getTextSelection(context);
    /*if (!selection) {
      selection = UbiquityGlobals.lastCmdResult;
    }
    var htmlSelection = getHtmlSelection(context);
    if (!htmlSelection)
      htmlSelection = selection; */

    var newParseDict = {};
    for (var x in parseDict) {
      // TODO move this "これ" to a constant
      if (parseDict[x] == "これ" ) {
	newParseDict[x] = selection;
	gotOne = true;
      } else {
	newParseDict[x] = parseDict[x];
      }
    }

    if (gotOne)
      return newParseDict;
    else
      return false;
  },

  canPossiblyUseNounType: function(nounType) {
    for( var x in this._modifiers) {
      if (this._modifiers[x]._name == nounType._name) {
	return x;
      }
    }
    return false;
  },

  nounTypesMatch: function( parseDict ) {
    for (var particle in parseDict) {
      if (this._modifiers[particle])
	if (!this._modifiers[particle].match(parseDict[particle]))
	  return false;
    }
    return true;
  },

  getCompletions: function(parseDict, context) {
    var completions = [];
    var sentence;
    var dictWithKoreSubstituted = this.substitutePronoun(parseDict,
							     context);
    if (dictWithKoreSubstituted)
      if (this.nounTypesMatch(dictWithKoreSubstituted)) {
	sentence = new JParsedSentence(this, dictWithKoreSubstituted);
	completions.push(sentence);
      }
    if (this.nounTypesMatch(parseDict)) {
      sentence = new JParsedSentence(this, parseDict);
      completions.push(sentence);
    }
    return completions;
  }
};
NLParser.JpVerb.prototype.__proto__ = new NLParser.BaseVerb();

NLParser.JpParsedSentence = function( verb, modifiers ) {
  this._init(verb, "", modifiers);
}
NLParser.JpParsedSentence.prototype = {
  getDisplayText: function() {
    var sentence = "";
    for (var x in this._verb._modifiers) {
      if (this._modifiers[x]) {
	sentence = sentence + "<b>" + this._modifiers[x] + x + "</b>";
      } else {
	sentence = sentence + "<span class=\"needarg\">(" + this._verb._modifiers[x]._name + x + ")</span>";
      }
    }
    sentence = sentence + this._verb._name;
    return sentence;
  }
};
JpParsedSentence.prototype.__proto__ = new NLParser.BaseParsedSentence();


function jpGetDefaultPreview() {
  return "いらっしゃいませ";
}