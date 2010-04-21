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

var tunerInterface = {
  //startTime: 0,
  //endTime: 0,
  //runtimes: 0,
  //currentLang: UbiquitySetup.languageCode,
  parser: null,
  fakeQuery: {
    dump: function(x) { dump(x+'\n'); },
    finished: false,
//    _requestCount: 0,
//    _outstandingRequests: [],
    _verbedParses: [],
    finishQuery: function() {}
  },
  _allNounTypeIds: {},
  run: function() {
    let input = $('.input').val();
    if (!input)
      return;

    this.parser.flushNounCache();
    var fakeQuery = this.fakeQuery;
    fakeQuery._detectionTracker = new NounTypeDetectionTracker(fakeQuery);

    var nounTypeIdsToCheck = this._allNounTypeIds;

    $('#suggs tbody tr').remove();
    for (let id in nounTypeIdsToCheck) {
      initialDisplay(this.parser._nounTypes[id]);
    }

    var formatScore = function(x) {
      return x ? Math.round(x*100)/100 : '?';
    }

    var displayScore = function(x) {
      for (let id in tunerInterface.parser._nounCache.cacheSpace[x]) {
        let suggs = tunerInterface.parser._nounCache.getSuggs(x,id);

        if (!suggs || !suggs.length)
          continue;

        let sugg = suggs.pop();
        $(id+' td.sugg').text(sugg.text);
        $(id+' .scoreval').text(formatScore(sugg.score));
        $(id+' .scorebar').css('width', Math.min(sugg.score * 500,500));

        while (sugg = suggs.pop()) {
        // Swapped instances of &nbsp; with &#160; for it to show up under xhtml -L
          $('<tr>'
            +'<td class="id">&#160;</td><td class="sugg">'+$('<div/>').text(sugg.text).html()+'</td>'
            +'<td class="score"><div class="scorebar" style="width: '
              + Math.min(sugg.score * 500,500) + 'px"></div> '
              +'<span class="scoreval">'+formatScore(sugg.score)+'</span></td>'
            +'</tr>').insertAfter($(id));
        }

      }
    }

    this.parser.detectNounType(this.fakeQuery,input,nounTypeIdsToCheck,
                               displayScore);
  }
}

function initialDisplay(nountype) {
  var el =
    $('<tr id="'+nountype.id.replace('#','')+'"><td class="id">'+nountype.id+'</td><td class="sugg">&#160;</td><td class="score"><div class="scorebar" style="width:0px;">&#160;</div> <span class="scoreval"></span></td></tr>');
  $('#suggs tbody').append(el);
}

function getParser(sync) {
  if (sync) {
    var {gUbiquity} = Utils.currentChromeWindow;
    if (gUbiquity) return gUbiquity.cmdManager.__nlParser;
    else $('#gubiquity').show();
  }
  eval(Utils.getLocalUrl("resource://ubiquity/modules/parser/new/"+
                         UbiquitySetup.languageCode + ".js"), "utf-8");
  return makeParser();
}

$(document).ready(function(){
  var [gUSync] = $("#gu-sync").change(function(){ location.reload() });
  var parser = tunerInterface.parser = getParser(gUSync.checked);
  parser.setCommandList(UbiquitySetup.createServices()
                        .commandSource.getAllCommands());
  tunerInterface._allNounTypeIds = {};
  for each (let nt in parser._nounTypes) {
    tunerInterface._allNounTypeIds[nt.id] = true;
  }

/*  for (let id in parser._nounTypes) {
    let nountype = parser._nounTypes[id];
    $('<li><code>'+id+'</code>: {label: <code>'+nountype.label+'</code>, '
      +'name: <code>'+nountype.name+'</code>}</li>')
      .appendTo($('#nountypes'));
  }*/

  if (UbiquitySetup.parserVersion != 2) {
    $('#parser2').show();
  }

  function run() {
    tunerInterface.startTime = new Date().getTime();
    tunerInterface.run();
  }

  $('.input').keyup(function autoRun(e){
    if ($('#autorun')[0].checked) {
      var input = $('.input').val();
      if (input && autoRun.lastInput !== (autoRun.lastInput = input))
        run();
    }
    else if (e.keyCode === KeyEvent.DOM_VK_RETURN) run();
  });
  $('#run').click(run);
});
