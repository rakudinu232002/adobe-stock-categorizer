const fs = require('fs');
const sharp = require('sharp');
const axios = require('axios');

// Adobe Stock Categories
const ADOBE_CATEGORIES = [
    "Animals", "Buildings and Architecture", "Business", "Drinks", "The Environment",
    "States of Mind", "Food", "Graphic Resources", "Hobbies and Leisure", "Industry",
    "Landscapes", "Lifestyle", "People", "Plants and Flowers", "Culture and Religion",
    "Science", "Social Issues", "Sports", "Technology", "Transport", "Travel"
];

// Keyword mapping for Adobe Categories
const CATEGORY_KEYWORDS = {
    "Animals": ["animal", "mammal", "bird", "fish", "insect", "pet", "dog", "cat", "wildlife", "zoo", "fur", "beak", "wing"],
    "Buildings and Architecture": ["building", "architecture", "house", "skyscraper", "city", "urban", "construction", "structure", "window", "door", "roof", "facade"],
    "Business": ["business", "office", "work", "meeting", "computer", "laptop", "finance", "money", "chart", "graph", "corporate", "professional", "suit"],
    "Drinks": ["drink", "beverage", "glass", "bottle", "cup", "mug", "coffee", "tea", "water", "alcohol", "wine", "beer", "cocktail", "juice"],
    "The Environment": ["environment", "nature", "ecology", "pollution", "recycle", "green", "earth", "planet", "climate", "global warming", "forest", "ocean"],
    "States of Mind": ["emotion", "happy", "sad", "angry", "love", "fear", "surprise", "joy", "depression", "stress", "mental", "thought", "dream"],
    "Food": ["food", "meal", "dish", "cuisine", "fruit", "vegetable", "meat", "bread", "dessert", "snack", "cooking", "kitchen", "restaurant"],
    "Graphic Resources": ["graphic", "design", "background", "texture", "pattern", "abstract", "art", "illustration", "vector", "symbol", "icon", "logo", "jewelry", "diamond", "gemstone", "luxury"],
    "Hobbies and Leisure": ["hobby", "leisure", "fun", "game", "play", "toy", "music", "art", "craft", "reading", "writing", "collection", "relax"],
    "Industry": ["industry", "factory", "manufacturing", "machine", "tool", "worker", "engineer", "construction", "plant", "production", "technology"],
    "Landscapes": ["landscape", "nature", "scenery", "mountain", "sky", "cloud", "river", "lake", "sea", "ocean", "beach", "forest", "tree", "grass", "field", "sunset", "sunrise"],
    "Lifestyle": ["lifestyle", "living", "home", "family", "friend", "couple", "party", "celebration", "wedding", "holiday", "vacation", "travel"],
    "People": ["person", "people", "man", "woman", "child", "baby", "crowd", "face", "portrait", "human", "group", "team"],
    "Plants and Flowers": ["plant", "flower", "leaf", "garden", "flora", "botany", "bloom", "blossom", "tree", "grass", "nature"],
    "Culture and Religion": ["culture", "religion", "tradition", "festival", "temple", "church", "mosque", "prayer", "god", "spirituality", "belief", "custom"],
    "Science": ["science", "research", "lab", "laboratory", "microscope", "chemistry", "biology", "physics", "medicine", "health", "doctor", "hospital"],
    "Social Issues": ["social", "issue", "poverty", "war", "protest", "politics", "government", "law", "justice", "crime", "violence", "peace"],
    "Sports": ["sport", "game", "match", "player", "team", "ball", "stadium", "athlete", "exercise", "fitness", "gym", "workout", "running"],
    "Technology": ["technology", "tech", "computer", "phone", "mobile", "internet", "digital", "software", "hardware", "robot", "ai", "future"],
    "Transport": ["transport", "transportation", "vehicle", "car", "bus", "train", "plane", "ship", "boat", "bicycle", "road", "traffic", "travel"],
    "Travel": ["travel", "tourism", "tourist", "destination", "vacation", "holiday", "trip", "journey", "adventure", "explore", "landmark", "monument"]
};

