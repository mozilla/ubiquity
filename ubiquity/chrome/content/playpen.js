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
  startTime: 0,
  endTime: 0,
  runtimes: 0,
  currentLang: UbiquitySetup.languageCode,
  currentParser: null,
  currentQuery: {},
  parse: function() {
    if (this.currentQuery.cancel != undefined)
      if (!this.currentQuery.finished)
        this.currentQuery.cancel();
    this.currentParser._nounCache = {};

    $('#parseinfo').empty();
    this.currentQuery = this.currentParser.newQuery($('.input').val(),{},$('#maxSuggestions').val(),true); // this last true is for dontRunImmediately
    
    // custom flag to make sure we don't onResults multiple times per query.
    this.currentQuery.resulted = false;
    
    // override the selection object
    this.currentQuery.selObj = {text: $('#selection').val(), 
                                html: $('#selection').val()};
    
    $('#scoredParses').empty();

    if ($('#displayparseinfo').attr('checked') 
        && this.runtimes + 2 > $('.runtimes').text()) {
      this.currentQuery.watch('_step',function(id,oldval,newval) {
        switch (oldval) {
          case 1:
            $('<h3>step 1: split words</h3><code>'+this._input+'</code>').appendTo($('#parseinfo'));
            break;
  
          case 2:
            $('<h3>step 2: pick possible verbs</h3><ul id="preParses"></ul>').appendTo($('#parseinfo'));
            for each (preParse in this._preParses) {
              $('<li>V: <code title="'+(preParse._verb.id || 'null')+'">'+(preParse._verb.text || '<i>null</i>')+'</code>, argString: <code>'+preParse.argString+'</code>, sel: <code>'+preParse.sel+'</code></li>').appendTo($('#preParses'));
            }
            break;
        
          case 3:
            $('<h3>step 3: pick possible clitics (TODO)</h3>').appendTo($('#parseinfo'));
            break;
  
          case 4: 
            $('<h3>step 4: group into arguments</h3><ul id="argParses"></ul>').appendTo($('#parseinfo'));
            for each (var parse in this._possibleParses) {
              $('#argParses').append('<li>' + parse.displayText + '</li>');
            }
            $('<p><small>'+this._possibleParses.length+' possible parses</small></p>').appendTo($('#parseinfo'));
            break;
  
          case 5:
            $('<h3>step 5: anaphora substitution</h3><ul id="newPossibleParses"></ul>').appendTo($('#parseinfo'));
            for each (var parse in this._possibleParses) {
              $('#newPossibleParses')
                .append('<li>' + parse.displayText + '</li>');
            }
            $('<p><small>'+this._possibleParses.length+' possible parses</small></p>').appendTo($('#parseinfo'));
            break;
          
          case 6:
            $('<h3>step 6: substitute normalized arguments</h3><ul id="normalizedArgParses"></ul>').appendTo($('#parseinfo'));
            for each (var parse in this._possibleParses) {
              $('#normalizedArgParses')
                .append('<li>' + parse.displayTextDebug + '</li>');
            }
            $('<p><small>'+this._possibleParses.length+' possible parses</small></p>').appendTo($('#parseinfo'));
            break;
          
          case 7:
            $('<h3>step 7: apply objects to other roles for parses with no verb</h3><ul id="otherRoleParses"></ul>').appendTo($('#parseinfo'));
            for each (var parse in this._possibleParses) {
              $('#otherRoleParses')
                .append('<li>' + parse.displayTextDebug + '</li>');
            }
            $('<p><small>'+this._possibleParses.length+' possible parses</small></p>').appendTo($('#parseinfo'));
            break;
          
          case 8:
            $('<h3>step 8: suggest verbs</h3><ul id="verbedParses"></ul>').appendTo($('#parseinfo'));
            for each (var parse in this._verbedParses) {
              $('#verbedParses')
                .append('<li>' + parse.displayTextDebug + '</li>');
            }
            $('<p><small>'+this._verbedParses.length+' parses with verbs</small></p>').appendTo($('#parseinfo'));
            break;
  
          case 9:
          case 10:
          case 11:
            /*$('<h3>step 7: noun type detection</h3><ul id="nounCache"></ul>').appendTo($('#parseinfo'));
            for (var text in nounCache) {
              var html = $('<li><code>'+text+'</code></li>');
              var list = $('<ul></ul>');
              for each (let suggestion in nounCache[text]) {
                $('<li>type: <code>'+suggestion.nountype.name+'</code>, suggestion: '+suggestion.text+', score: '+suggestion.score+'</li>').appendTo(list);
              }
              list.appendTo(html);
              html.appendTo($('#nounCache'));
            }*/

	          let suggestionList = this.suggestionList;
            $('<h3>step 9: fill in noun suggestions</h3><ul id="suggestedParses"></ul>').appendTo($('#parseinfo'));
            for each (let parse in suggestionList) {
              $('#suggestedParses')
                .append('<li>' + parse.displayTextDebug + '</li>');
            }
            $('<p><small>'+suggestionList.length+' parses with noun suggestions swapped in</small></p>').appendTo($('#parseinfo'));
  
  
            $('<h3>step 11: ranking</h3><ul id="debugScoredParses"></ul>').appendTo($('#parseinfo'));
            var allScoredParses = this.aggregateScoredParses();
	          for each (let parse in allScoredParses) {
              $('#debugScoredParses')
                .append('<li>' + parse.displayTextDebug + '</li>');
            }
            $('<p><small>'+allScoredParses.length+' scored parses</small></p>').appendTo($('#parseinfo'));
            break;
  
        }
        
        return newval;
      });
    }
    
    this.currentQuery.onResults = function() {
      if (this.finished && !this.resulted) {
        this.resulted = true;
        demoParserInterface.runtimes++;
        $('.current').text(demoParserInterface.runtimes);
        dump(demoParserInterface.runtimes+' done\n');
        var suggestionList = this.suggestionList;
        if (demoParserInterface.runtimes < $('.runtimes').text())
          demoParserInterface.parse();
        else {
	        $('#scoredParses').empty();
          for each (var parse in suggestionList) {
            $('#scoredParses')
              .append('<tr><td>' + parse.displayTextDebug + '</td></tr>');
          }

          demoParserInterface.endTime = new Date().getTime();

          dump('DURATION: '+(demoParserInterface.endTime - demoParserInterface.startTime)+'\n');
          $('.total').text(demoParserInterface.endTime - demoParserInterface.startTime);

          dump('AVG: '+(demoParserInterface.endTime - demoParserInterface.startTime)/demoParserInterface.runtimes+'\n');
          $('.avg').text(Math.round((demoParserInterface.endTime - demoParserInterface.startTime) * 100/demoParserInterface.runtimes)/100);

          
        }
      }
    }
    this.currentQuery.run();
    
  }
}


