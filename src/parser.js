function detectPythonVariables(pythonCode) {
  //   console.log("in python code", pythonCode);

  // Remove comments
  const removeComments = (code) => {
    return code
      .replace(/#.*$/gm, "")
      .replace(/'''[\s\S]*?'''/g, "")
      .replace(/"""[\s\S]*?"""/g, "");
  };

  // Remove string literals to avoid false positives
  const removeStrings = (code) => {
    return code.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
  };

  const cleanCode = removeStrings(removeComments(pythonCode));
  const lines = cleanCode.split("\n");
  const assigned = new Set();
  const used = new Set();

  // Regular expressions for different types of variable assignments
  const assignmentPatterns = [
    // Basic assignment: x = 1
    /^\s*([a-zA-Z_]\w*)\s*=(?!=)/,
    // Multiple assignment: x, y = 1, 2
    /^\s*([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*=(?!=)/,

    // Augmented assignment: x += 1
    /^\s*([a-zA-Z_]\w*)\s*[+\-*/%&|^]=(?!=)/,

    // Function definition: def func()
    /^\s*def\s+([a-zA-Z_]\w*)\s*\((.*?)\)/,

    // ------ transient variables that we're not keeping track of ----- //
    // For loop variables: for x in range(10)
    // /^\s*for\s+([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s+in/,
    // List comprehension variables: [x for x in range(10)]
    // /\[.*?for\s+([a-zA-Z_]\w*)\s+in/,
    // Function parameters: def func(x, y=1)
    // /^\s*def\s+[a-zA-Z_]\w*\s*\((.*?)\)/,
  ];

  // First pass: find all assigned variables
  lines.forEach((line) => {
    assignmentPatterns.forEach((pattern) => {
      const match = line.match(pattern);
      if (match) {
        if (pattern.toString().includes("def")) {
          // ---- do not need to keep track of transient variables in function declarations ---- //
          // Handle function name
          const funcName = match[1].trim();
          if (funcName && /^[a-zA-Z_]\w*$/.test(funcName)) {
            assigned.add(funcName);
          }
          // Process parameters
          //   const params = match[2].split(",");
          //   params.forEach((param) => {
          //     const paramName = param.trim().split("=")[0].trim();
          //     if (paramName && /^[a-zA-Z_]\w*$/.test(paramName)) {
          //       assigned.add(paramName);
          //     }
          //   });
        } else {
          // Handle other variable assignments
          const vars = match[1].split(",");
          vars.forEach((v) => {
            const varName = v.trim();
            if (varName && /^[a-zA-Z_]\w*$/.test(varName)) {
              assigned.add(varName);
            }
          });
        }
      }
    });
  });

  // Second pass: find used variables
  lines.forEach((line) => {
    let checkLine = line;

    // Remove the left side of assignments to only check usage
    // (1) Remove left side of basic assignments
    checkLine = checkLine.replace(
      /^\s*[a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*\s*=\s*/,
      ""
    );

    // (2) Remove left side of augmented assignments
    checkLine = checkLine.replace(/^\s*[a-zA-Z_]\w*\s*[+\-*/%&|^]=\s*/, "");

    // Find all potential variable names in the remaining code
    const usageMatches = checkLine.match(/[a-zA-Z_]\w*/g) || [];

    usageMatches.forEach((match) => {
      // Skip Python keywords and built-in functions
      const pythonKeywords = new Set([
        "False",
        "None",
        "True",
        "and",
        "as",
        "assert",
        "break",
        "class",
        "continue",
        "def",
        "del",
        "elif",
        "else",
        "except",
        "finally",
        "for",
        "from",
        "global",
        "if",
        "import",
        "in",
        "is",
        "lambda",
        "nonlocal",
        "not",
        "or",
        "pass",
        "raise",
        "return",
        "try",
        "while",
        "with",
        "yield",
        "print",
        "len",
        "range",
        "str",
        "int",
        "float",
        "list",
        "dict",
        "set",
      ]);

      if (!pythonKeywords.has(match) && !assigned.has(match)) {
        used.add(match);
      }
    });
  });

  return {
    assigned: Array.from(assigned),
    used: Array.from(used),
  };
}

function extractVariablesFromCode(code) {
  //   console.log("code", code);
  const result = detectPythonVariables(code);
  //   console.log("final result", result);
  return result;
}

export default extractVariablesFromCode;