const mapLabelsToCategory = (labels) => {
    const scores = {};
    const matchedKeywords = {};
    ADOBE_CATEGORIES.forEach(cat => {
        scores[cat] = 0;
        matchedKeywords[cat] = [];
    });

    labels.forEach(label => {
        const name = label.description.toLowerCase();
        const score = label.score;

        for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            if (keywords.some(k => name.includes(k))) {
                scores[category] += score;
                const matched = keywords.find(k => name.includes(k));
                if (matched && !matchedKeywords[category].includes(matched)) {
                    matchedKeywords[category].push(matched);
                }
            }
        }
    });

    let maxScore = 0;
    let bestCategory = "Graphic Resources";

    for (const [category, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            bestCategory = category;
        }
    }

    const confidence = Math.min(maxScore > 0 ? 0.7 + (maxScore * 0.1) : 0.5, 0.99);

    const topLabels = labels.slice(0, 5).map(l => `"${l.description}"`).join(', ');
    let reasoning = "";

    if (maxScore > 0) {
        const uniqueMatches = matchedKeywords[bestCategory].slice(0, 5).join(', ');
        reasoning = `The AI detected labels: ${topLabels}. It matched keywords "${uniqueMatches}" which align with the "${bestCategory}" category.`;
    } else {
        reasoning = `The AI detected labels: ${topLabels}, but found no strong direct matches with specific category keywords. Defaulting to "${bestCategory}" based on general visual characteristics.`;
    }

    return { category: bestCategory, confidence, reasoning };
};

const callGoogleVision = async (filePath, apiKey) => {
    try {
        const imageContent = fs.readFileSync(filePath).toString('base64');
        const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

        const response = await axios.post(url, {
            requests: [{
                image: { content: imageContent },
                features: [{ type: 'LABEL_DETECTION', maxResults: 20 }]
            }]
        });

        const labels = response.data.responses[0].labelAnnotations || [];
        if (labels.length === 0) throw new Error("No labels detected");

        const { category, confidence, reasoning } = mapLabelsToCategory(labels);

        return {
            category,
            confidence,
            reasoning,
            provider: 'Google Cloud Vision',
            labels: labels.map(l => l.description)
        };

    } catch (error) {
        console.error("Google Vision API Error:", error.response ? error.response.data : error.message);
        throw error;
    }
};

const getBestGeminiModel = async (apiKey) => {
    try {
        console.log("[Gemini] Fetching available models...");
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await axios.get(url);
        const models = response.data.models || [];

        console.log(`[Gemini] Found ${models.length} models available for this key.`);

        // Prioritized list of preferred vision models
        const preferredModels = [
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash',
            'gemini-1.5-pro-latest',
            'gemini-1.5-pro',
            'gemini-pro-vision'
        ];

        // Find the first preferred model that exists in the user's available models
        for (const pref of preferredModels) {
            const match = models.find(m => m.name.endsWith(`/${pref}`) || m.name === pref);
            if (match) {
                console.log(`[Gemini] Selected model: ${pref}`);
                return pref;
            }
        }

        // Fallback: check for any model with "vision" in the name
        const visionModel = models.find(m => m.name.includes('vision'));
        if (visionModel) {
            const name = visionModel.name.split('/').pop();
            console.log(`[Gemini] Selected fallback vision model: ${name}`);
            return name;
        }

        // Ultimate fallback if discovery fails or no match found
        console.warn("[Gemini] No specific vision model found in list. Defaulting to gemini-1.5-flash.");
        return 'gemini-1.5-flash';

    } catch (error) {
        console.warn("[Gemini] Failed to list models. Defaulting to gemini-1.5-flash.", error.message);
        return 'gemini-1.5-flash';
    }
};

