require('dotenv').config();
const express  = require('express');
const multer   = require('multer');
const nodemailer = require('nodemailer');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Static files serve karo (root folder se) ──────────────────────────────
app.use(express.static(__dirname));

// ── Multer — memory storage, 5MB limit, sirf pdf/doc/docx ─────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        const allowed = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, or DOCX files are allowed.'));
        }
    }
});

// ── Nodemailer transporter (Gmail SMTP) ───────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS   // Gmail App Password (16 characters)
    }
});

// ── POST /api/apply ───────────────────────────────────────────────────────
app.post('/api/apply', upload.single('cv'), async (req, res) => {
    try {
        const { fullName, email, phone, position, message } = req.body;
        const cv = req.file;

        // Basic server-side validation
        if (!fullName || !email || !phone || !position || !cv) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
        }

        // Build email
        const mailOptions = {
            from: `"PRO Careers" <${process.env.EMAIL_USER}>`,
            to: 'pakistanrecoveryoasis@gmail.com',
            subject: `New Job Application - ${position}`,
            html: `
                <div style="font-family:Poppins,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">
                    <div style="background:#043102;padding:24px 32px;">
                        <h2 style="color:#f9a825;margin:0;font-size:1.4rem;">New Job Application</h2>
                        <p style="color:#a7f3d0;margin:4px 0 0;font-size:0.9rem;">Pakistan Recovery Oasis — Careers</p>
                    </div>
                    <div style="padding:28px 32px;background:#fff;">
                        <table style="width:100%;border-collapse:collapse;font-size:0.95rem;">
                            <tr style="border-bottom:1px solid #f0f0f0;">
                                <td style="padding:10px 0;color:#888;width:140px;font-weight:600;">Full Name</td>
                                <td style="padding:10px 0;color:#2d2d2d;font-weight:700;">${fullName}</td>
                            </tr>
                            <tr style="border-bottom:1px solid #f0f0f0;">
                                <td style="padding:10px 0;color:#888;font-weight:600;">Email</td>
                                <td style="padding:10px 0;color:#2d2d2d;">${email}</td>
                            </tr>
                            <tr style="border-bottom:1px solid #f0f0f0;">
                                <td style="padding:10px 0;color:#888;font-weight:600;">Phone</td>
                                <td style="padding:10px 0;color:#2d2d2d;">${phone}</td>
                            </tr>
                            <tr style="border-bottom:1px solid #f0f0f0;">
                                <td style="padding:10px 0;color:#888;font-weight:600;">Position</td>
                                <td style="padding:10px 0;color:#0a870e;font-weight:700;">${position}</td>
                            </tr>
                            <tr>
                                <td style="padding:10px 0;color:#888;font-weight:600;vertical-align:top;">Message</td>
                                <td style="padding:10px 0;color:#2d2d2d;">${message || '<em style="color:#aaa;">No message provided</em>'}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="background:#f4f9f4;padding:14px 32px;font-size:0.8rem;color:#888;text-align:center;">
                        CV is attached to this email &bull; Pakistan Recovery Oasis &copy; ${new Date().getFullYear()}
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: cv.originalname,
                    content:  cv.buffer,
                    contentType: cv.mimetype
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Application submitted successfully!' });

    } catch (err) {
        console.error('Email send error:', err.message);
        return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});

// ── Multer error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File size must be under 5MB.' });
    }
    if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
});

// ── Start server ───────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`PRO server running on port ${PORT}`));
