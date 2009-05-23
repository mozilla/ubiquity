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
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Blair McBride <unfocused@gmail.com>
 *   Abimanyu Raja <abimanyuraja@gmail.com>
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
 
 //
 // **Shared functions for localized nountypes**
 //

function getGmailContacts( callback ) {
  // TODO: It's not really a security hazard since we're evaluating the
  // Vcard data in a sandbox, but I'm not sure how accurate this
  // algorithm is; we might want to consider using a third-party
  // VCard parser instead, e.g.: git://github.com/mattt/vcard.js.git
  // -AV

  var sandbox = Components.utils.Sandbox("data:text/html,");
  jQuery.get(
    "http://mail.google.com/mail/contacts/data/export",
    {exportType: "ALL", out: "VCARD"},
    function(data) {
      function unescapeBS(m) {
        var result =  Components.utils.evalInSandbox("'"+ m +"'", sandbox);
        if (typeof(result) == "string")
          return result;
        else
          return "";
      }
      var contacts = [], name = '';
      for each(var line in data.replace(/\r\n /g, '').split(/\r\n/))
        if(/^(FN|EMAIL).*?:(.*)/.test(line)){
          var {$1: key, $2: val} = RegExp;
          var val = val.replace(/\\./g, unescapeBS);
          if(key === "FN")
            name = val;
          else
            contacts.push({name: name, email: val});
        }
      callback(contacts);
    },
    "text");
}

function getYahooContacts( callback ){
  var url = "http://us.mg1.mail.yahoo.com/yab";
  //TODO: I have no idea what these params mean
  var params = {
    v: "XM",
    prog: "ymdc",
    tags: "short",
    attrs: "1",
    xf: "sf,mf"
  };

  jQuery.get(url, params, function(data) {

    var contacts = [];
    for each( var line in jQuery(data).find("ct") ){
      var name = jQuery(line).attr("yi");
      //accept it as as long as it is not undefined
      if(name){
        var contact = {};
        contact["name"] = name;
        contact["email"] = name + "@yahoo.com"; //TODO: what about yahoo.co.uk or ymail?
        contacts.push(contact);
      }
    }

    callback(contacts);
  }, "text");

}

function getContacts(callback){
  getGmailContacts(callback);
  getYahooContacts(callback);
}

function isAddress( query, callback ) {
  var url = "http://local.yahooapis.com/MapsService/V1/geocode";
  var params = Utils.paramsToString({
    location: query,
    appid: "YD-9G7bey8_JXxQP6rxl.fBFGgCdNjoDMACQA--"
  });


  jQuery.ajax({
    url: url+params,
    dataType: "xml",
    error: function() {
      callback( false );
    },
    success:function(data) {
      var results = jQuery(data).find("Result");
      var allText = jQuery.makeArray(
                      jQuery(data)
                        .find(":contains()")
                        .map( function(){ return jQuery(this).text().toLowerCase(); } )
                      );

      // TODO: Handle non-abbriviated States. Like Illinois instead of IL.

      if( results.length == 0 ){
        callback( false );
        return;
      }

      function existsMatch( text ){
        var joinedText = allText.join(" ");
        return joinedText.indexOf( text.toLowerCase() ) != -1;
      }

      var missCount = 0;

      var queryWords = query.match(/\w+/g);
      for( var i=0; i < queryWords.length; i++ ){
        if( existsMatch( queryWords[i] ) == false ) {
          missCount += 1;
          //displayMessage( queryWords[i] );
        }
      }

      var missRatio = missCount / queryWords.length;
      //displayMessage( missRatio );

      if( missRatio < .5 )
        callback( true );
      else
        callback( false );
    }
  });
}
