function extractText(data) {
  return data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim() || "";
}

async function generateWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    const error = new Error("Gemini API key is not configured");
    error.status = 503;
    throw error;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
        },
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || "Gemini request failed";
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.error?.status || "GEMINI_REQUEST_FAILED";

    if (
      response.status === 429 ||
      error.code === "RESOURCE_EXHAUSTED" ||
      /quota|rate limit|exceeded/i.test(message)
    ) {
      error.status = 429;
      error.code = "GEMINI_LIMIT_REACHED";
      error.message =
        "Gemini free-tier limit reached. Please wait and try again later, or use a different API key.";
    }

    throw error;
  }

  return extractText(data);
}

module.exports = { generateWithGemini };
