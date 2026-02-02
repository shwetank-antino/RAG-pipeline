import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = "uploads";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if(!req.sessionId) {
            return cb(new Error("Session ID is missing"));
        }

        const sessionDir = path.join(uploadDir, req.sessionId);
        fs.mkdirSync(sessionDir, { recursive: true });
        cb(null, sessionDir);
    },

    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/\s+/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    }
})

const fileFilter = (req, file, cb) => {
    const isPdf = 
    file.mimetype === 'application/pdf' &&
    path.extname(file.originalname).toLowerCase() === '.pdf';

    if(!isPdf) {
        return cb(new Error("Only PDF files are allowed"), false);
    }

    cb(null, true);
}

export const upload = multer({ 
    storage,
    fileFilter,
    limits: {
        files: 10,
        fileSize: 10 * 1024 * 1024
    },
});