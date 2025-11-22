const axios = require('axios');

const models = [
    "Salesforce/blip-image-captioning-base"
];

const endpoints = [
    "https://api-inference.huggingface.co/models",
    "https://router.huggingface.co/models",
    "https://router.huggingface.co/hf-inference/models"
];

async function check() {
    for (const endpoint of endpoints) {
        for (const model of models) {
            const url = `${endpoint}/${model}`;
            console.log(`Checking ${url}...`);
            try {
                // We expect 401 if the endpoint exists but we have no key
                // We expect 404 if the endpoint is wrong
                // We expect 410 if the endpoint is deprecated
                const response = await axios.post(url, { inputs: "test" }, { validateStatus: () => true });
                console.log(`Status: ${response.status}`);
                console.log(`Data:`, JSON.stringify(response.data).substring(0, 100));
            } catch (error) {
                console.log(`Error: ${error.message}`);
            }
            console.log('---');
        }
    }
}

check();
