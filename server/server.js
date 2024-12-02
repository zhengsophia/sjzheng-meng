const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Serve notebooks
app.use("/notebooks", express.static(path.join(__dirname, "notebooks")));

dotenv.config(); // Load environment variables from .env file

app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const fetchNotebookCells = async (notebookData) => {
  // Simulate fetching notebook cells. In practice, this could be done from a database or another source
  return notebookData.cells.filter((cell) => cell.cell_type === "code");
};

const generatePrompt = (codeCells) => {
  const prompt = `Analyze the following json of all notebook cells and group them based on their functionality or structural patterns of analysis such as 'Environment Setup', 'Feature Engineering', 'Modeling', etc.

    For each group, return a Javascript object with a concise label of the analysis functionality and the cell executions numbers contained
    (i.e. {"label": "Environment Setup", "cell_start": 1, "cell_end": 4})

    ${codeCells.map((code, i) => `Block ${i + 1}:\n${code}`).join("\n\n")}
    `;
  return prompt;
};

const getChatResponse = async (prompt) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );
    return response.data.choices[0].message;
  } catch (error) {
    console.error("Error fetching OpenAI response:", error);
    throw error;
  }
};

app.get("/", async (req, res) => {
  res.json({ test: "hi" });
});

// API route to process notebook and generate graph data
app.post("/generate-graph", async (req, res) => {
  try {
    console.log("req", req);
    const notebookData = req.body.notebookData; // expect the notebook data to be sent in the request body
    const notebookCells = await fetchNotebookCells(notebookData);
    const prompt = generatePrompt(notebookCells);
    const chatResponse = await getChatResponse(prompt);
    res.json({ chatResponse });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate graph" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
