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
// DEVELOPER COMMANDS
// -----------------------------------------------------------------

// TODO: Add the ability to manually set the language being highlighted.
// TODO: Add the ability to select the style of code highlighting.
CmdUtils.CreateCommand({
  name: "syntax-highlight",
  takes: {"code": noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/color_wheel.png",
  description: "Treats your selection as program source code, guesses its language, and colors it based on syntax.",
  execute: function( directObj ) {
    var code = directObj.text;
    var url = "http://azarask.in/services/syntaxhighlight/color.py";
    var params = {
      code: code,
      style: "native"
    };

    jQuery.post( url, params, function( html ) {
      html = html.replace( /class="highlight"/, "style='background-color:#222;padding:3px'");
      CmdUtils.setSelection( html );
    });
  },
  preview: "Syntax highlights your code."
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
