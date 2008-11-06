// -----------------------------------------------------------------
// TAB COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  name: "tab",
  takes: {"tab name": noun_type_tab},
  icon: "chrome://ubiquity/skin/icons/tab_go.png",
  description: "Switches to the tab that matches the given name.",

  execute: function( tab ) {
    var tabName = tab.text;
    var tabs = noun_type_tab.getTabs();
    tabs[tabName]._window.focus();
    tabs[tabName].focus();
  },

  preview: function( pblock, tab ) {
    var tabName = tab.text;

    var tabs = noun_type_tab.getTabs();
    var imgData = CmdUtils.getTabSnapshot( tabs[tabName], {width:500} );

    if( tabName.length > 1 ){
      pblock.innerHTML = "Changes to <b style=\"color:yellow\">%s</b> tab.".replace(/%s/, tabName);
      pblock.innerHTML += "<br/><img src='%s'>".replace(/%s/, imgData );
    }
    else
      pblock.innerHTML = "Switch to tab by name.";
  }
});

// Closes a single tab
CmdUtils.CreateCommand({
  name: "close-tab",
  takes: {"tab name": noun_type_tab},
  icon: "chrome://ubiquity/skin/icons/tab_delete.png",
  description: "Closes the tab that matches the given name.",
  execute: function( directObj ) {
    var tabName = directObj.text;
    var tabs = noun_type_tab.getTabs();
    if(tabs[tabName]!=null){
      tabs[tabName].close();
    }else{
      Application.activeWindow.activeTab.close();
    }
    displayMessage(tabName + " tab closed");
  },

  preview: function( pblock, directObj ) {
    var tabName = directObj.text;

    var tabs = noun_type_tab.getTabs();
    var imgData = CmdUtils.getTabSnapshot( tabs[tabName], {width:500} );

    if( tabName.length > 1 ) {
      pblock.innerHTML = "Closes the <b style=\"color:yellow\">%s</b> tab.".replace(/%s/, tabName);
      pblock.innerHTML += "<br/><img src='%s'>".replace(/%s/, imgData );
    }
    else
      pblock.innerHTML = "Closes the tab by name.";
  }
});


//Closes all tabs related to the specified word
CmdUtils.CreateCommand({
  name: "close-related-tabs",
  takes: {"related word": noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/tab_delete.png",
  description: "Closes all open tabs that have the given word in common.",
  preview: function( pblock, directObj ) {
    var query = directObj.text;
    var relatedWord = query.toLowerCase();
    var html = null;
    if(relatedWord.length != 0){
      html = "Closes the following tabs that are related to <b style=\"color:yellow\">\"" + relatedWord + "\"</b> : <ul>";
      var numTabs = 0;

      Application.activeWindow.tabs.forEach(function(tab){
        if ( tab.uri.spec.toLowerCase().match(relatedWord) || tab.document.title.toLowerCase().match(relatedWord)){
      	  html += "<li>" + tab.document.title + "</li>";
      	  numTabs++;
        }
      });

      if(numTabs == 0){
        html = "No tabs related to <b style=\"color:yellow\">\"" + relatedWord + "\"</b>";
      }else{
        html += "</ul>";
      }
    }else{
      html = "Closes all tabs related to the word";
    }
    jQuery(pblock).html( html );
  },

  execute: function( directObj ) {
    var query = directObj.text;
    var relatedWord = query.toLowerCase();
    var numTabs = 0;

    Application.activeWindow.tabs.forEach(function(tab){
      if ( tab.uri.spec.toLowerCase().match(relatedWord) || tab.document.title.toLowerCase().match(relatedWord)){
        tab.close();
        numTabs++;
      }
    });

    displayMessage(numTabs + " tabs closed");
  }

});

// -----------------------------------------------------------------
// ZOOM RELATED
// -----------------------------------------------------------------


function setFullPageZoom( level ) {
  var navigator1 = window
                    .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                    .getInterface(Components.interfaces.nsIWebNavigation);
  var docShell = navigator1.QueryInterface(Components.interfaces.nsIDocShell);
  var docviewer = docShell.contentViewer.QueryInterface(Components.interfaces.nsIMarkupDocumentViewer);
  docviewer.fullZoom = level;
}

CmdUtils.CreateCommand({
  name:"zoom",
  takes:{"percentage": noun_type_percentage},
  icon: "chrome://ubiquity/skin/icons/magnifier.png",
  description:"Zooms the Firefox window in or out.",
  preview:function(pBlock, directObj) {
    if (directObj.text)
      pBlock.innerHTML = "Zooms the Firefox window to " +
        directObj.text + " of its normal size.";
    else
      pBlock.innerHTML = "Zooms the Firefox window to a given percentage " +
      "of its normal size.";
  },
  execute:function(directObj) {
    if (directObj.data)
      setFullPageZoom(directObj.data);
    else
      displayMessage("You must provide a percentage to zoom to.");
  }
});

// -----------------------------------------------------------------
// TAGGING COMMANDS
// -----------------------------------------------------------------

// http://blog.stevenlevithan.com/archives/faster-trim-javascript
function trim (str) {
  var str = str.replace(/^\s\s*/, ''),
    ws = /\s/,
    i = str.length;
  while (ws.test(str.charAt(--i)));
  return str.slice(0, i + 1);
}

// command to tag the currently loaded URI via the humane prompt
CmdUtils.CreateCommand({
  name: "tag",
  homepage: "http://autonome.wordpress.com/",
  author: { name: "Dietrich Ayala", email: "dietrich@mozilla.com"},
  license: "MPL/GPL/LGPL",
  takes : {"text" : noun_arb_text},
  icon: "chrome://mozapps/skin/places/tagContainerIcon.png",
  description: "Adds a tag to describe the current page",
  preview: function(aEl, aTagsString) {
    aEl.innerHTML = "Describe the current page with tags";
    aEl.innerHTML += aTagsString.text.length ? " (" + aTagsString.text + ")" : ".";
  },
  execute: function(aTagsString) {
    var Cc = Components.classes;
    var Ci = Components.interfaces;
    var doc = CmdUtils.getDocumentInsecure();

    var iosvc = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    var currentURI = iosvc.newURI(doc.location, null, null);

    var bookmarks = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].
                    getService(Ci.nsINavBookmarksService);
    if (!bookmarks.isBookmarked(currentURI)) {
      // create unfiled bookmark
      bookmarks.insertBookmark(bookmarks.unfiledBookmarksFolder, currentURI,
                               bookmarks.DEFAULT_INDEX, doc.title);
    }

    // if there's a comma, split on commas, otherwise use spaces
    var splitChar = " ";
    if (aTagsString.text.indexOf(",") == -1)
      splitChar = ",";
    var tags = aTagsString.text.split(splitChar);

    // trim leading/trailing spaces
    tags = tags.map(function(a) { return trim(a); });

    var tagging = Cc["@mozilla.org/browser/tagging-service;1"].
                  getService(Ci.nsITaggingService);
    tagging.tagURI(currentURI, tags);
  }
});

