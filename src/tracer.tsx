import Papa from 'papaparse';

// schema for each cell
interface CellEntry {
  executionCount: number;
  sourceCode: string;
  outputs: string[];
}

// convert csv to array of CellEntry objects
function parseCSV(filePath: string): Promise<CellEntry[]> {
  return new Promise((resolve, reject) => {
    fetch(filePath)
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to fetch CSV file.");
        }
        return response.text();
      })
      .then(csvText => {
        console.log('csvText', csvText)
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          complete: (parsedData) => {
            const results: CellEntry[] = parsedData.data.map((row: any) => ({
              executionCount: row.execution_number,
              sourceCode: row.cell_content,
              outputs: []  // TODO: add in output types from user study sheets
            }));
            resolve(results);
          },
          error: (error: any) => reject(error)
        });
      })
      .catch(error => reject(error));
  });
}

// schema for each cell as defined by standard notebook jsons
interface NotebookCell {
  cell_type: "code";
  execution_count: number;
  metadata: {};
  source: string[];
  outputs: string[];
}

// schema for notebook as defined by standard notebook json
interface Notebook {
  cells: NotebookCell[];
  metadata: {
    kernelspec: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info: {
      name: string;
      version: string;
    };
  };
  nbformat: number;
  nbformat_minor: number;
}

// convert CellEntry to notebook JSON
function convertTraceToNotebook(trace: CellEntry[]): Notebook {
  const cells: NotebookCell[] = trace.map(entry => ({
    cell_type: "code",
    execution_count: entry.executionCount,
    metadata: {},
    source: entry.sourceCode.split("\n"),
    outputs: entry.outputs
  }));

  return {
    cells,
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3"
      },
      language_info: {
        name: "python",
        version: "3.x"
      }
    },
    nbformat: 4,
    nbformat_minor: 2
  };
}

// this variable will hold the notebook JSON
let traceJson: Notebook | null = null;

// input the filepath from being in the public folder
const csvFilePath = './lkin27js09b-trace.csv';

parseCSV(csvFilePath)
  .then((executionCode) => {
    console.log('execution code', executionCode)
    traceJson = convertTraceToNotebook(executionCode);
    console.log("Converted Jupyter Notebook JSON:", traceJson);
  })
  .catch((error) => {
    console.error("Error parsing CSV:", error);
  });

export { traceJson };


