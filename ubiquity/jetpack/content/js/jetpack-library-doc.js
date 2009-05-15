// == {{{jetpack}}} ==
//
// JetpackLibrary creates the {{{jetpack}}} namespace in Jetpack Features. This
// is the main point of contact for Features with the rest of Firefox. The API
// is guaranteed to be maintained moving forward, so that if you write a
// Feature  using the Jetpack library, you'll never have to change your code.
//
// For now, it has only three main objects: {{{tabs}}}, {{{ui}}}, and
// {{{lib}}}.
// * {{{tabs}}}: Gives access to all open tabs (irrespective of window), set 
// up event handlers, and and find the focused tab.
// * {{{ui}}}: Lets you add or modify Firefox's chrome.
// * {{{lib}}}: Gives access to small libraries for the web. Think of it as the
// standard library in Python. They provide encapsulated and easy-to-use ways
// of accessing services like Twitter, Flickr, Delicious, etc. Eventually
// you'll be able to import libraries from anywhere, but the default one's will
// be code reviewed by Mozilla.
function JetpackLibrary(){}
JetpackLibrary.prototype = {
  tabs: new Tab();
  ui{ statusBar: new StatusBar(); },
  lib: new StandardLibrary();
  notification: new Notification()
} 


// === {{{jetpack.tabs}}} ===  
// {{{jetpack.tabs}}} is an Array-like object with special tab-related
// properties. For example, to get the first tab you get write
// {{{jetpack.tabs[0]}}}. Similarly, you can find the number of tabs currently
// open by writing {{{jetpack.tabs.length}}}. The list of tabs includes all
// tabs from all windows, so {{{jetpack.tabs[i]}}} might live in window A, and
// {{{jetpack.tabs[j]}}} might live in window B.
function Tabs(){}
Tabs.prototype = {

  // ** {{{jetpack.tabs.focused}}} **
  // Returns the currently focused/active tab as a Tab object. 
  get focused(){ return null; }, 
  
  // ** {{{jetpack.tabs.on*}}} **
  // Most of what {{{jetpack.tabs}}} is useful for is setting up event handlers.
  // The wonderful thing about these event handlers is that they handle all the
  // difficult edge-cases for you. Not only is that event handler set up for all
  // currently open tabs, but when a new tab is created (in any window), Jetpack
  // will add the event handler to it
  //
  // All event handlers take an event handler function. On {{{callback}}}, those
  // functions receieve one paramater: an event object. The event handler's
  // {{{this}}} is set to the {{{Tab}}} that's had the event occur. 

  // * ** {{{jetpack.tabs.onFocus( callback )}}} **
  // The function callback is called when a tab becomes focused.
  onFocus: function( callback ){ /* ... */ }, 
  
  // * ** {{{jetpack.tabs.onOpen( callback )}}} **
  // The function callback is called when a new tab is opened. The event occurs
  // before the page begins to load.
  onOpen: function( callback ){ /* ... */ },   

  // * ** {{{jetpack.tabs.onClose( callback )}}} **
  // The function callback is called when a tab is closed. The event occurs
  // just before the tab disappears.
  onClose: function( callback ){ /* ... */ },   
  
  // * ** {{{jetpack.tabs.onReady( callback )}}} **
  // The function {{{callback}}} is called when a tab's DOM has finished
  // loading. Unlike the {{{jetpack.tabs.onLoad}}} event, {{{onReady}}} doesn't
  // wait until images, scripts, and iframes are loaded. This is particularly
  // useful for page-modifying scripts that alter pages before they are
  // displayed.
  onReady: function( callback ){ /* ... */ },   
  
  // * ** {{{jetpack.tabs.onLoad( callback )}}} **
  // The function callback is called when a tab's page has fully finished
  // loading, including images, scripts and iframes.
  onLoad: function( callback ){ /* ... */ },
  
  // * ** {{{jetpack.tabs.on*.remove( callback )}}} **
  // To remove an event handler, you simply call {{{*.remove( callback )}}} on a
  // event binder, where callback is the instance of the event handler passed
  // into {{{jetpack.tabs.on*}}}. If you don't pass in {{{callback}}}, it
  // removes all {{{on*}}} handlers. For example,
  // {{{jetpack.tabs.onOpen.remove()}}} removes all handlers for {{{onOpen}}}
  // events.
  
};

// === {{{jetpack.notifications}}} ===
// Eventually, this will be the end-all be-all of easy communication with your
// users. Notification bars, transparent messages, Growls, doorknob messages, 
// etc. will all go through here. For now, it just has simple notifications.

function Notifications(){}.
Notifications.prototype = {
  // * ** {{{jetpack.notifications.show( message )}}} **
  // Shows a simple notification message. On Windows it's a toaster
  // notification, and on OS X it's a Growl message (if Growl is installed).
  // {{{message}}} is either a string, or an object with properties
  // {{{title}}} and {{{body}}}.
  show: function(){}
}