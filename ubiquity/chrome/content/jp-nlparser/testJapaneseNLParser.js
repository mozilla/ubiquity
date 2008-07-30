/* prereqs: japaneseNLParser.js, nlparser.js, verbtypes.js
*/

function getTextSelection(context) {
  return false;
}

function getHtmlSelection(context) {
  return false;
}

const NOUN_LIST = [];

function testAssertEqual( a, b ) {
  if (a != b) {
    document.write("Error! " + a + " is not equal to " + b + "\n" );
  } else {
    document.write("OK.\n");
  }
}

function testSplitByParticles() {
  var jnlp = new JapaneseNLParser([]);

  var sentence1 = "彼女と駅に行った";
  var parsedSentence = jnlp.splitByParticles(sentence1);
  testAssertEqual( parsedSentence["と"], "彼女");
  testAssertEqual( parsedSentence["に"], "駅");
  testAssertEqual( parsedSentence["動詞"], "行った");
}

function testSplitByParticles2() {
  var jnlp = new JapaneseNLParser([]);

  var sentence1 = "これを英語から日本語に翻訳して";
  var parsedSentence = jnlp.splitByParticles(sentence1);
  testAssertEqual( parsedSentence["を"], "これ");
  testAssertEqual( parsedSentence["から"], "英語");
  testAssertEqual( parsedSentence["に"], "日本語");
  testAssertEqual( parsedSentence["動詞"], "翻訳して");
}

function testSplitByParticles3() {
  var jnlp = new JapaneseNLParser([]);

  var sentence1 = "計算して";
  var parsedSentence = jnlp.splitByParticles(sentence1);
  testAssertEqual( parsedSentence["動詞"], "計算して");
}

function testStabYourFriends() {
  /* Q: What's the U.S. state where everybody stabs their enemies with knives?
   * A: Tekisasu!
   */
  var dareGaSasareta = null;
  var tekiType = {
    suggest: function(input) {
      if (input == "敵") {
	return ["敵"];
      } else
	return [];
    },
    match: function(input) {
      return (input == "敵");
    }
  };
  var cmd_sasu = {
    execute: function(context, dobj, modifiers) {
      dareGaSasareta = modifiers["を"];
    },
    name:"刺す",
    DOLabel: null,
    DOType: null,
    modifiers: {"を": tekiType }
  };
  var parser = new JapaneseNLParser( [cmd_sasu], [tekiType] );
  var fakeContext = null;
  var input = "敵を刺す";
  parser.updateSuggestionList(input, fakeContext);

  var suggList = parser._suggestionList;
  testAssertEqual(suggList.length, 1);
  testAssertEqual(suggList[0]._verb._name, "刺す");
  testAssertEqual(suggList[0]._modifiers["を"], "敵");
  suggList[0].execute(fakeContext);
  testAssertEqual(dareGaSasareta, "敵");

  var input2 = "友達を刺す";
  parser.updateSuggestionList(input2, fakeContext);
  suggList = parser._suggestionList;
  testAssertEqual(suggList.length, 0);
}
