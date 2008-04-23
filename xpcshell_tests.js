var Ci = Components.interfaces;
var Cc = Components.classes;

function bindDirToResource(dirName, alias)
{
    var ioService = Cc["@mozilla.org/network/io-service;1"].getService(
        Ci.nsIIOService
    );

    var resProt = ioService.getProtocolHandler("resource").QueryInterface(
        Ci.nsIResProtocolHandler
    );

    var aliasFile = Cc["@mozilla.org/file/local;1"].createInstance(
        Ci.nsILocalFile
    );

    aliasFile.initWithPath(dirName);

    var aliasURI = ioService.newFileURI(aliasFile);
    resProt.setSubstitution(alias, aliasURI);
}

function registerComponent(filename)
{
    var file = Cc["@mozilla.org/file/local;1"].createInstance(
        Ci.nsILocalFile
    );

    file.initWithPath(filename);

    var registrar = Components.manager.QueryInterface(
        Ci.nsIComponentRegistrar
    );

    registrar.autoRegister(file);
}

function testCommandsAutoCompleterObeysQueryInterface()
{
    var classObj = Cc["@mozilla.org/autocomplete/search;1?name=commands"];
    var ac = classObj.createInstance(Ci.nsIAutoCompleteSearch);

    ac = ac.QueryInterface(Ci.nsIAutoCompleteSearch);
}

if (arguments.length == 0)
    throw "Please provide the path to the root of the extension.";

var basePath = arguments[0];
bindDirToResource(basePath + "/friday/modules", "friday-modules");
registerComponent(basePath + "/friday/components/autocomplete.js");
testCommandsAutoCompleterObeysQueryInterface();
