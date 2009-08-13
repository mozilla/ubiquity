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

Components.utils.import("resource://ubiquity/modules/setup.js");
Components.utils.import("resource://ubiquity/modules/utils.js");

var LT = LocalizationUtils.propertySelector(
  "chrome://ubiquity/locale/aboutubiquitytutorial.properties");

function waitForUserAction( conditionFunction, callback ) {
  var intervalId;
  intervalId = window.setInterval( function() {
                        if ( conditionFunction() ) {
                          window.clearInterval(intervalId);
                          callback();
                        }
                      }, 500 );
}

function fadeInText( text ) {
  // Start text out white, fade it to black over 1 second
  let color = 250;

  function setTextColor( colorInt ) {
    let colorString = "rgb(" + colorInt + ", " + colorInt + ", " + colorInt + ")";
    $("#tutorial-instructions-div").css( "color", colorString );
  }

  setTextColor(color);
  $("#tutorial-instructions-div").html( text );

  var intervalId;
  intervalId = window.setInterval( function() {
                                     color -= 25;
                                     setTextColor( color );
                                     if (color <= 0) {
                                       window.clearInterval(intervalId);
                                     }
                                   }, 100);
}

function hideOtherContent() {
  $(".not-the-tutorial").css("display", "none");
}

function moveDivRight() {
  let left = $(getGUbiq().textBox).width();
  $("#interactive-tutorial-div").css("position", "absolute");
  $("#interactive-tutorial-div").css("left", left + "px");
}

function getGUbiq() {
   var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                  .rootTreeItem
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindow);
  return mainWindow.gUbiquity;
}

function ubiqWindowIsUp() {
  return (getGUbiq().isWindowOpen);
}

function ubiqInputIs(text) {
  let input = getGUbiq().cmdManager.getLastInput();
  return (input.toLowerCase() == text.toLowerCase());
}

function ubiqSuggestionIs(text) {
  let verb = getGUbiq().cmdManager.getHilitedSuggestionDisplayName();
  return (verb.toLowerCase().indexOf(text.toLowerCase()) > -1);
}

function contentsDivHas(word) {
  return ($("#tutorial-contents-div").text().indexOf(word) > -1 );
}

function createCanvas(left, top, width, height) {
  let canvas = document.createElement("canvas");
  $(canvas).css("display", "block");
  $(canvas).css("position", "absolute");
  $(canvas).css("z-index", 5);
  $(canvas).css("left", left + "px");
  $(canvas).css("top", top + "px");
  $(canvas).attr("width", width );
  $(canvas).attr("height", height );

  $("#canvas-goes-here").append($(canvas));
  return canvas;
}

function destroyCanvas() {
  let canvas = $("#canvas-goes-here").find("canvas");
  if (canvas) {
      canvas.slideUp();
  }
  $("#canvas-goes-here").empty();
}

function showArrowToInputBox() {
  let div = $("#interactive-tutorial-div");
  let left = $(getGUbiq().textBox).width();
  let divTop = div.offset().top;
  let canvas = createCanvas(left, 0, div.width(), divTop);

  var ctx = canvas.getContext("2d");
  ctx.strokeStyle = "green";
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(150, divTop);
  ctx.lineTo(150, 25);
  ctx.lineTo(0, 25);
  ctx.lineTo(25, 0);
  ctx.lineTo(0, 25);
  ctx.lineTo(25, 50);
  ctx.stroke();
}

function showArrowToSuggestionList() {
  /* TODO: for some skins, this arrow will have to approach from the
   * right instead of from the bottom.
   */
  let panel = getGUbiq().msgPanel;
  let ubiqTop = panel.boxObject.y;
  let ubiqHeight = panel.boxObject.height;
  let ubiqBottom = ubiqTop + ubiqHeight;
  let theDiv = $("#interactive-tutorial-div");
  let divBottom = theDiv.offset().top + theDiv.height();
  let divRight = theDiv.offset().left + theDiv.width();
  let canvas = createCanvas(0, divBottom, divRight, 300 );

  var ctx = canvas.getContext("2d");
  ctx.strokeStyle = "green";
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  let bottomLevel = (ubiqBottom - divBottom);
  ctx.moveTo( theDiv.offset().left + 50, 0);
  ctx.lineTo( theDiv.offset().left + 50, bottomLevel);
  ctx.lineTo( 200, bottomLevel );
  ctx.lineTo( 200, bottomLevel - 50);
  ctx.lineTo( 175, bottomLevel - 25);
  ctx.lineTo( 200, bottomLevel - 50 );
  ctx.lineTo( 225, bottomLevel - 25);
  ctx.stroke();
}

