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

const JP_PARTICLES = ["に", "を", "から", "と", "で", "が", "まで"];
//const JP_PRONOUNS = ["これ"];

function JapaneseNLParser(verbList, nounList) {
  this._init(verbList, nounList);
}
JapaneseNLParser.prototype = {
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
    this._verbList = [ new JVerb( commandList[x] ) for (x in commandList)];
  }
}
JapaneseNLParser.prototype.__proto__ = new NLParser();

function JVerb( cmd ) {
  this._init( cmd );
}
JVerb.prototype = {
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
JVerb.prototype.__proto__ = new Verb();

function JParsedSentence( verb, modifiers ) {
  this._init(verb, "", modifiers);
}
JParsedSentence.prototype = {
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
JParsedSentence.prototype.__proto__ = new ParsedSentence();


function jpGetDefaultPreview() {
  return "いらっしゃいませ";
}