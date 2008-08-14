function getUrlParams() {
  var urlFragments = document.URL.split("?")[1];
  urlFragments = urlFragments.split("&");
  var params = {};
  for( var x in urlFragments ) {
    var fragFrags = urlFragments[x].split("=");
    params[ fragFrags[0] ] = fragFrags[1];
  }
  return params;
}

var gCommandFeedInfo = getUrlParams();

function showConfirmation() {
  $("#errorShortDesc").html($("#confirmationShortDesc").html());
  $("#errorLongDesc").html($("#confirmationLongDesc").html());
  $("#buttons").remove();
}

function onSubmit() {
  LinkRelCodeSource.addMarkedPage(gCommandFeedInfo.url);
  showConfirmation();
}

function onCancel() {
  window.close();
}

function onReady() {
  if (LinkRelCodeSource.isMarkedPage(gCommandFeedInfo.url))
    showConfirmation();

  $("#targetLink").text(gCommandFeedInfo.url);
  $("#targetLink").attr("href", gCommandFeedInfo.url);
  $("#jsIframe").attr("src", gCommandFeedInfo.sourceUrl);
}

$(window).ready(onReady);
