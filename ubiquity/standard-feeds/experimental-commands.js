//TODO : convert to xhtml style command

var freebase = {};
var $ = jQuery;

(function() {

    freebase.preview = function(pblock, directObject){
        var searchTerm = directObject.text;
        pblock.innerHTML = 'Searches Freebase for <b>'+searchTerm+'</b>';

        var url = "http://www.freebase.com/api/service/search";
        var search_callback = function(response) { show_preview(pblock,response); };
        $.get( url, {prefix: searchTerm, limit: 4}, search_callback, "json");
    };

    var style_rules = [
    '<style type="text/css">',
    '  ul         { list-style: none; padding:0; margin:0; }     ',
    '  li         { padding: 0.3em; } ',
    '  li:hover   { background: #C93 } ',
    '  .blurb     { font-size:small; }  ',
    '  .item      { height:4.5em; } ',
    '  .headline  { height: 1em; overflow: hidden; padding-bottom:0.2em;} ',
    '  .item_name { font-weight:bold; } ',
    '  .item_types { font-size: small; color:grey; font-style:italic; padding:1em; } ',
    '  .thumb,.missing { float:left; width:45px; height:45px; padding: 2px; border: solid thin grey; margin-right:0.5em; }',
    '</style>\n'
    ];

    function name(item) {
        return '<div class="headline"><span class="item_name">'+ item.name +'</span>'+types(item)+'</div>';
    }

    function types(item) {
        if (!item.type || !item.type.length) { return ''; }
        var major_types = $.grep(item.type, function(t) {
              if (t.id.indexOf('/common/')===0 || t.id.indexOf('/user/')===0) { return false; } // ignore
              return true;
        });
        var names = $.map(major_types,function(t) { return t.name || '??'; } );

        return '<span class="item_types">' + names.join(', ') + '</span>';
    }

    function thumbnail(item) {
        if (!item.image || !item.image.id) { return '<div class="missing">&nbsp;</div>'; }
        var params = '?maxheight=45&mode=fillcrop&maxwidth=45';
        var url = 'http://www.freebase.com/api/trans/image_thumb'+item.image.id+params;
        return '<img class="thumb" src="'+url+'" />';
    }

    function blurb(item) {
        if (!item.article || !item.article.id) { return '<i>Missing description</i>'; }
        return '<span class="blurb" bid="'+ item.article.id +'"></span>';
    }

    // this is the only function which modifes the innerHTML of the preview block
    function show_preview(pblock,response) {
        if (response.status != '200 OK') { pblock.innerHTML = 'Error: ' + response.status; return; }
        var h=style_rules.join('\n');
        h += '<ul>';
        for (var i=0;i<response.result.length;i++) {
            var item = response.result[i];
            h += '<li><a href="http://www.freebase.com/view' + item.id +'">';
            h +=      thumbnail(item) + '<div class="item">'+name(item)+blurb(item)+'</div>';
            h += '</a></li>\n';
        }
        h += '</ul>';
        pblock.innerHTML = h;

        $('.blurb',pblock).each(function(i,blurb) {
            var url = 'http://www.freebase.com/api/trans/blurb' + $(blurb).attr('bid') + '?maxlength=190';
            $.get( url, null, function(response) { $(blurb).text(response);  });
        });
        
    }


})();

makeSearchCommand({
    name: "freebase",
    url: "http://www.freebase.com/search?query={QUERY}",
    icon: "http://www.freebase.com/favicon.ico",
    description: 'Searches <a href="http://www.freebase.com>Freebase</a> for your words (shows previews)',
    homepage: "http://blog.hamstersoup.com/",
    author: { name: "Will Moffat", email: "will_ub@hamstersoup.com"},

    preview: freebase.preview
});

//TODO: noun should suggest songs currently playing in a Youtube, Songza or Imeem tab
//TODO: use the lyricswiki API to get lyrics and add to the preview

var noun_type_song = {
  _name: "song name",
  suggest: function( text, html ) {
    var suggestions  = [CmdUtils.makeSugg(text)];
    if(window.foxytunesGetCurrentTrackTitle){
  	  suggestions.push(CmdUtils.makeSugg(window.foxytunesGetCurrentTrackTitle()));
  	}
    return suggestions;
  }
}

CmdUtils.CreateCommand({
  name: "get-lyrics",
  takes: {song: noun_type_song},
  locale: "en-US",
  homepage: "http://abcdefu.wordpress.com",
  author: {name: "Abimanyu Raja", email: "abimanyuraja@gmail.com"},
  icon: "http://www.metrolyrics.com/favicon.ico",
  preview: function(pblock, directObject) {
    
    searchText = jQuery.trim(directObject.text);
    if(searchText.length < 1) {
      pblock.innerHTML = "Searches for lyrics of the song";
      return;
    }

    var previewTemplate = "Searches for the lyrics of <b>${query}</b>";
    var previewData = {query: searchText};
    pblock.innerHTML = CmdUtils.renderTemplate(previewTemplate, previewData);

  },
  execute: function(directObject) {
    var url = "http://www.google.com/search?q={QUERY}"
    var query = directObject.text + " lyrics";
    var urlString = url.replace("{QUERY}", query);
    Utils.openUrlInBrowser(urlString);
  }
});


