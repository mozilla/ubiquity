const snarlAppName      = "Ubiquity" // will be used as identifier within Snarl
const snarlWindowName   = "UbiquityWnd" // a unique name for a window which will be automatically created
const snarlExtensionId  = "ubiquity@labs.mozilla.com";
const snarlAppIconName  = "icon.png"; //filename of icon to be displayed on notifications and used during registration with Snarl
const cid = "@tlhan-ghun.de/snarlInterface;5"; // id of SnarlInterface - should be OK

var osString = Components.classes["@mozilla.org/xre/app-info;1"]
                   .getService(Components.interfaces.nsIXULRuntime).OS;


if(osString == "WINNT") {

// initialize the interface to Snarl  
var snarlInterface = Components.classes[cid].createInstance();
snarlInterface = snarlInterface.QueryInterface(Components.interfaces.ISNARLINTERFACE);

// some arrays for later use
var snarlNotificationsClickedCommand = new Array();


function SnarlStartAndStopObserver() {
}
SnarlStartAndStopObserver.prototype = {
  classID: Components.ID("{47119F85-D9CC-44A1-882F-47895AA45A7C}"), // Generate an own ID
  contractID: "@tlhan-ghun.de/ubiquitySnarlObserver/component;1", // generate an own ID
  classDescription: "Observer to handle communication between Ubiquity and Snarl", // some description

  QueryInterface: function(aIID) {
    if(!aIID.equals(CI.nsISupports) && !aIID.equals(CI.nsIObserver) && !aIID.equals(CI.nsISupportsWeakReference)) 
      throw CR.NS_ERROR_NO_INTERFACE;
    return this;
  },

  // nsIObserver implementation
  observe: function(aSubject, aTopic, aData) {
  
  
    switch(aTopic) {
      case "xpcom-startup":
        //dump("xpcom-startup");
        // this is run very early, right after XPCOM is initialized, but before
        // user profile information is applied. Register ourselves as an observer
        // for 'profile-after-change' and 'quit-application'.
        var obsSvc = CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService);
        obsSvc.addObserver(this, "profile-after-change", true);
        obsSvc.addObserver(this, "quit-application", true);
        obsSvc.addObserver(this, "SnarlInterfaceACK", true);
        obsSvc.addObserver(this, "SnarlInterfaceClicked", true);
        obsSvc.addObserver(this, "SnarlInterfaceTimedOut", true);
        obsSvc.addObserver(this, "SnarlInterfaceStatus", true);
        obsSvc.addObserver(this, "SnarlInterfaceRegisterClickCommand", true);        
        
        //you can add more observers here if you want and need
        break;

      case "profile-after-change":
        // This happens after profile has been loaded and user preferences have been read.
 
        // Getting the complete path tpo the icon
          var iconPath=Components.classes['@mozilla.org/file/directory_service;1']
                              .getService(Components.interfaces.nsIProperties)
                              .get("ProfD", Components.interfaces.nsILocalFile); 
            iconPath.append("extensions");
            iconPath.append(snarlExtensionId);
            //the following asumes that your image is in the folder components                             
            iconPath.append("content");
            iconPath.append("images");
            iconPath.append(snarlAppIconName); 
            icon=iconPath.path;  
                 
          var initReturnCode = snarlInterface.snRegisterConfig2(0, snarlAppName, 0, icon, snarlWindowName);
          snarlInterface.snRegisterAlert(snarlAppName,"Notification");
          // register more alerts by copying the line bfore

        break;

      case "quit-application":
        // shutdown code here
          snarlInterface.snRevokeConfig(0);
        break;
                
    case "SnarlInterfaceRegisterClickedCommand":
      // we store information on notification IDs and the belonging reason
      // here in a central array      
      var msgId = aData.match(/^[0-9]*/);
      var content = aData.replace(/^[0-9]*\ /,"");
      snarlNotificationsClickedCommand[msgId] = content;
      break;
    
    case "SnarlInterfaceACK":
    case "SnarlInterfaceClicked":
    case "SnarlInterfaceMiddleMouseButton":
      // snarlNotificationsClickcommand[aData]
    break;




    case "SnarlInterfaceTimedOut":
      var msgId = aData.match(/^[0-9]*/);
      var content = aData.replace(/^[0-9]*\ /,"");
      snarlNotificationsClickedCommand[msgId] = null;
      break;    
  
    case "SnarlInterfaceStatus":     
      if(aData=="Launched") {     
        // this is called if Snarl is (re)started            
          var initReturnCode = snarlInterface.snRegisterConfig2(0, snarlAppName, 0, icon, snarlWindowName);
          snarlInterface.snRegisterAlert(snarlAppName,"Notification");
          // register more alerts by copying the line bfore
          
      } else if (aData == "Quit") {
        // var responseID = snarlInterface.snShowMessage("Notification has been stopped", "", 3, icon, 0, 0);
      }
                
                
                
      default:
        throw Components.Exception("Unknown topic: " + aTopic);
    }
  }
};


