import express from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3001;

dotenv.config();

// enabling CORS for all routes
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// fetch notebook, filter code cells, only return relevant information
const fetchNotebookCells = async (notebookName) => {
  const notebookPath = path.join(__dirname, "notebooks", notebookName);
  try {
    // reading the notebook file
    const notebookData = fs.readFileSync(notebookPath, "utf8");
    const notebook = JSON.parse(notebookData);
    // filtering the code cells, only grab the relevant information
    const notebookCells = notebook.cells
      .filter((cell) => cell.cell_type === "code")
      .map((cell) => ({
        execution_count: cell.execution_count,
        outputs: cell.outputs,
        source: cell.source,
      }));
    return notebookCells;
  } catch (error) {
    console.error("Error reading notebook:", error);
    throw new Error("Failed to read the notebook");
  }
};

// create the prompt -> TO BE FINETUNED
// this returns text + the json objects right now
const generatePrompt = (codeCells) => {
  // const prompt = `Analyze the following json of all notebook cells and group them based on their functionality or structural patterns of analysis such as 'Environment Setup', 'Feature Engineering', 'Modeling', etc.

  // vanilla prompt - one shot learning
  //   For each group, return a Javascript object with a concise label of the analysis functionality and the cell executions numbers contained
  //   (i.e. {"label": "Environment Setup", "cell_start": 1, "cell_end": 4})

  //   ${codeCells.map((code, i) => `Block ${i + 1}:\n${code}`).join("\n\n")}
  //   `;

  // task taxonomy - prompt testing
  // const prompt = `Analyze the following json of all notebook cells and group them based on their functionality or structural patterns of analysis by providing analysis labels.

  //   ${codeCells.map((code, i) => `Block ${i + 1}:\n${code}`).join("\n\n")}
  //   `;

  // structured output prompt
  const prompt = `Analyze the following JSON of notebook cells and group them based on their functionality and/or structural patterns of analysis. Group should be the general pattern label, while subgroups label more specifically. Cell should specify the one or more cell numbers described by that subgroup.  

    ${codeCells.map((code, i) => `Block ${i + 1}:\n${code}`).join("\n\n")}
    `;
  return prompt;
};

////////////////////////////////////////
///    TESTING STRUCTURED OUTPUTS   ///
///////////////////////////////////////
const openai = new OpenAI();

const Subgroup = z.object({
  name: z.string(),
  cells: z.array(z.number()),
});

const Group = z.object({
  name: z.string(),
  subgroups: z.array(Subgroup),
});

const NotebookSummarization = z.object({
  groups: z.array(Group),
});

const getStructuredOutput = async (prompt) => {
  try {
    const response = await openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at structured data extraction. You will be given unstructured text from a JSON of notebook cells and should convert it into the given structure..",
        },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(
        NotebookSummarization,
        "notebook_summarization"
      ),
    });
    console.log("unparsed llm response", response.choices[0].message);
    return response.choices[0].message.parsed;
    // const notebook_summarization = response.choices[0].message.parsed;
    // console.log("notebook summarization", notebook_summarization);
  } catch (error) {
    console.error("Error fetching OpenAI response:", error);
    throw error;
  }
};

////////////////////////////////////////
///            API ROUTES            ///
///////////////////////////////////////

// custom API GET route to return just filtered notebook cells JSON to frontend
app.get("/notebooks/:notebookName", async (req, res) => {
  const notebookName = req.params.notebookName;
  try {
    // get filtered notebook
    const notebookCells = await fetchNotebookCells(notebookName);
    // console.log("notebookCells", notebookCells);
    // generate the prompt by feeding in each cells
    const prompt = generatePrompt(
      notebookCells.map((cell) => cell.source.join("\n"))
    );
    // get LLM reponse -> aggregate pattern analysis
    const structuredOutputResponse = await getStructuredOutput(prompt);
    console.log("LLM response", structuredOutputResponse);
  } catch (error) {
    res.status(500).json({ error: "Failed to process notebook" });
  }
});

// general get for testing api route
app.get("/", async (req, res) => {
  res.json({ test: "hi" });
});

// serve notebooks statically -> default GET route
app.use("/notebooks", express.static(path.join(__dirname, "notebooks")));

// successful setup
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
