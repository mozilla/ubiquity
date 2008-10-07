import os
import atexit
import time

import jsbridge
import jsbridge.callbacks
import mozrunner.global_settings
import jsbridge.global_settings
import simplesettings

# Maximum time, in seconds, that we'll let the tests run before giving
# up and declaring them to be failed.
MAX_TIME = 60.0

# Amount of time we'll wait, in seconds, before polling to see if the
# tests are done running yet.
TIME_INCREMENT = 0.5

def run_tests(bridge):
    tests = bridge.UbiquitySystemTests
    assert not tests.output.done

    tests.run();

    time_elapsed = 0.0

    while not tests.output.done:
        time.sleep(TIME_INCREMENT)
        time_elapsed += TIME_INCREMENT
        if time_elapsed > MAX_TIME:
            raise TestsFailedError("Maximum time elapsed; tests unresponsive.")

    print "Tests finished in ~%.1f seconds." % time_elapsed

    if tests.output.errorsOccurred:
        raise TestsFailedError(tests.output.errors)

class TestsFailedError(Exception):
    pass

if __name__ == '__main__':
    module_path = os.path.abspath(os.path.dirname(__file__))
    extension_path = os.path.join(module_path, 'ubiquity')

    settings = simplesettings.initialize_settings(mozrunner.global_settings)
    settings['JSBRIDGE_START_FIREFOX'] = True
    settings['MOZILLA_CREATE_NEW_PROFILE'] = True
    settings['MOZILLA_PLUGINS'] = list(
        jsbridge.global_settings.MOZILLA_PLUGINS
        )
    settings['MOZILLA_PLUGINS'].append(extension_path)
    settings['MOZILLA_CMD_ARGS'] = list(
        jsbridge.global_settings.MOZILLA_CMD_ARGS
        )
    bridge = jsbridge.start_from_settings(settings)

    def stop_moz():
        if settings.has_key('moz'):
            settings['moz'].stop()

    atexit.register(stop_moz)

    run_tests(bridge)

    print "Tests successful."