function showArrowToPreview() {
  /* TODO: the bracket is much too tall.*/
  let theDiv = $("#interactive-tutorial-div");
  // Note, msgpanel is XUL so don't try to use jQuery on it
  let panel = getGUbiq().msgPanel;
  let ubiqTop = panel.boxObject.y;
  let ubiqHeight = panel.boxObject.height; // too high!

  let canvas = createCanvas( theDiv.offset().left, ubiqTop,
                             50, ubiqHeight);

  theDiv.css("left", (theDiv.offset().left + 50) + "px");
  theDiv.width( theDiv.width() - 50 );

  var ctx = canvas.getContext("2d");
  ctx.strokeStyle = "green";
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(25, 25);
  let centerHite = theDiv.height();
  ctx.lineTo( 25, centerHite);
  ctx.lineTo( 50, centerHite);
  ctx.moveTo( 25, centerHite);
  ctx.lineTo( 25, ubiqHeight - 25 );
  ctx.lineTo( 0, ubiqHeight );
  ctx.stroke();
}

function startUbiqTutorial() {
  hideOtherContent();
  destroyCanvas();

  var html = "<h2>" + LT("tutorial.welcome") + "</h2>"
    + "<p><a onclick='ubiqTutorialStage1();'>" + LT("tutorial.fromthestart") + "</a></p>"
    + "<p>" + LT("tutorial.fromthemiddle") + "</p><ol>"
    + "<li><a onclick='ubiqTutorialStage1();'>" + LT("tutorial.howtostart") + "</a></li>"
    + "<li><a onclick='ubiqTutorialStage3();'>" + LT("tutorial.previews") + "</a></li>"
    + "<li><a onclick='ubiqTutorialStage7();'>" + LT("tutorial.suggestions") + "</a></li>"
    + "<li><a onclick='ubiqTutorialStage16();'>" + LT("tutorial.selecting") + "</a></li>"
    + "<li><a onclick='ubiqTutorialStage23();'>" + LT("tutorial.morecommands") + "</a></li>"
    + "</ol>";

  fadeInText( html );
}


function ubiqTutorialStage1() {

  var keyCombo = PrefKeys.getKeyCombo();
  var introHtml = "<h2>" + LT("tutorial.stage01h1") + "</h2>"
    + "<p>" + LT("tutorial.stage01p1") + "</p>"
    + "<p>" + LT("tutorial.stage01p2") + "</p>"
    + "<p><strong>" + LT("tutorial.stage01p3") + " "
    + keyCombo[0] + " " + LT("tutorial.stage01p4") + " "
    + keyCombo[1] + " " + LT("tutorial.stage01p5") + "</strong></p>";

  fadeInText(introHtml);

  waitForUserAction( ubiqWindowIsUp, ubiqTutorialStage2 );
}

function ubiqTutorialStage2() {
  moveDivRight();
  let stage2Html = "<p>" + LT("tutorial.stage02p1") + "</p>"
  + "<p>" + LT("tutorial.stage02p2") + "</p>";

  fadeInText(stage2Html);
  showArrowToInputBox();
  waitForUserAction( function() { return !ubiqWindowIsUp(); },
                     ubiqTutorialStage3 );
}


function ubiqTutorialStage3() {
  var keyCombo = PrefKeys.getKeyCombo();
  let stage3Html = 
    "<h2>" + LT("tutorial.stage03h1") + "</h2>"
    + "<p>" + LT("tutorial.stage03p1") + "</p>"
    + "<p>" + LT("tutorial.stage03p2") + " "
    + keyCombo[0] + " " + LT("tutorial.stage03p3") + " "
    + keyCombo[1] + " " + LT("tutorial.stage03p4") + "</p>";

  fadeInText(stage3Html);
  destroyCanvas();
  waitForUserAction( ubiqWindowIsUp,
                     ubiqTutorialStage4 );
}

function ubiqTutorialStage4() {
  moveDivRight();
  let stage4Html = "<p>" + LT("tutorial.stage04p1") + "</p>";
  fadeInText(stage4Html);
  showArrowToInputBox();
  waitForUserAction( function() { return ubiqSuggestionIs("weather"); },
                     ubiqTutorialStage5 );
}

