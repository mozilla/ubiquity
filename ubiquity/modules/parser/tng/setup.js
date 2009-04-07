// initialize the patternCache

var patternCache = {};

// set up the interface which will control the parser.

var demoParserInterface = {
  currentLang: 'en',
  currentQuery: { cancel: function(){} },
  parse: function() {
    if (this.currentQuery != undefined)
      this.currentQuery.cancel();

    $('#parseinfo').empty();
    this.currentQuery = window[this.currentLang].newQuery($('.input').val(),{},5);
    this.currentQuery.watch('_step',function(id,oldval,newval) {
      let timefactor = 7;
      if (oldval > 0)
        $('#timeinfo .step'+oldval).css('width',(this._times[oldval] - this._times[oldval-1]) * timefactor);

      if ($('#displayparseinfo').attr('checked')) {
        switch (oldval) {
          case 1:
            $('<h3>step 1: split words</h3><code>'+this._input+'</code>').appendTo($('#parseinfo'));
            break;

          case 2:
            $('<h3>step 2: pick possible verbs</h3><ul id="verbArgPairs"></ul>').appendTo($('#parseinfo'));
            for each (pair in this._verbArgPairs) {
              $('<li>V: <code title="'+(pair.verb || 'null')+'">'+(pair.verbName || '<i>null</i>')+'</code>, argString: <code>'+pair.argString+'</code></li>').appendTo($('#verbArgPairs'));
            }
            break;
        
          case 3:
            $('<h3>step 3: pick possible clitics (TODO)</h3>').appendTo($('#parseinfo'));
            break;

          case 4: 
            $('<h3>step 4: group into arguments</h3><ul id="argParses"></ul>').appendTo($('#parseinfo'));
            for each (var parse in this._possibleParses) {
              $('<li><span class="verb" title='+(parse.verb || 'null')+'>'+(parse.verbName || '<i>null</i>')+'</span>'+parse._display+'</li>').appendTo($('#argParses'));
            }
            $('<p><small>'+this._possibleParses.length+' possible parses</small></p>').appendTo($('#parseinfo'));
            break;

          case 5:
            $('<h3>step 5: anaphora substitution</h3><ul id="newPossibleParses"></ul>').appendTo($('#parseinfo'));
            for each (var parse in this._possibleParses) {
              $('<li><span class="verb" title='+(parse.verb || 'null')+'>'+(parse.verbName || '<i>null</i>')+'</span>'+parse._display+'</li>').appendTo($('#newPossibleParses'));
            }
            $('<p><small>'+this._possibleParses.length+' possible parses</small></p>').appendTo($('#parseinfo'));
            break;
          
          case 6:
            $('<h3>step 6: noun type detection</h3><ul id="nounCache"></ul>').appendTo($('#parseinfo'));
            for (var text in nounCache) {
              var html = $('<li><code>'+text+'</code></li>');
              var list = $('<ul></ul>');
              for (let type in nounCache[text]) {
                $('<li>type: <code>'+type+'</code>, score: '+nounCache[text][type]+'</li>').appendTo(list);
              }
              list.appendTo(html);
              html.appendTo($('#nounCache'));
            }
            break;

          case 7:
            $('<h3>step 7: ranking</h3>').appendTo($('#parseinfo'));
            break;

        }
      }
      
      if (oldval == 7) {
        $('#timeinfo span').text((this._times[7] - this._times[0])+'ms');
      }      
      
      return newval;
    });
    
    this.currentQuery.onResults = function() {
      $('#scoredParses').empty();
      for each (var parse in this._scoredParses.slice(0,this.maxSuggestions)) {
        $('<tr><td><span class="verb" title="'+parse.verb+'">'+parse.verbName+'</span>'+parse._display+'</td><td>'+Math.floor(100*parse.score)/100+'</td></tr>').appendTo($('#scoredParses'));
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
    patternCache = {};
  
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
