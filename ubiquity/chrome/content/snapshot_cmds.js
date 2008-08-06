// -----------------------------------------------------------------
// SNAPSHOT RELATED
// -----------------------------------------------------------------

function getHiddenWindow() {
  return Components.classes["@mozilla.org/appshell/appShellService;1"]
                   .getService(Components.interfaces.nsIAppShellService)
                   .hiddenDOMWindow;
}

function takeSnapshotOfWindow( window, scrollDict ) {
  if( !scrollDict ) scrollDict = {};
  var top = scrollDict.top || 0.001;
  var left = scrollDict.left || 0.001;

  var hiddenWindow = getHiddenWindow();
  var canvas = hiddenWindow.document.createElementNS("http://www.w3.org/1999/xhtml", "canvas" );

  var body = window.document.body;

  var width = jQuery(body).width();
  var height = window.innerHeight+110;

  canvas.width = width;
  canvas.height = height;

  var ctx = canvas.getContext( "2d" );
  ctx.drawWindow( window, left, top, width, height, "rgb(255,255,255)" );
  return canvas.toDataURL();
}

function cmd_inject_snapshot() {
  var win = CmdUtils.getWindowInsecure();
  win.snapshot = takeSnapshotOfWindow;
}

function pageLoad_inject_snapshot(){
  CmdUtils.getWindowInsecure().snapshot = takeSnapshotOfWindow;
}

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

function iframeFullPageZoom( iframe, level ) {
  var navigator1 = iframe.contentWindow
                    .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                    .getInterface(Components.interfaces.nsIWebNavigation);
  var docShell = navigator1.QueryInterface(Components.interfaces.nsIDocShell);
  var docviewer = docShell.contentViewer.QueryInterface(Components.interfaces.nsIMarkupDocumentViewer);
  docviewer.fullZoom = level;
}

function cmd_scale_firefox_down() {
  setFullPageZoom( .91 );
}

function cmd_zoom() {
  var win = CmdUtils.getWindowInsecure();
  var document = CmdUtils.getDocumentInsecure();

  var $ = jQuery;

  var dataUrl = takeSnapshotOfWindow( win, {top:win.scrollY} );

  var div = document.createElement( "div" );
  $(div).css({
    position:"fixed",
    top:0,
    left: 0,
    backgroundColor: "#222",
    width: "100%",
    height: "100%",
    zIndex: 10000000
  });

  var w = jQuery(document.body).width();
  var h = window.innerHeight;

  var img = document.createElement("img");
  img.src = dataUrl;
  img.id = "theImage";

  $(img).css({
    position:"fixed",
    top: 0,
    left: 0,
    zIndex: 10000001
  });

  $(document.body).append( img ).append(div);
  $(document.body).css({overflow:"hidden"});

  // This is a hack which fixes an intermittent bug where the top wasn't
  // being set correctly before animating.
  $(img).animate({top:0, width:w, height: h}, 1);

  $(img).animate({top:100, left:w/2, width:w*.1, height: h*.1}, 500);
  $(img).click( function(){
    $(img).animate({top:0, left:0, width:w, height: h}, 500);
    // TODO: Can't tell if this is an implicit window.setTimeout() or
    // should be changed to Utils.setTimeout()... -Atul
    setTimeout( function(){
      $(div).remove();
      $(img).remove();
      $(document.body).css({overflow:"auto"});
    },500);

  });
}
