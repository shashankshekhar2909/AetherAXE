import express from "express";
import path from "path";
import net from "node:net";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import multer from "multer";
import * as pdfImport from "pdf-parse";
const pdf = ((pdfImport as any).default || pdfImport) as any;
import mammoth from "mammoth";
import * as xlsx from "xlsx";
import AdmZip from "adm-zip";
import mime from "mime-types";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const MAX_RAW_INPUT_CHARS = 500_000;
const REQUEST_TIMEOUT_MS = 20_000;
const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  ".pdf", ".docx", ".xlsx", ".xls", ".csv", ".zip", ".txt", ".md", ".jpg", ".jpeg", ".png",
]);

// Configuration for Multer memory uploads (max 30MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

// JSON and URL-encoded body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
}

function parseNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseAdvancedOptions(optionsRaw: unknown) {
  const defaults = {
    preserveTables: true,
    aiCleanupLevel: "standard",
    ocrFallback: true,
    simulateJsRendering: false,
    excludeNavAndFooters: true,
    generateEmbeddings: true,
    chunkingStrategy: "semantic",
    chunkSize: 500,
    chunkOverlap: 50,
  } as const;

  if (!optionsRaw) {
    return { ...defaults };
  }

  let parsed: any = {};
  try {
    parsed = typeof optionsRaw === "string" ? JSON.parse(optionsRaw) : optionsRaw;
  } catch {
    throw new Error("Invalid options payload. Expected valid JSON object.");
  }

  const validCleanupLevels = new Set(["none", "conservative", "standard", "aggressive"]);
  const validChunking = new Set(["none", "semantic", "heading", "token"]);

  return {
    preserveTables: parseBoolean(parsed.preserveTables, defaults.preserveTables),
    aiCleanupLevel: validCleanupLevels.has(parsed.aiCleanupLevel) ? parsed.aiCleanupLevel : defaults.aiCleanupLevel,
    ocrFallback: parseBoolean(parsed.ocrFallback, defaults.ocrFallback),
    simulateJsRendering: parseBoolean(parsed.simulateJsRendering, defaults.simulateJsRendering),
    excludeNavAndFooters: parseBoolean(parsed.excludeNavAndFooters, defaults.excludeNavAndFooters),
    generateEmbeddings: parseBoolean(parsed.generateEmbeddings, defaults.generateEmbeddings),
    chunkingStrategy: validChunking.has(parsed.chunkingStrategy) ? parsed.chunkingStrategy : defaults.chunkingStrategy,
    chunkSize: parseNumber(parsed.chunkSize, defaults.chunkSize, 50, 2000),
    chunkOverlap: parseNumber(parsed.chunkOverlap, defaults.chunkOverlap, 0, 500),
  };
}

function isPrivateIPv4(ip: string): boolean {
  return ip.startsWith("10.") ||
    ip.startsWith("127.") ||
    ip.startsWith("169.254.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

function isUnsafeHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (net.isIP(host) === 4 && isPrivateIPv4(host)) return true;
  if (net.isIP(host) === 6 && (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80"))) return true;
  return false;
}

function validateOutboundUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL format.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Unsupported URL protocol. Only http/https are allowed.");
  }
  if (isUnsafeHost(parsed.hostname)) {
    throw new Error("Unsafe target host is not allowed.");
  }
  return parsed;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Lazy initialization helper for Gemini SDK client.
 * Strictly checks process.env.GEMINI_API_KEY as per structural constraints.
 */
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY is missing or unconfigured. Please configure it in Settings > Secrets.");
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// 1. Health Status check
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    time: new Date().toISOString(),
    capabilities: ["URL_EXTRACT", "FILE_EXTRACT", "AI_CLEANUP", "RAG_CHUNKER", "EMBEDDINGS"],
  });
});

/**
 * Internal URL Scrapper Utility.
 * Uses realistic browser headers to pull HTML contents.
 */
async function scrapeUrlHTML(url: string): Promise<{ html: string; contentType: string }> {
  const response = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP network request failed with status code ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const html = await response.text();
  return { html, contentType };
}

/**
 * Helper to strip non-readable clutter (script, style, inline SVG paths)
 * to prevent inflating context tokens while preserving content elements.
 */
function cleanHTMLNoise(html: string): string {
  let cleaned = html;
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  cleaned = cleaned.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "[Icon/SVG]");
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, ""); // strip comments
  return cleaned;
}

