var NLParser = { MAX_SUGGESTIONS: 5};

NLParser.makeParserForLanguage = function(languageCode, verbList, nounList) {
  if (languageCode == "jp") {
    return new NLParser.JpParser(verbList, nounList);
  } else {
    return new NLParser.EnParser(verbList, nounList);
  }
};
