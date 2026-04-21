const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {Readable} = require("stream");

const authenticate = require("../middleware/auth");
const {
  BLOB_ENABLED,
  LOCAL_UPLOAD_DIR,
  blobPathFromUrl,
  deleteBlob,
  ensureLocalDir,
  fileBlobUrl,
  getPrivateBlob,
  listPrivateBlobs,
  putPrivateBlob,
  toBlobFilePath,
  toSafeFilename,
} = require("../storage");

const router = express.Router();

const UPLOAD_DIR = LOCAL_UPLOAD_DIR;
const FILES_DIR = path.join(UPLOAD_DIR, "files");

if (!BLOB_ENABLED) {
  ensureLocalDir(FILES_DIR);
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
];

const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, FILES_DIR),
  filename: (req, file, cb) => {
    const safeName = toSafeFilename(file.originalname);
    cb(null, `${req.userId}-${Date.now()}-${safeName}`);
  },
});

const fileUpload = multer({
  storage: BLOB_ENABLED ? multer.memoryStorage() : fileStorage,
  limits: {fileSize: 10 * 1024 * 1024},
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type"));
    }
    cb(null, true);
  },
});

router.post("/", authenticate, (req, res) => {
  fileUpload.single("file")(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({error: "File too large (10 MB max)"});
      }
      return res.status(400).json({error: err.message});
    }
    if (err) return res.status(400).json({error: err.message});
    if (!req.file) return res.status(400).json({error: "No file sent"});

    try {
      let filename;
      let url;

      if (BLOB_ENABLED) {
        const blob = await putPrivateBlob(
          toBlobFilePath(req.userId, req.file.originalname),
          req.file.buffer,
          req.file.mimetype,
        );
        filename = blob.pathname;
        url = fileBlobUrl(blob.pathname);
      } else {
        filename = req.file.filename;
        url = `/api/upload/files/${req.file.filename}`;
      }

      res.status(201).json({
        filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url,
      });
    } catch (uploadError) {
      console.error("File upload error:", uploadError);
      res.status(500).json({error: "Server error"});
    }
  });
});

router.get("/file", authenticate, async (req, res) => {
  const pathname = String(req.query.pathname || "");

  if (!pathname.startsWith(`files/${req.userId}/`)) {
    return res.status(403).json({error: "Unauthorized access"});
  }

  if (!BLOB_ENABLED) {
    return res.status(404).json({error: "File storage not enabled"});
  }

  try {
    const blob = await getPrivateBlob(pathname, req.headers["if-none-match"]);

    if (!blob?.body) {
      return res.status(404).json({error: "File not found"});
    }

    if (blob.contentType) {
      res.setHeader("Content-Type", blob.contentType);
    }
    if (blob.etag) {
      res.setHeader("ETag", blob.etag);
    }
    res.setHeader("Cache-Control", blob.cacheControl || "private, max-age=60");

    Readable.fromWeb(blob.body).pipe(res);
  } catch (blobError) {
    if (blobError?.status === 304) {
      return res.status(304).end();
    }
    console.error("File download error:", blobError);
    res.status(404).json({error: "File not found"});
  }
});

router.get("/files/:filename", authenticate, (req, res) => {
  if (BLOB_ENABLED) {
    return res.status(400).json({error: "Use the file query endpoint"});
  }

  const {filename} = req.params;
  const safeName = path.basename(filename);
  const filePath = path.join(FILES_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({error: "File not found"});
  }

  if (!safeName.startsWith(`${req.userId}-`)) {
    return res.status(403).json({error: "Unauthorized access"});
  }

  res.sendFile(filePath);
});

router.delete("/file", authenticate, async (req, res) => {
  if (!BLOB_ENABLED) {
    return res.status(400).json({error: "Blob storage not enabled"});
  }

  const pathname = String(req.query.pathname || "");

  if (!pathname.startsWith(`files/${req.userId}/`)) {
    return res.status(403).json({error: "Unauthorized access"});
  }

  try {
    await deleteBlob(pathname);
    return res.json({message: "File deleted"});
  } catch (blobError) {
    console.error("File deletion error:", blobError);
    return res.status(404).json({error: "File not found"});
  }
});

router.delete("/files/:filename", authenticate, async (req, res) => {
  if (BLOB_ENABLED) {
    return res.status(400).json({error: "Use the file query endpoint"});
  }

  const {filename} = req.params;
  const safeName = path.basename(filename);
  const filePath = path.join(FILES_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({error: "File not found"});
  }

  if (!safeName.startsWith(`${req.userId}-`)) {
    return res.status(403).json({error: "Unauthorized access"});
  }

  fs.unlink(filePath, (err) => {
    if (err) return res.status(500).json({error: "Error during deletion"});
    res.json({message: "File deleted"});
  });
});

router.get("/my-files", authenticate, async (req, res) => {
  try {
    if (BLOB_ENABLED) {
      const {blobs} = await listPrivateBlobs(`files/${req.userId}/`);
      const files = blobs
        .map((blob) => ({
          filename: blob.pathname,
          size: blob.size,
          url: fileBlobUrl(blob.pathname),
          createdAt: blob.uploadedAt,
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return res.json({files});
    }

    const files = fs
      .readdirSync(FILES_DIR)
      .filter((entry) => entry.startsWith(`${req.userId}-`))
      .map((entry) => {
        const stat = fs.statSync(path.join(FILES_DIR, entry));
        return {
          filename: entry,
          size: stat.size,
          url: `/api/upload/files/${entry}`,
          createdAt: stat.birthtime,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    return res.json({files});
  } catch (listError) {
    console.error("File listing error:", listError);
    res.status(500).json({error: "Erreur serveur"});
  }
});

module.exports = router;
