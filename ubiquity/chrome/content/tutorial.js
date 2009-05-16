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

  var html = "<h2>Welcome to the Ubiquity Tutorial.</h2>"
    + "<p><a onclick='ubiqTutorialStage1();'>Click Here to Start"
    + " From The Beginning</a><p>"
    + "<p>Start from the middle:</p><ol>"
    + "<li><a onclick='ubiqTutorialStage1();'>How to start Ubiquity</a></li>"
    + "<li><a onclick='ubiqTutorialStage3();'>Weather command; previews</a></li>"
    + "<li><a onclick='ubiqTutorialStage7();'>Calculate command; abbreviations</a></li>"
    + "<li><a onclick='ubiqTutorialStage12();'>Wikipedia command; the suggestion list</a></li>"
    + "<li><a onclick='ubiqTutorialStage16();'>Translate command; executing commands</a></li>"
    + "<li><a onclick='ubiqTutorialStage23();'>How to get help and learn more commands</a></li>"
    + "</ol>";
  fadeInText( html );
}

function ubiqTutorialStage1() {

  var keyCombo = PrefKeys.getKeyCombo();
  var introHtml = "<h2>Ubiquity Tutorial, part 1 of 6: How to start Ubiquity</h2>"
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
  let stage3Html = "<h2>Ubiquity Tutorial, part 2 of 6: "
    + " Weather command and Previews</h2>"
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
    + " shows a preview of the results of your command &mdash; in this case, a "
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
  let stage7Html = "<h2>Ubiquity Tutorial, part 3 of 6: "
    + " Calculate command and Abbreviations</h2>"
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
  showArrowToSuggestionList();
  waitForUserAction( function() {return ubiqSuggestionIs("calculate" );},
                     ubiqTutorialStage10 );
}

function ubiqTutorialStage10() {
   let stage10Html = "<p>Now <b>type a space, and then type 22/7</b>"
    + " (so that your input says <b>'ca 22/7'</b>.)</p>";
  fadeInText(stage10Html);
  destroyCanvas();
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
  let stage12Html = "<h2>Ubiquity Tutorial, part 4 of 6:"
    + " Wikipedia command and the suggestion list</h2>"
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
  showArrowToInputBox();
  waitForUserAction(  function() {return ubiqSuggestionIs("cheese" );},
                     ubiqTutorialStage14 );
}

function ubiqTutorialStage14() {
  // todo explain suggestion list, arrow keys!!
  let stage14Html = "<p>Now <b>tap the down-arrow key</b> until the " +
    "<i>wikipedia</i> command is hilighted.</p>";
  destroyCanvas();
  showArrowToSuggestionList();
  fadeInText(stage14Html);
  waitForUserAction(  function() {return ubiqSuggestionIs("wikipedia" );},
                     ubiqTutorialStage15 );
}

function ubiqTutorialStage15() {
  let stage15Html = "<p>The <i>Wikipedia</i> command preview shows a snippet"
  + " from each article on Wikipedia matching your search term.</p>"
  + "<p>Those article titles are links &mdash; you can click on one of them to "
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
  let stage16Html = "<h2>Part 5 of 6:"
  + " Selecting and Executing</h2>"
  + "<p>If you select text on a web page before summoning Ubiquity, then "
  + "you can have your commands do things to the selected text.</p></p>Let's see"
  + " an example. Use the mouse to <b>select the Japanese text</b> below."
  + " Then <b>summon Ubiquity</b>.</p>";

  fadeInText(stage16Html);

  let jpDiv = $("#tutorial-contents-div");
  jpDiv.addClass("ubiq-tutorial");
  jpDiv.css("text-align", "center");
  jpDiv.html("アドオンを選んで、自分だけのブラウザをつくろう。");
  //"二十一世紀にようこそ");
  // TODO machine translation falls down on the line above.

  waitForUserAction( ubiqWindowIsUp, ubiqTutorialStage17 );
}

function ubiqTutorialStage17() {
  let stage17Html = "<p>Now issue the <i>translate</i> command.</p>"
    + "<p>(<b>type 'translate'</b>, or just 'tr').</p>";

  fadeInText(stage17Html);

  waitForUserAction( function() {return ubiqSuggestionIs("translate");},
                     ubiqTutorialStage18);
}

function ubiqTutorialStage18() {
  let stage18Html = "<p>At this point, you could type in some words that"
    + " you want to have Ubiquity translate.  But as you can see in the preview"
    + " area, Ubiquity is already translating the words that you have"
    + " selected.</p>"
    + "<p>Next, <b>tap the enter key</b> to execute the command.";

  fadeInText(stage18Html);
  waitForUserAction( function() { return contentsDivHas("browser"); },
                     ubiqTutorialStage19 );
}

