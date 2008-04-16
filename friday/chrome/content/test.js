function AssertionError(message)
{
    this.message = message;
}

function TestCase(func)
{
    this.__func = func;
}

TestCase.prototype = {

run : function()
{
    this.__func();
},

assertIsDefined : function(condition)
{
    if (!condition)
        throw new AssertionError("A variable is not defined.");
}

};

testSuite = {
start : function()
{
    var output = window.document.getElementById( "test-output" );
    var tests = [testCmdManagerDisplaysNoCmdError];

    successes = 0;
    failures = 0;

    for (i in tests) {
        var test = tests[i];
        testCase = new TestCase(test);
        try {
            testCase.run();
            successes += 1;
        } catch (e) {
            output.innerHTML += ("<p class=\"error\">Error in test " +
                                 test.name + ": " +
                                 e.message + " in " + e.fileName +
                                 ", line " + e.lineNumber + ".</p>");
            failures += 1;
        }
    }
    total = successes + failures;

    output.innerHTML += ("<p>" + successes + " out of " + 
                         total + " tests successful (" + failures + 
                         " failed).</p>");
},
};
