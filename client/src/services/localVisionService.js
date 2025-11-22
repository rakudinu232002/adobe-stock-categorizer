
// Adobe Stock Categories
const ADOBE_CATEGORIES = [
    "Animals", "Buildings and Architecture", "Business", "Drinks", "The Environment",
    "States of Mind", "Food", "Graphic Resources", "Hobbies and Leisure", "Industry",
    "Landscapes", "Lifestyle", "People", "Plants and Flowers", "Culture and Religion",
    "Science", "Social Issues", "Sports", "Technology", "Transport", "Travel"
];

// Keywords for specific detection groups
const KEYWORDS = {
    PEOPLE: ["person", "man", "woman", "boy", "girl", "child", "human", "face", "hair", "groom", "bride", "scuba diver", "player", "bikini", "maillot", "stole", "gown", "wig", "mask", "sunglasses", "suit", "academic gown", "lab coat", "uniform", "doctor", "nurse", "police", "soldier", "helmet", "cap", "hat"],
    OFFICE_TECH: ["laptop", "notebook", "computer", "monitor", "screen", "keyboard", "mouse", "desk", "office", "briefcase", "binder", "printer", "photocopier", "telephone", "phone", "smartphone", "tablet", "calculator", "projector"],
    FOOD: ["food", "vegetable", "fruit", "cucumber", "tomato", "salad", "meal", "dish", "cuisine", "cooking", "bread", "cake", "pizza", "burger", "meat", "fish", "soup", "coffee", "tea", "chocolate", "ice cream", "plate", "tray", "broccoli", "cauliflower", "zucchini", "squash", "pumpkin", "corn", "mushroom", "strawberry", "orange", "lemon", "banana", "apple", "grape", "pear", "pineapple", "pepper", "onion", "garlic", "potato", "carrot", "cabbage", "lettuce", "spinach", "bean", "pea", "nut", "seed", "grain", "rice", "pasta", "noodle", "egg", "cheese", "milk", "juice", "wine", "beer", "bakery", "dessert", "snack", "breakfast", "lunch", "dinner", "supper", "appetizer", "starter", "main", "course", "side", "drink", "beverage", "espresso", "latte", "cappuccino", "mocha", "soda", "cola", "water", "cocktail", "mocktail", "smoothie", "shake", "lemonade"],
    PLANTS: ["flower", "rose", "plant", "blossom", "bouquet", "petal", "bloom", "floral", "tree", "grass", "leaf", "garden", "pot", "vase", "daisy", "tulip", "orchid", "sunflower", "lily", "cactus", "palm", "fern", "moss", "mushroom", "fungus", "forest", "jungle", "wood", "log", "branch", "root", "stem", "bush", "shrub", "herb", "spice", "weed", "vine", "ivy", "clover", "bamboo", "reed", "seaweed", "algae", "coral"],
    ANIMALS: ["dog", "cat", "animal", "bird", "pet", "wildlife", "fish", "horse", "sheep", "cow", "pig", "chicken", "duck", "goose", "bear", "lion", "tiger", "elephant", "zebra", "monkey", "rabbit", "squirrel", "mouse", "rat", "hamster", "snake", "lizard", "frog", "turtle", "spider", "insect", "bee", "butterfly", "ant", "beetle", "terrier", "retriever", "hound", "spaniel", "corgi", "poodle", "husky", "shepherd", "beagle", "boxer", "bulldog", "dalmatian", "pug", "collie", "chihuahua", "wolf", "fox", "deer", "moose", "elk", "camel", "giraffe", "rhino", "hippo", "kangaroo", "koala", "panda", "whale", "dolphin", "shark", "eagle", "hawk", "parrot", "penguin", "owl", "swan", "flamingo", "peacock", "ostrich", "emu", "turkey", "rooster", "hen", "chick", "goat", "donkey", "mule", "buffalo", "bison", "yak", "llama", "alpaca", "seal", "walrus", "otter", "beaver", "raccoon", "skunk", "badger", "mole", "hedgehog", "bat", "crab", "lobster", "shrimp", "snail", "slug", "worm", "fly", "mosquito", "wasp", "hornet", "cricket", "grasshopper", "locust", "mantis", "dragonfly", "moth", "caterpillar", "centipede", "millipede", "scorpion", "tick", "mite", "flea", "louse"],
    LANDSCAPES: ["mountain", "landscape", "sky", "nature", "scenery", "valley", "alp", "volcano", "cliff", "coast", "beach", "ocean", "sea", "river", "lake", "forest", "park", "sand", "desert", "hill", "plain", "field", "meadow", "pasture", "swamp", "marsh", "bog", "wetland", "glacier", "iceberg", "canyon", "gorge", "ravine", "cave", "cavern", "waterfall", "stream", "creek", "brook", "pond", "pool", "lagoon", "bay", "gulf", "harbor", "port", "island", "peninsula", "cape", "headland", "point", "dune", "reef", "atoll", "archipelago", "cloud", "sun", "moon", "star", "sunrise", "sunset", "twilight", "dawn", "dusk", "night", "day", "weather", "storm", "rain", "snow", "wind", "fog", "mist", "haze", "smoke", "fire", "lightning", "thunder", "rainbow", "aurora"],
    TECHNOLOGY: ["computer", "phone", "tech", "device", "screen", "monitor", "keyboard", "mouse", "laptop", "tablet", "camera", "lens", "radio", "tv", "television", "speaker", "headphone", "microphone", "robot", "drone", "satellite", "rocket", "space", "science", "lab", "microscope", "telescope", "calculator", "clock", "watch", "battery", "charger", "cable", "wire", "plug", "socket", "switch", "button", "knob", "dial", "remote", "controller", "console", "game", "video", "audio", "internet", "web", "app", "software", "code", "data", "server", "cloud", "network", "wifi", "bluetooth", "usb", "hdmi", "vga", "dvd", "cd", "disk", "drive", "memory", "chip", "processor", "circuit", "board"]
};

