var App = {};

App.trim = function trim(str) {
  return str.replace(/^\s+|\s+$/g,"");
};

App.getLocalUrlData = function getLocalUrlData(url) {
  var jsm = {};
  Components.utils.import("resource://ubiquity/modules/codesource.js",
                          jsm);
  var lcs = new jsm.LocalUriCodeSource(url);
  return lcs.getCode();
};

App.processCode = function processCode(code) {
  var lines = code.split('\n');
  var blocks = [];
  var blockText = "";
  var codeText = "";
  var firstCommentLine;
  var lastCommentLine;

  function maybeAppendBlock() {
    if (blockText)
      blocks.push({text: blockText,
                   lineno: firstCommentLine,
                   numLines: lastCommentLine - firstCommentLine + 1,
                   code: codeText});
  }

  jQuery.each(
    lines,
    function(lineNum) {
      var line = this;
      var isCode = true;
      var isComment = (App.trim(line).indexOf("//") == 0);
      if (isComment) {
        var startIndex = line.indexOf("//");
        var text = line.slice(startIndex + 3);
        if (lineNum == lastCommentLine + 1) {
          blockText += text + "\n";
          lastCommentLine += 1;
          isCode = false;
        } else if (text[0] == "=" || text[0] == "*") {
          maybeAppendBlock();
          firstCommentLine = lineNum;
          lastCommentLine = lineNum;
          blockText = text + "\n";
          codeText = "";
          isCode = false;
        }
      }
      if (isCode)
        codeText += line + "\n";
    });
  maybeAppendBlock();

  var creole = new Parse.Simple.Creole(
    {interwiki: {
       WikiCreole: 'http://www.wikicreole.org/wiki/',
       Wikipedia: 'http://en.wikipedia.org/wiki/'
     },
     linkFormat: ''
    });

  jQuery.each(
    blocks,
    function(i) {
      var docs = $('<div class="documentation">');
      creole.parse(docs.get(0), this.text);
      $("#content").append(docs);
      var code = $('<div class="code">');
      code.text(this.code);
      $("#content").append(code);

      var docsSurplus = docs.height() - code.height() + 1;
      if (docsSurplus > 0)
        code.css({paddingBottom: docsSurplus + "px"});

      $("#content").append('<div class="divider">');
    });
};

$(window).ready(
  function() {
    var baseDir;
    var filename = "modules/utils.js";
    if (window.location.protocol == "chrome:") {
      baseDir = "resource://ubiquity/";
      var code = App.getLocalUrlData(baseDir + filename);
      App.processCode(code);
    } else {
      baseDir = "../../../";
      jQuery.get(baseDir + filename,
                 {},
                 App.processCode,
                 "text");
    }
  });
