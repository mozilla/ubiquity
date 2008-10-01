import os
import atexit
import time

import jsbridge
import jsbridge.callbacks
import mozrunner.global_settings
import jsbridge.global_settings
import simplesettings

def run_tests(bridge):
    tests = bridge.UbiquitySystemTests
    assert not tests.output.done

    tests.run();

    while not tests.output.done:
        time.sleep(0.5)

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
