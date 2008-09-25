/* ***** BEGIN LICENSE BLOCK *****
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
 *   Atul Varma <atul@mozilla.com>
 *   Aza Raskin <aza@mozilla.com>
 *   Maria Emerson <memerson@mozilla.com>
 *   Abimanyu Raja <abimanyu@gmail.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Blair McBride <blair@theunfocused.net>
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

// -----------------------------------------------------------------
// SYSTEM COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  name: "help",
  icon: "chrome://ubiquity/skin/icons/help.png",
  preview: "Provides help on using Ubiquity, as well as access to preferences, etc.",
  description: "Takes you to the Ubiquity <a href=\"about:ubiquity\">main help page</a>.",
  execute: function(){
    Utils.openUrlInBrowser("about:ubiquity");
  }
});

CmdUtils.CreateCommand({
  name: "command-editor",
  icon : "chrome://ubiquity/skin/icons/plugin_edit.png",
  preview: "Opens the editor for writing Ubiquity commands",
  description: "Takes you to the Ubiquity <a href=\"chrome://ubiquity/content/editor.html\">command editor</a> page.",
  execute: function(){
    Utils.openUrlInBrowser("chrome://ubiquity/content/editor.html");
  }
});

CmdUtils.CreateCommand({
  name: "command-list",
  icon : "chrome://ubiquity/skin/icons/application_view_list.png",
  preview: "Opens the list of all Ubiquity commands available and what they all do.",
  description: "Takes you to the page you're on right now.",
  execute: function(){
    Utils.openUrlInBrowser("chrome://ubiquity/content/cmdlist.html");
  }
});

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

// -----------------------------------------------------------------
// CALENDAR COMMANDS
// -----------------------------------------------------------------


function reloadGoogleCalendarTabs() {
  try {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    var enumerator = wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      var index = 0, numTabs = win.getBrowser().mPanelContainer.childNodes.length;
      while (index < numTabs) {
      	var currentTab = win.getBrowser().getBrowserAtIndex(index);
      	if(currentTab.currentURI.spec.indexOf("google.com/calendar") > -1) {
      	  currentTab.reload();
      	}
      	index++;
      }
    }
  } catch(e) {
    displayMessage("Error reloading calendar tabs: " + e);
  }
}


function addToGoogleCalendar(eventString) {

  var quickAddEntry = "<entry xmlns='http://www.w3.org/2005/Atom' xmlns:gCal='http://schemas.google.com/gCal/2005'>";
  quickAddEntry += "    <content type=\"html\">" + eventString + "</content>";
  quickAddEntry += "    <gCal:quickadd value=\"true\"/>";
  quickAddEntry += "</entry>";

  var authKey = Utils.getCookie(".www.google.com", "CAL");
  if (authKey == "") {
    displayMessage("Please make sure you are logged in to Google Calendar");
    return;
  }

  currentCalendar = "http://www.google.com/calendar/feeds/default/private/full";

  req = new XMLHttpRequest();
  req.open('POST', currentCalendar, false);
  req.setRequestHeader('Authorization', 'GoogleLogin auth=' + authKey);
  req.setRequestHeader('Content-type', 'application/atom+xml');
  req.send(quickAddEntry);
  if (req.status == 401) {
    displayMessage("Please make sure you are logged in to Google Calendar");
    return;
  } else if (req.status != 201) {
    displayMessage("Error creating the event. Error code: " + req.status + " " + req.statusText);
    return;
  }

}

/* TODO this comman just takes unstructured text right now and relies on
 google calendar to figure it out.  So we're not using the DateNounType
 here.  Should we be?  And, is there a better name for this command? */
