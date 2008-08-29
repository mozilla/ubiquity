function getUrlParams() {
  var urlFragments = document.URL.split("?")[1];
  urlFragments = urlFragments.split("&");
  var params = {};
  for( var x in urlFragments ) {
    var fragFrags = urlFragments[x].split("=");
    params[ fragFrags[0] ] = decodeURIComponent(fragFrags[1]);
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
  var code = $("#sourceCode").text();
  var canUpdate = $("#autoupdate").attr("checked") ? true : false;
  if (code) {
    LinkRelCodeSource.addMarkedPage({url: gCommandFeedInfo.url,
                                     sourceCode: code,
                                     canUpdate: canUpdate});
    showConfirmation();
  }
}

function onCancel() {
  window.close();
}

function fetchSource(uri) {
  function onSuccess(data) {
    $("#sourceCode").css({whiteSpace: "pre-wrap",
                          fontFamily: "Monospace"});
    $("#sourceCode").text(data);
  }
  if (LocalUriCodeSource.isValidUri(uri)) {
    $("#autoupdate-widget").hide();
    var codeSource = new LocalUriCodeSource(uri);
    onSuccess(codeSource.getCode());
  } else {
    jQuery.ajax({url: uri,
                 dataType: "text",
                 success: onSuccess});
  }
}

function onReady() {
  if (LinkRelCodeSource.isMarkedPage(gCommandFeedInfo.url))
    showConfirmation();

  $("#targetLink").text(gCommandFeedInfo.url);
  $("#targetLink").attr("href", gCommandFeedInfo.url);
  fetchSource(gCommandFeedInfo.sourceUrl);
}

$(window).ready(onReady);