function ubiqTutorialStage5() {
  // NOTE: For some reason, &mdash; makes the xhtml parser barf, but
  // &#8212; works.
  let stage5Html = 
    "<p>" + LT("tutorial.stage05p1") + "</p>"
    + "<p>" + LT("tutorial.stage05p2") + "</p>"
    + "<p>" + LT("tutorial.stage05p3") + "</p>";

  fadeInText(stage5Html);
  destroyCanvas();
  showArrowToPreview();
  waitForUserAction(function() {return ubiqSuggestionIs("chicago"); },
                    ubiqTutorialStage6 );
}

function ubiqTutorialStage6() {
  let stage6Html = "<p>" + LT("tutorial.stage06p1") + "</p>"
  + " <p>" + LT("tutorial.stage06p2") + "</p>";
  destroyCanvas();
  moveDivRight();
  fadeInText(stage6Html);
  waitForUserAction( function() { return !ubiqWindowIsUp(); },
                     ubiqTutorialStage7 );
}

function ubiqTutorialStage7() {
  destroyCanvas();
  let stage7Html = "<h2>" + LT("tutorial.stage07h1") + "</h2>"
    + " <p>" + LT("tutorial.stage07p1") + "</p>";
  fadeInText(stage7Html);
  waitForUserAction( ubiqWindowIsUp, ubiqTutorialStage8 );
}

function ubiqTutorialStage8() {
  moveDivRight();
   let stage8Html = "<p>" + LT("tutorial.stage08p1") + "</p>";
  fadeInText(stage8Html);
  showArrowToInputBox();
  waitForUserAction( function() {return ubiqInputIs("c" );},
                     ubiqTutorialStage9 );
}

function ubiqTutorialStage9() {
   let stage9Html = "<p>" + LT("tutorial.stage09p1") + "</p>"
    + " <p>" + LT("tutorial.stage09p2") + "</p>";
  fadeInText(stage9Html);
  destroyCanvas();
  showArrowToSuggestionList();
  waitForUserAction( function() {return ubiqSuggestionIs("calculate" );},
                     ubiqTutorialStage10 );
}

function ubiqTutorialStage10() {
   let stage10Html = "<p>" + LT("tutorial.stage10p1") + "</p>";
  fadeInText(stage10Html);
  destroyCanvas();
  showArrowToInputBox();
  waitForUserAction( function() {return ubiqSuggestionIs("22/7" );},
                     ubiqTutorialStage11 );
}

function ubiqTutorialStage11() {
   let stage11Html = "<p>" + LT("tutorial.stage11p1") + "</p>"
  + "<p>" + LT("tutorial.stage11p2") + "</p>";
  fadeInText(stage11Html);
  destroyCanvas();
  showArrowToPreview();
  waitForUserAction( function() {return !ubiqWindowIsUp();},
                     ubiqTutorialStage12 );
}

function ubiqTutorialStage12() {
  let stage12Html = "<h2>" + LT("tutorial.stage12h1") + "</h2>"
    + "<p>" + LT("tutorial.stage12p1") + "</p>";
  fadeInText(stage12Html);
  destroyCanvas();
  moveDivRight();
  waitForUserAction( ubiqWindowIsUp,
                     ubiqTutorialStage13 );
}

function ubiqTutorialStage13() {
  moveDivRight();
  let stage13Html = "<p>" + LT("tutorial.stage13p1") + "</p>"
    + "<p><strong>" + LT("tutorial.stage13p2") + "</strong></p>"
    + "<p>" + LT("tutorial.stage13p3") + "</p>";
  fadeInText(stage13Html);
  showArrowToInputBox();
  waitForUserAction(  function() {return ubiqSuggestionIs("cheese" );},
                     ubiqTutorialStage14 );
}

function ubiqTutorialStage14() {
  let stage14Html = "<p>" + LT("tutorial.stage14p1") + "</p>"
    + "<p>" + LT("tutorial.stage14p2") + "</p>";
  destroyCanvas();
  showArrowToSuggestionList();
  fadeInText(stage14Html);
  waitForUserAction(  function() {return ubiqSuggestionIs("google" );},
                     ubiqTutorialStage15 );
}

function ubiqTutorialStage15() {
  let stage15Html = "<p>" + LT("tutorial.stage15p1") + "</p>"
  + "<p>" + LT("tutorial.stage15p2") + "</p>"
  + "<p>" + LT("tutorial.stage15p3") + "</p>";
  fadeInText(stage15Html);
  destroyCanvas();
  showArrowToPreview();
  waitForUserAction( function() {return !ubiqWindowIsUp();},
                     ubiqTutorialStage16 );
}