CmdUtils.CreateCommand({
  name: "add-to-calendar",
  takes: {"event": noun_arb_text}, // TODO: use DateNounType or EventNounType?
  icon : "chrome://ubiquity/skin/icons/calendar_add.png",
  preview: "Adds the event to Google Calendar.<br/> Enter the event naturally e.g., \"3pm Lunch with Myk and Thunder\", or \"Jono's Birthday on Friday\".",
  description: "Adds an event to your calendar.",
  help: "Currently, only works with <a href=\"http://calendar.google.com\">Google Calendar</a>, so you'll need a " +
        "Google account to use it.  Try issuing &quot;add lunch with dan tomorrow&quot;.",
  execute: function( eventString ) {
    addToGoogleCalendar( eventString.text );
  }
});


// TODO: Don't do a whole-sale copy of the page ;)
function checkCalendar(pblock, date) {
  var url = "http://www.google.com/calendar/m";
  var params = Utils.paramsToString({ as_sdt: date.toString("yyyyMMdd") });

  Utils.ajaxGet(url + params, function(html) {
    pblock.innerHTML = html;
  });
}

CmdUtils.CreateCommand({
  name: "check-calendar",
  takes: {"date to check": noun_type_date},
  icon : "chrome://ubiquity/skin/icons/calendar.png",
  description: "Checks what events are on your calendar for a given date.",
  help: "Currently, only works with <a href=\"http://calendar.google.com\">Google Calendar</a>, so you'll need a " +
        "Google account to use it.  Try issuing &quot;check thursday&quot;.",
  execute: function( directObj ) {
    var date = directObj.data;
    var url = "http://www.google.com/calendar/m";
    var params = Utils.paramsToString({ as_sdt: date.toString("yyyyMMdd") });

    Utils.openUrlInBrowser( url + params );
  },
  preview: function( pblock, directObj ) {
    var date = directObj.data;
    if (date) {
      pblock.innerHTML = "Checks Google Calendar for the day of" +
                         date.toString("dd MM, yyyy");
      checkCalendar( pblock, date );
    } else
      pblock.innerHTML = "Checks Google Calendar for the date you specify.";
  }
});


// -----------------------------------------------------------------
// MAPPING COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  name: "map",
  takes: {"address": noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/map.png",
  description: "Turns an address or location name into a Google Map.",
  help:"Try issuing &quot;map kalamazoo&quot;.  You can click on the map in the preview pane to get a" +
       " larger, interactive map that you can zoom and pan around.  You can then click the &quot;insert map in page&quot;" +
       " (if you're in an editable text area) to insert the map.  So you can, for example, type an address in an email, " +
       " select it, issue &quot;map&quot;, click on the preview, and then insert the map.",
  execute: function( directObj ) {
    var location = directObj.text;
    var url = "http://maps.google.com/?q=";
    url += encodeURIComponent(location);

    Utils.openUrlInBrowser( url );
  },
  preview: function(pblock, directObj) {
    var location = directObj.text;
    CmdUtils.showPreviewFromFile( pblock,
                                  "templates/map.html",
                                  function(winInsecure) {
      winInsecure.setPreview( location );

      winInsecure.insertHtml = function(html) {
        var doc = context.focusedWindow.document;
        var focused = context.focusedElement;

        // This would be nice to store the map in the buffer...
	// But for now, it causes a problem with a large image showing up as the default
        //CmdUtils.setLastResult( html );

        if (doc.designMode == "on") {
          doc.execCommand("insertHTML", false, location + "<br/>" + html);
        }
        else if (CmdUtils.getSelection()) {
	        CmdUtils.setSelection(html);
      	}
      	else {
      	  displayMessage("Cannot insert in a non-editable space. Use 'edit page' for an editable page.");
      	}
      };
    });
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
      displayMessage("You're not in a rich text editing field.");
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
      displayMessage("You're not in a rich text editing field.");
  }
}