const callGeminiModel = async (model, filePath, apiKey) => {
    console.log(`[Gemini] Attempting model: ${model}`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Read file and ensure clean base64
    let imageContent = fs.readFileSync(filePath).toString('base64');
    // Remove data URI prefix if present
    imageContent = imageContent.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Analyze this image carefully. Identify all objects, subjects, themes, colors, and mood. Then categorize it into EXACTLY ONE of these Adobe Stock categories: Animals, Buildings and Architecture, Business, Drinks, The Environment, States of Mind, Food, Graphic Resources, Hobbies and Leisure, Industry, Landscapes, Lifestyle, People, Plants and Flowers, Culture and Religion, Science, Social Issues, Sports, Technology, Transport, or Travel. Respond in this exact format:
CATEGORY: [category name]
CONFIDENCE: [0-100]
REASON: [detailed explanation of why this category fits, mentioning specific detected elements]`;

    // Determine mime type based on file extension
    const ext = filePath.split('.').pop().toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === 'png') mimeType = 'image/png';
    if (ext === 'webp') mimeType = 'image/webp';
    if (ext === 'heic') mimeType = 'image/heic';
    if (ext === 'heif') mimeType = 'image/heif';

    try {
        const response = await axios.post(url, {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mimeType, data: imageContent } }
                ]
            }]
        });
        return response.data;
    } catch (error) {
        // Enhance error object with specific details
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            let message = `Gemini API Error (${status}): `;

            if (status === 400) message += "Invalid request or image format.";
            else if (status === 401) message += "Invalid API Key.";
            else if (status === 403) message += "Permission denied (check API key scope).";
            else if (status === 404) message += `Model '${model}' not found.`;
            else if (status === 429) message += "Quota exceeded (Rate limit reached).";
            else if (status === 500) message += "Internal Google Server Error.";
            else message += JSON.stringify(data);

            error.message = message;
            error.details = data;
        }
        throw error;
    }
};

const callGeminiAPI = async (filePath, apiKey) => {
    console.log(`[Gemini] Starting analysis for ${filePath}`);
    console.log(`[Gemini] Using API Key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);

    let candidate = null;
    let usedModel = 'unknown';

    try {
        // Dynamically find the best model
        usedModel = await getBestGeminiModel(apiKey);

        const data = await callGeminiModel(usedModel, filePath, apiKey);
        candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!candidate) {
            throw new Error("No response text from Gemini API.");
        }

        console.log("Gemini Raw Response:", candidate);

        // Parse the text response
        const categoryMatch = candidate.match(/CATEGORY:\s*(.+)/i);
        const confidenceMatch = candidate.match(/CONFIDENCE:\s*(\d+(?:\.\d+)?)/i);
        const reasonMatch = candidate.match(/REASON:\s*(.+)/si);

        let category = categoryMatch ? categoryMatch[1].trim() : "Unable to categorize";
        let confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) / 100 : 0.0;
        let reasoning = reasonMatch ? reasonMatch[1].trim() : "AI could not provide a clear reason.";

        // Validate category
        if (!ADOBE_CATEGORIES.includes(category)) {
            console.warn(`[Gemini] Invalid category returned: "${category}".`);
            // Try to find a close match
            const match = ADOBE_CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase());
            category = match || "Unable to categorize";
        }

        return {
            category: category,
            confidence: confidence,
            reasoning: reasoning + ` (Model: ${usedModel})`,
            provider: `Google Gemini API (${usedModel})`
        };

    } catch (error) {
        console.error("Gemini API Failed:", error.message);

        // Return a fallback result instead of crashing
        return {
            category: "Unable to categorize",
            confidence: 0,
            reasoning: `Analysis failed: ${error.message}`,
            provider: 'Google Gemini API (Failed)'
        };
    }
};