/**
 * Parsing dispatching core
 */
app.post("/api/extract", upload.single("file"), async (req, res) => {
  try {
    const { url, options: optionsRaw } = req.body;
    const options = parseAdvancedOptions(optionsRaw);

    let rawText = "";
    let fileType = "html";
    let isWebScrape = false;
    let targetSource = "";

    // A. URL Handling Branch
    if (url) {
      const validatedUrl = validateOutboundUrl(url);
      targetSource = validatedUrl.toString();
      
      // Check if file extension suggests downloadable document
      const ext = path.extname(validatedUrl.pathname).toLowerCase();
      
      if (ext === ".pdf" || ext === ".docx" || ext === ".xlsx" || ext === ".xls" || ext === ".csv" || ext === ".zip") {
        isWebScrape = false;
        // Download document
        const downBuffer = await fetchWithTimeout(validatedUrl.toString()).then(r => {
          if (!r.ok) throw new Error(`Failed to download document: status ${r.status}`);
          return r.arrayBuffer();
        });
        const buffer = Buffer.from(downBuffer);
        const { text, type } = await parseDocumentBuffer(buffer, ext, url);
        rawText = text;
        fileType = type;
      } else if (validatedUrl.hostname.includes("youtube.com") || validatedUrl.hostname.includes("youtu.be")) {
        // Handle specialized YouTube search/grounding summary
        isWebScrape = true;
        fileType = "youtube";
        rawText = `YouTube video metadata analysis requested for: ${url}`;
      } else {
        // Standard Web Scraping
        isWebScrape = true;
        const { html, contentType } = await scrapeUrlHTML(validatedUrl.toString());
        if (contentType.includes("application/pdf") || url.endsWith(".pdf")) {
          const downBuffer = Buffer.from(html, "binary");
          const { text, type } = await parseDocumentBuffer(downBuffer, ".pdf", url);
          rawText = text;
          fileType = type;
          isWebScrape = false;
        } else {
          rawText = cleanHTMLNoise(html);
          fileType = "html";
        }
      }
    } 
    // B. Direct File Upload Branch
    else if (req.file) {
      targetSource = req.file.originalname;
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
        return res.status(400).json({ error: "Unsupported file type." });
      }
      const { text, type } = await parseDocumentBuffer(req.file.buffer, ext, req.file.originalname);
      rawText = text;
      fileType = type;
    } else {
      return res.status(400).json({ error: "Either a web target URL or a file upload is required." });
    }

    // Initialize Gemini Core SDK
    const ai = getGeminiClient();

    // Setup systemic cleanup instruction
    const systemInstruction = `You are a world-class Document Extraction engine operating in 2026.
Your mandate is to cleanly extract readable Markdown content and structured metadata from raw text/HTML feeds.
Remove navbars, sidebars, header noise, footer links, ads, cookie popups, and non-article content.
Normalize messy headers. Ensure a correct heading hierarchy starts from # (Title) and increments gracefully (##, ###).
Always preserve visual elements such as detailed code blocks with languages, list categories, hyperlinks, images, footnotes, and full table grids.
Analyze document contents and output exact structured JSON containing:
1. title: Human-centric title of the website or file content.
2. author: Name of authors or organizations, return "Unknown" if missing.
3. date: Original publication date, formatted "YYYY-MM-DD", fallback to "Unknown".
4. summary: High-fidelity executive paragraph summarizing the entire contents.
5. tags: Up to 6 key subject tags.
6. entities: Core persons, products, locations, organizations, or metrics cited.
7. confidenceScore: Out of 1.0 (float reflecting clean density).
8. markdown: Elegant, absolute, clean article markdown representing the document, healing all formatting.
9. toc: Logical Table of Contents headers hierarchy with level, text, and anchor references.
10. chunks: Array of logical paragraphs split semantically. Include full headingContext (breadcrumbs tracking current headers) and exact token counts for each chunk limit.

For YouTube targets: use search/grounding context to summarize, listing real transcript timeline segments or description highlights as markdown structure.
Ensure JSON format is strictly parsed. Do not truncate markdown code blocks. Always return correct JSON keys.`;

    const promptMessage = `
    Source Source: ${targetSource}
    File Type context: ${fileType}
    Scrape Level: ${isWebScrape ? "Web Browser Crawl" : "Buffered Binary Parser"}
    Advanced Options: ${JSON.stringify(options)}

    Raw Input Source Stream (Length: ${rawText.length}):
    -------------------
    ${rawText.slice(0, MAX_RAW_INPUT_CHARS)} // Safe guard slice to fit the token cap comfortably
    -------------------
    `;

    // Process using main model of choice
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptMessage,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
            date: { type: Type.STRING },
            summary: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            entities: { type: Type.ARRAY, items: { type: Type.STRING } },
            confidenceScore: { type: Type.NUMBER },
            markdown: { type: Type.STRING },
            toc: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.INTEGER },
                  text: { type: Type.STRING },
                  anchor: { type: Type.STRING }
                },
                required: ["level", "text", "anchor"]
              }
            },
            chunks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  headingContext: { type: Type.ARRAY, items: { type: Type.STRING } },
                  content: { type: Type.STRING },
                  tokenCount: { type: Type.INTEGER }
                },
                required: ["id", "headingContext", "content", "tokenCount"]
              }
            }
          },
          required: ["title", "author", "date", "summary", "tags", "entities", "confidenceScore", "markdown", "toc", "chunks"]
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Received empty content generation response from Gemini.");
    }

    let compiledResult: any;
    try {
      compiledResult = JSON.parse(outputText.trim());
    } catch {
      throw new Error("Model returned non-JSON output. Please retry.");
    }
    
    // Attempt building real chunk embeddings if requested
    if (options.generateEmbeddings && compiledResult.chunks) {
      try {
        const embedLimit = compiledResult.chunks.slice(0, 10); // embed first 10 chunks to avoid quota limits
        for (const ch of embedLimit) {
          try {
            const embRes = (await ai.models.embedContent({
              model: "gemini-embedding-2-preview",
              contents: ch.content,
            })) as any;
            const embedVal = embRes.embedding || embRes.embeddings;
            if (embedVal?.values) {
              ch.embedding = embedVal.values.slice(0, 32); // return compressed dimensions to avoid heavy payloads
            }
          } catch {
            ch.embedding = null;
          }
        }
        
        // Mark remaining chunks as non-embedded to avoid fake vectors.
        for (let i = 10; i < compiledResult.chunks.length; i++) {
          compiledResult.chunks[i].embedding = null;
        }
      } catch (err) {
        console.warn("Embeddings pipeline warning:", err);
      }
    }

    // Format perfect return payload
    const finalPayload = {
      id: Math.random().toString(36).substr(2, 9),
      sourceType: url ? "url" : "file",
      originalSource: targetSource,
      status: "success",
      metadata: {
        title: compiledResult.title,
        author: compiledResult.author,
        date: compiledResult.date,
        sourceUrl: url || undefined,
        summary: compiledResult.summary,
        tags: compiledResult.tags,
        entities: compiledResult.entities,
        confidenceScore: compiledResult.confidenceScore,
        contentType: fileType,
        wordCount: compiledResult.markdown.split(/\s+/).length,
        toc: compiledResult.toc,
      },
      markdown: compiledResult.markdown,
      chunks: compiledResult.chunks,
      assets: req.file ? [{
        id: "asset_1",
        type: fileType,
        originalName: req.file.originalname,
        sizeBytes: req.file.size
      }] : []
    };

    res.json(finalPayload);

  } catch (error: any) {
    console.error("Extraction error log:", error?.message || error);
    const message = typeof error?.message === "string" ? error.message : "Unknown server execution error";
    const status = /invalid|unsupported|unsafe|required/i.test(message) ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

/**
 * AI Summarize Endpoint.
 * Receives the cleaned markdown, queries Gemini to request a brief summary,
 * and returns it.
 */
app.post("/api/summarize", async (req, res) => {
  try {
    const { markdown } = req.body;
    if (!markdown) {
      return res.status(400).json({ error: "Markdown content is required for summarization." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are a world-class content summarizer.
Your goal is to digest the provided document markdown and produce a highly scannable, elegant, and action-oriented brief summary.
Focus on the primary value proposition, critical numbers, core concepts, or key deliverables in the text.
Use elegant Markdown bullet points or short, punchy paragraphs. Avoid conversational filler or meta-references like "This document is about".`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Markdown Document to Summarize:
-------------------
${markdown.slice(0, 300000)}
-------------------`,
      config: {
        systemInstruction,
        temperature: 0.25,
      },
    });

    const summaryText = response.text;
    if (!summaryText) {
      throw new Error("Received empty summarization response from Gemini.");
    }

    res.json({ summary: summaryText.trim() });
  } catch (error: any) {
    console.error("Summarization error log:", error?.message || error);
    res.status(500).json({ error: "Failed to generate brief summary." });
  }
});

/**
 * Handle direct external RAG Webhook ingestion deliveries
 */
app.post("/api/export/webhook", async (req, res) => {
  const { webhookUrl, authHeader, result } = req.body;
  if (!webhookUrl) {
    return res.status(400).json({ error: "RAG target webhook URL is required." });
  }

  try {
    const parsedWebhookUrl = validateOutboundUrl(webhookUrl);
    if (parsedWebhookUrl.protocol !== "https:") {
      return res.status(400).json({ error: "Only HTTPS webhook URLs are allowed." });
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authHeader) {
      if (typeof authHeader !== "string" || authHeader.length > 2048) {
        return res.status(400).json({ error: "Invalid authorization header." });
      }
      headers["Authorization"] = authHeader;
    }

    const response = await fetchWithTimeout(parsedWebhookUrl.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({
        event: "document_extraction_completed",
        timestamp: new Date().toISOString(),
        payload: result
      })
    });

    if (!response.ok) {
      throw new Error(`Target endpoint returned HTTP status code ${response.status}`);
    }

    res.json({ success: true, message: "Ingestion data delivered successfully!" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed delivery connection" });
  }
});

/**
 * Parsing Buffer depending on file signatures
 */
async function parseDocumentBuffer(buffer: Buffer, ext: string, filename: string): Promise<{ text: string; type: string }> {
  const normalizedExt = ext.toLowerCase();

  switch (normalizedExt) {
    case ".pdf": {
      try {
        const data = await pdf(buffer);
        return { text: data.text || `[PDF empty text] ${filename}`, type: "pdf" };
      } catch (err) {
        // Fallback or read as buffer base64 string
        return { text: `[Scanned/Encrypted PDF Buffer] Base64 signature: ${buffer.slice(0, 1000).toString("base64")}`, type: "pdf" };
      }
    }
    case ".docx": {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value || `[Word Document empty text] ${filename}`, type: "docx" };
    }
    case ".xlsx":
    case ".xls": {
      const workbook = xlsx.read(buffer, { type: "buffer" });
      let textSheet = "";
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const csvValue = xlsx.utils.sheet_to_csv(sheet);
        textSheet += `\nSheet: ${sheetName}\n-----------------\n${csvValue}\n`;
      });
      return { text: textSheet || `[Sheet empty text] ${filename}`, type: "excel" };
    }
    case ".csv": {
      const csvStr = buffer.toString("utf-8");
      return { text: csvStr, type: "csv" };
    }
    case ".zip": {
      const zip = new AdmZip(buffer);
      let zipTextConcat = "";
      const zipEntries = zip.getEntries();
      zipEntries.forEach(entry => {
        if (!entry.isDirectory && entry.getData) {
          const content = entry.getData().toString("utf-8");
          // compile only text based scripts
          const isText = /\.(txt|md|js|ts|json|py|html|css|java|cpp|yaml|yml|rs|go)$/i.test(entry.entryName);
          if (isText) {
            zipTextConcat += `\n\n=== File: ${entry.entryName} ===\n${content.slice(0, 10000)}`;
          }
        }
      });
      return { text: zipTextConcat || `[Zip unpacked archive metadata files] Count: ${zipEntries.length}`, type: "zip" };
    }
    case ".txt":
    case ".md": {
      return { text: buffer.toString("utf-8"), type: normalizedExt === ".md" ? "markdown" : "txt" };
    }
    case ".jpg":
    case ".jpeg":
    case ".png": {
      // Direct raw Image, return base64 for direct multimodal parsing
      return { text: `[Multimodal OCR Image Content] Base64 data: ${buffer.toString("base64")}`, type: "image" };
    }
    default:
      // Fallback
      return { text: buffer.toString("utf-8"), type: "txt" };
  }
}

/**
 * Express Fullstack Server launch flow
 */
async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Fullstack Extraction Core] server running beautifully on port ${PORT}`);
  });
}

startServer();
