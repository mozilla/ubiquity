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

TestSuite = {
start : function()
{
    var output = window.document.getElementById( "test-output" );
    var parent = window;

    var tests = [];

    for (prop in parent)
        if (prop.indexOf("test") == 0)
            tests.push(parent[prop]);

    successes = 0;
    failures = 0;

    for each (test in tests)
    {
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
