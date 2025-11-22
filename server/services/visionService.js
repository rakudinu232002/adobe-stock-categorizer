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
            'gemini-pro-vision',
            'gemini-2.0-flash-exp'
        ];

        // Find the first preferred model that exists in the user's available models
        for (const pref of preferredModels) {
            const match = models.find(m => m.name.endsWith(`/${pref}`) || m.name === pref);
            if (match) {
                const modelName = match.name.split('/').pop();
                console.log(`[Gemini] Selected model: ${modelName}`);
                return modelName;
            }
        }

        // Fallback: check for any model with "vision" or "flash" or "pro" in the name
        const visionModel = models.find(m =>
            m.name.includes('vision') ||
            m.name.includes('flash') ||
            m.name.includes('pro') ||
            m.name.includes('gemini')
        );

        if (visionModel) {
            const name = visionModel.name.split('/').pop();
            console.log(`[Gemini] Selected fallback model: ${name}`);
            return name;
        }

        // If we still haven't found one, just use the first available model
        if (models.length > 0) {
            const firstModel = models[0].name.split('/').pop();
            console.warn(`[Gemini] Using first available model: ${firstModel}`);
            return firstModel;
        }

        // Ultimate fallback - should never reach here
        throw new Error("No models available for this API key");

    } catch (error) {
        console.error("[Gemini] Failed to list models:", error.message);
        throw new Error(`Model discovery failed: ${error.message}`);
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
            else if (status === 429) message += "Quota exceeded. Gemini free tier has very low limits. Try: 1) Wait 1-2 hours  2) Use a different API  3) Enable billing on your Google Cloud account";
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
            reasoning: reasoning,
            provider: `Google Gemini API`
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

    // Priority list of free vision models (updated Nov 2024)
    const MODELS = [
        "meta-llama/llama-3.2-11b-vision-instruct:free",
        "qwen/qwen2.5-vl-32b-instruct:free",
        "google/gemma-3-27b-it:free"
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
                reasoning: reasoning,
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
        else if (status === 413) message += "Image too large for free tier. Try compressing the image or use a paid API";
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

    // Priority list of captioning models
    const CAPTION_MODELS = [
        "Salesforce/blip-image-captioning-base",
        "microsoft/git-base",
        "nlpconnect/vit-gpt2-image-captioning"
    ];

    // Endpoints to try (router first, then standard API)
    const ENDPOINTS = [
        "https://router.huggingface.co/hf-inference/models",
        "https://api-inference.huggingface.co/models"
    ];

    let description = null;
    let usedModel = null;
    let lastError = null;

    // Step 1: Try to get a caption
    console.log("[Hugging Face] Step 1: Generating image caption...");

    outerLoop:
    for (const endpoint of ENDPOINTS) {
        for (const model of CAPTION_MODELS) {
            try {
                console.log(`[Hugging Face] Attempting: ${endpoint}/${model}`);
                const captionResponse = await axios.post(
                    `${endpoint}/${model}`,
                    { inputs: imageContent },
                    {
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                            "Content-Type": "application/json"
                        }
                    }
                );

                if (captionResponse.data && captionResponse.data[0] && captionResponse.data[0].generated_text) {
                    description = captionResponse.data[0].generated_text;
                    usedModel = `${model} (${endpoint})`;
                    console.log(`[Hugging Face] Success with ${usedModel}. Caption: "${description}"`);
                    break outerLoop;
                }
            } catch (error) {
                console.warn(`[Hugging Face] Failed with ${endpoint}/${model}:`, error.message);
                lastError = error;
            }
        }
    }

    // Step 2: If captioning succeeded, categorize using BART
    if (description) {
        try {
            console.log("[Hugging Face] Step 2: Categorizing description...");
            const classificationModel = "facebook/bart-large-mnli";
            let classification = null;

            for (const endpoint of ENDPOINTS) {
                try {
                    const classificationResponse = await axios.post(
                        `${endpoint}/${classificationModel}`,
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
                    classification = classificationResponse.data;
                    break;
                } catch (e) {
                    console.warn(`[Hugging Face] Classification failed on ${endpoint}: ${e.message}`);
                }
            }

            if (classification && classification.labels && classification.scores) {
                const bestCategory = classification.labels[0];
                const confidence = classification.scores[0];

                return {
                    category: bestCategory,
                    confidence: confidence,
                    reasoning: `Image analysis: "${description}" (via ${usedModel}). Matched to category "${bestCategory}" with ${(confidence * 100).toFixed(1)}% confidence.`,
                    provider: 'Hugging Face (Captioning)'
                };
            }
        } catch (error) {
            console.warn("[Hugging Face] BART classification failed, falling back to direct classification.");
        }
    }

    // Step 3: Fallback - Direct Image Classification
    if (!description) {
        console.log("[Hugging Face] Captioning failed. Proceeding to fallback...");
    } else {
        console.log("[Hugging Face] Captioning succeeded but classification failed. Proceeding to fallback...");
    }

    console.log("[Hugging Face] Step 3: Fallback to Direct Image Classification...");
    const fallbackModel = "google/vit-base-patch16-224";

    for (const endpoint of ENDPOINTS) {
        try {
            console.log(`[Hugging Face] Attempting fallback: ${endpoint}/${fallbackModel}`);
            const response = await axios.post(
                `${endpoint}/${fallbackModel}`,
                { inputs: imageContent },
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            // Expecting array of { label: string, score: number }
            if (Array.isArray(response.data)) {
                const labels = response.data.map(item => ({
                    description: item.label,
                    score: item.score
                }));

                const { category, confidence, reasoning } = mapLabelsToCategory(labels);

                console.log(`[Hugging Face] Fallback success. Category: ${category}`);

                return {
                    category,
                    confidence,
                    reasoning: `Direct classification fallback: ${reasoning} (Model: ${fallbackModel})`,
                    provider: 'Hugging Face (Fallback)'
                };
            }

        } catch (error) {
            console.warn(`[Hugging Face] Fallback failed with ${endpoint}/${fallbackModel}:`, error.message);
            lastError = error;
        }
    }

    // If all fails
    const status = lastError?.response?.status || 'Unknown';
    const details = lastError?.response?.data ? JSON.stringify(lastError.response.data) : lastError?.message;

    return {
        category: "Unable to categorize",
        confidence: 0,
        reasoning: `All Hugging Face methods failed. Last error (${status}): ${details}`,
        provider: 'Hugging Face (Failed)'
    };
};

// ============= TOGETHER AI (Llama Vision) =============
const callTogetherAI = async (filePath, apiKey) => {
    console.log(`[Together AI] Starting analysis for ${filePath}`);

    // Read and encode image
    let imageContent = fs.readFileSync(filePath).toString('base64');
    imageContent = imageContent.replace(/^data:image\/\w+;base64,/, '');

    const url = "https://api.together.xyz/v1/chat/completions";

    const prompt = `Analyze this image carefully. Identify all objects, subjects, themes, colors, and mood. Then categorize it into EXACTLY ONE of these Adobe Stock categories: Animals, Buildings and Architecture, Business, Drinks, The Environment, States of Mind, Food, Graphic Resources, Hobbies and Leisure, Industry, Landscapes, Lifestyle, People, Plants and Flowers, Culture and Religion, Science, Social Issues, Sports, Technology, Transport, or Travel. Respond in this exact format:
CATEGORY: [category name]
CONFIDENCE: [0-100]
REASON: [detailed explanation]`;

    try {
        console.log("[Together AI] Sending request to Llama Vision model");
        const response = await axios.post(url, {
            model: "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo",
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageContent}` } }
                ]
            }],
            max_tokens: 500,
            temperature: 0.7
        }, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        const text = response.data.choices?.[0]?.message?.content;
        if (!text) throw new Error("No response from Together AI");

        console.log(`[Together AI] Response:`, text);

        // Parse response
        const categoryMatch = text.match(/CATEGORY:\s*(.+)/i);
        const confidenceMatch = text.match(/CONFIDENCE:\s*(\d+(?:\.\d+)?)/i);
        const reasonMatch = text.match(/REASON:\s*(.+)/si);

        let category = categoryMatch ? categoryMatch[1].trim() : "Unable to categorize";
        let confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) / 100 : 0.0;
        let reasoning = reasonMatch ? reasonMatch[1].trim() : "AI response unclear";

        // Validate category
        if (!ADOBE_CATEGORIES.includes(category)) {
            const match = ADOBE_CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase());
            category = match || "Unable to categorize";
        }

        return {
            category,
            confidence,
            reasoning,
            provider: 'Together AI'
        };

    } catch (error) {
        console.error("[Together AI] Error:", error.message);
        const status = error.response?.status || 'Unknown';
        const message = error.response?.data ? JSON.stringify(error.response.data) : error.message;

        return {
            category: "Unable to categorize",
            confidence: 0,
            reasoning: `Together AI Error (${status}): ${message}`,
            provider: 'Together AI (Failed)'
        };
    }
};

// ============= IMAGGA API =============
const callImaggaAPI = async (filePath, apiKey) => {
    console.log(`[Imagga] Starting analysis for ${filePath}`);

    try {
        // Imagga expects API Key and Secret in format "apikey:secret"
        if (!apiKey.includes(':')) {
            throw new Error("Invalid format. Imagga requires 'APIKey:APISecret' format. Get both from imagga.com/profile/api-keys");
        }

        // Read image file
        const imageBuffer = fs.readFileSync(filePath);
        const FormData = require('form-data');
        const form = new FormData();
        form.append('image', imageBuffer, {
            filename: 'image.jpg',
            contentType: 'image/jpeg'
        });

        console.log("[Imagga] Sending categorization request");
        const response = await axios.post(
            "https://api.imagga.com/v2/categories/personal_photos",
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    "Authorization": `Basic ${Buffer.from(apiKey).toString('base64')}`
                }
            }
        );

        const categories = response.data.result?.categories;
        if (!categories || categories.length === 0) {
            throw new Error("No categories returned from Imagga");
        }

        console.log(`[Imagga] Received categories:`, categories.slice(0, 5));

        // Map Imagga categories to Adobe Stock categories
        const mappedLabels = categories.map(cat => ({
            description: cat.name.en,
            score: cat.confidence / 100
        }));

        const { category, confidence, reasoning } = mapLabelsToCategory(mappedLabels);

        return {
            category,
            confidence,
            reasoning: `Imagga categorization: ${reasoning}`,
            provider: 'Imagga'
        };

    } catch (error) {
        console.error("[Imagga] Error:", error.message);
        const status = error.response?.status || 'Unknown';
        const message = error.response?.data ? JSON.stringify(error.response.data) : error.message;

        return {
            category: "Unable to categorize",
            confidence: 0,
            reasoning: `Imagga Error (${status}): ${message}`,
            provider: 'Imagga (Failed)'
        };
    }
};

// ============= IBM WATSON VISUAL RECOGNITION =============
const callIBMWatsonAPI = async (filePath, apiKey) => {
    console.log(`[IBM Watson] Starting analysis for ${filePath}`);

    try {
        // Watson expects API key in format: apikey:version_date
        // For simplicity, we'll assume user provides full API key with instance ID

        const imageContent = fs.readFileSync(filePath);
        const FormData = require('form-data');
        const form = new FormData();
        form.append('images_file', imageContent, { filename: 'image.jpg' });
        form.append('threshold', 0.1);
        form.append('features', 'objects');

        console.log("[IBM Watson] Sending request to Visual Recognition API");
        const response = await axios.post(
            `https://api.us-south.visual-recognition.watson.cloud.ibm.com/instances/${apiKey}/v4/analyze?version=2021-08-01`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    "Authorization": `Bearer ${apiKey}`
                }
            }
        );

        const objects = response.data.images?.[0]?.objects?.collections?.[0]?.objects;
        if (!objects || objects.length === 0) {
            throw new Error("No objects detected by IBM Watson");
        }

        console.log(`[IBM Watson] Detected objects:`, objects.slice(0, 5));

        // Map Watson objects to Adobe categories
        const mappedLabels = objects.map(obj => ({
            description: obj.object,
            score: obj.score
        }));

        const { category, confidence, reasoning } = mapLabelsToCategory(mappedLabels);

        return {
            category,
            confidence,
            reasoning: `IBM Watson detection: ${reasoning}`,
            provider: 'IBM Watson'
        };

    } catch (error) {
        console.error("[IBM Watson] Error:", error.message);
        const status = error.response?.status || 'Unknown';
        const message = error.response?.data ? JSON.stringify(error.response.data) : error.message;

        return {
            category: "Unable to categorize",
            confidence: 0,
            reasoning: `IBM Watson Error (${status}): ${message}`,
            provider: 'IBM Watson (Failed)'
        };
    }
};

