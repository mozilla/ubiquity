mylang = [];

$(document).ready(function(){
  
  $('input[name=lang]').click(function(e){loadLang($('input[name=lang]:checked').val());});
  loadLang($('input[name=lang]:checked').val())
  
  $('.input').keyup(function(){mylang.parse()});
  $('#clearnouncache').click(function() { nounCache = []; });
  
  $('.toggle').click(function(e){$(e.currentTarget).siblings().toggle();});

});

function loadLang(lang) {
  mylang = [];
  mylang = window[lang];
  nounCache = [];
  patternCache = {};

  mylang.initialCache();

  $('#roles').empty();
  for each (role in mylang.roles) {
    $('<li><code>'+role.role+'</code>, delimiter: <code>'+role.delimiter+'</code></li>').appendTo($('#roles'));
  }

  $('#nountypes').empty();
  for (let type in nounTypes) {
    $('<li><code>'+type+'</code>'+(nounTypes[type].list != undefined ? ': {<code>'+nounTypes[type].list.join('</code>, <code>')+'</code>}':'')+'</li>').appendTo($('#nountypes'));
  }

  $('#verblist').empty();
  for (verb in verbs) {
    var li = $('<li><code>'+verb+'</code> (<code>'+(verbs[verb].names[mylang.lang] || verbs[verb].names['en']).join('</code>, <code>')+'</code>)</li>');
    var ul = $('<ul></ul>');
    for each (arg in verbs[verb].arguments)
      $('<li><code>'+arg.role+'</code>: <code>'+arg.nountype+'</code>').appendTo(ul);
    ul.appendTo(li);
    li.appendTo($('#verblist'));
  }
  
  $('#examples').html(mylang.examples.map(function(code){return '<code>'+code+'</code>'}).join(', '));
  
//  if ($('.input').val() != '')
//    mylang.parse();
  
}