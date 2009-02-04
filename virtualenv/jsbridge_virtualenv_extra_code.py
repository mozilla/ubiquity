__log_filename = None

import traceback
import subprocess
import sys

def __easy_install(logfile, home_dir, package):
    if sys.platform == 'win32':
        bin = 'Scripts'
    else:
        bin = 'bin'
    path = join(home_dir, bin, 'easy_install')
    popen = subprocess.Popen(
        [path, package],
        stdout=logfile,
        stderr=subprocess.STDOUT
        )
    popen.wait()
    if popen.returncode != 0:
        raise Exception('Executing %s failed with return code %d.' % 
                        (path, popen.returncode))

def after_install(options, home_dir):
    logfile = open(__log_filename, 'w')
    try:
        __easy_install(logfile, home_dir, 'jsbridge')
        logfile.write('\nDONE:SUCCESS\n')
        logfile.close()
    except:
        logfile.write(traceback.format_exc())
        logfile.write('\nDONE:FAIL\n')
        logfile.close()
        raise

def adjust_options(options, args):
    global __log_filename
    __log_filename = args[1]
    args.pop()