CmdUtils.CreateCommand({
  name:"convert",
  takes:{text:noun_arb_text},
  modifiers:{to:noun_conversion_options},
  icon: "chrome://ubiquity/skin/icons/convert.png",
  description:"Converts a selection to a PDF, to rich text, or to html.",
  preview: function(pBlock, directObj, modifiers) {
    if (modifiers.to && modifiers.to.text) {
      pBlock.innerHTML = "Converts your selection to " + modifiers.to.text;
    } else {
      pBlock.innerHTML = "Converts a selection to a PDF, to rich text, or to html.";
    }
  },
  execute: function(directObj, modifiers) {
    if (modifiers.to && modifiers.to.text) {
      switch( modifiers.to.text) {
      case "pdf":
        convert_page_to_pdf();
	break;
      case "html":
	if (directObj.html)
          convert_to_html(directObj.html);
	else
	  displayMessage("There is nothing to convert!");
	break;
      case "rich-text":
	if (directObj.html)
          convert_to_rich_text(directObj.html);
	else
	  displayMessage("There is nothing to convert!");
	break;
      }
    } else {
      displayMessage("You must specify what you want to convert to: pdf, html, or rich-text.");
    }
  }
});


// -----------------------------------------------------------------
// MISC COMMANDS
// -----------------------------------------------------------------

function cmd_view_source() {
  var url = Application.activeWindow.activeTab.document.location.href;
  url = "view-source:" + url;
  // TODO: Should do it this way:
  // Utils.openUrlInBrowser( "http://www.google.com" );
  CmdUtils.getWindowInsecure().location = url;
}
cmd_view_source.description = "Shows you the source-code of the web page you're looking at.";
cmd_view_source.icon = "chrome://ubiquity/skin/icons/page_code.png";

