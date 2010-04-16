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

Cu.import("resource://ubiquity/modules/prefkeys.js");

var gPrefKeys = new PrefKeys;
var T = LocalizationUtils.propertySelector(
  "chrome://ubiquity/locale/aboutubiquitytutorial.properties");

function waitForUserAction(conditionFunction, callback) {
  var intervalId = window.setInterval(function onInterval() {
    if (conditionFunction()) {
      window.clearInterval(intervalId);
      callback();
    }
  }, 500);
}

function fadeInHtml(htmls) {
  // Start text out white, fade it to black over 1 second
  ($("#tutorial-instructions-div")
   .css({brightness: 250})
   .html(Array.join(arguments, ""))
   .animate({brightness: 0}, {
     duration: 1e3,
     step: function setRGB(now) {
       now |= 0; // float => int
       this.style.color = "rgb(" + now + "," + now + "," + now + ")";
     },
   }));
}

function hideOtherContent() {
  $(".not-the-tutorial").hide();
}

function moveDivRight() {
  let left = $(getGUbiq().textBox).width();
  $("#interactive-tutorial-div").css({
    position: "absolute",
    left: left + "px",
  });
}

function getGUbiq() Utils.currentChromeWindow.gUbiquity;

function ubiqWindowIsUp() getGUbiq().isWindowOpen;
function ubiqWindowIsDown() !ubiqWindowIsUp();

function ubiqInputIs(text) {
  let {lastInput} = getGUbiq().cmdManager;
  return lastInput.toLowerCase() === text.toLowerCase();
}

function ubiqSuggestionIs(text) {
  let {hilitedSuggestion} = getGUbiq().cmdManager;
  return (hilitedSuggestion &&
          (hilitedSuggestion.displayText.toLowerCase()
           .indexOf(text.toLowerCase())) > -1);
}

function contentsDivHas(word) {
  return ($("#tutorial-contents-div").text().indexOf(word) > -1);
}

function createCanvas(left, top, width, height) (
  $(document.createElement("canvas"))
  .css({
    "display": "block",
    "position": "absolute",
    "z-index": 5,
    "left": left + "px",
    "top": top + "px",
  })
  .attr({
    "width": width,
    "height": height,
  })
  .appendTo("#canvas-goes-here")
  [0]);

function forceDefaultSkin() {
  var {skinService} = UbiquitySetup.createServices();
  skinService.changeSkin(skinService.DEFAULT_SKIN);
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
  let {panel} = getGUbiq();
  let ubiqTop = panel.boxObject.y;
  let ubiqHeight = panel.boxObject.height;
  let ubiqBottom = ubiqTop + ubiqHeight;
  let theDiv = $("#interactive-tutorial-div");
  let divBottom = theDiv.offset().top + theDiv.height();
  let divRight = theDiv.offset().left + theDiv.width();
  let canvas = createCanvas(0, divBottom, divRight, 300);

  var ctx = canvas.getContext("2d");
  ctx.strokeStyle = "green";
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  let bottomLevel = (ubiqBottom - divBottom);
  ctx.moveTo(theDiv.offset().left + 50, 0);
  ctx.lineTo(theDiv.offset().left + 50, bottomLevel);
  ctx.lineTo(200, bottomLevel);
  ctx.lineTo(200, bottomLevel - 50);
  ctx.lineTo(175, bottomLevel - 25);
  ctx.lineTo(200, bottomLevel - 50);
  ctx.lineTo(225, bottomLevel - 25);
  ctx.stroke();
}

function showArrowToPreview() {
  /* TODO: the bracket is much too tall.*/
  let theDiv = $("#interactive-tutorial-div");
  // Note, panel is XUL so don't try to use jQuery on it
  let {panel} = getGUbiq();
  let ubiqTop = panel.boxObject.y;
  let ubiqHeight = panel.boxObject.height; // too high!

  let canvas = createCanvas(theDiv.offset().left, ubiqTop,
                             50, ubiqHeight);

  theDiv.css("left", (theDiv.offset().left + 50) + "px");
  theDiv.width(theDiv.width() - 50);

  var ctx = canvas.getContext("2d");
  ctx.strokeStyle = "green";
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(25, 25);
  let centerHite = theDiv.height();
  ctx.lineTo(25, centerHite);
  ctx.lineTo(50, centerHite);
  ctx.moveTo(25, centerHite);
  ctx.lineTo(25, ubiqHeight - 25);
  ctx.lineTo(0, ubiqHeight);
  ctx.stroke();
}

for each (let tag in ["h2", "p", "ol", "li", "strong"]) {
  let beg = "<" + tag + ">", end = "</" + tag + ">";
  this[tag.toUpperCase()] =
    function quickTag() beg + Array.join(arguments, "") + end;
}

function stageLink(number, content) (
  "<a onclick='ubiqTutorialStage" + number +"();'>" + content + "</a>");

