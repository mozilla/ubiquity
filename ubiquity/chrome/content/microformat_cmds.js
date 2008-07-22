// -----------------------------------------------------------------
// MICROFORMAT RELATED
// -----------------------------------------------------------------

function getMF( type ) {
  Components.utils.import("resource://gre/modules/Microformats.js");

  var count = Microformats.count( type , getDocumentInsecure(), {recurseExternalFrames: true});
  if( count > 0 ) {
    return Microformats.get( type , getDocumentInsecure(), {recurseExternalFrames: true});
  }
  return null;
}

function cmd_detect_microformat() {
  if( !globals.addresses )
    globals.addresses = [];

  var uf = getMF( "adr" );
  if( uf ) {
    displayMessage( "Found address: " + uf );
    globals.addresses.push( uf[0] );
  }
}

// If Google Maps is open, go to the last harvested address
// microformat.
function cmd_populate_with_microformat() {
  //displayMessage( globals.addresses.length )
  if( globals.addresses.length == 0 ) return;

  var last = globals.addresses.length - 1;
  var addr = globals.addresses[last].toString();
  var url = getWindowInsecure().location.href;

  if( url == "http://maps.google.com/" ){
    getDocumentInsecure().getElementById("q_d").value = addr;

    setTimeout( function(){
      getDocumentInsecure().getElementById("q_sub").click();
    }, 50 );
  }
}

function pageLoad_installMicroformatHarvesters() {
  cmd_detect_microformat();
  cmd_populate_with_microformat();
}