let model = null;

export const loadModel = async () => {
    if (model) return model;

    try {
        console.log("Loading MobileNet model...");
        // Wait for global variable to be available
        if (!window.mobilenet) {
            throw new Error("MobileNet script not loaded. Please check your internet connection.");
        }

        model = await window.mobilenet.load();
        console.log("MobileNet model loaded successfully");
        return model;
    } catch (error) {
        console.error("Error loading MobileNet:", error);
        throw error;
    }
};

export const classifyImage = async (imageElement) => {
    try {
        if (!model) {
            await loadModel();
        }

        // Get top 5 predictions to have a broader context
        const predictions = await model.classify(imageElement, 5);
        console.log("Raw predictions:", predictions);

        if (!predictions || predictions.length === 0) {
            return {
                category: "Graphic Resources",
                confidence: 0,
                reasoning: "No objects detected by local model."
            };
        }

        // Collect all detected words from top predictions
        const detectedWords = new Set();
        predictions.forEach(p => {
            p.className.toLowerCase().split(/[\s,]+/).forEach(word => detectedWords.add(word));
        });

        console.log("Detected words:", Array.from(detectedWords));

        // Helper to check if any keyword from a list is present
        const hasKeyword = (list) => list.some(keyword => detectedWords.has(keyword));

        let bestCategory = "Graphic Resources";
        let reasoning = "";
        const topClass = predictions[0].className;
        const topProb = predictions[0].probability;

        // STRICT PRIORITY LOGIC

        // 1. PEOPLE & BUSINESS
        const hasPerson = hasKeyword(KEYWORDS.PEOPLE);
        const hasOfficeTech = hasKeyword(KEYWORDS.OFFICE_TECH);

        if (hasPerson) {
            if (hasOfficeTech) {
                bestCategory = "Business";
                reasoning = `Detected person (${topClass}) with office/tech elements. Mapped to "Business".`;
            } else {
                bestCategory = "People";
                reasoning = `Detected person/human element (${topClass}). Mapped to "People".`;
            }
        }
        // 2. FOOD
        else if (hasKeyword(KEYWORDS.FOOD)) {
            bestCategory = "Food";
            reasoning = `Detected food item (${topClass}). Mapped to "Food".`;
        }
        // 3. PLANTS AND FLOWERS
        else if (hasKeyword(KEYWORDS.PLANTS)) {
            bestCategory = "Plants and Flowers";
            reasoning = `Detected plant/flower (${topClass}). Mapped to "Plants and Flowers".`;
        }
        // 4. ANIMALS
        else if (hasKeyword(KEYWORDS.ANIMALS)) {
            bestCategory = "Animals";
            reasoning = `Detected animal (${topClass}). Mapped to "Animals".`;
        }
        // 5. LANDSCAPES
        else if (hasKeyword(KEYWORDS.LANDSCAPES)) {
            bestCategory = "Landscapes";
            reasoning = `Detected landscape element (${topClass}). Mapped to "Landscapes".`;
        }
        // 6. TECHNOLOGY (Only if no person detected)
        else if (hasKeyword(KEYWORDS.TECHNOLOGY)) {
            bestCategory = "Technology";
            reasoning = `Detected technology (${topClass}) without people. Mapped to "Technology".`;
        }
        // 7. DEFAULT / GRAPHIC RESOURCES
        else {
            bestCategory = "Graphic Resources";
            reasoning = `No specific category matched for "${topClass}". Defaulting to "Graphic Resources".`;
        }

        return {
            category: bestCategory,
            confidence: topProb,
            reasoning: reasoning,
            provider: "Local Device (TensorFlow.js)"
        };

    } catch (error) {
        console.error("Error classifying image locally:", error);
        throw error;
    }
};
