import express from "express";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import cors from "cors";
import multer from "multer";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5174; // Use a different port than Vite

app.use(cors());
app.use(express.json());

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory for temp uploads and DZI output
const UPLOAD_DIR = path.join(__dirname, "uploads");
const DZI_DIR = path.join(__dirname, "public", "tiles", "uploaded");
const METADATA_FILE = path.join(__dirname, "uploads", "metadata.json");

// Ensure directories exist
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DZI_DIR, { recursive: true });

// Multer for chunk upload
const upload = multer({ dest: UPLOAD_DIR });

// Helper function to save metadata
function saveMetadata(imageData) {
  let metadata = [];
  if (fs.existsSync(METADATA_FILE)) {
    try {
      metadata = JSON.parse(fs.readFileSync(METADATA_FILE, "utf8"));
    } catch (err) {
      console.error("Error reading metadata file:", err);
      metadata = [];
    }
  }
  metadata.push({
    ...imageData,
    uploadedAt: new Date().toISOString(),
  });
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

// Get all uploaded images metadata
app.get("/images/uploaded", (req, res) => {
  if (fs.existsSync(METADATA_FILE)) {
    try {
      const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, "utf8"));
      res.json(metadata);
    } catch (err) {
      console.error("Error reading metadata:", err);
      res.json([]);
    }
  } else {
    res.json([]);
  }
});

// 1. Start upload: get uploadId
app.post("/upload/init", (req, res) => {
  // Generate a simple uploadId (timestamp)
  const uploadId = Date.now().toString();
  res.json({ uploadId });
});

// 2. Receive chunk
app.post("/upload/chunk", upload.single("chunk"), (req, res) => {
  const { uploadId, chunkIndex } = req.body;
  const chunkPath = path.join(UPLOAD_DIR, `${uploadId}.${chunkIndex}`);
  fs.renameSync(req.file.path, chunkPath);
  res.json({ success: true });
});

// 3. Complete upload, assemble chunks, run Sharp
app.post("/upload/complete", async (req, res) => {
  const { uploadId, totalChunks, filename } = req.body;
  const ext = path.extname(filename).toLowerCase();
  const baseName = path.basename(filename, ext); // <--- file name without extension

  const allowed = [".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp"];
  if (!allowed.includes(ext)) {
    return res.status(400).json({ error: "Unsupported file type." });
  }

  // Assemble chunks
  const assembledPath = path.join(UPLOAD_DIR, `${uploadId}_assembled${ext}`);
  const outStream = fs.createWriteStream(assembledPath);
  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(UPLOAD_DIR, `${uploadId}.${i}`);
      if (!fs.existsSync(chunkPath)) throw new Error("Missing chunk " + i);
      const data = fs.readFileSync(chunkPath);
      outStream.write(data);
      fs.unlinkSync(chunkPath); // Clean up chunk
    }
    outStream.end();
    await new Promise((resolve) => outStream.on("finish", resolve));
  } catch (err) {
    return res.status(500).json({ error: "Failed to assemble chunks." });
  }

  // DZI output path uses uploaded file name
  const dziOut = path.join(DZI_DIR, baseName);

  try {
    await sharp(assembledPath, { limitInputPixels: false })
      .tile({
        size: 256,
        overlap: 2,
        container: "fs",
        layout: "dz",
      })
      .toFile(dziOut);

    fs.unlinkSync(assembledPath); // Clean up assembled file

    // Create full URL for the DZI file
    const dziUrl = `http://localhost:${PORT}/tiles/uploaded/${baseName}.dzi`;

    const imageData = {
      dziBaseName: baseName,
      dziPath: dziUrl,
      originalFilename: filename,
      uploadId,
    };

    // Save metadata for persistence
    saveMetadata(imageData);

    res.json({
      success: true,
      dziPath: dziUrl,
      dziBaseName: baseName,
    });
  } catch (err) {
    fs.unlinkSync(assembledPath);
    return res
      .status(500)
      .json({ error: "DZI generation failed: " + err.message });
  }
});

// Serve static files (for DZI tiles)
app.use("/tiles", express.static(path.join(__dirname, "public", "tiles")));

app.listen(PORT, () => {
  console.log(` Uploader server running on http://localhost:${PORT}`);
  console.log(` Tiles directory: ${DZI_DIR}`);
  console.log(` Upload directory: ${UPLOAD_DIR}`);
});
