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

function ubiqSuggestionIs(text) {
  let verb = getGUbiq().cmdManager.getHilitedSuggestionDisplayName();
  //$("#debug").html(verb);
  return (verb.indexOf(text) > -1);
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
  ctx.lineWidth = 2.0;
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
  let ubiqBottom = $(getGUbiq().msgPanel).height();
  let theDiv = $("#interactive-tutorial-div");
  let divBottom = theDiv.offset().top + theDiv.height();
  let divRight = theDiv.offset().left + theDiv.width();
  let canvas = createCanvas(0, divBotton, divRight, 300 );

  var ctx = canvas.getContext("2d");
  ctx.strokeStyle = "green";
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo( theDiv.offset().left + 50, divBottom);
  ctx.lineTo( theDiv.offset().left + 50, ubiqBottom + 50);
  ctx.lineTo( 200, ubiqBottom + 50);
  ctx.lineTo( 200, ubiqBottom );
  ctx.lineTo( 175, ubiqBottom + 25);
  ctx.lineTo( 200, ubiqBottom );
  ctx.lineTo( 225, ubiqBottom + 25);
  ctx.stroke();
}

function showArrowToPreview() {
  /* TODO: the bracket is much too tall.
   *
   */
  let theDiv = $("#interactive-tutorial-div");
  // Note, msgpanel is XUL so don't try to use jQuery on it
  let panel = getGUbiq().msgPanel;
  let ubiqTop = panel.boxObject.y;
  let ubiqHeight = 400; //panel.boxObject.height;

  let canvas = createCanvas( theDiv.offset().left, ubiqTop,
                             50, ubiqHeight);

  theDiv.css("left", (theDiv.offset().left + 50) + "px");
  theDiv.width( theDiv.width() - 50 );

  var ctx = canvas.getContext("2d");
  ctx.strokeStyle = "green";
  ctx.lineWidth = 2.0;
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

  var html = "<p>Welcome to the Ubiquity Tutorial.</p>"
    + "<p><a onclick='ubiqTutorialStage1();'>Click Here to Start"
    + " From The Beginning</a><p>"
    + "<p>Start from the middle:</p><ol>"
    + "<li><a onclick='ubiqTutorialStage1();'>How to start Ubiquity</a></li>"
    + "<li><a onclick='ubiqTutorialStage3();'>Weather command; previews</a></li>"
    + "<li><a onclick='ubiqTutorialStage7();'>Calculate command; abbreviations</a></li>"
    + "<li><a onclick='ubiqTutorialStage12();'>Wikipedia command; the suggestion list</a></li>"
    + "<li><a onclick='ubiqTutorialStage16();'>Translate command; executing commands</a></li>"
    + "</ol>";
  fadeInText( html );
}

function ubiqTutorialStage1() {

  var keyCombo = PrefKeys.getKeyCombo();
  var introHtml = "<p>Ubiquity Tutorial, part 1 of 6: How to start Ubiquity"
    + "<p>Welcome to the Ubiquity tutorial.  </p>"
    + "<p>Let's get started.  To summon Ubiquity, do this now:</p>"
    + "<p><b>Hold down the " +  keyCombo[0] + " key and tap the "
    + keyCombo[1] + " key.</b></p>";

  fadeInText(introHtml);

  waitForUserAction( ubiqWindowIsUp, ubiqTutorialStage2 );
}

function ubiqTutorialStage2() {
  moveDivRight();
  let stage2Html = "<p>This is the Ubiquity <b>input box</b>.  You can"
  + " type commands here.</p><p>If you want to get out of Ubiquity without"
  + " giving a command, <b>tap the Escape key</b>.  Try that now.</p>";

  fadeInText(stage2Html);
  showArrowToInputBox();
  waitForUserAction( function() { return !ubiqWindowIsUp(); },
                     ubiqTutorialStage3 );
}


function ubiqTutorialStage3() {
  var keyCombo = PrefKeys.getKeyCombo();
  let stage3Html = "<p>Ubiquity Tutorial, part 2 of 6: "
    + " Weather command and Previews</p>"
    + "<p>OK, so now let's learn a command. Summon Ubiquity again...</p>"
    + "<p>(Remember, <b>hold down the " + keyCombo[0] + " key and tap the "
    + keyCombo[1] + " key.</b>)</p>";
  fadeInText(stage3Html);
  destroyCanvas();
  waitForUserAction( ubiqWindowIsUp,
                     ubiqTutorialStage4 );
}

function ubiqTutorialStage4() {
  moveDivRight();
  let stage4Html = "<p>Now type the word <b>weather</b>....</p>";
  fadeInText(stage4Html);
  showArrowToInputBox();
  waitForUserAction( function() { return ubiqSuggestionIs("weather"); },
                     ubiqTutorialStage5 );
}

function ubiqTutorialStage5() {
  let stage5Html = "<p>Even before you're done typing, the <b>preview area</b>"
    + " shows a preview of the results of your command -- in this case, a "
    + " weather report.</p>"
    + "<p>If you don't enter a location, the <i>weather</i> command takes a"
    + " guess where you are.</p>"
    + "<p>Now let's give it a location: <b>type a space, and then the word"
    + " Chicago</b>.";

  fadeInText(stage5Html);
  destroyCanvas();
  showArrowToPreview();
  waitForUserAction(function() {return ubiqSuggestionIs("chicago"); },
                    ubiqTutorialStage6 );
}

function ubiqTutorialStage6() {
  let stage6Html = "<p>See how that works?  Feel free to delete"
  + " &quot;chicago&quot; and try some other locations.</p>"
  + " <p>When you're done checking the weather, <b>hit the escape key.</b></p>";
  destroyCanvas();
  moveDivRight();
  fadeInText(stage6Html);
  waitForUserAction( function() { return !ubiqWindowIsUp(); },
                     ubiqTutorialStage7 );
}