// ============= HUGGING FACE INFERENCE ENDPOINTS (Updated) =============
const callHuggingFaceInference = async (filePath, apiKey) => {
    console.log(`[HF Inference] Starting analysis for ${filePath}`);

    // Use updated Inference Endpoints API
    const model = "nlpconnect/vit-gpt2-image-captioning";
    const url = `https://api-inference.huggingface.co/models/${model}`;

    try {
        const imageContent = fs.readFileSync(filePath);

        console.log(`[HF Inference] Sending request to ${model}`);
        const response = await axios.post(
            url,
            imageContent,
            {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/octet-stream"
                }
            }
        );

        const caption = response.data?.[0]?.generated_text;
        if (!caption) throw new Error("No caption generated");

        console.log(`[HF Inference] Generated caption: ${caption}`);

        // Convert caption to labels for categorization
        const words = caption.toLowerCase().split(/\s+/);
        const mappedLabels = words.map(word => ({
            description: word,
            score: 0.5
        }));

        const { category, confidence, reasoning } = mapLabelsToCategory(mappedLabels);

        return {
            category,
            confidence,
            reasoning: `Based on caption: "${caption}". ${reasoning}`,
            provider: 'Hugging Face Inference'
        };

    } catch (error) {
        console.error("[HF Inference] Error:", error.message);
        const status = error.response?.status || 'Unknown';
        const message = error.response?.data ? JSON.stringify(error.response.data) : error.message;

        return {
            category: "Unable to categorize",
            confidence: 0,
            reasoning: `HF Inference Error (${status}): ${message}`,
            provider: 'HF Inference (Failed)'
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
                } else if (keyObj.provider === 'Together AI') {
                    result = await callTogetherAI(filePath, keyObj.key);
                } else if (keyObj.provider === 'Imagga') {
                    result = await callImaggaAPI(filePath, keyObj.key);
                } else if (keyObj.provider === 'IBM Watson') {
                    result = await callIBMWatsonAPI(filePath, keyObj.key);
                } else if (keyObj.provider === 'Hugging Face Inference') {
                    result = await callHuggingFaceInference(filePath, keyObj.key);
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
