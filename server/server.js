const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");

const app = express();
const PORT = 3001;

dotenv.config();

// enabling CORS for all routes
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
  const prompt = `Analyze the following json of all notebook cells and group them based on their functionality or structural patterns of analysis such as 'Environment Setup', 'Feature Engineering', 'Modeling', etc.

    For each group, return a Javascript object with a concise label of the analysis functionality and the cell executions numbers contained
    (i.e. {"label": "Environment Setup", "cell_start": 1, "cell_end": 4})

    ${codeCells.map((code, i) => `Block ${i + 1}:\n${code}`).join("\n\n")}
    `;

  return prompt;
};

// feeding into the LLM, standard dev start
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

// extracts just the array of jsons from the response
const cleanChatResponse = async (responseText) => {
  try {
    // regex to match and extract the array content
    const match = responseText.match(/const\s+\w+\s*=\s*(\[[\s\S]*?\]);/);

    if (match && match[1]) {
      const strArr = match[1];
      // removing single-line comments
      const cleanedStrArr = strArr
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      // console.log("json parsed as arr", JSON.parse(cleanedStrArr));
      return JSON.parse(cleanedStrArr); // return the array of json objects
    } else {
      throw new Error("No array content found in response text.");
    }
  } catch (error) {
    console.error("Error extracting array content:", error);
    return null;
  }
};

// assigns the label based on execution count to notebookCells
const addLabelsToCells = async (notebookCells, labels) => {
  const labeledCells = notebookCells.map((cell) => {
    let matchingGroup = null;
    // console.log("testing labels", labels);
    // console.log("is labels an aray", Array.isArray(labels));
    labels.forEach((label) => {
      // console.log("testing single label", label);
      if (
        cell.execution_count >= label.cell_start &&
        cell.execution_count <= label.cell_end
      ) {
        matchingGroup = label;
      }
    });
    // console.log("matching group", matchingGroup);
    // unlabeled if GPT did not assign a label to any cells
    return {
      ...cell,
      label: matchingGroup ? matchingGroup.label : "Unlabeled",
    };
  });
  // console.log("labeledCells", labeledCells);
  return labeledCells;
};

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
    // const chatResponse = await getChatResponse(prompt);
    const chatResponse = `Based on the provided notebook cell structures, here's a categorized analysis of the cells grouped by their functionality, along with the range of cell executions contained within each category.

\`\`\`javascript
const analysisFunctions = [
    {
        "label": "Environment Setup",
        "cell_start": 1,
        "cell_end": 1
    },
    {
        "label": "Data Import",
        "cell_start": 3,
        "cell_end": 3
    },
    {
        "label": "Data Overview",
        "cell_start": 4,
        "cell_end": 9
    },
    {
        "label": "Data Cleaning",
        "cell_start": 6,
        "cell_end": 28
    },
    {
        "label": "Feature Engineering",
        "cell_start": 16,
        "cell_end": 38
    },
    {
        "label": "Visualizations",
        "cell_start": 11,
        "cell_end": 58
    },
    {
        "label": "Modeling Setup",
        "cell_start": 62,
        "cell_end": 65
    },
    {
        "label": "Model Training",
        "cell_start": 66,
        "cell_end": 67
    },
    {
        "label": "Model Prediction",
        "cell_start": 68,
        "cell_end": 70
    }
];
\`\`\`

### Explanation of the Categorization:
1. **Environment Setup**: Includes cell for importing libraries and modules essential for the analysis.
2. **Data Import**: Includes cells where the datasets are loaded from CSV files.
3. **Data Overview**: Cells that give insights on the shape, structure, and basic statistics of the datasets.
4. **Data Cleaning**: Cells that involve tasks such as dropping NaN values, cleaning text data, and other preprocessing operations.
5. **Feature Engineering**: Cells focused on creating new features derived from existing data (like calculating word counts, etc.).
6. **Visualizations**: Cells responsible for plotting and visualizing data through various plots and figures to understand distributions and relationships visually.
7. **Modeling Setup**: Cells for preparing the model environment, including setting up data formats and structures needed to train the model.
8. **Model Training**: Cells involved in the training of the sentiment analysis model on provided data.
9. **Model Prediction**: Cells that handle the prediction of sentiments using the trained model and preparing this data for submission.

This categorization ensures clear structure and logical flow for the notebook's operations, each serving a specific purpose in the analysis workflow.`;
    // console.log("LLM response", chatResponse.content);
    //     const chatResponse = `To categorize the blocks of code based on their functionality in a data analysis context, we can group the notebook cells into several categories, such as "Environment Setup", "Data Loading", "Data Cleaning", "Exploratory Data Analysis", "Feature Engineering", "Modeling", and "Evaluation". Below is a structured analysis of the grouped blocks with their corresponding cell execution numbers.

    // \`\`\`javascript
    // const groupedCells = [
    //     {
    //         "label": "Environment Setup",
    //         "cell_start": 1,
    //         "cell_end": 1
    //     },
    //     {
    //         "label": "Data Loading",
    //         "cell_start": 2,
    //         "cell_end": 2
    //     },
    //     {
    //         "label": "Data Cleaning",
    //         "cell_start": 3,
    //         "cell_end": 35 // Includes cell blocks for outlier detection, dropping outliers, filling missing values, and feature transformations
    //     },
    //     {
    //         "label": "Exploratory Data Analysis",
    //         "cell_start": 11,
    //         "cell_end": 34 // Includes descriptive stats, plots and correlation analysis.
    //     },
    //     {
    //         "label": "Feature Engineering",
    //         "cell_start": 36,
    //         "cell_end": 46 // Includes all the steps taken to create new features and handling categorical variables
    //     },
    //     {
    //         "label": "Modeling",
    //         "cell_start": 63,
    //         "cell_end": 76 // Includes model training, hyperparameter tuning, and cross-validation results.
    //     },
    //     {
    //         "label": "Evaluation",
    //         "cell_start": 64,
    //         "cell_end": 75 // Includes model evaluation metrics and visualizations of results.
    //     }
    // ];
    // \`\`\`

    // ### Explanation of Grouping:
    // 1. **Environment Setup**: Contains imports and initial settings.
    // 2. **Data Loading**: Includes the code for loading the train and test datasets.
    // 3. **Data Cleaning**: Involves all tasks related to cleaning the data such as outlier detection, dropping outliers, filling missing values, and handling nulls.
    // 4. **Exploratory Data Analysis**: Covers all blocks that visualize and summarize data characteristics, exploring relationships between features and the target.
    // 5. **Feature Engineering**: Encompasses all operations for creating new features based on existing data and transforming categorical variables.
    // 6. **Modeling**: Contains portions related to defining and fitting models, as well as methods for tuning hyperparameters and comparing model performances.
    // 7. **Evaluation**: Involves the analysis and presentation of the model performance, including results from different classifiers and ensemble methods.

    // This structure helps organize the analysis in a coherent manner, making it easier to understand the flow of the data analysis process in the notebook.`;

    // parse the LLM response to return the original filtered cells but also with the pattern labels
    // const analysisLabels = JSON.parse(chatResponse.content);
    const analysisLabels = await cleanChatResponse(chatResponse);
    // const analysisLabels = await cleanChatResponse(chatResponse.content);
    console.log("label array", analysisLabels);

    const labeledCells = await addLabelsToCells(notebookCells, analysisLabels);
    // console.log("labeled cells", labeledCells);

    const response = {
      cells: labeledCells,
    };
    res.json(response);
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
