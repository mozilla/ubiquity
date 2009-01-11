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
 *   Atul Varma <atul@mozilla.com>
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
