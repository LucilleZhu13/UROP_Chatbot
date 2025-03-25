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
const port = process.env.PORT || 3000;

// Enhanced CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `CORS policy blocks access from ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(bodyParser.json());

// Initialize OpenAI with error handling
let openai;
try {
  openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.OPENAI_API_KEY || "sk-d3ae19dbe4fa462393b860637f1a19d2", // Never hardcode in production
  });
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

// Enhanced API endpoint
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
      model: "deepseek-chat",
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