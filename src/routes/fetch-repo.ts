import { Router, Request, Response } from "express";
import { createCodeCleaner } from "../lib/code-cleaner";

const router = Router();

// POST /api/fetch-repo
router.post("/", async (req: Request, res: Response) => {
  try {
    const { url, branch } = req.body;

    if (!url) {
      return res.status(400).json({ error: "GitHub URL is required" });
    }

    // Parse GitHub URL
    // Expected formats: https://github.com/owner/repo or https://github.com/owner/repo.git
    const cleanUrl = url.replace(/\.git$/, "");
    const parts = cleanUrl.split("/");
    const owner = parts[parts.length - 2];
    const repo = parts[parts.length - 1];

    if (!owner || !repo) {
      return res.status(400).json({ error: "Invalid GitHub URL format" });
    }

    // Determine branch (default to main or master if not provided)
    let targetBranch = branch;
    if (!targetBranch) {
        targetBranch = "main"; 
    }

    const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${targetBranch}.zip`;
    
    console.log(`Fetching repo from: ${zipUrl}`);

    const fetchRes = await fetch(zipUrl);

    if (!fetchRes.ok) {
        if (fetchRes.status === 404 && !branch) {
            // Try 'master' if 'main' failed and no branch was specified
            const masterUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/master.zip`;
            console.log(`'main' branch not found, trying 'master': ${masterUrl}`);
            const masterRes = await fetch(masterUrl);
            
            if (!masterRes.ok) {
                 return res.status(404).json({ error: "Repository or branch not found. Please check the URL and visibility." });
            }
            // Use the master response
            return handleZipResponse(masterRes, res);
        }
        return res.status(fetchRes.status).json({ error: `GitHub API error: ${fetchRes.statusText}` });
    }

    return handleZipResponse(fetchRes, res);

  } catch (error) {
    console.error("Error in /fetch-repo:", error);
    return res.status(500).json({ error: "Internal server error during repo fetch" });
  }
});

async function handleZipResponse(fetchRes: globalThis.Response, res: Response) {
    const arrayBuffer = await fetchRes.arrayBuffer();
    
    // Check size limit (e.g., 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (arrayBuffer.byteLength > MAX_SIZE) {
        return res.status(400).json({ error: "Repository is too large (max 50MB)" });
    }

    // Use CodeCleaner to extract and detect framework
    const cleaner = createCodeCleaner({
        stripFirstDirectory: true, // GitHub zips have a root folder
        maxFileSize: 1024 * 1024, // 1MB text file limit
    });

    const result = await cleaner.extractFromZip(arrayBuffer);

    return res.json({
        success: true,
        ...result
    });
}

export default router;
