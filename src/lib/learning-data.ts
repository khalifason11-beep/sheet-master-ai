export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Business";

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  duration: string;
  objectives: string[];
  concept: string;
  proTips: string[];
  mistakes: string[];
  useCase: string;
  practice: {
    instructions: string;
    initialData: (string | number)[][];
    targetCell: string;
    expectedFormula: string;
    expectedValue: number | string;
  };
}

export interface LearningPath {
  id: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  duration: string;
  color: string;
  icon: string;
  lessons: Lesson[];
}

const lesson = (
  id: string,
  title: string,
  summary: string,
  partial: Partial<Lesson> = {},
): Lesson => ({
  id,
  title,
  summary,
  duration: partial.duration ?? "8 min",
  objectives: partial.objectives ?? [
    `Understand how ${title} works in Excel`,
    `Apply ${title} to a real worksheet`,
    `Recognize common mistakes with ${title}`,
  ],
  concept:
    partial.concept ??
    `${title} is a foundational concept you'll use constantly in real spreadsheets. Read the explanation, then try it in the live worksheet below.`,
  proTips: partial.proTips ?? [
    `Use absolute references ($A$1) when you copy formulas.`,
    `Name your ranges for readability.`,
  ],
  mistakes: partial.mistakes ?? [
    `Forgetting to lock references with $`,
    `Mixing text and numbers in the same column`,
  ],
  useCase:
    partial.useCase ??
    `Analysts use ${title} every day to clean, summarize and report on real business data.`,
  practice: partial.practice ?? {
    instructions: `In cell B6, write a formula that returns the total of B2:B5.`,
    initialData: [
      ["Item", "Amount"],
      ["Coffee", 4.5],
      ["Bagel", 3.25],
      ["Juice", 5.0],
      ["Tip", 2.0],
      ["Total", ""],
    ],
    targetCell: "B6",
    expectedFormula: "=SUM(B2:B5)",
    expectedValue: 14.75,
  },
});

export const learningPaths: LearningPath[] = [
  {
    id: "beginner",
    title: "Excel Foundations",
    difficulty: "Beginner",
    description:
      "Start from zero. Learn the interface, cells, formatting and your first formulas.",
    duration: "3h",
    color: "from-emerald-400 to-emerald-600",
    icon: "Sparkles",
    lessons: [
      lesson("intro-interface", "The Excel Interface", "Ribbon, sheets, cells, name box."),
      lesson("cells-rows-cols", "Cells, Rows & Columns", "How a spreadsheet is structured."),
      lesson("formatting", "Formatting Cells", "Numbers, dates, currency, conditional formatting."),
      lesson("basic-formulas", "Your First Formula", "Arithmetic, references and the equals sign.", {
        practice: {
          instructions: "In B4, write =B2+B3 to add the two values.",
          initialData: [["Item", "Amount"], ["Apples", 12], ["Oranges", 8], ["Total", ""]],
          targetCell: "B4",
          expectedFormula: "=B2+B3",
          expectedValue: 20,
        },
      }),
      lesson("sum-average", "SUM & AVERAGE", "Summarize a column in two seconds."),
    ],
  },
  {
    id: "intermediate",
    title: "Logic & Lookups",
    difficulty: "Intermediate",
    description: "Master IF, SUMIF, COUNTIF and the lookup family that powers real spreadsheets.",
    duration: "5h",
    color: "from-teal-400 to-emerald-600",
    icon: "Brain",
    lessons: [
      lesson("if-function", "IF Function", "Make Excel decide between two outcomes.", {
        practice: {
          instructions: "In B2, write =IF(A2>=60,\"Pass\",\"Fail\")",
          initialData: [["Score", "Result"], [72, ""], [54, ""]],
          targetCell: "B2",
          expectedFormula: '=IF(A2>=60,"Pass","Fail")',
          expectedValue: "Pass",
        },
      }),
      lesson("sumif", "SUMIF", "Conditional sums in one formula.", {
        practice: {
          instructions: 'In B6, write =SUMIF(A2:A5,"Food",B2:B5)',
          initialData: [
            ["Category", "Amount"],
            ["Food", 12],
            ["Travel", 30],
            ["Food", 8],
            ["Travel", 22],
            ["Food total", ""],
          ],
          targetCell: "B6",
          expectedFormula: '=SUMIF(A2:A5,"Food",B2:B5)',
          expectedValue: 20,
        },
      }),
      lesson("countif", "COUNTIF", "Count cells that match a rule."),
      lesson("vlookup", "VLOOKUP", "The classic lookup function."),
      lesson("xlookup", "XLOOKUP", "The modern, smarter replacement for VLOOKUP."),
      lesson("index-match", "INDEX + MATCH", "The power combo every analyst should know."),
    ],
  },
  {
    id: "advanced",
    title: "Power Excel",
    difficulty: "Advanced",
    description: "Dynamic arrays, LET, LAMBDA, Pivot Tables and pro-level dashboards.",
    duration: "8h",
    color: "from-violet-500 to-emerald-500",
    icon: "Rocket",
    lessons: [
      lesson("pivot-tables", "Pivot Tables", "Summarize thousands of rows in seconds."),
      lesson("power-query", "Power Query", "Clean and shape data with no formulas."),
      lesson("dynamic-arrays", "Dynamic Arrays", "Modern formulas that spill into a range."),
      lesson("let-function", "LET Function", "Name parts of a formula for clarity & speed."),
      lesson("lambda", "LAMBDA", "Write your own reusable Excel functions."),
      lesson("dashboards", "Building Dashboards", "Turn data into a polished, interactive report."),
    ],
  },
  {
    id: "business",
    title: "Excel for Business",
    difficulty: "Business",
    description: "Real workflows: Finance, HR, Sales, Inventory, Data Analysis.",
    duration: "10h",
    color: "from-amber-400 to-emerald-600",
    icon: "Briefcase",
    lessons: [
      lesson("excel-finance", "Excel for Finance", "Models, NPV, IRR, forecasting."),
      lesson("excel-accounting", "Excel for Accounting", "Ledgers, reconciliations, reporting."),
      lesson("excel-hr", "Excel for HR", "Headcount, payroll basics, attendance."),
      lesson("excel-sales", "Excel for Sales", "Pipelines, commission, KPI dashboards."),
      lesson("excel-inventory", "Excel for Inventory", "Stock levels, reorder points, ABC analysis."),
      lesson("excel-data", "Excel for Data Analysis", "Cleaning, summarizing, charting."),
    ],
  },
];

