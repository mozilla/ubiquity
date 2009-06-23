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
  name: "song name",
  suggest: function( text, html ) {
    var suggestions  = [CmdUtils.makeSugg(text)];
    if(window.foxytunesGetCurrentTrackTitle){
  	  suggestions.push(CmdUtils.makeSugg(window.foxytunesGetCurrentTrackTitle()));
  	}
    return suggestions;
  }
}

CmdUtils.CreateCommand({
  names: ["get lyrics"],
  arguments: {modifier: noun_type_song},
  locale: "en-US",
  homepage: "http://abcdefu.wordpress.com",
  author: {name: "Abimanyu Raja", email: "abimanyuraja@gmail.com"},
  icon: "http://www.metrolyrics.com/favicon.ico",
  preview: function(pblock, {modifier}) {
    var searchText = jQuery.trim(modifier.text);
    if(searchText.length < 1) {
      pblock.innerHTML = "Searches for lyrics of the song";
      return;
    }

    var previewTemplate = "Searches for the lyrics of <b>${query}</b>";
    var previewData = {query: searchText};
    pblock.innerHTML = CmdUtils.renderTemplate(previewTemplate, previewData);

  },
  execute: function({modifier}) {
    var url = "http://www.google.com/search?q={QUERY}";
    var query = modifier.text + " lyrics";
    var urlString = url.replace("{QUERY}", query);
    Utils.openUrlInBrowser(urlString);
  }
});


function getImgsFromSelection(context) {
  var sel = CmdUtils.getWindowInsecure().getSelection();
  var document = CmdUtils.getDocumentInsecure();

  if (sel.rangeCount < 1)
    return [];
  var range = sel.getRangeAt(0);

  // TODO: This is overly aggressive and finds things that are
  // outside the current selection. This logic should be fixed
  // (requires playing with the ranges begining and ending and
  // offsets) and moved into the selection variable. We currently
  // have input.text and input.html. We'll need an input.pointer
  // or input.selection or something.
  return jQuery.find("img", range.commonAncestorContainer);
}

function getRotationFromMatrix(matrix) {
  if (matrix != "none")
    args = matrix.substring(7,matrix.length).split(", ");
  else
    args = [1,0];
  var acosa = parseFloat(args[0]);
  var asina = parseFloat(args[1]);
  var a = NaN;
  with (Math) {
    a = acos(acosa);
    if (asina < 0)
      a = 2*PI-a;
  };
  return a;
}


CmdUtils.CreateCommand({
  names: ["rotate page"],
  arguments: [{role: "object",
               nountype: /^\d*$/,
               label: "number of degrees" }],
  preview: function(pblock, {object}) {
    if (object.text == "")
      rot = "180";
    else
      rot = object.text;
    pblock.innerHTML = "<p>" + _("Rotates entire page ${angle} degrees",
                                 {"angle": rot}) + "</p>";
  },
  execute: function({object}) {
    if (object.text == "")
      rot = Math.PI; // default rotation
    else
      rot = 2*Math.PI*object.text/360;
    var document = CmdUtils.getDocument();
    var matrix = jQuery(document.body).css("-moz-transform");
    jQuery(document.body).
    css("-moz-transform", "rotate("+(getRotationFromMatrix(matrix)+rot)+"rad)");
  }
});

var rotate_cmd_preview_html = '\
  <div id="rotate">  \
  <ol>  \
    <li>Select an image (or multiple images).</li>  \
    <li>Click and drag the rotator below to rotate the selected image(s).</li>  \
  </ol>  \
  <div id="control"></div>  \
  <style>  \
  #control{   \
    width: 80px; height: 80px;  \
    color: black; background-color: white;  \
    -moz-border-radius: 45px; border-top: 5px solid #cc6600;  \
    margin: 0 auto;  \
  }  \
  </style>  \
</div>  ';