function startUbiqTutorial() {
  //forceDefaultSkin();
  hideOtherContent();
  destroyCanvas();
  fadeInHtml(
    H2(T("tutorial.welcome")),
    P(stageLink(1, T("tutorial.fromthestart"))),
    P(T("tutorial.fromthemiddle")),
    OL(LI(stageLink( 1, T("tutorial.howtostart"))),
       LI(stageLink( 3, T("tutorial.previews"))),
       LI(stageLink( 7, T("tutorial.abbreviations"))),
       LI(stageLink(12, T("tutorial.suggestions"))),
       LI(stageLink(16, T("tutorial.selecting"))),
       LI(stageLink(23, T("tutorial.morecommands")))));
}

function ubiqTutorialStage1() {
  var {keyCombo} = gPrefKeys;
  fadeInHtml(
    H2(T("tutorial.stage01h1")),
    P(T("tutorial.stage01p1")),
    P(T("tutorial.stage01p2")),
    P(STRONG(T("tutorial.stage01p3", keyCombo[0], keyCombo[1]))));
  waitForUserAction(ubiqWindowIsUp, ubiqTutorialStage2);
}

function ubiqTutorialStage2() {
  moveDivRight();
  fadeInHtml(P(T("tutorial.stage02p1")),
             P(T("tutorial.stage02p2")));
  showArrowToInputBox();
  waitForUserAction(ubiqWindowIsDown, ubiqTutorialStage3);
}

function ubiqTutorialStage3() {
  var {keyCombo} = gPrefKeys;
  fadeInHtml(
    H2(T("tutorial.stage03h1")),
    P(T("tutorial.stage03p1")),
    P(T("tutorial.stage03p2", keyCombo[0], keyCombo[1])));
  destroyCanvas();
  waitForUserAction(ubiqWindowIsUp, ubiqTutorialStage4);
}

function ubiqTutorialStage4() {
  moveDivRight();
  fadeInHtml(P(T("tutorial.stage04p1")));
  showArrowToInputBox();
  waitForUserAction(function() ubiqSuggestionIs("weather"),
                    ubiqTutorialStage5);
}

function ubiqTutorialStage5() {
  // NOTE: For some reason, &mdash; makes the xhtml parser barf, but
  // &#8212; works.
  fadeInHtml(P(T("tutorial.stage05p1")),
             P(T("tutorial.stage05p2")),
             P(T("tutorial.stage05p3")));
  destroyCanvas();
  showArrowToPreview();
  waitForUserAction(function() ubiqSuggestionIs("chicago"),
                    ubiqTutorialStage6);
}

function ubiqTutorialStage6() {
  destroyCanvas();
  moveDivRight();
  fadeInHtml(P(T("tutorial.stage06p1")),
             P(T("tutorial.stage06p2")));
  waitForUserAction(ubiqWindowIsDown, ubiqTutorialStage7);
}

function ubiqTutorialStage7() {
  destroyCanvas();
  fadeInHtml(H2(T("tutorial.stage07h1")),
             P(T("tutorial.stage07p1")));
  waitForUserAction(ubiqWindowIsUp, ubiqTutorialStage8);
}

function ubiqTutorialStage8() {
  moveDivRight();
  fadeInHtml(P(T("tutorial.stage08p1")));
  showArrowToInputBox();
  waitForUserAction(function() ubiqInputIs("c"), ubiqTutorialStage9);
}

function ubiqTutorialStage9() {
  fadeInHtml(P(T("tutorial.stage09p1")),
             P(T("tutorial.stage09p2")));
  destroyCanvas();
  showArrowToSuggestionList();
  waitForUserAction(function() ubiqSuggestionIs("calculate"),
                    ubiqTutorialStage10);
}

function ubiqTutorialStage10() {
  fadeInHtml(P(T("tutorial.stage10p1")));
  destroyCanvas();
  showArrowToInputBox();
  waitForUserAction(function() ubiqSuggestionIs("22/7"),
                    ubiqTutorialStage11);
}

function ubiqTutorialStage11() {
  fadeInHtml(P(T("tutorial.stage11p1")),
             P(T("tutorial.stage11p2")));
  destroyCanvas();
  showArrowToPreview();
  waitForUserAction(ubiqWindowIsDown, ubiqTutorialStage12);
}

function ubiqTutorialStage12() {
  fadeInHtml(H2(T("tutorial.stage12h1")),
             P(T("tutorial.stage12p1")));
  destroyCanvas();
  moveDivRight();
  waitForUserAction(ubiqWindowIsUp, ubiqTutorialStage13);
}

function ubiqTutorialStage13() {
  moveDivRight();
  fadeInHtml(P(T("tutorial.stage13p1")),
             P(STRONG(T("tutorial.stage13p2"))),
             P(T("tutorial.stage13p3")));
  showArrowToInputBox();
  waitForUserAction( function() ubiqSuggestionIs("cheese"),
                     ubiqTutorialStage14);
}

