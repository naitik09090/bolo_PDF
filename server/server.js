// server.js - Complete Backend with All Requirements
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// ================== MIDDLEWARE ==================
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

// ================== CREATE FOLDERS ==================
const folders = ['uploads', 'outputs'];
folders.forEach(folder => {
    const dir = path.join(__dirname, folder);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created folder: ${folder}`);
    }
});

// ================== MONGODB CONNECTION ==================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
// pdf_signature_db
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));

// ================== MONGODB SCHEMA ==================
const pdfAuditSchema = new mongoose.Schema({
    originalFilename: String,
    storedFilename: String,
    signedFilename: String,
    originalHash: {
        type: String,
        required: true,
        index: true
    },
    signedHash: {
        type: String,
        required: true
    },
    fields: [{
        type: String,
        label: String,
        page: Number,
        coordinates: {
            css: {
                x: Number,
                y: Number,
                width: Number,
                height: Number
            },
            pdf: {
                x: Number,
                y: Number,
                width: Number,
                height: Number
            }
        },
        value: String,
        hasImage: Boolean
    }],
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    signedAt: {
        type: Date,
        default: Date.now
    },
    ipAddress: String,
    userAgent: String
}, {
    timestamps: true
});

const PDFAudit = mongoose.model('PDFAudit', pdfAuditSchema);

// ================== MULTER CONFIGURATION ==================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files allowed!'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ================== UTILITY FUNCTIONS ==================

/**
 * Calculate SHA-256 hash of file
 */
function calculateFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

/**
 * Convert CSS coordinates to PDF coordinates
 * This is the CORE COORDINATE CONVERSION FUNCTION
 * 
 * EXPLANATION (Gujarati):
 * Browser માં coordinates Top-Left થી start થાય છે (CSS)
 * PDF માં coordinates Bottom-Left થી start થાય છે (PDF Points)
 * A4 PDF size: 595.28 x 841.89 points (72 DPI)
 * 
 * Conversion Logic:
 * 1. Calculate scale factor: PDF_SIZE / CONTAINER_SIZE
 * 2. Convert X: same direction, just scale
 * 3. Convert Y: flip direction (top-left to bottom-left)
 *    PDF_Y = PDF_HEIGHT - CSS_Y - ELEMENT_HEIGHT
 */
function convertCSSCoordinatesToPDF(field, containerWidth, containerHeight) {
    // Standard A4 PDF dimensions in points (72 DPI)
    const PDF_WIDTH = 595.28;
    const PDF_HEIGHT = 841.89;

    // Calculate scaling factors
    const scaleX = PDF_WIDTH / containerWidth;
    const scaleY = PDF_HEIGHT / containerHeight;

    // Convert coordinates
    const pdfCoordinates = {
        x: field.x * scaleX,
        y: PDF_HEIGHT - (field.y * scaleY) - (field.height * scaleY),
        width: field.width * scaleX,
        height: field.height * scaleY,
        page: field.page || 1
    };

    console.log('🔄 Coordinate Conversion:', {
        css: { x: field.x, y: field.y, width: field.width, height: field.height },
        pdf: pdfCoordinates,
        containerSize: { width: containerWidth, height: containerHeight },
        scale: { x: scaleX, y: scaleY }
    });

    return pdfCoordinates;
}

/**
 * Embed image with aspect ratio preservation
 * This ensures images fit within boxes without distortion
 */
async function embedImageWithAspectRatio(pdfDoc, page, imageData, box) {
    let embeddedImage;

    // Determine image type and embed
    if (imageData.includes('data:image/png')) {
        const imageBytes = Buffer.from(imageData.split(',')[1], 'base64');
        embeddedImage = await pdfDoc.embedPng(imageBytes);
    } else if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) {
        const imageBytes = Buffer.from(imageData.split(',')[1], 'base64');
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
    } else {
        throw new Error('Unsupported image format');
    }

    // Get image dimensions
    const imageDims = embeddedImage.scale(1);
    const imageAspectRatio = imageDims.width / imageDims.height;
    const boxAspectRatio = box.width / box.height;

    let finalWidth, finalHeight, offsetX = 0, offsetY = 0;

    // Calculate dimensions to fit within box while maintaining aspect ratio
    if (imageAspectRatio > boxAspectRatio) {
        // Image is wider than box
        finalWidth = box.width;
        finalHeight = box.width / imageAspectRatio;
        offsetY = (box.height - finalHeight) / 2;
    } else {
        // Image is taller than box
        finalHeight = box.height;
        finalWidth = box.height * imageAspectRatio;
        offsetX = (box.width - finalWidth) / 2;
    }

    // Draw image centered in box
    page.drawImage(embeddedImage, {
        x: box.x + offsetX,
        y: box.y + offsetY,
        width: finalWidth,
        height: finalHeight
    });

    console.log('🖼️ Image embedded with aspect ratio preserved:', {
        original: imageDims,
        box: box,
        final: { width: finalWidth, height: finalHeight },
        offset: { x: offsetX, y: offsetY }
    });
}

// ================== ROUTES ==================

/**
 * POST /api/pdf/sign-pdf
 * Main endpoint to sign PDF with fields
 */
app.post('/api/pdf/sign-pdf', upload.single('pdf'), async (req, res) => {
    try {
        console.log('\n📥 Received sign-pdf request');

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file uploaded'
            });
        }

        const { fields: fieldsJSON, originalHash } = req.body;
        const fields = JSON.parse(fieldsJSON);

        console.log('📄 PDF File:', req.file.filename);
        console.log('🔐 Original Hash (from client):', originalHash);
        console.log('📋 Fields to process:', fields.length);

        // Verify original hash
        const serverOriginalHash = calculateFileHash(req.file.path);
        console.log('🔐 Original Hash (calculated):', serverOriginalHash);

        if (originalHash !== serverOriginalHash) {
            console.warn('⚠️  Hash mismatch! Client:', originalHash, 'Server:', serverOriginalHash);
        }

        // Load the PDF
        const existingPdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();

        console.log('📖 PDF Pages:', pages.length);

        // Process each field
        for (const field of fields) {
            const page = pages[field.page - 1];
            if (!page) {
                console.warn(`⚠️  Page ${field.page} not found, skipping field`);
                continue;
            }

            const pdfCoords = field.pdfCoordinates;

            console.log(`\n✏️  Processing ${field.type} field on page ${field.page}`);

            // Handle different field types
            switch (field.type) {
                case 'text':
                    if (field.value) {
                        page.drawText(field.value, {
                            x: pdfCoords.x,
                            y: pdfCoords.y,
                            size: 12,
                            color: rgb(0, 0, 0)
                        });
                        console.log('✅ Text added:', field.value);
                    }
                    break;

                case 'date':
                    if (field.value) {
                        const formattedDate = new Date(field.value).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                        page.drawText(formattedDate, {
                            x: pdfCoords.x,
                            y: pdfCoords.y,
                            size: 12,
                            color: rgb(0, 0, 0)
                        });
                        console.log('✅ Date added:', formattedDate);
                    }
                    break;

                case 'signature':
                case 'image':
                    if (field.imageData) {
                        await embedImageWithAspectRatio(pdfDoc, page, field.imageData, pdfCoords);
                        console.log('✅ Image/Signature embedded');
                    }
                    break;

                case 'radio':
                    // Draw radio button circle
                    page.drawCircle({
                        x: pdfCoords.x + pdfCoords.width / 2,
                        y: pdfCoords.y + pdfCoords.height / 2,
                        size: pdfCoords.width / 2,
                        borderColor: rgb(0.2, 0.2, 0.2),
                        borderWidth: 2
                    });
                    console.log('✅ Radio button drawn');
                    break;

                default:
                    console.warn('⚠️  Unknown field type:', field.type);
            }
        }

        // Save the signed PDF
        const signedPdfBytes = await pdfDoc.save();
        const signedFilename = `signed-${Date.now()}-${req.file.originalname}`;
        const signedPath = path.join(__dirname, 'outputs', signedFilename);
        fs.writeFileSync(signedPath, signedPdfBytes);

        // Calculate signed PDF hash
        const signedHash = calculateFileHash(signedPath);
        console.log('🔐 Signed Hash:', signedHash);

        // Store audit trail in MongoDB
        const auditRecord = new PDFAudit({
            originalFilename: req.file.originalname,
            storedFilename: req.file.filename,
            signedFilename: signedFilename,
            originalHash: serverOriginalHash,
            signedHash: signedHash,
            fields: fields.map(f => ({
                type: f.type,
                label: f.label,
                page: f.page,
                coordinates: {
                    css: { x: f.x, y: f.y, width: f.width, height: f.height },
                    pdf: f.pdfCoordinates
                },
                value: f.value,
                hasImage: !!f.imageData
            })),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        await auditRecord.save();
        console.log('💾 Audit record saved to MongoDB:', auditRecord._id);

        // Delete original uploaded file
        fs.unlinkSync(req.file.path);
        console.log('🗑️  Original file deleted');

        // Send response
        res.json({
            success: true,
            message: 'PDF signed successfully',
            signedPdfUrl: `http://localhost:${PORT}/outputs/${signedFilename}`,
            originalHash: serverOriginalHash,
            signedHash: signedHash,
            auditId: auditRecord._id,
            fieldsProcessed: fields.length
        });

        console.log('✅ Sign-PDF request completed\n');

    } catch (error) {
        console.error('❌ Error signing PDF:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/pdf/audit/:auditId
 * Get audit trail for a signed document
 */
app.get('/api/pdf/audit/:auditId', async (req, res) => {
    try {
        const audit = await PDFAudit.findById(req.params.auditId);
        if (!audit) {
            return res.status(404).json({
                success: false,
                error: 'Audit record not found'
            });
        }

        res.json({
            success: true,
            audit: audit
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/pdf/verify/:hash
 * Verify document by hash
 */
app.get('/api/pdf/verify/:hash', async (req, res) => {
    try {
        const audit = await PDFAudit.findOne({
            $or: [
                { originalHash: req.params.hash },
                { signedHash: req.params.hash }
            ]
        });

        if (!audit) {
            return res.status(404).json({
                success: false,
                verified: false,
                message: 'Document not found in audit trail'
            });
        }

        res.json({
            success: true,
            verified: true,
            audit: {
                originalHash: audit.originalHash,
                signedHash: audit.signedHash,
                signedAt: audit.signedAt,
                fieldsCount: audit.fields.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/pdf/audits
 * Get all audit records
 */
app.get('/api/pdf/audits', async (req, res) => {
    try {
        const audits = await PDFAudit.find()
            .sort({ signedAt: -1 })
            .limit(50);

        res.json({
            success: true,
            count: audits.length,
            audits: audits
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'PDF Signature Engine Backend',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'PDF Signature Engine API - BoloForms Assignment',
        version: '1.0.0',
        endpoints: {
            signPDF: 'POST /api/pdf/sign-pdf',
            getAudit: 'GET /api/pdf/audit/:auditId',
            verifyHash: 'GET /api/pdf/verify/:hash',
            getAllAudits: 'GET /api/pdf/audits',
            health: 'GET /health'
        }
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({
        success: false,
        error: err.message
    });
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(70));
    console.log(`🚀 PDF Signature Engine Backend Running`);
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}`);
    console.log('='.repeat(70) + '\n');
});

module.exports = app;