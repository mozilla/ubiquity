var App = {
  XUL_PLANET_URL_TEMPLATE: ("http://www.xulplanet.com/references/xpcomref/" +
                            "ifaces/%QUERY%.html"),
  MDC_URL_TEMPLATE: "https://developer.mozilla.org/en/N%QUERY%"
};

App.trim = function trim(str) {
  return str.replace(/^\s+|\s+$/g,"");
};

App.processCode = function processCode(code, div) {
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
      $(div).append(docs);
      var code = $('<div class="code">');
      code.text(this.code);
      $(div).append(code);

      var docsSurplus = docs.height() - code.height() + 1;
      if (docsSurplus > 0)
        code.css({paddingBottom: docsSurplus + "px"});

      $(div).append('<div class="divider">');
    });
  $(div).find(".documentation").find("tt").each(
    function() {
      var text = $(this).text();
      if (!(text.indexOf("nsI") == 0))
        return;
      $(this).wrap('<span class="popup-enabled"></span>');

    $(this).mousedown(
      function(evt) {
        evt.preventDefault();
        var popup = $('<div class="popup"></div>');

        function addMenuItem(label, urlOrCallback) {
          var callback;
          var menuItem = $('<div class="item"></div>');
          menuItem.text(label);
          function onOverOrOut() { $(this).toggleClass("selected"); }
          menuItem.mouseover(onOverOrOut);
          menuItem.mouseout(onOverOrOut);
          if (typeof(urlOrCallback) == "string")
            callback = function() {
              window.open(urlOrCallback);
            };
          else
            callback = urlOrCallback;
          menuItem.mouseup(callback);
          popup.append(menuItem);
        }

        addMenuItem("View MDC entry",
                    App.MDC_URL_TEMPLATE.replace("%QUERY%",
                                                 text.slice(1)));
        addMenuItem("View XULPlanet entry",
                    App.XUL_PLANET_URL_TEMPLATE.replace("%QUERY%", text));

        popup.find(".item:last").addClass("bottom");

        popup.css({left: evt.pageX + "px"});
        $(window).mouseup(
          function mouseup() {
            popup.remove();
            $(window).unbind("mouseup", mouseup);
          });
        $(this).append(popup);
      });
    });
};

App.currentPage = null;

App.pages = {};

App.navigate = function navigate() {
  var newPage;
  if (window.location.hash)
    newPage = window.location.hash.slice(1);
  else
    newPage = "overview";

  if (App.currentPage != newPage) {
    if (App.currentPage)
      $(App.pages[App.currentPage]).hide();
    if (!App.pages[newPage]) {
      var newDiv = $("<div>");
      newDiv.attr("name", newPage);
      $("#content").append(newDiv);
      App.pages[newPage] = newDiv;
      jQuery.get(newPage,
                 {},
                 function(code) { App.processCode(code, newDiv); },
                 "text");
    }
    $(App.pages[newPage]).show();
    App.currentPage = newPage;
  }
};

$(window).ready(
  function() {
    App.pages["overview"] = $("#overview").get(0);
    window.setInterval(
      function() { App.navigate(); },
      100
    );
    App.navigate();
  });
