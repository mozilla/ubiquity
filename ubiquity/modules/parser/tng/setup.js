// set up the interface which will control the parser.

var demoParserInterface = {
  currentLang: 'en',
  currentQuery: { cancel: function(){} },
  parse: function() {
    if (this.currentQuery != undefined)
      if (!this.currentQuery.finished)
        this.currentQuery.cancel();

    $('#parseinfo').empty();
    this.currentQuery = window[this.currentLang].newQuery($('.input').val(),{getSelection:function() $('#selection').val()},$('#maxSuggestions').val()*1);
    this.currentQuery._threshold = $('#threshold').val()*1;
    if (!$('#async').attr('checked'))
      this.currentQuery._async = false;
    this.currentQuery.watch('_step',function(id,oldval,newval) {
      let timefactor = 4;
      if (oldval > 0)
        $('#timeinfo div').eq(oldval).css('width',(this._times[oldval] - this._times[oldval-1]) * timefactor);

      if ($('#displayparseinfo').attr('checked')) {
        switch (oldval) {
          case 1:
            $('<h3>step 1: split words</h3><code>'+this._input+'</code>').appendTo($('#parseinfo'));
            break;

          case 2:
            $('<h3>step 2: pick possible verbs</h3><ul id="verbArgPairs"></ul>').appendTo($('#parseinfo'));
            for each (pair in this._verbArgPairs) {
              $('<li>V: <code title="'+(pair.verb.id || 'null')+'">'+(pair.verb.text || '<i>null</i>')+'</code>, argString: <code>'+pair.argString+'</code></li>').appendTo($('#verbArgPairs'));
            }
            break;
        
          case 3:
            $('<h3>step 3: pick possible clitics (TODO)</h3>').appendTo($('#parseinfo'));
            break;

          case 4: 
            $('<h3>step 4: group into arguments</h3><ul id="argParses"></ul>').appendTo($('#parseinfo'));
            for each (var parse in this._possibleParses) {
              $('<li>'+parse+'</li>').appendTo($('#argParses'));
            }
            $('<p><small>'+this._possibleParses.length+' possible parses</small></p>').appendTo($('#parseinfo'));
            break;

          case 5:
            $('<h3>step 5: anaphora substitution</h3><ul id="newPossibleParses"></ul>').appendTo($('#parseinfo'));
            for each (var parse in this._possibleParses) {
              $('<li>'+parse+'</li>').appendTo($('#newPossibleParses'));
            }
            $('<p><small>'+this._possibleParses.length+' possible parses</small></p>').appendTo($('#parseinfo'));
            break;
          
          case 6:
            $('<h3>step 6: suggest verbs</h3><ul id="verbedParses"></ul>').appendTo($('#parseinfo'));
            for each (var parse in this._verbedParses) {
              $('<li>'+parse+'</li>').appendTo($('#verbedParses'));
            }
            $('<p><small>'+this._verbedParses.length+' parses with verbs</small></p>').appendTo($('#parseinfo'));
            break;

          case 7:
            $('<h3>step 7: noun type detection</h3><ul id="nounCache"></ul>').appendTo($('#parseinfo'));
            for (var text in nounCache) {
              var html = $('<li><code>'+text+'</code></li>');
              var list = $('<ul></ul>');
              for (let type in nounCache[text]) {
                for each (let suggestion in nounCache[text][type]) {
                  $('<li>type: <code>'+type+'</code>, suggestion: '+suggestion.text+', score: '+suggestion.score+'</li>').appendTo(list);
                }
              }
              list.appendTo(html);
              html.appendTo($('#nounCache'));
            }
            break;

          case 8:
            $('<h3>step 8: fill in noun suggestions</h3><ul id="suggestedParses"></ul>').appendTo($('#parseinfo'));
            for each (let parse in this._suggestedParses) {
              $('<li>'+parse+'</li>').appendTo($('#suggestedParses'));
            }
            $('<p><small>'+this._suggestedParses.length+' parses with noun suggestions swapped in</small></p>').appendTo($('#parseinfo'));
            break;

          case 9:
            $('<h3>step 9: ranking</h3><ul id="debugScoredParses"></ul>').appendTo($('#parseinfo'));
            for each (let parse in this._scoredParses) {
              $('<li>'+parse+' '+Math.floor(100*parse.score)/100+'</li>').appendTo($('#debugScoredParses'));
            }
            $('<p><small>'+this._scoredParses.length+' scored parses</small></p>').appendTo($('#parseinfo'));
            break;

        }
      }
      
      if (oldval == 9) {
        $('#timeinfo span').text((this._times[7] - this._times[0])+'ms');
      }      
      
      return newval;
    });
    
    this.currentQuery.onResults = function() {
      $('#scoredParses').empty();
      for each (var parse in this._scoredParses.slice(0,this.maxSuggestions)) {
        $('<tr><td>'+parse+'</td><td>'+Math.floor(100*parse.score)/100+'</td></tr>').appendTo($('#scoredParses'));
      }
    }
    this.currentQuery.run();
//    setTimeout(function(x){x.currentQuery.run()},0,this);
//    dump('finish');
//    return false;
    
  },
  loadLang: function(lang) {
    this.currentLang = lang;

    nounCache = [];
  
    window[this.currentLang].setCommandList(verbs);
    window[this.currentLang].initialCache();
  
    $('#roles').empty();
    for each (role in window[this.currentLang].roles) {
      $('<li><code>'+role.role+'</code>, delimiter: <code>'+role.delimiter+'</code></li>').appendTo($('#roles'));
    }
  
    $('#nountypes').empty();
    for (let type in nounTypes) {
      $('<li><code>'+type+'</code>'+(nounTypes[type].list != undefined ? ': {<code>'+nounTypes[type].list.join('</code>, <code>')+'</code>}':'')+'</li>').appendTo($('#nountypes'));
    }
  
    $('#verblist').empty();
    for (verb in verbs) {
      var li = $('<li><code>'+verb+'</code> (<code>'+(verbs[verb].names[window[this.currentLang].lang] || verbs[verb].names['en']).join('</code>, <code>')+'</code>)</li>');
      var ul = $('<ul></ul>');
      for each (arg in verbs[verb].arguments)
        $('<li><code>'+arg.role+'</code>: <code>'+arg.nountype+'</code>').appendTo(ul);
      ul.appendTo(li);
      li.appendTo($('#verblist'));
    }
    
    $('#examples').html(window[this.currentLang].examples.map(function(code){return '<code>'+code+'</code>'}).join(', '));
    
  }
}


$(document).ready(function(){
  
  $('input[name=lang]').click(function(e){demoParserInterface.loadLang($('input[name=lang]:checked').val());});
  demoParserInterface.loadLang($('input[name=lang]:checked').val())
  
  $('.input').keyup(function(){demoParserInterface.parse()});
  $('#clearnouncache').click(function() { nounCache = []; });
  
  $('.toggle').click(function(e){$(e.currentTarget).siblings().toggle();});

});
