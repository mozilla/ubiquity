__log_filename = None
__config_filename = None
__scripts_dir = None

import traceback
import subprocess
import sys

def __call_python(logfile, home_dir, script, args):
    logfile.flush()
    python_path = join(home_dir, 'bin', 'python')
    final_args = [python_path, script]
    final_args.extend(args)
    popen = subprocess.Popen(
        final_args,
        stdout=logfile,
        stderr=subprocess.STDOUT
        )
    popen.wait()
    if popen.returncode != 0:
        raise Exception('Executing %s failed with return code %d.' % 
                        (final_args, popen.returncode))

def __easy_install(logfile, home_dir, package):
    if sys.platform == 'win32':
        bin = 'Scripts'
    else:
        bin = 'bin'
    easy_install = join(home_dir, bin, 'easy_install')
    __call_python(logfile, home_dir, easy_install, [package])

def after_install(options, home_dir):
    logfile = open(__log_filename, 'w')
    logfile.write('virtualenv created in %s.\n' % home_dir)
    try:
        logfile.write('installing dependencies.\n')
        __easy_install(logfile, home_dir, 'jsbridge')
        logfile.write('writing config file.\n')
        __call_python(logfile,
                      home_dir,
                      os.path.join(__scripts_dir, 'write_config.py'),
                      [__config_filename])
        logfile.write('\nDONE:SUCCESS\n')
        logfile.close()
    except:
        logfile.write(traceback.format_exc())
        logfile.write('\nDONE:FAILURE\n')
        logfile.close()
        raise

def adjust_options(options, args):
    global __log_filename, __config_filename, __scripts_dir
    (__log_filename, __config_filename,
     __scripts_dir) = args[1:]
    args[:] = [args[0]]