export function getPath(id: string) {
  return learningPaths.find((p) => p.id === id);
}

export function getLesson(id: string) {
  for (const p of learningPaths) {
    const l = p.lessons.find((x) => x.id === id);
    if (l) return { lesson: l, path: p };
  }
  return null;
}

export interface FormulaDoc {
  name: string;
  category: "Math" | "Logical" | "Lookup" | "Text" | "Date" | "Statistical" | "Financial";
  syntax: string;
  purpose: string;
  description: string;
  args: { name: string; desc: string }[];
  example: { formula: string; result: string; note: string };
  intents: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  related: string[];
  tips: string[];
  mistakes: string[];
}

export const formulas: FormulaDoc[] = [
  {
    name: "SUM",
    category: "Math",
    syntax: "=SUM(number1, [number2], ...)",
    purpose: "Add numbers together",
    description: "Adds all numbers in a range of cells. The single most used Excel function.",
    args: [{ name: "number1", desc: "First number or range" }, { name: "number2…", desc: "Additional numbers or ranges" }],
    example: { formula: "=SUM(A1:A10)", result: "Sum of A1 through A10", note: "Use ranges, not 10 individual cells." },
    intents: ["add", "total", "sum", "addition", "plus"],
    difficulty: "Easy",
    related: ["SUMIF", "SUMIFS", "SUBTOTAL"],
    tips: ["Use Alt+= to autosum the column above."],
    mistakes: ["Including text values silently — they're ignored."],
  },
  {
    name: "AVERAGE",
    category: "Statistical",
    syntax: "=AVERAGE(number1, [number2], ...)",
    purpose: "Calculate the arithmetic mean",
    description: "Returns the average (mean) of the numbers in the range.",
    args: [{ name: "number1", desc: "First number or range" }],
    example: { formula: "=AVERAGE(B2:B100)", result: "Mean of B2:B100", note: "Empty cells are ignored." },
    intents: ["mean", "average", "avg"],
    difficulty: "Easy",
    related: ["AVERAGEIF", "MEDIAN", "SUM"],
    tips: ["Use AVERAGEIF for conditional averages."],
    mistakes: ["AVERAGE counts 0 but ignores blanks — they differ."],
  },
  {
    name: "IF",
    category: "Logical",
    syntax: "=IF(logical_test, value_if_true, value_if_false)",
    purpose: "Return one value if a condition is true, another if false",
    description: "The foundation of decision-making in Excel.",
    args: [
      { name: "logical_test", desc: "A condition like A1>10" },
      { name: "value_if_true", desc: "Returned if the condition is true" },
      { name: "value_if_false", desc: "Returned if the condition is false" },
    ],
    example: { formula: '=IF(A1>=60,"Pass","Fail")', result: 'Pass or Fail', note: "Nest sparingly — use IFS instead." },
    intents: ["if", "condition", "decide", "then", "otherwise"],
    difficulty: "Easy",
    related: ["IFS", "AND", "OR", "SWITCH"],
    tips: ["Combine with AND/OR for multiple conditions."],
    mistakes: ["Too many nested IFs — use IFS or SWITCH."],
  },
  {
    name: "SUMIF",
    category: "Math",
    syntax: "=SUMIF(range, criteria, [sum_range])",
    purpose: "Sum numbers that match a condition",
    description: "Sums values in sum_range where the corresponding cell in range matches criteria.",
    args: [
      { name: "range", desc: "Cells to evaluate" },
      { name: "criteria", desc: 'Condition, e.g. ">10" or "Food"' },
      { name: "sum_range", desc: "Cells to sum" },
    ],
    example: { formula: '=SUMIF(A2:A100,"Food",B2:B100)', result: "Total for Food", note: "" },
    intents: ["add numbers with a condition", "conditional sum", "total if", "sumif"],
    difficulty: "Easy",
    related: ["SUMIFS", "COUNTIF", "AVERAGEIF"],
    tips: ["Use SUMIFS for multiple conditions."],
    mistakes: ["Forgetting that text criteria needs quotes."],
  },
  {
    name: "COUNTIF",
    category: "Statistical",
    syntax: "=COUNTIF(range, criteria)",
    purpose: "Count cells that match a condition",
    description: "Returns the count of cells in range that meet criteria.",
    args: [{ name: "range", desc: "Cells to evaluate" }, { name: "criteria", desc: "Condition" }],
    example: { formula: '=COUNTIF(A2:A100,"Open")', result: "Number of Open items", note: "" },
    intents: ["count", "how many", "tally", "countif"],
    difficulty: "Easy",
    related: ["COUNTIFS", "SUMIF"],
    tips: ["Wildcards * and ? work in text criteria."],
    mistakes: ["Case-insensitive matches — beware of capitalization assumptions."],
  },
  {
    name: "VLOOKUP",
    category: "Lookup",
    syntax: "=VLOOKUP(lookup_value, table_array, col_index, [range_lookup])",
    purpose: "Look up a value vertically in a table",
    description: "Finds a value in the first column of a table and returns a value in the same row from another column.",
    args: [
      { name: "lookup_value", desc: "What to find" },
      { name: "table_array", desc: "Range to search" },
      { name: "col_index", desc: "Column number to return" },
      { name: "range_lookup", desc: "FALSE for exact match" },
    ],
    example: { formula: "=VLOOKUP(A2,Products,3,FALSE)", result: "Price of product A2", note: "" },
    intents: ["lookup", "find", "vlookup", "search table"],
    difficulty: "Medium",
    related: ["XLOOKUP", "INDEX", "MATCH"],
    tips: ["Use XLOOKUP if available — it's better."],
    mistakes: ["Forgetting FALSE for exact match — defaults to approximate."],
  },
  {
    name: "XLOOKUP",
    category: "Lookup",
    syntax: "=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found])",
    purpose: "Modern, flexible lookup",
    description: "Looks up a value in any column and returns from any other — left, right, or even vertical.",
    args: [
      { name: "lookup_value", desc: "What to find" },
      { name: "lookup_array", desc: "Where to look" },
      { name: "return_array", desc: "What to return" },
      { name: "if_not_found", desc: "Fallback if missing" },
    ],
    example: { formula: '=XLOOKUP(A2,Names,Emails,"Not found")', result: "Email for A2", note: "" },
    intents: ["lookup", "find", "xlookup", "modern lookup"],
    difficulty: "Medium",
    related: ["VLOOKUP", "INDEX", "MATCH"],
    tips: ["XLOOKUP can search right-to-left, VLOOKUP can't."],
    mistakes: ["Not providing if_not_found and getting #N/A."],
  },
  {
    name: "INDEX",
    category: "Lookup",
    syntax: "=INDEX(array, row_num, [column_num])",
    purpose: "Return a value at a specific position",
    description: "Returns the value at the intersection of a row and column in a range.",
    args: [{ name: "array", desc: "Range" }, { name: "row_num", desc: "Row offset" }],
    example: { formula: "=INDEX(A1:C10, 5, 2)", result: "Value at row 5, col 2", note: "" },
    intents: ["index", "position", "cell at"],
    difficulty: "Medium",
    related: ["MATCH", "OFFSET"],
    tips: ["Pair with MATCH for a flexible lookup."],
    mistakes: ["Confusing row/column order."],
  },
  {
    name: "MATCH",
    category: "Lookup",
    syntax: "=MATCH(lookup_value, lookup_array, [match_type])",
    purpose: "Find the position of a value",
    description: "Returns the position of a value within a range.",
    args: [{ name: "lookup_value", desc: "What to find" }, { name: "lookup_array", desc: "Where to look" }],
    example: { formula: '=MATCH("Apple", A1:A100, 0)', result: "Row where Apple appears", note: "" },
    intents: ["position", "find row", "match"],
    difficulty: "Medium",
    related: ["INDEX", "XMATCH"],
    tips: ["Use 0 for exact match."],
    mistakes: ["Default match type is 1 — approximate."],
  },
  {
    name: "CONCAT",
    category: "Text",
    syntax: "=CONCAT(text1, [text2], ...)",
    purpose: "Join text strings together",
    description: "Concatenates a list of text values without a separator.",
    args: [{ name: "text1…", desc: "Strings to join" }],
    example: { formula: '=CONCAT(A1," ",B1)', result: "First Last", note: "" },
    intents: ["merge text", "join", "combine strings", "concat"],
    difficulty: "Easy",
    related: ["TEXTJOIN", "&"],
    tips: ["TEXTJOIN is better when you need a separator."],
    mistakes: ["No automatic spaces — add them yourself."],
  },
  {
    name: "TEXTJOIN",
    category: "Text",
    syntax: "=TEXTJOIN(delimiter, ignore_empty, text1, ...)",
    purpose: "Join text with a delimiter",
    description: "Joins strings with a delimiter and optionally skips empty cells.",
    args: [
      { name: "delimiter", desc: "Separator like \", \"" },
      { name: "ignore_empty", desc: "TRUE to skip blanks" },
    ],
    example: { formula: '=TEXTJOIN(", ", TRUE, A1:A10)', result: "List separated by commas", note: "" },
    intents: ["merge text", "join with comma", "concatenate with delimiter"],
    difficulty: "Easy",
    related: ["CONCAT"],
    tips: ["Set ignore_empty=TRUE to avoid stray delimiters."],
    mistakes: ["Quoting the delimiter wrong."],
  },
  {
    name: "LET",
    category: "Logical",
    syntax: "=LET(name1, value1, [name2, value2, ...], calculation)",
    purpose: "Name intermediate values inside a formula",
    description: "Makes complex formulas readable and faster by reusing intermediate calculations.",
    args: [{ name: "name", desc: "A friendly name" }, { name: "value", desc: "What it equals" }, { name: "calc", desc: "Final expression" }],
    example: { formula: "=LET(x, A1*2, y, x+10, y*y)", result: "Computed result", note: "" },
    intents: ["clean formula", "name variable", "let"],
    difficulty: "Hard",
    related: ["LAMBDA"],
    tips: ["Use LET when a sub-expression repeats."],
    mistakes: ["Forgetting the final calculation argument."],
  },
];

export function searchFormulas(query: string): FormulaDoc[] {
  const q = query.trim().toLowerCase();
  if (!q) return formulas;
  return formulas
    .map((f) => {
      const hay = [f.name, f.purpose, f.description, ...f.intents].join(" ").toLowerCase();
      let score = 0;
      if (f.name.toLowerCase() === q) score += 100;
      if (f.name.toLowerCase().startsWith(q)) score += 50;
      if (hay.includes(q)) score += 10;
      for (const word of q.split(/\s+/)) {
        if (hay.includes(word)) score += 3;
      }
      return { f, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.f);
}

export const platformStats = {
  lessons: learningPaths.reduce((s, p) => s + p.lessons.length, 0),
  paths: learningPaths.length,
  formulas: formulas.length,
  exercises: 124,
  projects: 18,
  users: "12,400+",
};
