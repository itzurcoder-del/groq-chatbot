// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch"; // keep if you're using node-fetch
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const GROQ_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.MODEL || "llama3-8b-8192";

if (!GROQ_KEY) {
  console.error("Missing GROQ_API_KEY in .env");
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // serve frontend

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ error: "message required" });

    const payload = {
      model: MODEL,
      messages: [
        { role: "system", content: "You are a helpful assistant named URA." },
        { role: "user", content: userMessage }
      ],
      max_tokens: 512,
      temperature: 0.7
    };

    const apiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      console.error("Groq API error:", data);
      return res.status(500).json({ error: "Model API error", details: data });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() || "No response from model.";
    res.json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://127.0.0.1:${PORT}`);
});
