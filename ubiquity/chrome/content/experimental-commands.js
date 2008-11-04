// Commented out since skins functionality is not completely done.
// //TODO: update this
// CmdUtils.CreateCommand({
//   name: "skin",
//   preview: "Changes your current Ubiquity skin.",
//   description: "Changes what skin you're using for Ubiquity.",
//   takes: {"skin name": noun_arb_text},
//   execute: function(directObj){
//     if(!directObj.text) {
//       Utils.openUrlInBrowser("chrome://ubiquity/content/skinlist.html");
//       return;
//     }
//
//     //TODO style guide
//     //TODO: preview doesn't change
//     //TODO: changes affect web page
//
//     var newSkinName = directObj.text;
//
//     try {
//       var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
//         .getService(Components.interfaces.nsIStyleSheetService);
//
//       var oldSkinName = Application.prefs.getValue("extensions.ubiquity.skin", "default");
//       var skinFolderUrl = "chrome://ubiquity/skin/skins/";
//       var oldBrowserCss = Utils.url(skinFolderUrl + oldSkinName + "/browser.css");
//       var oldPreviewCss = Utils.url(skinFolderUrl + oldSkinName + "/preview.css");
//
//       var browserCss = Utils.url(skinFolderUrl + newSkinName + "/browser.css");
//       var previewCss = Utils.url(skinFolderUrl + newSkinName + "/preview.css");
//
//       sss.loadAndRegisterSheet(browserCss, sss.USER_SHEET);
//       sss.loadAndRegisterSheet(previewCss, sss.USER_SHEET);
//
//       try {
//         // this can fail and the rest still work
//         if(sss.sheetRegistered(oldBrowserCss, sss.USER_SHEET))
//           sss.unregisterSheet(oldBrowserCss, sss.USER_SHEET);
//         if(sss.sheetRegistered(oldPreviewCss, sss.USER_SHEET))
//           sss.unregisterSheet(oldPreviewCss, sss.USER_SHEET);
//       } catch(e) {
//         // do nothing
//       }
//
//       Application.prefs.setValue("extensions.ubiquity.skin", newSkinName);
//     } catch(e) {
//       displayMessage("Error applying skin: " + e);
//     }
//   }
// });


//TODO: add support for POST forms
//TODO: add preview with pictures showing how to use command (?)

CmdUtils.CreateCommand({
  description: "Creates a new Ubiquity command from a search-box.  Like creating a bookmark with keywords, except less clicking.",
  help: "Select a searchbox, click it and then type make-new... keyword, and a command named keyword will be created.",
  name: "make-new-search-command",
  author: {name: "Marcello Herreshoff",
           homepage: "http://stanford.edu/~marce110/"},
  icon: "chrome://ubiquity/skin/icons/search.png",
  license: "GPL/LGPL/MPL",
  homepage: "http://stanford.edu/~marce110/verbs/new-command-from-search-box.html",
  takes: {"command name": noun_arb_text},

  _makeURI : function(aURL, aOriginCharset, aBaseURI){
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Components.interfaces.nsIIOService);
    return ioService.newURI(aURL, aOriginCharset, aBaseURI);
  },

  _escapeNameValuePair: function(aName, aValue, aIsFormUrlEncoded){
    if (aIsFormUrlEncoded)
      return escape(aName + "=" + aValue);
    else
      return escape(aName) + "=" + escape(aValue);
  },

  preview: function(pblock, input) {
    if(input.text.length < 1){
      pblock.innerHTML = "Select a searchbox, click it and then type make-new... keyword, and a command named keyword will be created.";
    }else{
      pblock.innerHTML = "Creates a new search command called <b>" + input.text + "</b>";
    }
  },

  execute: function(name){
    //1. Figure out what this search-bar does.
    var node = context.focusedElement;
    if(!node || !node.form){
      displayMessage("You need to click on a searchbox before running this command."); return;
    }

    //Copied from chrome://browser/content/browser.js, function AddKeywordForSearchField()
    //Comments starting with MMH: indicates that something has been changed by me.
    PLACEHOLDER = "{QUERY}"; //MMH: Note also: I have globally replaced "%s" with PLACEHOLDER
    //COPY STARTS
    var charset = node.ownerDocument.characterSet;

    var docURI = this._makeURI(node.ownerDocument.URL,
                         charset);

    var formURI = this._makeURI(node.form.getAttribute("action"),
                          charset,
                          docURI);

    var spec = formURI.spec;

    var isURLEncoded =
                 (node.form.method.toUpperCase() == "POST"
                  && (node.form.enctype == "application/x-www-form-urlencoded" ||
                      node.form.enctype == ""));

    var el, type;
    var formData = [];

    for (var i=0; i < node.form.elements.length; i++) {
      el = node.form.elements[i];

      if (!el.type) // happens with fieldsets
        continue;

      if (el == node) {
        formData.push((isURLEncoded) ? this._escapeNameValuePair(el.name, PLACEHOLDER, true) :
                                       // Don't escape PLACEHOLDER, just append
                                       this._escapeNameValuePair(el.name, "", false) + PLACEHOLDER);
        continue;
      }

      type = el.type.toLowerCase();

      if ((type == "text" || type == "hidden" || type == "textarea") ||
          ((type == "checkbox" || type == "radio") && el.checked)) {
        formData.push(this._escapeNameValuePair(el.name, el.value, isURLEncoded));
      //} else if (el instanceof HTMLSelectElement && el.selectedIndex >= 0) {
      } else if (el.selectedIndex && el.getTagName() == "select" && el.selectedIndex >= 0){
           //MMH: HTMLSelectElement was undefined.
        for (var j=0; j < el.options.length; j++) {
          if (el.options[j].selected)
            formData.push(this._escapeNameValuePair(el.name, el.options[j].value,
                                              isURLEncoded));
        }
      }
    }

    var postData;

    if (isURLEncoded)
      postData = formData.join("&");
    else
      spec += "?" + formData.join("&");

    //COPY ENDS

    if(postData){
      displayMessage("Sorry.  Support for POST-method forms is yet to be implemented.");
      return;
    }

    var url = spec;

    //2. Now that we have the form's URL, figure out the name, description and favicon for the command
    currentLocation = String(Application.activeWindow.activeTab.document.location);
    domain = currentLocation.replace(/^(.*):\/\//, '').split('/')[0];
    name = name.text;
    if(!name){ var parts = domain.split('.'); name = parts[parts.length-2]}
    var icon = "http://"+domain+"/favicon.ico";
    var description = "Searches " + domain;

    //3. Build the piece of code that creates the command
    var code =  '\n\n//Note: This command was automatically generated by the make-new-search-command command.\n'
    code += 'CmdUtils.makeSearchCommand({\n'
    code += '  name: "'+name+'",\n';
    code += '  url: "'+url+'",\n';
    code += '  icon: "'+icon+'",\n';
    code += '  description: "'+description+'"\n';
    code += '});\n'
    //4. Append the code to Ubiqity's code
    CmdUtils.UserCode.appendCode(code);

    //5. Tell the user we finished
    displayMessage("You have created the command: " + name +
                   ".  You can edit its source-code with the command-editor command.");
  }
});


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


