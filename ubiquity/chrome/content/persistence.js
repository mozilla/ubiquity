/***** BEGIN LICENSE BLOCK *****
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
 *   Michael Yoshitaka Erlewine <mitcho@mitcho.com>
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

Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/setup.js");

// set up the interface which will control the parser.

var Cc = Components.classes;
var Ci = Components.interfaces;

var demoParserInterface = {
  currentParser: null,
  currentQuery: {},
  parse: function() {
    if (this.currentQuery.cancel != undefined)
      if (!this.currentQuery.finished)
        this.currentQuery.cancel();
    
//    if ($('#flushcache').attr('checked'))
//      this.currentParser.flushNounCache();

    this.currentQuery = this.currentParser.newQuery($('#input').val(),{},5,true); // this last true is for dontRunImmediately

    // custom flag to make sure we don't onResults multiple times per query.
    this.currentQuery.resulted = false;
    
    // override the selection object
    this.currentQuery.selObj = {text: $('#selection').val(), 
                                html: $('#selection').val()};
    
    $('#realCSS').text($('#CSS').val());
    
    this.currentQuery.onResults = function() {
      if (this.finished && !this.resulted) {
        this.resulted = true;
      }
      var resultsHtml = [s.displayHtml for each (s in this.suggestionList)];
      with ({Utils:Utils,results:resultsHtml,jQuery:jQuery}) {
        eval($('#onResults').val());
      }
    }
    this.currentQuery.run();
    
  }
}

function enforceOS() {
  $('#awesomebar').removeClass('mac');
  $('#awesomebar').removeClass('linux');
  $('#awesomebar').removeClass('vista');
  $('#awesomebar').addClass($('.os:checked').val());
}

$(document).ready(function(){
  var [gUSync] = $("#gu-sync").change(function(){ location.reload() });
  var gUbiquity = Utils.currentChromeWindow.gUbiquity;
  if (!gUbiquity) {
    $('#gubiquity').show();
    return;
  }
  if (UbiquitySetup.parserVersion != 2) {
    $('#parser2').show();
    return;
  }
  var parser = gUbiquity.cmdManager.__nlParser;
  parser.setCommandList(UbiquitySetup.createServices()
                        .commandSource.getAllCommands());
  demoParserInterface.currentParser = parser;
  
  function onClose() {
    with ({Utils:Utils,jQuery:jQuery}) {
      eval($('#onClose').val());
    }
  }
  
  $('.os').click(enforceOS);
  enforceOS();
  
  $('#input').keyup(function autoParse(e){
    var input = $('.input').val();

    if (e.keyCode === KeyEvent.DOM_VK_ESCAPE)
      return onClose();
    if ((input && autoParse.lastInput !== (autoParse.lastInput = input))
        || e.keyCode === KeyEvent.DOM_VK_RETURN)
      demoParserInterface.parse();
  });
  
  $('.toggle').click(function(e){$(e.currentTarget).siblings().toggle('slow');});

});