function ubiqTutorialStage14() {
  destroyCanvas();
  showArrowToSuggestionList();
  fadeInHtml(P(T("tutorial.stage14p1")),
             P(T("tutorial.stage14p2")));
  waitForUserAction(function() ubiqSuggestionIs("google"),
                    ubiqTutorialStage15);
}

function ubiqTutorialStage15() {
  fadeInHtml(P(T("tutorial.stage15p1")),
             P(T("tutorial.stage15p2")),
             P(T("tutorial.stage15p3")));
  destroyCanvas();
  showArrowToPreview();
  waitForUserAction(ubiqWindowIsDown, ubiqTutorialStage16);
}

function ubiqTutorialStage16() {
  moveDivRight();
  destroyCanvas();
  fadeInHtml(H2(T("tutorial.stage16ah1")),
             P(T("tutorial.stage16ap1")),
             P(T("tutorial.stage16ap2")));

  ($("#tutorial-contents-div")
   .addClass("ubiq-tutorial")
   .css("text-align", "center")
   .html("1981 Landings Drive, Mountain View, CA"));

  waitForUserAction(ubiqWindowIsUp, ubiqTutorialStage16b);
}

function ubiqTutorialStage16b() {
   fadeInHtml(P(T("tutorial.stage16bp1")));
   waitForUserAction(function() ubiqSuggestionIs("map"),
                     ubiqTutorialStage16c);
}

function ubiqTutorialStage16c() {
  fadeInHtml(P(T("tutorial.stage16cp1")),
             P(T("tutorial.stage16cp2")));
  waitForUserAction(ubiqWindowIsDown, ubiqTutorialStage17);
}

function ubiqTutorialStage17() {
  ($("#tutorial-contents-div")
   .addClass("ubiq-tutorial")
   .css("text-align", "center")
   .html("アドオンを選んで、自分だけのブラウザをつくろう。"));

  fadeInHtml(P(T("tutorial.stage17p1")),
             P(T("tutorial.stage17p2")),
             P(T("tutorial.stage17p3")));
  waitForUserAction(function() ubiqSuggestionIs("translate"),
                    ubiqTutorialStage18);
}

function ubiqTutorialStage18() {
  fadeInHtml(P(T("tutorial.stage18p1")),
             P(T("tutorial.stage18p2")));
  waitForUserAction(function() contentsDivHas("browser"),
                    ubiqTutorialStage19);
}

function ubiqTutorialStage19() {
  fadeInHtml(P(T("tutorial.stage19p1")),
             P(T("tutorial.stage19p2")),
             P(stageLink(20, T("tutorial.stage19p3"))));
}

function ubiqTutorialStage20() {
  $("#tutorial-contents-div").html("aglet");
  fadeInHtml(P(T("tutorial.stage20p1")),
             P(STRONG(T("tutorial.stage20p2"))));
  waitForUserAction(ubiqWindowIsUp, ubiqTutorialStage21);
}

function ubiqTutorialStage21() {
  fadeInHtml(P(T("tutorial.stage21p1")));
  waitForUserAction(function() ubiqSuggestionIs("google"),
                    ubiqTutorialStage22);
}

function ubiqTutorialStage22() {
  fadeInHtml(P(T("tutorial.stage22p1")),
             P(T("tutorial.stage22p2")),
             P(T("tutorial.stage23p3")));
  waitForUserAction(ubiqWindowIsDown, ubiqTutorialStage23);
}

function ubiqTutorialStage23() {
  $("#tutorial-contents-div").slideUp();
  moveDivRight();
  fadeInHtml(H2(T("tutorial.stage23h1")),
             P(T("tutorial.stage23p1")),
             P(T("tutorial.stage23p2")),
             P(T("tutorial.stage23p3")),
             P(STRONG(T("tutorial.stage23p4"))));
  waitForUserAction(ubiqWindowIsUp, ubiqTutorialStage24);
}

function ubiqTutorialStage24() {
  fadeInHtml(P(T("tutorial.stage24p1")),
             P(STRONG(T("tutorial.stage24p2"))));
  waitForUserAction(function() (ubiqSuggestionIs("help") &&
                                ubiqSuggestionIs("tab")),
                    ubiqTutorialStage25);
}

function ubiqTutorialStage25() {
  fadeInHtml(P(T("tutorial.stage25p1")),
             P(T("tutorial.stage25p2")),
             P(T("tutorial.stage25p3")));
  waitForUserAction(ubiqWindowIsDown, ubiqTutorialStage26);
}

function ubiqTutorialStage26() {
  fadeInHtml(P(T("tutorial.stage26p1")),
             P(T("tutorial.stage26p2")),
             P(T("tutorial.stage26p3")),
             P(T("tutorial.stage26p4")));
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

