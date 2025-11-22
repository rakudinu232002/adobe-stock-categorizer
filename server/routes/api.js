const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const visionService = require('../services/visionService');

const fs = require('fs');
const os = require('os');

// Configure Multer for memory storage (Vercel compatible)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|tiff|bmp|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: File upload only supports the following filetypes - ' + filetypes));
    }
});

// Route to handle image upload and categorization
router.post('/categorize', upload.single('image'), async (req, res) => {
    let tempFilePath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }

        // Write buffer to temp file for visionService (Vercel compatible)
        const tempDir = os.tmpdir();
        const tempFileName = Date.now() + '-' + req.file.originalname;
        tempFilePath = path.join(tempDir, tempFileName);
        fs.writeFileSync(tempFilePath, req.file.buffer);

        // API keys should be passed in headers or body
        const apiKeys = JSON.parse(req.body.apiKeys || '[]');

        console.log(`[API] Received request for ${req.file.originalname}`);
        console.log(`[API] Received ${apiKeys.length} API keys`);
        apiKeys.forEach((k, i) => {
            console.log(`[API] Key ${i + 1}: Provider=${k.provider}, Key=${k.key ? k.key.substring(0, 5) + '...' : 'EMPTY'}`);
        });

        if (!apiKeys || apiKeys.length === 0) {
            console.warn("[API] No API keys provided in request!");
        }

        const result = await visionService.processImage(tempFilePath, apiKeys);

        res.json(result);

    } catch (error) {
        console.error('Categorization error:', error);
        res.status(500).json({ error: 'Failed to categorize image', details: error.message });
    } finally {
        // Clean up temp file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (cleanupError) {
                console.error("Failed to cleanup temp file:", cleanupError);
            }
        }
    }
});

module.exports = router;