function ubiqTutorialStage16() {
  moveDivRight();
  destroyCanvas();
  let stage16Html = "<h2>" + LT("tutorial.stage16ah1") + "</h2>"
  + "<p>" + LT("tutorial.stage16ap1") + "</p>"
  + "<p>" + LT("tutorial.stage16ap2") + "</p>";

  fadeInText(stage16Html);

  let agDiv = $("#tutorial-contents-div");
  agDiv.addClass("ubiq-tutorial");
  agDiv.css("text-align", "center");

  agDiv.html("1981 Landings Drive, Mountain View, CA");

  waitForUserAction( ubiqWindowIsUp, ubiqTutorialStage16b );
}

function ubiqTutorialStage16b() {
   let stage16bhtml = "<p>" + LT("tutorial.stage16bp1") + "</p>";
   fadeInText(stage16bhtml);
   waitForUserAction( function() {return ubiqSuggestionIs("map");},
                      ubiqTutorialStage16c);
}

function ubiqTutorialStage16c() {
  let stage16chtml = "<p>" + LT("tutorial.stage16cp1") + "</p>"
  + "<p>" + LT("tutorial.stage16cp2") + "</p>";
  fadeInText(stage16chtml);

  waitForUserAction( function() {return !ubiqWindowIsUp();},
                     ubiqTutorialStage17 );
}

function ubiqTutorialStage17() {

  let stage17Html = "<p>" + LT("tutorial.stage17p1") + "</p>"
  + "<p>" + LT("tutorial.stage17p2") + "</p>"
  + "<p>" + LT("tutorial.stage17p3") + "</p>";

  let jpDiv = $("#tutorial-contents-div");
  jpDiv.addClass("ubiq-tutorial");
  jpDiv.css("text-align", "center");
  jpDiv.html("アドオンを選んで、自分だけのブラウザをつくろう。");

  fadeInText(stage17Html);

  waitForUserAction( function() {return ubiqSuggestionIs("translate");},
                     ubiqTutorialStage18);
}

function ubiqTutorialStage18() {
  let stage18Html = "<p>" + LT("tutorial.stage18p1") + "</p>"
    + "<p>" + LT("tutorial.stage18p2") + "</p>";

  fadeInText(stage18Html);
  waitForUserAction( function() { return contentsDivHas("browser"); },
                     ubiqTutorialStage19 );
}

function ubiqTutorialStage19() {
  let stage19Html = "<p>" + LT("tutorial.stage19p1") + "</p>"
    + "<p>" + LT("tutorial.stage19p2") + "</p>"
    + "<p><a onclick='ubiqTutorialStage20();'>" + LT("tutorial.stage19p3") + "</a></p>";

  fadeInText(stage19Html);
}

function ubiqTutorialStage20() {
  let stage20Html = "<p>" + LT("tutorial.stage20p1") + "</p>"
    + "<p><strong>" + LT("tutorial.stage20p2") + "</strong>.</p>";
  let agDiv = $("#tutorial-contents-div");
  agDiv.html("aglet");

  fadeInText(stage20Html);

  waitForUserAction( ubiqWindowIsUp, ubiqTutorialStage21 );
}

function ubiqTutorialStage21() {
  let stage21Html = "<p>" + LT("tutorial.stage21p1") + "</p>";

  fadeInText(stage21Html);
  waitForUserAction( function() {return ubiqSuggestionIs("google");},
                     ubiqTutorialStage22);
}

function ubiqTutorialStage22() {
  let stage22Html = "<p>" + LT("tutorial.stage22p1") + "</p>"
    + "<p>" + LT("tutorial.stage22p2") + "</p>"
    + "<p>" + LT("tutorial.stage23p3") + "</p>";
  fadeInText(stage22Html);
  waitForUserAction( function() {return !ubiqWindowIsUp();},
                     ubiqTutorialStage23 );
}

function ubiqTutorialStage23() {
  $("#tutorial-contents-div").slideUp();
  moveDivRight();
  let stage23Html = "<h2>" + LT("tutorial.stage23h1") + "</h2>"
    + "<p>" + LT("tutorial.stage23p1") + "</p>"
    + "<p>" + LT("tutorial.stage23p2") + "</p>"
    + "<p>" + LT("tutorial.stage23p3") + "</p>"
    + "<p><strong>" + LT("tutorial.stage23p4") + "</strong></p>";
  fadeInText(stage23Html);
  waitForUserAction( ubiqWindowIsUp, ubiqTutorialStage24 );
}