CmdUtils.CreateCommand({
  names: ["rotate image"],
  _rotate: function(elems, deg) {
    jQuery.each(elems, function() {
      jQuery(this).css("-moz-transform", "rotate(%sdeg)".replace(/%s/, deg));
    });
  },

  preview: function(pblock) {
    pblock.innerHTML = rotate_cmd_preview_html;
    var self = this;

    var handleControl = function(event) {
      var controlPos = jQuery(event.currentTarget).position();
      var controlWidth = jQuery(event.currentTarget).width();
      var controlHeight = jQuery(event.currentTarget).height();

      var x = event.clientX - controlPos.left - controlWidth/2;
      var y = event.clientY - controlPos.top - controlHeight/2;

      var angle = Math.atan(y/x)/Math.PI*180 + 90;
      if (x < 0)
        angle += 180;

      self._rotate(jQuery("#control", pblock), angle);
      var imgs = getImgsFromSelection(context);
      self._rotate(imgs, angle);
    };

    jQuery("#control", pblock).mousedown(function(event) {
      pblock.inDrag = true;
    });

    jQuery("#control", pblock).mouseup(function() {
        pblock.inDrag = false;
    });

    jQuery("#control", pblock).mousemove(function(event) {
      if (pblock.inDrag)
        handleControl(event);
    });

    jQuery("#control", pblock).mousedown(handleControl);

  },
  execute: function() {}
});



CmdUtils.CreateCommand({
  names: ["flip page"],
  preview: "Flips the entire page upside down. "
         + "<span style='-moz-transform:rotate(180deg)'>"
         + "Useful for bats</span>.",
  execute: function() {
    var document = CmdUtils.getDocument();
    var matrix = jQuery(document.body).css("-moz-transform");
    jQuery(document.body).css("-moz-transform",
                              "rotate("
                              +(getRotationFromMatrix(matrix)+Math.PI)+"rad)");
  }
});

function injectPixastic(context, callback) {
  if (jQuery("script#_pixastic_").length > 0)
    callback();

  var doc = CmdUtils.getDocument();
  var s = doc.createElement("script");
  s.src = "resource://ubiquity/scripts/pixastic.js";
  s.id = "_pixastic_";
  doc.body.appendChild(s);
  jQuery(s).load(callback);
}

