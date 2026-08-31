const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./data/uploads";
const resolvedUploadsDir = path.isAbsolute(UPLOADS_DIR)
  ? UPLOADS_DIR
  : path.join(process.cwd(), UPLOADS_DIR);

fs.mkdirSync(resolvedUploadsDir, { recursive: true });

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 15);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resolvedUploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    const randomName = crypto.randomBytes(16).toString("hex");
    cb(null, `${randomName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
});

module.exports = { upload, resolvedUploadsDir, MAX_UPLOAD_MB };