function escape_html_entities(text) {
  // TODO finish this?
  text = text.replace(/</g, "&amp;lt;");
  text = text.replace(/>/g, "&amp;gt;");
  return text;
}
var escape_desc = "Replaces html entities (&lt;, &gt;, and &amp;) with their escape sequences.";
CmdUtils.CreateCommand({
  name:"escape-html-entities",
  takes: {text: noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/html_go.png",
  description: escape_desc,
  preview: function(pBlock, directObj) {
   if (directObj.html)
     pBlock.innerHTML = "Replaces your selection with " + escape_html_entities(directObj.html);
   else
     pBlock.innerHTML = escape_desc;
  },
  execute: function(directObj) {
    if (directObj.html)
      CmdUtils.setSelection(escape_html_entities(directObj.html));
  }
});


function wordCount(text){
  var words = text.split(" ");
  var wordCount = 0;

  for(i=0; i<words.length; i++){
    if (words[i].length > 0)
      wordCount++;
  }

  return wordCount;
}

CmdUtils.CreateCommand({
  name: "word-count",
  takes: {text: noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/sum.png",
  description: "Displays the number of words in a selection.",
  execute: function( directObj ) {
    if (directObj.text)
      displayMessage(wordCount(directObj.text) + " words");
    else
      displayMessage("No words selected.");
  },
  preview: function(pBlock, directObj) {
    if (directObj.text)
      pBlock.innerHTML = wordCount(directObj.text) + " words";
    else
      pBlock.innerHTML = "Displays the number of words in a selection.";
  }
});



/* TODO
From Abi:
	I think the ones I most often use would be to check the current status
	of a specific friend (or maybe, the last 3 statuses). The ability to
	check your friends timeline as a whole would also be nice.


*/

// max of 140 chars is recommended, but it really allows 160... but that gets truncated on some displays? grr
const TWITTER_STATUS_MAXLEN = 140;


CmdUtils.CreateCommand({
  name: "twitter",
  synonyms: ["tweet"],
  icon: "http://assets3.twitter.com/images/favicon.ico",
  takes: {status: noun_arb_text},
  modifiers: {},
  description: "Sets your Twitter status to a message of at most 160 characters.",
  help: "You'll need a <a href=\"http://twitter.com\">Twitter account</a>, obviously.  If you're not already logged in" +
        " you'll be asked to log in.",
  preview: function(previewBlock, directObj) {
	// these are converted in the Twitter database anyway, and counted as 4 characters
    var statusText = directObj.text
	  .replace("<", "&lt;")
	  .replace(">", "&gt;");

    var previewTemplate = "Updates your Twitter status to: <br /><b>${status}</b><br /><br />Characters remaining: <b>${chars}</b>";
    var truncateTemplate = "<br />The last <b>${truncate}</b> characters will be truncated!";
    var previewData = {
      status: statusText,
      chars: TWITTER_STATUS_MAXLEN - statusText.length
    };

    var previewHTML = CmdUtils.renderTemplate(previewTemplate, previewData);

    if(previewData.chars < 0) {
      var truncateData = {
        truncate: 0 - previewData.chars
      };

      previewHTML += CmdUtils.renderTemplate(truncateTemplate, truncateData);
    }

    previewBlock.innerHTML = previewHTML;
  },
  execute: function(directObj) {
    var statusText = directObj.text;
    if(statusText.length < 1) {
      displayMessage("Twitter requires a status to be entered");
      return;
    }

    var updateUrl = "https://twitter.com/statuses/update.json";
    var updateParams = {
      source: "ubiquity",
      status: statusText.slice(0, TWITTER_STATUS_MAXLEN)
    };

    jQuery.ajax({
      type: "POST",
      url: updateUrl,
      data: updateParams,
      dataType: "json",
      error: function() {
        displayMessage("Twitter error - status not updated");
      },
      success: function() {
        displayMessage("Twitter status updated");
      }
    });
  }
});

CmdUtils.CreateCommand({
  name: "digg",
  synonyms: ["share-on-digg"],
  icon: "http://digg.com/favicon.ico",
  homepage: "http://www.gialloporpora.netsons.org",
  description: "If not yet submitted, submits the page to Digg. Otherwise, it takes you to the story's Digg page.",
  author: { name: "Sandro Della Giustina", email: "sandrodll@yahoo.it"},
  license: "MPL,GPL",
  execute: function() {
    var doc = CmdUtils.getDocument();
    var sel = doc.getSelection().substring(0,375);

    var params = Utils.paramsToString({
      phase: "2",
      url: doc.location,
      title: doc.title,
      bodytext: sel
    });

    story_url='http://digg.com/submit' + params;
    Utils.openUrlInBrowser(story_url);

  },
  preview: function(pblock) {

    var doc = CmdUtils.getDocument();
    var selected_text= doc.getSelection();
    var api_url='http://services.digg.com/stories';

    var params = Utils.paramsToString({
      appkey: "http://www.gialloporpora.netsons.org",
      link: doc.location
    });

    var html= 'Submit or digg this page. Checking if this page has already been submitted...';
    pblock.innerHTML = html;

    jQuery.ajax({
      type: "GET",
      url: api_url+params,
      error: function(){
        //pblock.innerHTML= 'Digg API seems to be unavailable or the URI is incorrect.<br/>';
      },
      success: function(xml){
        var el = jQuery(xml).find("story");
        var diggs = el.attr("diggs");

        if (diggs == null){
          html = 'Submit this page to Digg';
          if (selected_text.length > 0) {
            html += " with the description:<br/> <i style='padding:10px;color: #CCC;display:block;'>" + selected_text + "</i>";
            if (selected_text.length > 375){
              html +='<br/> Description can only be 375 characters. The last <b>'
              + (selected_text.length - 375) + '</b> characters will be truncated.';
            }
          }
        }
        else{
          html = 'Digg this page. This page already has <b>'+diggs+'</b> diggs.';
        }
        pblock.innerHTML = html;
      }
    });
  }
});


CmdUtils.CreateCommand({
  name: "tinyurl",
  takes: {"url to shorten": noun_type_url},
  icon: "http://tinyurl.com/favicon.ico",
  description: "Replaces the selected URL with a <a href=\"http://www.tinyurl.com\">TinyUrl</a>",
  preview: function( pblock, urlToShorten ){
    pblock.innerHTML = "Replaces the selected URL with a TinyUrl.";
    var baseUrl = "http://tinyurl.com/api-create.php?url=";
    pblock.innerHTML = "Replaces the selected URL with ",
    jQuery.get( baseUrl + urlToShorten.text, function( tinyUrl ) {
      if(tinyUrl != "Error") pblock.innerHTML += tinyUrl;
    });
  },
  execute: function( urlToShorten ) {
    //escaping urlToShorten will not create the right tinyurl
    var baseUrl = "http://tinyurl.com/api-create.php?url=";
    jQuery.get( baseUrl + urlToShorten.text, function( tinyUrl ) {
      CmdUtils.setSelection( tinyUrl );
    });
  }
});


// -----------------------------------------------------------------
// PAGE EDIT COMMANDS
// -----------------------------------------------------------------

function cmd_delete() {
  var sel = context.focusedWindow.getSelection();
  var document = context.focusedWindow.document;

  if (sel.rangeCount >= 1) {
      var range = sel.getRangeAt(0);
      var newNode = document.createElement("div");
      newNode.className = "_toRemove";
      range.surroundContents(newNode);
  }

  CmdUtils.loadJQuery(function(jQuery) {
    jQuery("._toRemove").slideUp();
  });
}
cmd_delete.description = "Deletes the selected chunk of HTML from the page.";
cmd_delete.icon = "chrome://ubiquity/skin/icons/delete.png";
cmd_delete.preview = function( pblock ) {
  pblock.innerHTML = cmd_delete.description;
};

function cmd_undelete() {
  CmdUtils.loadJQuery(function(jQuery) {
    jQuery("._toRemove").slideDown();
  });
}
cmd_undelete.description = "Restores the HTML deleted by the delete command.";
cmd_undelete.icon = "chrome://ubiquity/skin/icons/arrow_undo.png";
cmd_undelete.preview = function( pblock ) {
  pblock.innerHTML = cmd_undelete.description;
};

function cmd_edit_page() {
  // TODO: works w/o wrappedJSObject in CmdUtils.getDocumentInsecure() call- fix this
  CmdUtils.getDocumentInsecure().body.contentEditable = 'true';
  CmdUtils.getDocumentInsecure().designMode='on';
}
cmd_edit_page.description = "Puts the web page into a mode where you can edit the contents.";
cmd_edit_page.help = "In edit mode, you can edit the page like any document: Select text, delete it, add to it, copy and paste it.  Issue \'bold\', \'italic\', or \'underline\' commands to add formatting.  Issue the 'save' command to save your changes so they persist even when you reload the page.  Issue 'stop-editing-page' when you're done to go back to the normal page viewing mode.";
cmd_edit_page.icon = "chrome://ubiquity/skin/icons/page_edit.png";
cmd_edit_page.preview = function( pblock ) {
  pblock.innerHTML = cmd_edit_page.description;
};

function cmd_stop_editing_page() {
  CmdUtils.getDocumentInsecure().body.contentEditable = 'false';
  CmdUtils.getDocumentInsecure().designMode='off';
}
cmd_stop_editing_page.description = "If you used the 'edit page' command to put the page into editable mode, use this command to end that mode and go back to normal page viewing.";
cmd_stop_editing_page.preview = function( pblock ) {
  pblock.innerHTML = cmd_stop_editing_page.description;
}
cmd_stop_editing_page.icon = "chrome://ubiquity/skin/icons/page_refresh.png";

// I think edit-mode on and edit-mode off would be

function cmd_save() {
  // TODO: works w/o wrappedJSObject in CmdUtils.getDocumentInsecure() call- fix this
  CmdUtils.getDocumentInsecure().body.contentEditable = 'false';
  CmdUtils.getDocumentInsecure().designMode = 'off';

  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);

  var body = jQuery( CmdUtils.getDocumentInsecure().body );

  annotationService.setPageAnnotation(ioservice.newURI(window.content.location.href, null, null), "ubiquity/edit", body.html(), 0, 4);

}
cmd_save.description = "Saves page edits. Undo with 'remove-annotations'";
cmd_save.icon = "chrome://ubiquity/skin/icons/page_save.png";
cmd_save.preview = function( pblock ) {
  pblock.innerHTML = cmd_save.description;
};

var pageLoad_restorePageAnnotations = function () {
  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService);

  var uri = ioservice.newURI(window.content.location.href, null, null);

  var annotationNames = annotationService.getPageAnnotationNames(uri, {});

  for (var i=0; i<annotationNames.length; i++) {

    var annotationName, annotationValue;
    var startNode, endNode;
    var startXpath, endXpath;
    var startOffset, endOffset;

    if (annotationNames[i].match("ubiquity/delete/")) {
      annotationName = annotationNames[i].substring(16);
      annotationValue = annotationService.getPageAnnotation(uri, annotationNames[i]);

      // get xpaths out of name
      startXpath = annotationName.substring(0, annotationName.indexOf("#"));
      endXpath = annotationName.substring(annotationName.indexOf("#") + 1);

      // get offsets out of value
      startOffset = parseInt(annotationValue.substring(0, annotationValue.indexOf("#")));
      endOffset = parseInt(annotationValue.substring(annotationValue.indexOf("#") + 1));


      // find the nodes from the xpaths
      var iterator;
      iterator = doc.evaluate(startXpath, doc, null, XPathResult.ANY_TYPE, null);
      startNode = iterator.iterateNext();
      iterator = doc.evaluate(endXpath, doc, null, XPathResult.ANY_TYPE, null);
      endNode = iterator.iterateNext();


      // delete the text content in between the start and end nodes
      if (startNode == endNode) {
        startNode.textContent = startNode.textContent.substring(0, startOffset) +
          startNode.textContent.substring(endOffset);
      }
      else {
        startNode.textContent = startNode.textContent.substring(0, startOffset);
        var curNode = startNode.nextSibling;
        while (curNode && (curNode != endNode)) {
          curNode.textContent = "";
          curNode = curNode.nextSibling;
        }
        endNode.textContent = endNode.textContent.substring(endOffset);
      }

    }

    if (annotationNames[i] == "ubiquity/edit") {
      // TODO: works w/o wrappedJSObject in CmdUtils.getDocumentInsecure() call- fix this
      var body = jQuery( CmdUtils.getDocumentInsecure().body );

      annotationValue = annotationService.getPageAnnotation(uri, annotationNames[i]);
      body.html(annotationValue);

      // TODO: Fix "TypeError: head is not defined" on some pages

    }
  }
};
cmd_save.description = "Saves edits you've made to this page in an annotation.";
cmd_save.preview = function( pblock ) {
  pblock.innerHTML = cmd_save.description;
}

