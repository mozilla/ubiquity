var Ubiquity = {
  implementVerb: function implementVerb(id, func) {
    var cmd = document.getElementById(id);
    cmd.addEventListener(
      "DOMNodeInserted",
      function(aEvt) {
        var target = aEvt.target;
        target.parentNode.removeChild(target);
        window.setTimeout(function() { func(target.innerHTML); }, 0);
      },
      false
    );

    var element = document.getElementById("commands");
    var evt = document.createEvent("Events");
    evt.initEvent("UbiquityEvent", true, false);
    element.dispatchEvent(evt);
  },

  displayMessage: function displayMessage(text) {
    var element = document.createElement("div");
    element.className = "display-message";
    element.innerHTML = text;
    element.style.display = "none";

    var container = document.documentElement;
    container.appendChild(element);

    var evt = document.createEvent("Events");
    evt.initEvent("UbiquityEvent", true, false);
    element.dispatchEvent(evt);
  }
};
