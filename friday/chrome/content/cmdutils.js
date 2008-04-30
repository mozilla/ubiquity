function __TimerCallback(callback)
{
    Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
    var Ci = Components.interfaces;

    this._callback = callback;
    this.QueryInterface = XPCOMUtils.generateQI([Ci.nsITimerCallback]);
}

__TimerCallback.prototype = {
    notify : function(timer) {
        this._callback();
    }
};

function setTimeout(callback, delay)
{
    var classObj = Components.classes["@mozilla.org/timer;1"];
    var timer = classObj.createInstance(Components.interfaces.nsITimer);

    timer.initWithCallback(new __TimerCallback(callback),
                           delay,
                           classObj.TYPE_ONE_SHOT);
}

function url(spec) {
    var classObj = Components.classes["@mozilla.org/network/io-service;1"];
    var ios = classObj.getService(Components.interfaces.nsIIOService);
    return ios.newURI(spec, null, null);
}

function openUrlInBrowser(urlString)
{
    var tab = Application.activeWindow.open(url(urlString));
    tab.focus();
}

function getTextSelection(context)
{
    var focused = context.focusedElement;
    var retval = "";

    if (focused) {
        if (focused.selectionStart != focused.selectionEnd)
            retval = focused.value.substring(focused.selectionStart,
                                             focused.selectionEnd);
    } else {
        var sel = context.focusedWindow.getSelection();
        if (sel.rangeCount >= 1) {
            retval = sel.toString();
        }
    }
    return retval;
}

function safeWrapper(func)
{
    wrappedFunc = function() {
        try {
            func();
        } catch (e) {
            displayMessage("An exception occurred: " + e);
        }
    };
    return wrappedFunc;
}

function ajaxGet(url, callbackFunction)
{
  var request = new window.XMLHttpRequest();
  request.open("GET", url, true);
  request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded"); 
 
  request.onreadystatechange = safeWrapper( function(){
    if (request.readyState == 4 && request.status == 200){
      if (request.responseText){
          callbackFunction(request.responseText);
      }
    }
  } );

  request.send(null);
}

function setTextSelection( html, context ){
    var doc = context.focusedWindow.document;
    if (doc.designMode == "on")
    {
        doc.execCommand("insertHTML", false, html);
    } else {
        displayMessage(html);
		var div = doc.createElement("span");
		div.innerHTML = html;
		div.style.position = "absolute";
		div.style.top = "100px";
		div.style.left = "100px";
		div.style.border = "5px solid #666";
		div.style.backgroundColor = "white";
		doc.body.appendChild( div );
    }	
}
