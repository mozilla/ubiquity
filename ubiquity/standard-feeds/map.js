var API_KEY = "ABQIAAAAO0oNFUXoUNx4MuxcPwakNhR3yUCx-o6JvWtDFa7jNOakHN7MrBSTsaKtGJjaVMeVURIpTa3cD1qNfA";
// This API key is for https://people.mozilla.com only."

CmdUtils.CreateCommand({
  names: ["map"],
  arguments: [{role: "object",
               nountype: noun_arb_text,
               label: "address"}],
  icon: "chrome://ubiquity/skin/icons/map.png",
  description: "Turns an address or location name into a Google Map.",
  help:"Try issuing &quot;map kalamazoo&quot;.  You can click on the map in the preview pane to get a" +
       " larger, interactive map that you can zoom and pan around.  You can then click the &quot;insert map in page&quot;" +
       " (if you're in an editable text area) to insert the map.  So you can, for example, type an address in an email, " +
       " select it, issue &quot;map&quot;, click on the preview, and then insert the map.",
  execute: function( arguments ) {
    if (arguments.object && arguments.object.text) {
      var location = arguments.object.text;
      var url = "http://maps.google.com/?q=";
      url += encodeURIComponent(location);

      Utils.openUrlInBrowser( url );
    } else {
      Utils.openUrlInBrowser( "http://maps.google.com" );
    }
  },
  previewUrl: "templates/map.html",
  preview: function(pblock, arguments) {
      // TODO: This isn't terribly safe; ideally, we should be communicating
      // with the other page via DOM events, etc.
    if (arguments.object && arguments.object.text ){
      var dobj = arguments.object;
      var previewWindow = pblock.ownerDocument.defaultView;
      previewWindow = XPCSafeJSObjectWrapper(previewWindow);
      previewWindow.Ubiquity.context = context;

      previewWindow.Ubiquity.resizePreview = function(height) {
        // TODO: Do something to change height of iframe?
      };

      previewWindow.Ubiquity.insertHtml = function(html) {
        if (typeof(html) != "string")
          return;
        var doc = context.focusedWindow.document;
        var focused = context.focusedElement;

        if (doc.designMode == "on") {
          // The "query" here is useful so that you don't have to retype what
          // you put in the map command. That said, this is map-command
          // specific and should be factored out. -- Aza
          doc.execCommand("insertHTML", false, dobj.html + "<br/>" + html);
        }
        else if (CmdUtils.getSelection()) {
	  CmdUtils.setSelection(html);
      	}
      	else {
      	  displayMessage("Cannot insert in a non-editable space. Use " +
                         "'edit page' for an editable page.");
      	}
      };
      previewWindow.Ubiquity.onPreview(dobj);
    } else {
      pblock.innerHTML = this.description;
    }
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
