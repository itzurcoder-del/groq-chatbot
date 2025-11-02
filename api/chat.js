export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;
  console.log("User message:", message);

  // Example simple response
  // (You can later connect this to OpenAI or your own logic)
  const reply = `You said: **${message}**`;

  res.status(200).json({ reply });
}
