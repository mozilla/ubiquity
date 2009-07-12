var API_KEY = jQuery("#google-jsapi").get(0).src.split("?key=")[1];

google.load("search", "1");
google.load("maps", "2");

var gLocalSearch;
var gMap;
var gSelectedResults = [];
var gCurrentResults = [];
var gCurrentMarker;
var gCurrentMarkerPoint;
var gMapControl;
var gMapType;

function showAddressPreview() {
  if (document.getElementById("preview-pane-large"))
    document.getElementById("preview-pane-large").id = "preview-pane";
  $(".map-actions, #selected-address").hide();
  $(".suggestion, #address-list, #clickee").show();

  if (document.getElementById("map-large"))
    document.getElementById("map-large").id = "map";

  gMap.checkResize();
  if (gCurrentMarkerPoint)
    gMap.panTo(gCurrentMarkerPoint);

  gMap.removeControl(gMapControl);
  gMap.removeControl(gMapType);
  gMap.disableDragging();

  //Ubiquity.resizePreview(
  //  document.getElementsByName("preview-pane")[0].clientHeight);

  // this animation doesn't work since the preview pane size has to be changed from cmdutils.js
  /* $("#preview-pane")
        .height("300px")
        .animate({ height: "140px" });
   */
  // this animation works, but looks bad since the above was taken out
  /*
      $("#map").animate({
        width: "200px",
        height: "130px",
      }, 500);
      setTimeout(function(){
        $(".suggestion").slideDown(500);
        $("#address-list").fadeIn(700);
      }, 500);
   */
}

function showMapPreview(map) {
  $("#address-list, #clickee, .suggestion").hide();

  $("#selected-address").fadeIn(300);
  var previewPane = document.getElementById("preview-pane");
  if (previewPane)
    previewPane.id = "preview-pane-large";

  gMap.addControl(gMapControl);
  gMap.addControl(gMapType);
  gMap.enableDragging();

  $("#map").animate({
    width: "100%",
    height: "240px",
  }, 500);
  setTimeout(function(){
    $(".map-actions").fadeIn();
    $(".suggestion").slideUp(500);
  }, 300);

  //Ubiquity.resizePreview(
  //  document.getElementsByName("preview-pane")[0].clientHeight);

  if (document.getElementById("map"))
    document.getElementById("map").id = "map-large";

  gMap.checkResize();
  gMap.panTo(gCurrentMarkerPoint);

  /*
      $("#preview-pane-large")
        .height("140px")
        .animate({ height: "300px" });
   */

}

// initializes the map and starts the local search
function loadMap(searchTerm, index) {
  var currentLat = geoip_latitude();
  var currentLng = geoip_longitude();

  // Initialize the map
  gMap = new google.maps.Map2(document.getElementById("map"));
  gMap.setCenter(new google.maps.LatLng(currentLat, currentLng), 13);
  gMap.disableDragging();
  gMapControl = new GSmallMapControl();
  gMapType = new GMapTypeControl();
  GEvent.addListener(gMap, "click", function () { showMapPreview(gMap) });

  // add listeners so the map knows when we change it
  GEvent.addListener(
    gMap, "dragend", function () { gMap.setCenter(gMap.getCenter()) });
  GEvent.addListener(
    gMap, "maptypechanged",
    function () { gMap.setMapType(gMap.getCurrentMapType()) });

  // Initialize the local searcher
  gLocalSearch = new google.search.LocalSearch();
  gLocalSearch.setCenterPoint(gMap);
  gLocalSearch.setSearchCompleteCallback(
    null, function () { onLocalSearch(searchTerm) });

  // Execute the initial search
  gLocalSearch.execute(searchTerm);

  showAddressPreview();
}

// Called when Local Search results are returned
function onLocalSearch(searchTerm) {
  var {results} = gLocalSearch;
  if ((results || "").length === 0) {
    $("#mapArea").hide();
    $("#msg").html('<div>No results for "' + searchTerm + '\"</div>');
    return;
  }
  $("#mapArea").show();
  $("#msg").html("");

  $("#address-list").empty();
  var searchWell = document.getElementById("address-list");

  gCurrentResults = [];
  var numToDisplay = Math.min(3, results.length);
  for (var i = 0; i < numToDisplay; i++) {
    gCurrentResults.push(new LocalResult(results[i]));
  }

  // move the map to the first result
  var first = results[0];
  var point = new google.maps.LatLng(first.lat, first.lng);

  setMarker(point, 0);
}

