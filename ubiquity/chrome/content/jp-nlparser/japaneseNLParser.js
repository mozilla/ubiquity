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
  _init: function( verbList, nounList ) {
    this._verbList = verbList;
    this._nounList = nounList;
  },
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
      newSuggs = newSuggs.concat(this.nounFirstSuggestionsWithDict(query,
								   parseDict,
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
    if (!selection) {
      selection = UbiquityGlobals.lastCmdResult;
    }
    var htmlSelection = getHtmlSelection(context);
    if (!htmlSelection)
      htmlSelection = selection;

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
      if (this._modifiers[x] == nounType) {
	return x;
      }
    }
    return false;
  },

  getCompletions: function(parseDict, context) {
    var completions = [];
    var dictWithKoreSubstituted = this.substitutePronoun(parseDict,
							     context);
    var sentence = new ParsedSentence(this, "", parseDict);
    completions.push(sentence);
    if (dictWithKoreSubstituted) {
      sentence = new ParsedSentence(this, "", dictWitKoreSubstituted);
      completions.push(sentence);
    }
    return completions;
  }
};
JVerb.prototype.__proto__ = new Verb();


function testAssertEqual( a, b ) {
  if (a != b) {
    dump("Error! " + a + " is not equal to " + b + "\n" );
  } else {
    dump("OK.\n");
  }
}

function testSplitByParticles() {
  var jnlp = new JapaneseNLParser( [], [], JP_PRONOUNS );

  var sentence1 = "彼女と駅に行った";
  var parsedSentence = jnlp.splitByParticles(sentence1);
  testAssertEqual( parsedSentence["と"], "彼女");
  testAssertEqual( parsedSentence["に"], "駅");
  testAssertEqual( parsedSentence["動詞"], "行った");
}

function testSplitByParticles2() {
  var jnlp = new JapaneseNLParser( [], [], JP_PRONOUNS );

  var sentence1 = "これを英語から日本語に翻訳して";
  var parsedSentence = jnlp.splitByParticles(sentence1);
  testAssertEqual( parsedSentence["を"], "これ");
  testAssertEqual( parsedSentence["から"], "英語");
  testAssertEqual( parsedSentence["に"], "日本語");
  testAssertEqual( parsedSentence["動詞"], "翻訳して");
}

function testSplitByParticles3() {
  var jnlp = new JapaneseNLParser( [], [], JP_PRONOUNS );

  var sentence1 = "計算して";
  var parsedSentence = jnlp.splitByParticles(sentence1);
  testAssertEqual( parsedSentence["動詞"], "計算して");
}

testSplitByParticles();
testSplitByParticles2();
testSplitByParticles3();