import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: "sk-d3ae19dbe4fa462393b860637f1a19d2",
});

// Read prompt from file
const getSystemPrompt = () => {
  try {
    const promptText = fs.readFileSync(path.join(__dirname, 'prompt.txt'), 'utf8');
    // Optionally process the prompt (e.g., insert current date)
    return promptText.replace('${new Date().toLocaleDateString()}', new Date().toLocaleDateString());
  } catch (err) {
    console.error("Error reading prompt file:", err);
    return "You are a helpful assistant."; // Fallback prompt
  }
};

app.post("/chat", async (req, res) => {
  const { history } = req.body;

  try {
    const messages = [
      { role: "system", content: getSystemPrompt() },
      ...history
    ];

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: messages,
    });

    res.json({ 
      reply: completion.choices[0].message.content 
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      error: "Failed to get response. Please try again." 
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});