function ubiqTutorialStage19() {
  let stage19Html = "<p>Notice how the Japanese text that you selected was"
    + " <i>replaced</i> with the translation.  That's because you executed"
    + " the command by pressing 'enter'.</p>"
    + "<p>Each command does something different when you execute it.  Most"
    + " often, it will open a new page, or change something on the current"
    + " page.</p>"
    + "<p><a onclick='ubiqTutorialStage20();'>Click here to continue</a></p>";

  fadeInText(stage19Html);
}

function ubiqTutorialStage20() {
  let stage20Html = "<p>Let's do one more example.  Say you're browsing the"
    + " web and you come across an unfamiliar word, like the word 'aglet'."
    + "</p><p><b>Select the word 'aglet' and then summon Ubiquity</b>.</p>";
  let agDiv = $("#tutorial-contents-div");
  agDiv.html("aglet");

  fadeInText(stage20Html);

  waitForUserAction( ubiqWindowIsUp, ubiqTutorialStage21 );
}

function ubiqTutorialStage21() {
  let stage21Html = "<p>You don't want to translate this word, you want to"
  + " look it up.  So <b>issue the <i>google</i> command</b> (type 'google'"
  + " or just 'goo').</p>";

  fadeInText(stage21Html);
  waitForUserAction( function() {return ubiqSuggestionIs("google");},
                     ubiqTutorialStage22);
}

function ubiqTutorialStage22() {
  let stage22Html = "<p>Now, if the preview of the <i>google</i> command"
    + " tells you what you want to know, then you're done &mdash; you can dismiss"
    + " Ubiquity and go on your way.</p>"
    + "<p>But if you want more information, you can tap the enter key to "
    + " execute the <i>google</i> command, which will open the search results"
    + " in a new page.</p>"
    + "<p>It's up to you.</p>";
  fadeInText(stage22Html);
  waitForUserAction( function() {return !ubiqWindowIsUp();},
                     ubiqTutorialStage23 );
}

function ubiqTutorialStage23() {
  $("#tutorial-contents-div").slideUp();
  moveDivRight();
  let stage23Html = "<h2>Part 6 of 6: Getting Help and Learning"
    + " More Commands</h2>"
    + "<p>So far you've learned the <i>weather</i>, <i>calculate</i>, "
    + "<i>wikipedia</i>, <i>translate</i>, and <i>google</i> commands."
    + " That's a good start, but there are dozens more commands"
    + " included with Ubiquity &mdash; plus you can find more on the Web.</p>"
    + "<p>How will you find out what commands are available?</p>"
    + "<p>One way is by using the <i>help</i> command.</p>"
    + "<p><b>Summon Ubiquity...</b></p>";
  fadeInText(stage23Html);
  waitForUserAction( ubiqWindowIsUp, ubiqTutorialStage24 );
}

function ubiqTutorialStage24() {
  let stage24Html = "<p>Suppose you want to know if there are any commands"
    + " that deal with tabs.  You can use the <i>help</i> command like this:"
    + "</p><p><b>type 'help tab'</b>.</p>";

  fadeInText(stage24Html);
  waitForUserAction( function() {return ubiqSuggestionIs("help") &&
                                 ubiqSuggestionIs("tab");},
                     ubiqTutorialStage25);
}

function ubiqTutorialStage25() {
  let stage25Html = "<p>In the suggestion list, you can see all of the commands"
    + " that have 'tab' in their names.</p>"
    + "<p>Use the arrow keys to move through the suggestion list.  The preview"
    + " area shows help information about each command that you highlight.</p>"
    + "<p>When you're done, <b>tap escape</b>.</p>";

  fadeInText(stage25Html);
  waitForUserAction( function() {return !ubiqWindowIsUp();},
                     ubiqTutorialStage26 );
}

function ubiqTutorialStage26() {
  let stage26Html = "<p>Finally, there's the <i>command-list</i> command."
  + " This command will take you to a page that shows every command Ubiquity"
  + " has installed.  You can learn all sorts of useful things by browsing"
  + " the command-list page!</p>"
  + "<p>This is the end of the tutorial. Once you go to the command-list"
  + " page, you are on your own to experiment and learn new commands at your own pace.</p>"
  + "<p><b>Summon Ubiquity, issue 'command-list', and tap the enter key to"
  + " execute.</b></p><p>Good-bye!</p>";

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
 * Translated japanese text, output of calculate command, etc. must be way
 * more obvious -- it looks like nothing has happened.
 *
 * Start by showing an animation of ubiquity in action so they know what to
 * expect.
 *
 * Describe the benefit by saying "here's how you would have had to do this
 * before... see how much faster it is"
 *
 * Needs to be a way to get back to table of contents at any point -- maybe
 * even keep it up and show progress through it.
 *
 * Instead of arrows, maybe blink an outline around the actual part of the
 * actual ubiquity box.  OR show a little voodoo-doll and point to or circle
 * part of that one.
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

