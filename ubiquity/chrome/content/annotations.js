window.addEventListener("load", function() { ubiquity.init(); }, false);
  	
var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                        .getService(Components.interfaces.nsIAnnotationService);
var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
	
var ubiquity = {
  init: function() {
    var appcontent = document.getElementById("appcontent");   // browser
    if(appcontent)
      appcontent.addEventListener("DOMContentLoaded", this.onPageLoad, true);
    var messagepane = document.getElementById("messagepane"); // mail
    if(messagepane)
      messagepane.addEventListener("load", function () { this.onPageLoad(); }, true);
  },

  onPageLoad: function(aEvent) {
    var doc = aEvent.originalTarget; // doc is document that triggered "onload" event
    var uri = ioservice.newURI(doc.location.href, null, null);

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
      
      if (annotationNames[i] == "test") {
        displayMessage("test");
        
        //alert(eval(annotationService.getPageAnnotation(uri, annotationNames[i]))); 
      }
    }
  },  
} 
 