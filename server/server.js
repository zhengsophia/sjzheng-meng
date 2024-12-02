const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");

const app = express();
const PORT = 3001;

dotenv.config(); // Load environment variables from .env file

// Enable CORS for all routes
app.use(cors());
app.use(express.json());
dotenv.config(); // Load environment variables from .env file

// Fetch notebook and filter code cells
const fetchNotebookCells = async (notebookName) => {
  const notebookPath = path.join(__dirname, "notebooks", notebookName);
  try {
    // reading the notebook file
    const notebookData = fs.readFileSync(notebookPath, "utf8");
    const notebook = JSON.parse(notebookData);
    // filtering the code cells
    const notebookCells = notebook.cells.filter(
      (cell) => cell.cell_type === "code"
    );
    return notebookCells;
  } catch (error) {
    console.error("Error reading notebook:", error);
    throw new Error("Failed to read the notebook");
  }
};

// custom API GET route to return just filtered notebook cells JSON to frontend
app.get("/notebooks/:notebookName", async (req, res) => {
  const notebookName = req.params.notebookName;
  try {
    const notebookCells = await fetchNotebookCells(notebookName);
    res.json({ cells: notebookCells });
  } catch (error) {
    res.status(500).json({ error: "Failed to process notebook" });
  }
});

// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// const generatePrompt = (codeCells) => {
//   const prompt = `Analyze the following json of all notebook cells and group them based on their functionality or structural patterns of analysis such as 'Environment Setup', 'Feature Engineering', 'Modeling', etc.

//     For each group, return a Javascript object with a concise label of the analysis functionality and the cell executions numbers contained
//     (i.e. {"label": "Environment Setup", "cell_start": 1, "cell_end": 4})

//     ${codeCells.map((code, i) => `Block ${i + 1}:\n${code}`).join("\n\n")}
//     `;
//   return prompt;
// };

// const getChatResponse = async (prompt) => {
//   try {
//     const response = await axios.post(
//       "https://api.openai.com/v1/chat/completions",
//       {
//         model: "gpt-4o-mini",
//         messages: [
//           { role: "system", content: "You are a helpful assistant." },
//           { role: "user", content: prompt },
//         ],
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${OPENAI_API_KEY}`,
//         },
//       }
//     );
//     return response.data.choices[0].message;
//   } catch (error) {
//     console.error("Error fetching OpenAI response:", error);
//     throw error;
//   }
// };

// app.get("/", async (req, res) => {
//   res.json({ test: "hi" });
// });

// // API route to process notebook and generate graph data
// app.post("/generate-graph", async (req, res) => {
//   try {
//     // console.log("req", req);
//     const notebookData = req.body.notebookData; // expect the notebook data to be sent in the request body
//     const notebookCells = await fetchNotebookCells(notebookData);
//     const prompt = generatePrompt(notebookCells);
//     const chatResponse = await getChatResponse(prompt);
//     res.json({ chatResponse });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to generate graph" });
//   }
// });

// serve notebooks statically -> default GET route
app.use("/notebooks", express.static(path.join(__dirname, "notebooks")));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