const callOpenRouterAPI = async (filePath, apiKey) => {
    console.log(`[OpenRouter] Starting analysis for ${filePath}`);

    // Read file and ensure clean base64
    let imageContent = fs.readFileSync(filePath).toString('base64');
    imageContent = imageContent.replace(/^data:image\/\w+;base64,/, '');

    const url = "https://openrouter.ai/api/v1/chat/completions";

    // Priority list of free vision models
    const MODELS = [
        "google/gemini-flash-1.5-8b:free",
        "meta-llama/llama-3.2-11b-vision-instruct:free",
        "qwen/qwen-2-vl-7b-instruct:free",
        "google/gemini-2.0-flash-thinking-exp:free"
    ];

    const prompt = `Analyze this image carefully. Identify all objects, subjects, themes, colors, and mood. Then categorize it into EXACTLY ONE of these Adobe Stock categories: Animals, Buildings and Architecture, Business, Drinks, The Environment, States of Mind, Food, Graphic Resources, Hobbies and Leisure, Industry, Landscapes, Lifestyle, People, Plants and Flowers, Culture and Religion, Science, Social Issues, Sports, Technology, Transport, or Travel. Respond in this exact format:
CATEGORY: [category name]
CONFIDENCE: [0-100]
REASON: [detailed explanation of why this category fits, mentioning specific detected elements]`;

    let lastError = null;

    for (const model of MODELS) {
        console.log(`[OpenRouter] Attempting model: ${model}`);
        try {
            const response = await axios.post(url, {
                model: model,
                messages: [{
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageContent}` } }
                    ]
                }]
            }, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "Adobe Stock Categorizer",
                    "Content-Type": "application/json"
                }
            });

            const candidate = response.data.choices?.[0]?.message?.content;

            if (!candidate) {
                throw new Error(`No response text from OpenRouter API using ${model}.`);
            }

            console.log(`[OpenRouter] Success with ${model}. Response:`, candidate);

            // Parse the text response
            const categoryMatch = candidate.match(/CATEGORY:\s*(.+)/i);
            const confidenceMatch = candidate.match(/CONFIDENCE:\s*(\d+(?:\.\d+)?)/i);
            const reasonMatch = candidate.match(/REASON:\s*(.+)/si);

            let category = categoryMatch ? categoryMatch[1].trim() : "Unable to categorize";
            let confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) / 100 : 0.0;
            let reasoning = reasonMatch ? reasonMatch[1].trim() : "AI could not provide a clear reason.";

            // Validate category
            if (!ADOBE_CATEGORIES.includes(category)) {
                console.warn(`[OpenRouter] Invalid category returned: "${category}".`);
                const match = ADOBE_CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase());
                category = match || "Unable to categorize";
            }

            return {
                category: category,
                confidence: confidence,
                reasoning: reasoning + ` (Model: ${model})`,
                provider: 'OpenRouter (Free)'
            };

        } catch (error) {
            console.warn(`[OpenRouter] Failed with ${model}:`, error.message);

            // Check for specific errors to stop trying if it's an auth issue
            if (error.response && error.response.status === 401) {
                lastError = error;
                break; // Don't try other models if key is invalid
            }

            lastError = error;
            // Continue to next model
        }
    }

    // If we get here, all models failed
    console.error("OpenRouter API Failed with all models.");

    // Enhance error object with specific details from the last error
    let message = "All OpenRouter models failed.";
    if (lastError && lastError.response) {
        const status = lastError.response.status;
        const data = lastError.response.data;
        message = `OpenRouter API Error (${status}): `;

        if (status === 401) message += "Invalid API key. Get a new one from openrouter.ai/keys";
        else if (status === 429) message += "Daily limit reached (200/day). Wait 24 hours or create another free key";
        else if (status === 402) message += "This model requires credits. Use a :free model instead";
        else message += JSON.stringify(data);
    } else if (lastError) {
        message += " " + lastError.message;
    }

    return {
        category: "Unable to categorize",
        confidence: 0,
        reasoning: `Analysis failed: ${message}`,
        provider: 'OpenRouter (Failed)'
    };
};

const categorizeWithHuggingFace = async (filePath, apiKey) => {
    console.log(`[Hugging Face] Starting analysis for ${filePath}`);

    // Read file and ensure clean base64
    let imageContent = fs.readFileSync(filePath).toString('base64');
    imageContent = imageContent.replace(/^data:image\/\w+;base64,/, '');

    try {
        // Step 1: Get image description using BLIP
        console.log("[Hugging Face] Step 1: Generating image caption...");
        const captionResponse = await axios.post(
            "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
            { inputs: imageContent },
            {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const description = captionResponse.data[0]?.generated_text;
        if (!description) throw new Error("Failed to generate image description.");
        console.log(`[Hugging Face] Generated Caption: "${description}"`);

        // Step 2: Categorize description using BART
        console.log("[Hugging Face] Step 2: Categorizing description...");
        const classificationResponse = await axios.post(
            "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
            {
                inputs: description,
                parameters: { candidate_labels: ADOBE_CATEGORIES }
            },
            {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const classification = classificationResponse.data;
        const bestCategory = classification.labels[0];
        const confidence = classification.scores[0];

        console.log(`[Hugging Face] Categorized as: ${bestCategory} (${(confidence * 100).toFixed(1)}%)`);

        return {
            category: bestCategory,
            confidence: confidence,
            reasoning: `Image analysis: "${description}". Matched to category "${bestCategory}" with ${(confidence * 100).toFixed(1)}% confidence.`,
            provider: 'Hugging Face (BLIP + BART)'
        };

    } catch (error) {
        console.error("Hugging Face API Failed:", error.message);
        if (error.response) {
            console.error("Details:", error.response.data);
        }

        return {
            category: "Unable to categorize",
            confidence: 0,
            reasoning: `Analysis failed: ${error.message}`,
            provider: 'Hugging Face (Failed)'
        };
    }
};

const processImage = async (filePath, apiKeys) => {
    try {
        let result = null;
        let lastError = null;

        for (const keyObj of apiKeys) {
            if (!keyObj.key || !keyObj.key.trim()) continue;

            try {
                if (keyObj.provider === 'Google Cloud Vision') {
                    result = await callGoogleVision(filePath, keyObj.key);
                } else if (keyObj.provider === 'Google Gemini API') {
                    result = await callGeminiAPI(filePath, keyObj.key);
                } else if (keyObj.provider === 'OpenRouter') {
                    result = await callOpenRouterAPI(filePath, keyObj.key);
                } else if (keyObj.provider === 'Hugging Face') {
                    result = await categorizeWithHuggingFace(filePath, keyObj.key);
                }

                if (result) break;

            } catch (e) {
                lastError = e;
                console.error(`API ${keyObj.provider} failed:`, e.message);
            }
        }

        if (!result) {
            if (lastError) throw new Error(`All API keys failed. Last error: ${lastError.message}`);
            throw new Error("No valid API keys provided or supported.");
        }

        return {
            filename: filePath.split(/[\\/]/).pop(),
            category: result.category,
            confidence: result.confidence,
            reasoning: result.reasoning,
            provider: result.provider,
            suggestions: []
        };

    } catch (error) {
        throw error;
    }
};

module.exports = {
    processImage
};