function ubiqTutorialStage24() {
  let stage24Html = "<p>" + LT("tutorial.stage24p1") + "</p>"
    + "<p><strong>" + LT("tutorial.stage24p2") + "</strong></p>";

  fadeInText(stage24Html);
  waitForUserAction( function() {return ubiqSuggestionIs("help") &&
                                 ubiqSuggestionIs("tab");},
                     ubiqTutorialStage25);
}

function ubiqTutorialStage25() {
  let stage25Html = "<p>" + LT("tutorial.stage25p1") + "</p>"
    + "<p>" + LT("tutorial.stage25p2") + "</p>"
    + "<p>" + LT("tutorial.stage25p3") + "</p>";

  fadeInText(stage25Html);
  waitForUserAction( function() {return !ubiqWindowIsUp();},
                     ubiqTutorialStage26 );
}

function ubiqTutorialStage26() {
  let stage26Html = "<p>" + LT("tutorial.stage26p1") + "</p>"
  + "<p>" + LT("tutorial.stage26p2") + "</p>"
  + "<p>" + LT("tutorial.stage26p3") + "</p>"
  + "<p>" + LT("tutorial.stage26p4") + "</p>";

  fadeInText(stage26Html);
}


  /* Tutorial problems
 *
 * Arrows don't point to the right places if you're not using the default
 * skin.  (Everything's too far left, for one thing.)
 *
 * if user has to scroll to see the rest of the instructions, it breaks
 * everything.  (Maybe position the tutorial instructions div so that it's
 * always on screen regardless of scroll position?)
 *
 * If user clicks elswhere on the page to take focus out of ubiquity, it
 * breaks everything.  Maybe put ubiquity into some kind of special mode so
 * it can't lose focus.
 *
 * Fix the arrows more better!
 *
 * > Can we get the width of the ubiquity window and it's input line in any
 * > way regardless of which skin is in use? If yes, then I think we can 
 * > move the tutorial to a new page and switch from a properties file to 
 * > a DTD which could help a ton.
 * >
 * > This way we can effectively halve the page [left ubiquity|right tut] 
 * > (or vice-versa for ltr languages) and make things much more flexible.
 * > Then slide, flip or fade text in/out of the tutorial portion as the
 * > user goes through each step.
 * >
 * > Additionally if we can grab the width and height then we won't need the
 * > arrow images in their current form and could instead attach a "<" from
 * > the tutorial portion and using the width and height offsets we would
 * > have better targeting.
 *
 * Translated japanese text, output of calculate command, etc. must be way
 * more obvious -- it looks like nothing has happened.
 *
 * > We need to give translators more freedom in applying their own context
 * > based on their native language/translation. Currently all input is
 * > expected to be in English with a single Japanese translation. This is
 * > somewhat limited, but works at the moment.
 *
 * Start by showing an animation of ubiquity in action so they know what to
 * expect.
 *
 * > Unfold/roll-down with results instead of popping in like we currently do?
 *
 * Describe the benefit by saying "here's how you would have had to do this
 * before... see how much faster it is"
 *
 * > Faster may not exactly be better, although it is made easier by cutting
 * > away all if not most of the unnecessary steps to reach a given goal.
 * > ie: "look mom, no tabs!"
 *
 * Needs to be a way to get back to table of contents at any point -- maybe
 * even keep it up and show progress through it.
 *
 * > The fix for this would be breaking the tutorial out to it's own page
 * > with an included reachable/interactive TOC. 
 * > layout: [index | previous] [current content] [next chapter]
 *
 * Instead of arrows, maybe blink an outline around the actual part of the
 * actual ubiquity box.  OR show a little voodoo-doll and point to or circle
 * part of that one.
 *
 * > Underline or hilighting the output result could be useful. Alternately a
 * > cliche Clippy moment could be created with accompanying chat bubbles :)
 *
 * > -L
 */


/* Ideas
 *
 * ubiquity bar under location and search bars (or make it one of the
 * choices in the search bar)
 *
 * keystroke combo puts focus up there
 *
 * Have the tutorial "follow" you when you move to another page during
 * the tutorial!
 *
 * Let's have sections of the tutorial:
 *
 * 1/5  Summoning and dismissing Ubiquity
 * 2/5  Commands, arguments, preview
 * 3/5  The suggestion list
 * 4/5  Executing commands; transforming the page
 * 5/5  Learning more commands
 *
 * Advanced tutorial:
 *
 * 1/5  Finding and installing more commands
 * 2/5  Using "this" and other magic words
 * 3/5  Advanced syntax
 */