// removes all page annotations - add more functionality
function cmd_remove_annotations() {
  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);

  annotationService.removePageAnnotations(ioservice.newURI(window.content.location.href, null, null));

  window.content.location.reload();
}
cmd_remove_annotations.description = "Resets any annotation changes you've made to this page.";
cmd_remove_annotations.preview = function( pblock ) {
  pblock.innerHTML = cmd_remove_annotations.description;
};

cmd_remove_annotations.icon = "chrome://ubiquity/skin/icons/page_delete.png";


CmdUtils.CreateCommand({
  name:"map-these",
  takes: {"selection": noun_arb_text },
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
      key: "ABQIAAAAGZ11mh1LzgQ8-8LRW3wEShQeSuJunOpTb3RsLsk00-MAdzxmXhQoiCd940lo0KlfQM5PeNYEPLW-3w",
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
                long: points[0].long,
                marker: String.fromCharCode( markerNumber++ ),
                name: jQuery( "title", div).text()
              }

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
})


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

  return co.toDataURL()
}

CmdUtils.CreateCommand({
  name: "sparkline",
  synonyms: ["graph"],
  description: "Graphs the current selection, turning it into a sparkline.",
  takes: {"data": noun_arb_text},
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

  preview: function(pblock, input) {
    var img = this._dataToSparkline( input.text );

    if( !img )
      jQuery(pblock).text( "Requires numbers to graph." );
    else
      jQuery(pblock).empty().append( img ).height( "15px" );
  },

  execute: function( input ) {
    var img = this._dataToSparkline( input.text );
    if( img ) CmdUtils.setSelection( img );
  }
});


