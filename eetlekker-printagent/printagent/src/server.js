#!/usr/bin/env node
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { loadConfig, saveConfig, CONFIG_PATH } = require("./config");
const { listPrinters, printPdfBuffer } = require("./printer");
const { buildPdf } = require("./receipt");

const VERSION = "1.0.0";

const app = express();
app.use(express.json({ limit: "1mb" }));

// ---------- CORS ----------
const STATIC_ORIGINS = new Set([
  "http://localhost",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1",
  "http://127.0.0.1:7777",
  "http://localhost:7777",
  "https://eetlekker.online",
  "https://www.eetlekker.online",
]);

const ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^https:\/\/([a-z0-9-]+\.)*lovable\.app$/i,
  /^https:\/\/([a-z0-9-]+\.)*lovableproject\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)*eetlekker\.online$/i,
];

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin / curl
  if (STATIC_ORIGINS.has(origin)) return true;
  return ORIGIN_PATTERNS.some((re) => re.test(origin));
}

app.use(
  cors({
    origin(origin, cb) {
      if (isAllowedOrigin(origin)) return cb(null, true);
      return cb(new Error(`Origin not allowed: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
  })
);

// ---------- Static admin/test page ----------
const publicDir = process.pkg
  ? path.join(__dirname, "..", "public")
  : path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// ---------- API ----------
app.get("/status", (_req, res) => {
  res.json({
    ok: true,
    app: "Eetlekker PrintAgent",
    version: VERSION,
    connected: true,
  });
});

app.get("/printers", async (_req, res) => {
  try {
    const printers = await listPrinters();
    res.json({ ok: true, printers });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/config", (_req, res) => {
  res.json({ ok: true, config: loadConfig(), path: CONFIG_PATH });
});

app.post("/config", (req, res) => {
  try {
    const next = saveConfig(req.body || {});
    res.json({ ok: true, config: next });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post("/print", async (req, res) => {
  try {
    const payload = req.body || {};
    const cfg = loadConfig();

    // Resolve target printer
    let printerName = (payload.printerName || "").trim();
    if (!printerName && payload.printerRole) {
      printerName = (cfg.printers[payload.printerRole] || "").trim();
    }
    if (!printerName) {
      // fall back to OS default printer (printPdfBuffer with no name uses it)
      const list = await listPrinters().catch(() => []);
      const def = list.find((p) => p.isDefault);
      if (def) printerName = def.name;
    }
    if (!printerName) {
      return res.status(400).json({ ok: false, error: "No printer specified and no default printer found" });
    }

    // Verify printer exists
    const installed = await listPrinters().catch(() => []);
    if (installed.length && !installed.some((p) => p.name === printerName)) {
      return res.status(404).json({ ok: false, error: `Printer not found: ${printerName}` });
    }

    payload._paperWidthMm = cfg.settings.paperWidth || 58;
    const pdf = await buildPdf(payload);
    await printPdfBuffer(pdf, printerName);

    res.json({ ok: true, message: "Printed successfully", printerName });
  } catch (err) {
    console.error("Print error:", err);
    res.status(500).json({ ok: false, error: err.message || "Print failed" });
  }
});

// ---------- Boot ----------
const cfg = loadConfig();
const PORT = Number(process.env.PORT || cfg.settings.port || 7777);

app.listen(PORT, "127.0.0.1", () => {
  console.log("");
  console.log("===========================================");
  console.log("  Eetlekker PrintAgent v" + VERSION);
  console.log("  Listening on http://127.0.0.1:" + PORT);
  console.log("  Config:  " + CONFIG_PATH);
  console.log("===========================================");
  console.log("");
});