$(document).ready(function(){

  try {  
    var gUbiquity = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator).getMostRecentWindow("navigator:browser").gUbiquity;
    demoParserInterface.currentParser = gUbiquity.__cmdManager.__nlParser;

    let parser = demoParserInterface.currentParser;

    for each (let {role, delimiter} in parser.roles) {
      $('<li><code>'+role+'</code>: &quot;'+delimiter+'&quot;</li>').appendTo($('#roles'));
    }

    for (let id in parser._nounTypes) {
      let nountype = parser._nounTypes[id];
      $('<li><code>'+id+'</code>: {label: <code>'+nountype.label+'</code>, '
                                 +'name: <code>'+nountype.name+'</code>,...}</li>')
                          .appendTo($('#nountypes'));
    }
    
    for each (let verb in parser._verbList) {
      let {names, help, description} = verb;
      let args = $('<ul></ul>');
      for each (let {nountype, role, label} in verb.arguments) {
        $('<li>role: <code>'+role+'</code>, nountype: <code>'+nountype.id+'</code></li>').appendTo(args);
      }
      let item = $('<li><b><code>'+names[0]+'</code></b></li>');
      if (verb.arguments.length) {
        $(':<br/>').appendTo(item);
        args.appendTo(item);
      }
      item.appendTo($('#verblist'));
    }

  } catch (e) {
    $('#gubiquity').show();
  }

  if (UbiquitySetup.parserVersion != 2) {
    $('#parser2').show();
  }
  
  function run() {
    demoParserInterface.startTime = new Date().getTime();
    $('.runtimes').text($('#times').val());
    demoParserInterface.runtimes = 0;
    demoParserInterface.parse();
  }
  
  $('.input').keyup(function autoParse(){
    if (!$('#autoparse')[0].checked) return;
    var input = $('.input').val();
    if (input && autoParse.lastInput !== (autoParse.lastInput = input))
      run();
  });
  $('#run').click(run);

  //$('#clearnouncache').click(function() { nounCache = []; });
  
  $('.toggle').click(function(e){$(e.currentTarget).siblings().toggle();});

});