function getStaticMapUrl() {
  var curZoom = gMap.getZoom();
  var curCenter = gMap.getCenter();

  return "http://maps.google.com/staticmap?" + $.param({
    center: curCenter.lat() + "," + curCenter.lng(),
    zoom: curZoom,
    size: $("#map-large").width() + "x" + $("#map-large").height(),
    key: API_KEY,
    markers: (gCurrentMarkerPoint
              ? (gCurrentMarkerPoint.lat() + "," + gCurrentMarkerPoint.lng() +
                 "," + "red")
              : ""),
  });
}

// A class representing a single Local Search result returned by the Google AJAX Search API.
function LocalResult(result) {
  this.result = result;
  this.resultNode = this.unselectedHtml();
  document.getElementById("address-list").appendChild(this.resultNode);
}
LocalResult.prototype.unselectedHtml = function unselectedHtml() {
  var {results} = gLocalSearch;
  var {result} = this;
  var container = document.createElement("div");
  var point = new google.maps.LatLng(result.lat, result.lng);
  var index = results.indexOf(result);
  container.className = index < 1 ? "gaddress-current" : "gaddress";

  $("#selected-address").text(result.titleNoFormatting);

  var {streetAddress, city, region} = result;
  var key = index + 1;
  result.html.innerHTML = (
    "<a class='address-link' accesskey='" + key + "'>" +
    "<div class='address-line'><kbd>" + key + "</kbd>" +
    result.title + "</div>" +
    "<div class='address-line'>" +
    (streetAddress || "") +
    (city ? "&nbsp;" + city : "") +
    (region ? ",&nbsp;" + region : "") +
    // "&nbsp;" + result.country +
    "</div></a>");
  container.appendChild(result.html.cloneNode(true));
  container.getElementsByClassName("address-link")[0].addEventListener(
    "click", function () { setMarker(point, index) }, false);
  return container;
}

/* onclick for each address in the results list */
function setMarker(point, index) {
  // adjust the map to the new address
  if (gCurrentMarker)
    gMap.removeOverlay(gCurrentMarker);
  gMap.panTo(point);
  gCurrentMarkerPoint = point;
  gCurrentMarker = new GMarker(point);
  gMap.addOverlay(gCurrentMarker);

  var curAddress = document.getElementsByClassName("gaddress-current");
  curAddress[0].className = "gaddress";

  var addresses = document.getElementsByClassName("gaddress");
  for (var i=0; i < addresses.length; i++) {
    if (i == index)
      addresses[i].className = "gaddress-current";
    else
      addresses[i].className = "gaddress";
  }

  // adjust the email link
  setEmailUrl();
}

/* Currently using default mail client. */
/* Would be nice to include the image itself in the body */
function setEmailUrl() {
  var curCenter = gMap.getCenter();
  var curAddress = document.getElementById("selected-address").innerHTML;
  var staticMap = "http://maps.google.com/staticmap?" + $.param({
    markers: curCenter.lat() + "," + curCenter.lng() + "," + "red",
    zoom: 13,
    size: "450x240",
    key: API_KEY,
  });
  document.getElementById("send-link").href =
    "mailto:?Subject=" + curAddress + "&body=" + encodeURIComponent(staticMap);
}

function insertMap() {
  var mapHtml = jQuery("#map").html();
  var url = getStaticMapUrl();
  Ubiquity.insertHtml(<img src={url}/>.toXMLString(), url);
}

function clickMap() {
  var ev = document.createEvent("MouseEvents");
  ev.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0,
                    false, false, false, false, 0, null);
  document.getElementById("map").dispatchEvent(ev);
}

Ubiquity.onPreview = function setPreview(searchTerm) {
  if ($("#preview-pane-large").length)
    showAddressPreview();
  loadMap(searchTerm.text, 0);
};

function setupTestFramework() {
  // Test Framework
  if (window.console) {
    ($(document.createElement("input"))
     .val("Enter search term here (then hit enter)")
     .css({width: 300, position: "absolute", top: 400, left: 10})
     .click(function () {
       jQuery(this).select();
     })
     .keyup(function (e) {
       if (e.which === 13) {
         Ubiquity.onPreview({text: this.value});
       }
     })
     .appendTo("body"));
  }
}