function sanatizeImage(img) {
  // Replaces an image src attribute with a data URL.
  var hWin = CmdUtils.getHiddenWindow();
  var canvas = hWin.document.createElementNS("http://www.w3.org/1999/xhtml",
                                             "canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  img.src = canvas.toDataURL();
}


// TODO: Make these into a factory, and add controls into the previews.

CmdUtils.CreateCommand({
  names: ["desaturate image"],
  execute: function() {
    injectPixastic(context, function() {
      var imgs = getImgsFromSelection(context);

      jQuery(imgs).each(function() {
        sanatizeImage(this);
        CmdUtils.log(CmdUtils.getWindow(),
                     CmdUtils.getWindowInsecure()["Pixastic"]);
        CmdUtils.getWindowInsecure().Pixastic.process(this, "desaturate");
      });
    });
  }
});


CmdUtils.CreateCommand({
  names: ["invert image"],
  execute: function() {
    injectPixastic(context, function() {
      var imgs = getImgsFromSelection(context);

      jQuery(imgs).each(function() {
        sanatizeImage(this);
        CmdUtils.getWindowInsecure().Pixastic.process(this, "invert");
      });
    });
  }
});


CmdUtils.CreateCommand({
  names: ["edge-detect image", "detect edges in image"],
  execute: function() {
    injectPixastic(context, function() {
      var imgs = getImgsFromSelection(context);

      jQuery(imgs).each(function() {
        sanatizeImage(this);
        CmdUtils.getWindowInsecure().Pixastic.process(this,
                                                      "edges",
                                                      {mono:true,invert:false});
      });
    });
  }
});



CmdUtils.CreateCommand({
  names: ["map these"],
  arguments: {object: noun_arb_text },
  icon : "chrome://ubiquity/skin/icons/map_add.png",
  description: "Maps multiple selected addresses or links onto a single Google Map. (Experimental!)",
  preview: function( pblock, directObject ) {
    var html = directObject.html;
    pblock.innerHTML = "<span id='loading'>Mapping...</span>";

    // TODO: Figure out why we have to do this?
    var doc = context.focusedWindow.document;
    var div = doc.createElement( "div" );
    div.innerHTML = html;

    var pages = {};

    jQuery( "a", div ).each( function() {
      if( this.href.indexOf(".html") != -1 ) {
        pages[ jQuery(this).text() ] = this.href;
      }
    });

    var mapUrl = "http://maps.google.com/staticmap?";

    var params = {
      size: "500x300",
      key: API_KEY,
      markers: ""
    };

    var mapURL = mapUrl + jQuery.param( params );
    var img = doc.createElement( "img" );
    img.src = mapURL;
    jQuery(pblock).height( 300 )
                  .append( img )
                  .append( "<div id='spots'></div>");

    var markerNumber = 97; // Lowercase a

    for( var description in pages ) {
      jQuery.get( pages[description], function(pageHtml) {
        var div = doc.createElement( "div" );
        div.innerHTML = pageHtml;

        // Get the link entitled "Google Map" and then strip out
        // the location from it's href, which is always of the form
        // http://map.google.com?q=loc%3A+[location], where [location]
        // is the location string with spaces replaced by pluses.
        var mapLink = jQuery( "a:contains(google map)", div );
        if( mapLink.length > 0 ) {
          mapLink = mapLink[0];
          var loc = mapLink.href.match( /\?q=loc%3A\+(.*)/ )[1]
                                .replace( /\+/g, " ");
          CmdUtils.geocodeAddress( loc, function(points){
            if( points != null){
              jQuery( "#loading:visible", pblock).slideUp();

              var params = {
                lat: points[0].lat,
                "long": points[0].long,
                marker: String.fromCharCode( markerNumber++ ),
                name: jQuery( "title", div).text()
              };

              img.src += CmdUtils.renderTemplate( "${lat},${long},red${marker}|", params );

              params.marker = params.marker.toUpperCase();
              var spotName = CmdUtils.renderTemplate( "<div><b>${marker}</b>: <i>${name}</i></div>", params );
              jQuery( "#spots", pblock ).append( spotName );
              jQuery( pblock ).animate( {height: "+=6px"} );
            }
          });
        }
      });
    }

  }
});


// max 100 chars for question
const RYPPLE_QUESTION_MAXLEN = 100;
const RYPPLE_ATTRIBUTE_MAX = 3;

CmdUtils.CreateCommand({
  names: ["ask rypple", "rypple"],
  arguments: [{role: "object",
               nountype: noun_arb_text,
               label: "question"}],
  icon: "https://www.rypple.com/feedback/images/favicon.ico",
  description: "Asks a question on Rypple",
  help: "You'll need a <a href=\"http://rypple.com\">Rypple account</a> and be logged in",
  homepage: "http://www.rypple.com/ubiquity/ask.html",

  _parse: function (character, text) {
    // parse text
    var values = [];
    var startIndex = 0;
    var textLeft = '';
    var lastIndex = startIndex;
    do {
      startIndex = text.indexOf(character, endIndex);
      var endIndex = startIndex;
      if (startIndex >= 0) {
        var endIndex = text.indexOf(' ', startIndex);
        if (endIndex < 0) {
          endIndex = text.length;
        }
        var value = text.substring(startIndex + 1, endIndex);
        if (value.length > 0) {
          values.push(value);
        }

        textLeft += text.substring(lastIndex, startIndex);
        lastIndex = endIndex + 1;
      }
    } while (startIndex >= 0);

    // concat last chunk of text after last found item
    if (lastIndex != text.length) {
      textLeft += text.substring(lastIndex, text.length);
    }

    var parsed = [];
    parsed.values = values;
    parsed.textLeft = textLeft;
    return parsed;
  },

  preview: function( previewBlock, {object} ) {
    // parse entry text
    var parsedContacts = this._parse('@', object.text);
    var parsedAttr = this._parse('#', parsedContacts.textLeft);
    var question = parsedAttr.textLeft;

    // output preview
    var template = '{if errorMsg}<span style="color: red;"><br />${errorMsg}<br/></span>{/if}';
    template +=    '<b>';
    template +=    _('Asks the following question (${charsLeft} characters left):');
    template +=    '</b><br/>';
    template +=    '{if question != ""}${question}{else}';
    template +=      _('NO QUESTION. PLEASE ENTER A QUESTION.');
    template +=    '{/if}<br/>';
    template +=    '<br/>';
    template +=    '<b>'+_('To:')+'</b><br/>';
    template +=    '{for c in contacts}${c}, {forelse}';
    template +=    _('NO RECIPIENTS. YOU MUST ENTER AT LEAST ONE.');
    template +=    '{/for}<br/>';
    template +=    '<br/>';
    template +=     '<b>'+_('Attributes:')+'</b><br/>';
    template +=    '{for a in attributes}${a}, {forelse}';
    template +=    _('NO ATTRIBUTES. YOU MUST ENTER AT LEAST ONE.');
    template +=    '{/for}<br/>';
    template +=    '<br/>';
    template +=    '<br/>';
    template +=    '<hr/>';
    template +=    '<b>'+_('Usage:')+'</b><br/>';
    template +=    _('rypple-ask &lt;question&gt; &lt;recipient(s)&gt; &lt;attribute(s)&gt;');
    template +=    '<br/>';
    template +=    _('Recipients must start with \'@\' and at least one recipient is required.');
    template +=    '<br/>';
    template +=    _('Attributes must start with \'#\' and at least one attribute is required.');
    template +=    '<br/>';

    var charsLeft = RYPPLE_QUESTION_MAXLEN - question.length;
    var errorMsg = "";
    if (charsLeft < 0) {
        errorMsg += _("The last ${chars} character(s) of your question will be truncated!<br/>",{chars:"<b>" + charsLeft * -1 + "</b>"});
    }
    if (parsedAttr.values.length > RYPPLE_ATTRIBUTE_MAX) {
        errorMsg += _("The last <b>${num}</b> attributes{if num > 1}s{/if} will not be used!",{num:(parsedAttr.values.length - RYPPLE_ATTRIBUTE_MAX)})+"<br/>";
    }
    var data = {
      question : question,
      contacts : parsedContacts.values,
      attributes : parsedAttr.values,
      charsLeft: charsLeft,
      errorMsg : errorMsg
    };

    previewBlock.innerHTML = CmdUtils.renderTemplate( template, data );
  },

  //TODO email format validation, tags w/ spaces, msg format: @ character, advice/rated
  execute: function({object}) {
    // parse entry text
    var parsedContacts = this._parse('@', object.text);
    var parsedAttr = this._parse('#', parsedContacts.textLeft);
    var question = parsedAttr.textLeft;

    // validation
    if (parsedContacts.values.length < 1) {
      displayMessage(_("At least one recipient is required"));
      return;
    }
    if (parsedAttr.values.length < 1) {
      displayMessage(_("At least one attribute is required"));
      return;
    }
    if (question.length < 1) {
      displayMessage(_("No question specified"));
      return;
    }

    var updateUrl = "https://www.rypple.com/feedback/api/v1/feedback";

    var updateParams = {
      recipients: parsedContacts.values,
      attributes: parsedAttr.values.slice(0,RYPPLE_ATTRIBUTE_MAX),
      title: question.substring(0, RYPPLE_QUESTION_MAXLEN),
      type: "ADVICE"
    };

    var areYouLoggedIn = _("Rypple error - are you logged in?");

    jQuery.ajax({
      type: "POST",
      processData: false,
      contentType: "application/json",
      url: updateUrl,
      data: Utils.encodeJson(updateParams),
      dataType: "json",
      error: function() {
          displayMessage(areYouLoggedIn);
      },
      success: function(returnValue ) {
        if (returnValue.success) {
          displayMessage(_("Asked Question Successfully on Rypple"));
        } else {
          displayMessage(areYouLoggedIn);
        }
      }
    });
  }
});


// -----------------------------------------------------------------
// SPARKLINE
// -----------------------------------------------------------------

function sparkline(data) {
  var p = data;

  var nw = "auto";
  var nh = "auto";


  var f = 2;
  var w = ( nw == "auto" || nw == 0 ? p.length * f : nw - 0 );
  var h = ( nh == "auto" || nh == 0 ? "1em" : nh );

  var doc = context.focusedWindow.document;
  var co = doc.createElement("canvas");

  co.style.height = h;
  co.style.width = w;
  co.width = w;

  var h = co.offsetHeight;
  h = 10;
  co.height = h;

  var min = 9999;
  var max = -1;

  for ( var i = 0; i < p.length; i++ ) {
    p[i] = p[i] - 0;
    if ( p[i] < min ) min = p[i];
    if ( p[i] > max ) max = p[i];
  }

  if ( co.getContext ) {
    var c = co.getContext("2d");
    c.strokeStyle = "red";
    c.lineWidth = 1.0;
    c.beginPath();

    for ( var i = 0; i < p.length; i++ ) {
      c.lineTo( (w / p.length) * i, h - (((p[i] - min) / (max - min)) * h) );
    }

    c.stroke();
  }

  return co.toDataURL();
}

CmdUtils.CreateCommand({
  names: ["sparkline", "graph", "insert sparkline"],
  description: "Graphs the current selection, turning it into a sparkline.",
  arguments: [{role: "object",
               nountype: noun_arb_text,
               label: "data"}],
  author: {name: "Aza Raskin", email:"aza@mozilla.com"},
  license: "MIT",
  help: "Select a set of numbers -- in a table or otherwise -- and use this command to graph them as a sparkline. Don't worry about non-numbers getting in there. It'll handle them.",

  _cleanData: function( string ) {
    var dirtyData = string.split(/\W/);
    var data = [];
    for(var i=0; i<dirtyData.length; i++){
      var datum = parseFloat( dirtyData[i] );
      if( datum.toString() != "NaN" ){
        data.push( datum );
      }
    }

    return data;
  },

  _dataToSparkline: function( string ) {
    var data = this._cleanData( string );
    if( data.length < 2 ) return null;

    var dataUrl = sparkline( data );
    return img = "<img src='%'/>".replace(/%/, dataUrl);
  },

  preview: function(pblock, {object}) {
    var img = this._dataToSparkline( object.text );

    if( !img )
      jQuery(pblock).text( _("Requires numbers to graph.") );
    else
      jQuery(pblock).empty().append( img ).height( "15px" );
  },

  execute: function( {object} ) {
    var img = this._dataToSparkline( object.text );
    if( img ) CmdUtils.setSelection( img );
  }
});


// -----------------------------------------------------------------
// CONVERSION COMMANDS
// -----------------------------------------------------------------
var noun_conversion_options = new CmdUtils.NounType( "conversion-options",
                                                     ["pdf",
                                                      "html",
                                                      "rich-text"]);

function convert_page_to_pdf() {
  var url = "http://www.htm2pdf.co.uk/?url=";
  url += escape( CmdUtils.getWindowInsecure().location );

  Utils.openUrlInBrowser(url);
  /*jQuery.get( url, function(html){
    //displayMessage( html );
    CmdUtils.getWindowInsecure().console.log( jQuery(html).filter(a) );

  })*/
}

function convert_to_rich_text( html ) {
  if (html) {
    var doc = context.focusedWindow.document;
    if (doc.designMode == "on")
      doc.execCommand("insertHTML", false, html);
    else
      displayMessage(_("You're not in a rich text editing field."));
  }
}

function convert_to_html( html ) {
  if (html) {
    var doc = context.focusedWindow.document;
    if (doc.designMode == "on") {
      html = html.replace(/&/g, "&amp;");
      html = html.replace(/>/g, "&gt;");
      html = html.replace(/</g, "&lt;");
      doc.execCommand("insertHTML", false, html);
    } else
      displayMessage(_("You're not in a rich text editing field."));
  }
}

CmdUtils.CreateCommand({
  names:["convert (text to format)"],
  arguments: [{role: "object",
               nountype:noun_arb_text,
               label: "text"},
              {role: "goal",
               nountype:noun_conversion_options,
               label: "format"}],
  icon: "chrome://ubiquity/skin/icons/convert.png",
  description:"Converts a selection to a PDF, to rich text, or to html.",
  preview: function(pBlock, arguments) {
    if (arguments.goal && arguments.goal.text) {
      pBlock.innerHTML = "Converts your selection to " + arguments.goal.text;
    } else {
      pBlock.innerHTML = "Converts a selection to a PDF, to rich text, or to html.";
    }
  },
  execute: function(arguments) {
    // Just putting the shared text here so it is localizable.
    _("You're not in a rich text editing field.");
    if (arguments.goal && arguments.goal.text) {
      switch( arguments.goal.text) {
      case "pdf":
        convert_page_to_pdf();
        break;
      case "html":
        if (arguments.object.html)
          convert_to_html(arguments.object.html);
        else
          displayMessage(_("There is nothing to convert!"));
        break;
      case "rich-text":
        if (arguments.object.html)
          convert_to_rich_text(arguments.object.html);
        else
          displayMessage(_("There is nothing to convert!"));
        break;
      }
    } else {
      displayMessage(_("You must specify what you want to convert to: pdf, html, or rich-text."));
    }
  }
});
