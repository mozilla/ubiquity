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

// TODO: Move the div with the tutorial to the right so it's not
// covered by ubiquity window.

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
    $("#interactive-tutorial-div").css( "color", colorString );
  }

  setTextColor(color);
  $("#interactive-tutorial-div").html( text );

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
  $("#not-the-tutorial").css("display", "none");
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
  return (!getGUbiq().isWindowOpen);
}

function ubiqSuggestionIs(text) {
  let verb = getGUbiq().cmdManager.getHilitedSuggestionDisplayName();
  return (verb.indexOf(text) > -1);
}

function startUbiqTutorial() {

  hideOtherContent();
  var keyCombo = PrefKeys.getKeyCombo();
  

  var introHtml = "<p>Hi, I'm Jono from Mozilla Labs, one of the authors"
                  + " of Ubiquity.  Ubiquity makes the Internet do your bidding."
    + " This is the absolute basics tutorial.  Let's get started.</p>"
    + "<p><b>Hold down the " +  keyCombo[0] + " key and tap the " 
    + keyCombo[1] + " key.</b></p>";

  fadeInText(introHtml);

  waitForUserAction( ubiqWindowIsUp, ubiqTutorialStage2 );
}

function ubiqTutorialStage2() {
  moveDivRight();
  let stage2Html = "<p>OK, so now you have this box in the corner of"
  + " your screen (arrow to it).  This is the Ubiquity input box.  You can"
  + " type commands here. If you want to get out of Ubiquity without"
  + " giving a command, tap the Escape key.  Try that now.</p>";

  fadeInText(stage2Html);
  waitForUserAction( function() { return !ubiqWindowIsUp(); },
                     ubiqTutorialStage3 );
}


function ubiqTutorialStage3() {
  let stage3Html = "<p>OK, so now let's learn a command.  Bring up the input box again...</p>";
  fadeInText(stage3Html);
  waitForUserAction( ubiqWindowIsUp,
                     ubiqTutorialStage4 );
}

function ubiqTutorialStage4() {
  let stage4Html = "<p>Now type the word <b>weather</b>....</p>";
  fadeInText(stage4Html);
  waitForUserAction( function() { return ubiqSuggestionIs("weather"); },
                     ubiqTutorialStage5 );
}

function ubiqTutorialStage5() {
  let stage5Html = "<p>You have just given your first command to Ubiquity."
    + " Notice that the <b>Weather</b> command took a guess at your location.";
  fadeInText(stage5Html);
}