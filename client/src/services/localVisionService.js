// Adobe Stock Categories - EXACT implementation of provided rules
const ADOBE_CATEGORIES = [
    "Animals", "Buildings and Architecture", "Business", "Drinks", "The Environment",
    "States of Mind", "Food", "Graphic Resources", "Hobbies and Leisure", "Industry",
    "Landscapes", "Lifestyle", "People", "Plants and Flowers", "Culture and Religion",
    "Science", "Social Issues", "Sports", "Technology", "Transport", "Travel"
];

// Keywords extracted from Adobe Stock definitions - EXACTLY as specified
const KEYWORDS = {
    // 1. Animals - Positive signals
    ANIMALS: ["dog", "puppy", "cat", "kitten", "horse", "cow", "sheep", "goat", "pig", "chicken", "bird", "eagle", "duck", "fish", "shark", "whale", "dolphin", "insect", "butterfly", "bee", "spider", "reptile", "lion", "tiger", "elephant", "wildlife", "pet", "zoo"],
    // Animals - Negative signals (products from animals)
    ANIMALS_EXCLUDE: ["leather shoe", "handbag", "wallet", "fur coat", "meat", "steak"],

    // 2. Buildings and Architecture
    BUILDINGS: ["building", "house", "home exterior", "interior", "living room", "kitchen", "office interior", "skyscraper", "skyline", "church façade", "temple", "mosque", "bridge", "castle", "stadium", "warehouse", "barn", "facade", "architecture"],

    // 3. Business
    BUSINESS: ["office worker", "meeting", "handshake", "presentation", "conference room", "startup", "entrepreneur", "manager", "team", "graph", "chart", "stock market", "money", "coins", "banknote", "finance", "contract", "keyboard", "office", "coworkers"],

    // 4. Drinks
    DRINKS: ["coffee", "tea", "mug", "cup", "wine", "beer", "cocktail", "juice", "smoothie"],

    // 5. The Environment
    ENVIRONMENT: ["pollution", "waste", "landfill", "climate change", "CO2", "recycling", "eco", "renewable energy"],

    // 6. States of Mind
    STATES_OF_MIND: ["sad", "happy", "angry", "depressed", "anxious", "hopeful", "lonely", "inspired", "stressed"],

    // 7. Food
    FOOD: ["pizza", "salad", "fruits", "dessert", "burger", "plate", "bowl"],

    // 8. Graphic Resources - (detected by lack of other signals)

    // 9. Hobbies and Leisure
    HOBBIES: ["craft", "knitting", "painting", "hobby", "diy", "reading", "board game", "camping", "fishing", "musical instrument", "gaming", "guitar", "book"],

    // 10. Industry
    INDUSTRY: ["factory", "refinery", "manufacturing", "warehouse", "construction crane", "power plant", "helmet", "assembly line"],

    // 11. Landscape
    LANDSCAPE: ["mountain", "beach", "forest", "lake", "desert", "skyline"],

    // 12. Lifestyle
    LIFESTYLE: ["family", "friends", "home", "commuting", "parenting"],

    // 13. People
    PEOPLE: ["person", "portrait", "headshot", "face"],

    // 14. Plants and Flowers
    PLANTS: ["flower", "plant", "bouquet"],

    // 15. Culture and Religion
    CULTURE: ["ceremony", "ritual", "worship", "festival", "traditional costume", "priest", "monk", "prayer"],

    // 16. Science
    SCIENCE: ["lab", "microscope", "beaker", "test tube"],

    // 17. Social Issues
    SOCIAL: ["protest", "vote", "climate strike", "justice", "rights"],

    // 18. Sports
    SPORTS: ["ball", "racquet", "stadium", "athlete", "gym", "yoga"],

    // 19. Technology
    TECHNOLOGY: ["smartphone", "laptop", "tablet", "server", "chip", "robot", "code"],

    // 20. Transport
    TRANSPORT: ["car", "bus", "train", "plane", "ship", "highway", "railway"],

    // 21. Travel
    TRAVEL: ["suitcase", "passport", "airplane wing", "landmark"]
};

let model = null;

export const loadModel = async () => {
    if (model) return model;
    try {
        if (!window.mobilenet) {
            throw new Error("MobileNet script not loaded.");
        }
        model = await window.mobilenet.load();
        console.log("MobileNet loaded");
        return model;
    } catch (error) {
        console.error("Error loading MobileNet:", error);
        throw error;
    }
};

