import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Allowed frontend origins
const allowedOrigins = [
  "https://lucillezhu13.github.io",
  "http://localhost:5173", // Add for local development if needed
];

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy blocks access from ${origin}`), false);
  },
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(bodyParser.json());

// Initialize OpenAI securely
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  if (!process.env.OPENAI_API_KEY) {
    console.warn("Warning: OPENAI_API_KEY is missing!");
  }
} catch (err) {
  console.error("OpenAI initialization failed:", err);
  process.exit(1);
}

// Improved file reading with caching
let cachedPrompt = null;
const getSystemPrompt = () => {
  if (cachedPrompt) return cachedPrompt;
  
  try {
    const promptPath = path.join(__dirname, 'prompt.txt');
    if (!fs.existsSync(promptPath)) {
      throw new Error("prompt.txt not found");
    }
    cachedPrompt = fs.readFileSync(promptPath, 'utf8')
      .replace('${new Date().toLocaleDateString()}', new Date().toLocaleDateString());
    return cachedPrompt;
  } catch (err) {
    console.error("Error reading prompt:", err);
    return "You are a helpful assistant.";
  }
};

// API endpoint for chat
app.post("/chat", async (req, res) => {
  try {
    const { history } = req.body;

    if (!Array.isArray(history)) {
      return res.status(400).json({ error: "History must be an array" });
    }

    const messages = [
      { role: "system", content: getSystemPrompt() },
      ...history.filter(msg => 
        msg.role && ["system", "user", "assistant"].includes(msg.role) && msg.content
      )
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    res.json({ 
      reply: completion.choices[0].message.content 
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to process request" 
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});