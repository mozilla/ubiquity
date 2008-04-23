import os
import sys
import subprocess

if __name__ == "__main__":
    if len(sys.argv) == 1:
        print "usage: %s <command>" % sys.argv[0]
        print
        print "'command' can be one of the following:"
        print
        print "    test - run unit tests"
        print
        sys.exit(1)

    main = __import__("__main__")
    mydir = os.path.abspath(os.path.split(main.__file__)[0])

    path_to_extension_root = os.path.join(mydir, "friday")

    if subprocess.call(["which", "xpcshell"],
                       stdout=subprocess.PIPE) != 0:
        print "You must have xpcshell on your PATH to run tests."
        sys.exit(1)

    xpcshell_args = [
        "xpcshell",
        "-v", "180",     # Use Javascript 1.8
        "-w",            # Enable warnings
        "-s",            # Enable strict mode
        os.path.join(mydir, "xpcshell_tests.js"),
        path_to_extension_root
        ]

    subprocess.call(xpcshell_args)
