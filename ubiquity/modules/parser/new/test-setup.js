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

// import NLParser2 and parserRegistry
Components.utils.import("resource://ubiquity/modules/parser/new/namespace.js");

// set up the interface which will control the parser.

var demoParserInterface = {
  currentLang: 'en',
  currentParser: {},
  currentQuery: {},
  parse: function() {

    nounCache = [];
    
    this.currentQuery = this.currentParser.newQuery($('.input').val(),{},5,true);
    // this last true is for dontRunImmediately
    
    // override the selection object
    this.currentQuery.selObj = {text: $('#selection').val(), 
                                html: $('#selection').val()};
    
    $('#scoredParses').empty();
    
    this.currentQuery.onResults = function() {
      if (this.finished) {
        $('#scoredParses').empty();
        for each (var parse in this.suggestionList) {
          $('<tr><td>'+parse.getDisplayText()+'</td></tr>').appendTo($('#scoredParses'));
        }
        $('#timeinfo span').text((this._times[this._times.length-1] - this._times[0])+'ms');
      }
    }
    
    this.currentQuery.run();
    
  },
  loadLang: function(lang) {
    this.currentLang = lang;
    var jsm = {};
    Components.utils.import("resource://ubiquity/modules/parser/new/fake_verbs_and_nountypes.js",jsm);
  
    this.currentParser = NLParser2.makeParserForLanguage(lang,jsm.sampleVerbs,jsm.nounTypes);
  }
}


$(document).ready(function(){
    
  for (let code in parserRegistry) {
    $('#languages').append($("<input name='lang' value='"+code+"' type='radio'>"
                              +parserRegistry[code]+'</input>'));
  }

  // if nothing is selected, select English
  if ($('input[name=lang]:checked').val() == null)
    $('input[value=en]').click();
  $('input[name=lang]').click(function(e){demoParserInterface.loadLang($('input[name=lang]:checked').val());});
  demoParserInterface.loadLang($('input[name=lang]:checked').val())
  
  $('#run').click(function(){demoParserInterface.parse()});
  
});
