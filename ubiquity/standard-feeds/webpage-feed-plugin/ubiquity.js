var Ubiquity = {
  registerPreview: function registerPreview(callback) {
    var element = document.createElement("div");
    element.className = "preview";
    element.style.display = "none";

    var container = document.documentElement;
    container.appendChild(element);

    element.addEventListener(
      "DOMNodeInserted",
      function(aEvt) {
        var target = aEvt.target;
        target.parentNode.removeChild(target);
        var cmd = target.getAttribute("command");
        var directObj = {text: target.getAttribute("directObjText"),
                         html: target.getAttribute("directObjHtml")};
        window.setTimeout(function() { callback(cmd, directObj); }, 0);
      },
      false
    );

    var evt = document.createEvent("Events");
    evt.initEvent("UbiquityEvent", true, false);
    element.dispatchEvent(evt);
  },

  __commandsNode: null,

  defineVerb: function defineVerb(params) {
    if (!this.__commandsNode) {
      var node = document.createElement("div");
      node.className = "commands";
      node.style.display = "none";
      document.documentElement.appendChild(node);
      this.__commandsNode = node;
    }

    var cmdNode = document.createElement("div");
    cmdNode.className = "command";

    var nameNode = document.createElement("div");
    nameNode.className = "name";
    nameNode.textContent = params.name;
    cmdNode.appendChild(nameNode);

    if (params.directObject) {
      var doNode = document.createElement("div");
      doNode.className = "direct-object";
      doNode.textContent = params.directObject;
      cmdNode.appendChild(doNode);
    }

    var previewNode;
    if (params.previewUrl) {
      previewNode = document.createElement("a");
      previewNode.setAttribute("href", params.previewUrl);
    } else {
      var previewHtml;
      if (params.previewHtml)
        previewHtml = params.previewHtml;
      else
        previewHtml = "";
      previewNode = document.createElement("div");
      previewNode.innerHTML = previewHtml;
    }

    previewNode.className = "preview";
    cmdNode.appendChild(previewNode);

    this.__commandsNode.appendChild(cmdNode);

    cmdNode.addEventListener(
      "DOMNodeInserted",
      function(aEvt) {
        var target = aEvt.target;
        target.parentNode.removeChild(target);
        var directObj = {text: target.getAttribute("directObjText"),
                         html: target.getAttribute("directObjHtml")};
        window.setTimeout(function executeCommand() {
                            params.execute(directObj);
                          }, 0);
      },
      false
    );

    var evt = document.createEvent("Events");
    evt.initEvent("UbiquityEvent", true, false);
    this.__commandsNode.dispatchEvent(evt);
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
