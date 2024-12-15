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

const generateNarrativePrompt = (codeCells) => {
  const prompt = `This is an example of a narrative vignette. 

  "The user began the static task by inspecting sample data via df.head(). He infers that the purpose of 
  the analysis is to use the data to decide if the rescue attempt on the space-titanic was 'fair', with transported 
  as the variable that indicates if an individual (dataframe row) was rescued. He verifies this assumption by consulting 
  the data dictionary. He then generates a profile visualization and inspects the univariate distribution of all 
  variables in the dataframe. He expresses the desire to look at the univariate distributions subset on the values of 
  the transported variable [allowing him to compare the shape of the potential predictor variables for 'survived' vs. 
  'died' vs. null. As he is unable to add a facet to the profile, he instead generating a series of profile visualizations,
  each manually-filtered on a level of the transported variable. [NOTE: This is problematic if the distribution of the 
    transported variable is not equal across the 3 levels, as the profile visualizations will not reflect the proportion of 
    the filtered data included in each subset—however, this is not transpartent to the user] Next he decides to look more 
    closely at the relationship between VIP and rescue status, first by generating a jointplot [which is ineffective b/c the 
      variables are both categorical and the jointplot yields overplotting] and eventually using numpy to calculate the covariance 
      between the variables. This initially yields errors (due to datatype), so he coerces the categories numbers, converts missing 
      data to 0s and is then able to generate a covariance matrix. He concludes from this matrix that the VIPs were not overly 
      targeted for being rescued. He then decides to construct a crosstab [frequency table] of a few combinations of variables. 
      He then decides to look more closely at the large number of null values in some of the variables to see if they might be 
      appropriately coerced to a different value that would then render more signal in the relationships. As he decides which 
      variable-pairs to consider, he shares that he is using the profile visualization to keep track of the variables in the 
      dataframe. After calculating crosstabs for a number of variable pairs, and then creates a series of concatenated-histograms 
      consiting of two side by side histograms of transported manually filtered based on a new computed variable [true/false] 
      indicating if any money was spent. He characterizes this as a “visual version of the table I was looking at before”, 
      indicating he is using the concatenated-histogram as a validation of the previous crosstab tables. [This is a suboptimal 
      visualization strategy because the crosstabs are 2D the histograms are 1D and not-proportional to each other, meaning that 
      as he compares across the histograms of the transported distribution, the height of bars in the histograms are not 
      proportional across the histograms. This strategy would only be valid if the distribution of the money-spent variable 
      was 50% across T and F]. He then concludes that it does not seem like status-related variables played a role in who survived 
      the space titanic crash, and decides to take explore whether 'side of the ship' played a role in survival. Again he creates a 
      concatenated-histogram visualizing the distribution of transported for two filtered dataframes, one containing starboard cabins and 
      the other port. He interprets the small difference in height across the bars as indicating that side of the ship did not make a 
      difference in survival. As he eliminates potential explanatory variables, he returns to the data dictionary when deciding what 
      variables to inspect next. Several of the potential explanatory relationships the user explores involved creating new variables 
      (or filtered dataframes) based on parsing information out of existing variables (e.g. parsing cabin floor and side of boat out 
      of cabin name), indicating a high degree of fluency with Python and common data handling libraries. When the experimenter prompts 
      him that the time is almost up, he proceeds to answering the questions at the end of the notebook."

    Can you write one for the given notebook? Please also return a json object with the sentence indices if split mapped to the code cells based on execution number.
    i.e. {"sentence": 0, "cell_start": 1, "cell_end": 4}
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

const getNarrativeResponse = async (prompt) => {
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
    // const narrativePrompt = generateNarrativePrompt(
    //   notebookCells.map((cell) => cell.source.join("\n"))
    // );
    // get LLM reponse -> aggregate pattern analysis
    // const chatResponse = await getChatResponse(prompt);
    // console.log("LLM response", chatResponse.content);
    // const narrativeResponse = await getNarrativeResponse(narrativePrompt);
    // console.log("LLM response", narrativeResponse.content);

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
    // const analysisLabels = await cleanChatResponse(chatResponse.content);
    const analysisLabels = await cleanChatResponse(chatResponse);
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
