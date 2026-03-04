import type { MiddlewareConfigFn } from "wasp/server";
import type { ChatbotUploadPdf } from "wasp/server/api";
import { HttpError } from "wasp/server";
import multer from "multer";
import { PDFParse } from "pdf-parse";

// ---------------------------------------------------------------------------
// Middleware — use multer for file upload (10MB limit)
// ---------------------------------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed") as any, false);
    }
  },
});

export const chatbotUploadMiddleware: MiddlewareConfigFn = (middlewareConfig) => {
  // Add multer middleware for single file upload
  middlewareConfig.set("multer", upload.single("file"));
  return middlewareConfig;
};

// ---------------------------------------------------------------------------
// PDF Upload handler
// ---------------------------------------------------------------------------

export const chatbotUploadPdf: ChatbotUploadPdf = async (req, res, context) => {
  try {
    if (!context.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const chatbotId = req.body?.chatbotId;
    if (!chatbotId) {
      res.status(400).json({ error: "chatbotId is required" });
      return;
    }

    // Verify chatbot ownership
    const chatbot = await context.entities.Chatbot.findUnique({
      where: { id: chatbotId },
    });
    if (!chatbot) {
      res.status(404).json({ error: "Chatbot not found" });
      return;
    }
    if (chatbot.userId !== context.user.id) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    // Parse PDF content using PDFParse v2 class API
    let extractedText = "";
    try {
      const parser = new PDFParse({ data: file.buffer });
      const data = await parser.getText();
      extractedText = data.text?.trim() || "";
      await parser.destroy();
    } catch (parseErr: any) {
      console.error("[PDF] Parse error:", parseErr);
      res.status(400).json({ error: "Failed to parse PDF. Make sure it contains readable text." });
      return;
    }

    if (extractedText.length < 10) {
      res.status(400).json({ error: "PDF contains too little text content." });
      return;
    }

    // Truncate to 8000 chars
    if (extractedText.length > 8000) {
      extractedText = extractedText.substring(0, 8000) + "\n[Content truncated]";
    }

    // Create ChatbotData record
    const record = await context.entities.ChatbotData.create({
      data: {
        chatbotId,
        userId: context.user.id,
        type: "pdf",
        typeValue: file.originalname || "document.pdf",
        content: extractedText,
        status: "waiting",
      },
    });

    res.status(200).json({
      success: true,
      id: record.id,
      filename: file.originalname,
      contentLength: extractedText.length,
    });
  } catch (err: any) {
    console.error("[PDF Upload] Error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
};
