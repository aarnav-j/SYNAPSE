const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function callLocalAI(prompt, retries = 2) {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                temperature: 0.2,
                topP: 0.9,
                maxOutputTokens: 4096
            }
        });
        console.log("API KEY:", process.env.GEMINI_API_KEY);
        return response.text;

    } catch (error) {
        console.log("API KEY:", process.env.GEMINI_API_KEY);
        console.error("❌ GEMINI ERROR:", error.message);

        if (retries > 0) {
            return callLocalAI(prompt, retries - 1);
        }

        return "";
    }
}

module.exports = callLocalAI;