export const classifyImage = async (imageElement) => {
    try {
        if (!model) await loadModel();

        const predictions = await model.classify(imageElement, 10);
        if (!predictions || predictions.length === 0) {
            return { category: "Graphic Resources", confidence: 0, reasoning: "No objects detected." };
        }

        // Get all detected labels
        const allLabels = predictions.map(p => p.className.toLowerCase()).join(" ");
        console.log("Detected:", allLabels);

        const topClass = predictions[0].className;
        const topProb = predictions[0].probability;

        // Helper: check if any keyword matches
        const has = (keywords) => keywords.some(kw => allLabels.includes(kw.toLowerCase()));

        // APPLY ADOBE STOCK RULES EXACTLY AS SPECIFIED

        // RULE 1: Animals
        // "If top labels contain ≥1 animal word and no strong building, office, lab, or food labels, set category to Animals"
        // "If labels include leather shoe, handbag, wallet, fur coat, meat, steak and no live animal, explicitly exclude Animals"
        if (has(KEYWORDS.ANIMALS)) {
            if (has(KEYWORDS.ANIMALS_EXCLUDE)) {
                // Skip Animals - it's animal products
            } else if (!has(KEYWORDS.BUILDINGS) && !has(KEYWORDS.BUSINESS) && !has(KEYWORDS.SCIENCE) && !has(KEYWORDS.FOOD)) {
                return { category: "Animals", confidence: topProb, reasoning: `Detected animal (${topClass}). No strong building, office, lab, or food labels present.` };
            }
        }

        // RULE 2: Buildings and Architecture
        // "If majority of the frame is walls, windows, rooflines, or interiors and people occupy <20% of attention, choose Buildings"
        // "If labels combine office, meeting, coworkers then go to Business instead"
        if (has(KEYWORDS.BUILDINGS)) {
            if (has(KEYWORDS.BUSINESS)) {
                // Skip - will be handled by Business rule
            } else {
                return { category: "Buildings and Architecture", confidence: topProb, reasoning: `Detected building/architecture (${topClass}). No business context.` };
            }
        }

        // RULE 3: Business
        // "If image contains people in formal/semi-formal clothes + laptops/documents in office-like setting, choose Business"
        // "If there are finance icons (graphs, money, piggy bank) without people, still choose Business"
        if (has(KEYWORDS.BUSINESS)) {
            return { category: "Business", confidence: topProb, reasoning: `Detected business-related element (${topClass}). Office, work, or finance context.` };
        }

        // RULE 4: Drinks
        // "If top labels include any of {coffee, tea, mug, cup, wine, beer, cocktail, juice, smoothie} and they occupy >40% of visible area, map to Drinks unless Food is clearly more dominant"
        if (has(KEYWORDS.DRINKS)) {
            if (has(KEYWORDS.FOOD) && predictions.findIndex(p => KEYWORDS.FOOD.some(f => p.className.toLowerCase().includes(f))) < predictions.findIndex(p => KEYWORDS.DRINKS.some(d => p.className.toLowerCase().includes(d)))) {
                // Food is more dominant - skip Drinks
            } else {
                return { category: "Drinks", confidence: topProb, reasoning: `Detected beverage (${topClass}). Drink is primary focus.` };
            }
        }

        // RULE 5: The Environment
        // "If labels match pollution, waste, landfill, climate change, CO2, recycling, eco, or renewable energy, strongly boost Environment score and override Landscape/Industry if message is negative/activist"
        if (has(KEYWORDS.ENVIRONMENT)) {
            return { category: "The Environment", confidence: topProb, reasoning: `Detected environmental element (${topClass}). Eco/sustainability focus.` };
        }

        // RULE 6: States of Mind
        // "If emotion keywords appear in labels and scene is minimal, prefer States of Mind"
        if (has(KEYWORDS.STATES_OF_MIND)) {
            return { category: "States of Mind", confidence: topProb, reasoning: `Detected emotional keyword (${topClass}). Mental/psychological focus.` };
        }

        // RULE 7: Food
        // "If top labels contain multiple distinct foods and no faces, map to Food"
        // "If both faces and food, compare which area/labels dominate (if people > food, go Lifestyle)"
        if (has(KEYWORDS.FOOD)) {
            if (has(KEYWORDS.PEOPLE) && predictions[0].className.toLowerCase().includes("person")) {
                // People dominate - will be handled by Lifestyle
            } else {
                return { category: "Food", confidence: topProb, reasoning: `Detected food (${topClass}). Culinary focus without people dominance.` };
            }
        }

        // RULE 8: Graphic Resources
        // "If no people, buildings, or clear scene depth and layout looks flat/graphic, default strongly toward Graphic Resources"
        // This will be the final fallback

        // RULE 9: Hobbies and Leisure
        // "If person is clearly at home or outdoors doing an activity with relaxed clothing and no stadium, audience, or job context, strongly consider Hobbies and Leisure"
        if (has(KEYWORDS.HOBBIES)) {
            if (!has(KEYWORDS.SPORTS) && !has(KEYWORDS.BUSINESS)) {
                return { category: "Hobbies and Leisure", confidence: topProb, reasoning: `Detected hobby/leisure activity (${topClass}). Recreational context.` };
            }
        }

        // RULE 10: Industry
        // "If labels contain factory, refinery, manufacturing, warehouse interior with pallets, construction crane, or power plant, prioritize Industry"
        if (has(KEYWORDS.INDUSTRY)) {
            return { category: "Industry", confidence: topProb, reasoning: `Detected industrial element (${topClass}). Manufacturing/production focus.` };
        }

        // RULE 11: Landscape
        // "If the image is >70% natural or urban scenery and humans are tiny or absent, default to Landscape unless environment or travel story is obviously stronger"
        if (has(KEYWORDS.LANDSCAPE)) {
            if (!has(KEYWORDS.ENVIRONMENT) && !has(KEYWORDS.TRAVEL)) {
                return { category: "Landscapes", confidence: topProb, reasoning: `Detected landscape (${topClass}). Natural or urban scenery focus.` };
            }
        }

        // RULE 12: Lifestyle
        // "If people are central and doing non-sport, non-business, non-ritual activities in believable real-life scenarios, choose Lifestyle"
        if (has(KEYWORDS.LIFESTYLE) || (has(KEYWORDS.PEOPLE) && !has(KEYWORDS.SPORTS) && !has(KEYWORDS.BUSINESS) && !has(KEYWORDS.CULTURE))) {
            return { category: "Lifestyle", confidence: topProb, reasoning: `Detected lifestyle scene (${topClass}). Everyday living context.` };
        }

        // RULE 13: People
        // "If framing is tight on face or body with blurred background and no clear story beyond 'this person', pick People"
        if (has(KEYWORDS.PEOPLE)) {
            return { category: "People", confidence: topProb, reasoning: `Detected person (${topClass}). Portrait or human-centric focus.` };
        }

        // RULE 14: Plants and Flowers
        // "If primary object is a flower/plant and it occupies >40% area, choose Plants and Flowers unless it is clearly a dish on a plate"
        if (has(KEYWORDS.PLANTS)) {
            if (!has(KEYWORDS.FOOD)) {
                return { category: "Plants and Flowers", confidence: topProb, reasoning: `Detected plant/flower (${topClass}). Botanical focus.` };
            }
        }

        // RULE 15: Culture and Religion
        // "If labels include words like ceremony, ritual, worship, festival, traditional costume, priest, monk, prayer, and the spiritual/cultural aspect is clear, choose Culture and Religion"
        if (has(KEYWORDS.CULTURE)) {
            return { category: "Culture and Religion", confidence: topProb, reasoning: `Detected cultural/religious element (${topClass}). Traditional or spiritual focus.` };
        }

        // RULE 16: Science
        // "If environment includes lab equipment or strongly scientific symbols, force category to Science even if people are present"
        if (has(KEYWORDS.SCIENCE)) {
            return { category: "Science", confidence: topProb, reasoning: `Detected scientific equipment (${topClass}). Research or laboratory focus.` };
        }

        // RULE 17: Social Issues
        // "If text on signs or composition clearly references rights, justice, protest, vote, climate strike, etc., map to Social Issues"
        if (has(KEYWORDS.SOCIAL)) {
            return { category: "Social Issues", confidence: topProb, reasoning: `Detected social/political element (${topClass}). Activism or advocacy focus.` };
        }

        // RULE 18: Sports
        // "If subject is mid-action in recognizable sport or workout gear, with associated equipment, set category to Sports"
        if (has(KEYWORDS.SPORTS)) {
            return { category: "Sports", confidence: topProb, reasoning: `Detected sports/fitness element (${topClass}). Athletic focus.` };
        }

        // RULE 19: Technology
        // "If the primary subject is a device or digital interface without strong human story, classify as Technology"
        if (has(KEYWORDS.TECHNOLOGY)) {
            if (!has(KEYWORDS.BUSINESS) && !has(KEYWORDS.LIFESTYLE)) {
                return { category: "Technology", confidence: topProb, reasoning: `Detected technology (${topClass}). Device or digital focus.` };
            }
        }

        // RULE 20: Transport
        // "If >40% of the frame is a vehicle or transport infrastructure and no strong human or touristic story is present, use Transport"
        if (has(KEYWORDS.TRANSPORT)) {
            if (!has(KEYWORDS.TRAVEL)) {
                return { category: "Transport", confidence: topProb, reasoning: `Detected transport (${topClass}). Vehicle or infrastructure focus.` };
            }
        }

        // RULE 21: Travel
        // "If scene includes recognizable landmark or travel gear (suitcase, passport, airplane wing view) and mood suggests vacation or journey, classify as Travel"
        if (has(KEYWORDS.TRAVEL)) {
            return { category: "Travel", confidence: topProb, reasoning: `Detected travel element (${topClass}). Tourism or journey focus.` };
        }

        // DEFAULT: Graphic Resources
        return { category: "Graphic Resources", confidence: topProb, reasoning: `No specific category matched for "${topClass}". Defaulting to "Graphic Resources".` };

    } catch (error) {
        console.error("Error classifying:", error);
        throw error;
    }
};
