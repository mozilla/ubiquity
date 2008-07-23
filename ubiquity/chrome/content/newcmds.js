function setGooglePreview(searchTerm, pblock) {
  var url = "http://ajax.googleapis.com/ajax/services/search/web";
  var params = "v=1.0&q=" + encodeURIComponent(searchTerm);

  var req = new XMLHttpRequest();
  req.open('GET', url + "?" + params, true);
  req.overrideMimeType('application/json');
  req.onreadystatechange = function() {
    if (req.readyState == 4 && req.status == 200) {
      var jObj = eval( '(' + req.responseText + ')' );
      var count = jObj.responseData.cursor.estimatedResultCount;
      var numToDisplay = 3;
      var results = jObj.responseData.results;
      var html = "";

      if (numToDisplay < count) {
        for (var i=0; i<numToDisplay; i++) {
          var title = results[i].title;
          var content = results[i].content;
          var url = results[i].url;
          var visibleUrl = results[i].visibleUrl;

          html = html + "<div class=\"gresult\">" +
                        "<div><a onclick=\"window.content.location.href = '" + url + "';\">" + title + "</a></div>" +
                        "<xul:description class=\"gresult-content\">" + content + "</xul:description>" +
                        "<div class=\"gresult-url\">" + visibleUrl +
                        "</div></div>";
        }
      }
      pblock.innerHTML = html;
    }
  };
  req.send(null);

}

function loadMap(lat, lng) {
  if (GBrowserIsCompatible) {
    var map = new GMap2(document.getElementById("map"));
    var point = new GLatLng(lat, lng);
    map.setCenter(point, 13);
    map.addOverlay(new GMarker(point));
    map.addControl(new GSmallMapControl());
  }
}

function setMapPreview(searchTerm, pblock) {
  var doc = context.focusedWindow.document;
  var url = "http://maps.google.com/maps/geo";
  var apikey = "ABQIAAAAzr2EBOXUKnm_jVnk0OJI7xSsTL4WIgxhMZ0ZK_kHjwHeQuOD4xQJpBVbSrqNn69S6DOTv203MQ5ufA";
  var params = "key=" + apikey + "&q=" + encodeURIComponent(searchTerm);

  var req = new XMLHttpRequest();
  req.open('GET', url + "?" + params, true);
  req.overrideMimeType('application/json');
  req.onreadystatechange = function() {
    if (req.readyState == 4 && req.status == 200) {
      var jobj = eval( '(' + req.responseText + ')' );
      var numToDisplay = 3;

      if (!jobj.Placemark) {
        displayMessage("not specific enough");
        return;
      }

      var placemark = jobj.Placemark[0];
      var lng0 = placemark.Point.coordinates[0];
      var lat0 = placemark.Point.coordinates[1];

      var html = "<div id=\"address-list\">";
      for (var i=0; i<numToDisplay; i++) {
        if (jobj.Placemark[i]) {
          var address = jobj.Placemark[i].address;
          var lng = jobj.Placemark[i].Point.coordinates[0];
          var lat = jobj.Placemark[i].Point.coordinates[1];

          html = html + "<div class=\"gaddress\">" +
                        "<a href=\"#\" onclick=\"loadMap(" + lat + ", " + lng + ");\">" +
                        address + "</a></div>";
        }
      }
      html = html + "</div>" +
                    "<div id=\"map\">[map]</div>";

      // For now, just displaying the address listings and the map
      pblock.innerHTML = html;

      // This call to load map doesn't have access to the google api script which is currently included in the popup in browser.xul
      // Possibly insert a script tag here instead- doesn't seem to be working either: doesn't actually LOAD (ie: onload event never fires)
      loadMap(lat0, lng0);

    }
  };
  req.send(null);
}



function makeSearchCommand(name, urlTemplate, icon) {
  var cmd = function(directObject, modifiers) {
    var urlString = urlTemplate.replace("{QUERY}", directObject);
    openUrlInBrowser(urlString);
  };

  cmd.icon = icon;

  cmd.preview = function(pblock, directObject, modifiers) {
    if (directObject) {
      if (name == "Google") {
        setGooglePreview(directObject, pblock);
        pblock.innerHTML = ("Getting google results for <b>" +
                           escape(directObject) + "</b>...");
      }
      else if (name == "Google Maps") {
        setMapPreview(directObject, pblock);
        pblock.innerHTML = ("Getting map for <b>" +
                           escape(directObject) + "</b>...");
      }
      else {
        var content = ("Performs a " + name + " search for <b>" +
                  escape(directObject) + "</b>.");
        pblock.innerHTML = content;
      }
    }
  };

  cmd.DOType = arbText;
  cmd.DOName = "search term";
  cmd.modifiers = {};
  return cmd;
}

var cmd_google = makeSearchCommand(
  "Google",
  "http://www.google.com/search?q={QUERY}",
  "http://www.google.com/favicon.ico"
);

var cmd_imdb = makeSearchCommand(
  "IMDB",
  "http://www.imdb.com/find?s=all&q={QUERY}&x=0&y=0",
  "http://i.imdb.com/favicon.ico"
);

var cmd_map_it = makeSearchCommand(
  "Google Maps",
  "http://maps.google.com/?q={QUERY}",
  "http://www.google.com/favicon.ico"
);

// -----------------------------------------------------------------
// TEXT COMMANDS
// -----------------------------------------------------------------

function cmd_bold() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("bold", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}

function cmd_italic() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("italic", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}

function cmd_underline() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("underline", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}

function cmd_undo() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("undo", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}

function cmd_redo() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("redo", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}