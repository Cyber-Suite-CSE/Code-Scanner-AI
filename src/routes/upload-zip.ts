import { Router, Request, Response } from "express";
import multer from "multer";
import { createCodeCleaner } from "../lib/code-cleaner";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// POST /api/upload-zip
router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const buffer = file.buffer;
    
    // Check if it is a zip (basic check)
    if (file.mimetype !== "application/zip" && 
        file.mimetype !== "application/x-zip-compressed" &&
        !file.originalname.endsWith(".zip")) {
        return res.status(400).json({ error: "Only .zip files are allowed" });
    }

    // Use CodeCleaner to extract and detect framework
    const cleaner = createCodeCleaner({
        stripFirstDirectory: false, // User uploads usually don't need this enforced, or maybe they do? 
                                    // Often user zips DO have a root folder. Let's auto-detect?
                                    // For now, let's assume standard zip behavior. CodeCleaner handles relative paths.
                                    // If the user zips a folder, it has a root. If they zip files, it doesn't.
                                    // The cleaner preserves paths.
        maxFileSize: 1024 * 1024, // 1MB text file limit
    });

    const result = await cleaner.extractFromZip(buffer);

    return res.json({
        success: true,
        ...result
    });

  } catch (error) {
    console.error("Error in /upload-zip:", error);
    return res.status(500).json({ error: "Internal server error during zip upload" });
  }
});

export default router;
