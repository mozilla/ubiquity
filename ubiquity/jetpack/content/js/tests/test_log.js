var LoggingTests = {
  testConsoleListener: function(self) {
    var listener = new Logging.ConsoleListener();
    var wasSuccessful = false;
    listener.onMessage = function onMessage(msg) {
      if (msg.isWarning && msg.message == logText) {
        self.success();
      }
    };
    var logText = "This is a test warning, please ignore it.";
    var logger = new Logging.JsErrorConsoleLogger();
    logger.warn(logText);
    self.setTimeout(1000);
  }
};