// constructors for objects we want to XPCOMify
var objects = [SnarlStartAndStopObserver];

/*
* Registration code.
*
*/

const CI = Components.interfaces, CC = Components.classes, CR = Components.results;

const MY_OBSERVER_NAME = "Ubiquity Snarl Observer";

function FactoryHolder(aObj) {
  this.CID        = aObj.prototype.classID;
  this.contractID = aObj.prototype.contractID;
  this.className  = aObj.prototype.classDescription;
  this.factory = {
    createInstance: function(aOuter, aIID) {
      if(aOuter)
        throw CR.NS_ERROR_NO_AGGREGATION;
      return (new this.constructor).QueryInterface(aIID);
    }
  };
  this.factory.constructor = aObj;
}

var gModule = {
  registerSelf: function (aComponentManager, aFileSpec, aLocation, aType)
  {
    aComponentManager.QueryInterface(CI.nsIComponentRegistrar);
    for (var key in this._objects) {
      var obj = this._objects[key];
      aComponentManager.registerFactoryLocation(obj.CID, obj.className,
        obj.contractID, aFileSpec, aLocation, aType);
    }

    // this can be deleted if you don't need to init on startup
    var catman = CC["@mozilla.org/categorymanager;1"].getService(CI.nsICategoryManager);
    catman.addCategoryEntry("xpcom-startup", MY_OBSERVER_NAME,
      SnarlStartAndStopObserver.prototype.contractID, true, true);
    catman.addCategoryEntry("xpcom-shutdown", MY_OBSERVER_NAME,
      SnarlStartAndStopObserver.prototype.contractID, true, true);
  },

  unregisterSelf: function(aCompMgr, aFileSpec, aLocation) {
    // this must be deleted if you delete the above code dealing with |catman|
    var catman = CC["@mozilla.org/categorymanager;1"].getService(CI.nsICategoryManager);
    catman.deleteCategoryEntry("xpcom-startup", MY_OBSERVER_NAME, true);
    // end of deleteable code

    aComponentManager.QueryInterface(CI.nsIComponentRegistrar);
    for (var key in this._objects) {
      var obj = this._objects[key];
      aComponentManager.unregisterFactoryLocation(obj.CID, aFileSpec);
    }
  },

  getClassObject: function(aComponentManager, aCID, aIID) {
    if (!aIID.equals(CI.nsIFactory)) throw CR.NS_ERROR_NOT_IMPLEMENTED;

    for (var key in this._objects) {
      if (aCID.equals(this._objects[key].CID))
        return this._objects[key].factory;
    }
   
    throw CR.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aComponentManager) {
    return true;
  },

  _objects: {} //FactoryHolder
};

function NSGetModule(compMgr, fileSpec)
{
  for(var i in objects)
    gModule._objects[i] = new FactoryHolder(objects[i]);
  return gModule;
}
    
}