function ubiqTutorialStage7() {
  destroyCanvas();
  let stage7Html = "<p>Ubiquity Tutorial, part 3 of 6: "
    + " Calculate command and Abbreviations</p>"
    + " <p>Summon Ubiquity again, and we'll learn some"
    + " more commands.</p>";
  fadeInText(stage7Html);
  waitForUserAction( ubiqWindowIsUp, ubiqTutorialStage8 );
}

function ubiqTutorialStage8() {
  moveDivRight();
   let stage8Html = "<p>This time, <b>type just the letter 'c'</b>"
     + " (lower-case) and see what happens.</p>";
  fadeInText(stage8Html);
  showArrowToInputBox();
  waitForUserAction( function() {return ubiqSuggestionIs("convert" );},
                     ubiqTutorialStage9 );
}

function ubiqTutorialStage9() {
   let stage9Html = "<p>The Ubiquity <b>suggestion list</b> displays all of"
    + " the commands that start with the letter 'C'.</p>"
    + " <p>Let's say you want the <i>calculate</i> command.  You don't have"
    + " to type the whole command name.  Just <b>type the letter 'A'</b>"
    + " (so that your input says <b>'ca'</b>).</p>";
  fadeInText(stage9Html);
  destroyCanvas();
  // showArrowToSuggestionList();
  waitForUserAction( function() {return ubiqSuggestionIs("calculate" );},
                     ubiqTutorialStage10 );
}

function ubiqTutorialStage10() {
   let stage10Html = "<p>Now <b>type a space, and then type 22/7</b>"
    + " (so that your input says <b>'ca 22/7'</b>.)</p>";
  fadeInText(stage10Html);
  showArrowToInputBox();
  waitForUserAction( function() {return ubiqSuggestionIs("22/7" );},
                     ubiqTutorialStage11 );
}

function ubiqTutorialStage11() {
   let stage11Html = "<p>The <i>calculate</i> command will show you the"
  + " result of any arithmetic expression you type in.</p>"
  + "<p>When you're done experimenting with <i>calculate</i>, <b>hit the "
  + "escape key.</b></p>";
  fadeInText(stage11Html);
  destroyCanvas();
  showArrowToPreview();
  waitForUserAction( function() {return !ubiqWindowIsUp();},
                     ubiqTutorialStage12 );
}

function ubiqTutorialStage12() {
  let stage12Html = "<p>Ubiquity Tutorial, part 4 of 6:"
    + " Wikipedia command and the suggestion list</p>"
    + "<p>Summon Ubiquity again...</p>";
  fadeInText(stage12Html);
  destroyCanvas();
  moveDivRight();
  waitForUserAction( ubiqWindowIsUp,
                     ubiqTutorialStage13 );
}

function ubiqTutorialStage13() {
  moveDivRight();
  let stage13Html = "<p><b>Type the letter 'W', a space, and the word 'cheese'</b>.</b></p>"
    + "<p>(Like, 'w cheese').</p>";
  fadeInText(stage13Html);
  waitForUserAction(  function() {return ubiqSuggestionIs("cheese" );},
                     ubiqTutorialStage14 );
}

function ubiqTutorialStage14() {
  // todo explain suggestion list, arrow keys
  let stage14Html = "<p>Now <b>tap the down-arrow key</b> until the " +
    "<i>wikipedia</i> command is hilighted.</p>";
  fadeInText(stage14Html);
  waitForUserAction(  function() {return ubiqSuggestionIs("wikipedia" );},
                     ubiqTutorialStage15 );
}

function ubiqTutorialStage15() {
  let stage15Html = "<p>The <i>Wikipedia</i> command preview shows a snippet"
  + " from each article on Wikipedia matching your search term.</p>"
  + "<p>Those article titles are links -- you can click on one of them to "
  + "open the article in a new page.</p>"
  + "<p>When you're done, close that page and come back here, or just <b>tap"
  + " escape</b> to move on with the tutorial.</p>";
  fadeInText(stage15Html);
  destroyCanvas();
  showArrowToPreview();
  waitForUserAction( function() {return !ubiqWindowIsUp();},
                     ubiqTutorialStage16 );
}

function ubiqTutorialStage16() {
  moveDivRight();
  destroyCanvas();
  let stage16Html = "<p>Ubiquity Tutorial, part 5 of 6:"
  + " Translate command and execution</p>"
  + "<p>Some commands can transform part of the web page "
  + "you are looking at.  Use the mouse to <b>select the Japanese text</b> below."
  + "Then <b>summon Ubiquity</b>.</p>";

  fadeInText(stage16Html);

  let jpDiv = $("#tutorial-contents-div");
  jpDiv.addClass("ubiq-tutorial");
  jpDiv.css("text-align", "center");
  //jpDiv.html("古池や" + "<br/>" + "蛙飛び込む" + "<br/>" + "水の音");
  jpDiv.html("年くれぬ傘着て草鞋はきながら");
    //"toshi kurenu / kasa kite waraji / hakinagara");

  // TODO break into two divs... put the jpDiv down below...


  /*waitForUserAction( ubiqWindowIsUp,
                     ubiqTutorialStage17 );*/
}

/* Tutorial problems
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
 * Translated japanese text, output of calculate command, etc. must be way
 * more obvious -- it looks like nothing has happened.
 *
 * Start by showing an animation of ubiquity in action so they know what to
 * expect.
 *
 * Describe the benefit by saying "here's how you would have had to do this
 * before... see how much faster it is"
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

