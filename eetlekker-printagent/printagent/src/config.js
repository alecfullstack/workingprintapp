const fs = require("fs");
const path = require("path");

// When packaged with pkg, __dirname points inside the snapshot.
// Keep config.json next to the executable so users can edit it.
const baseDir = process.pkg
  ? path.dirname(process.execPath)
  : path.join(__dirname, "..");

const CONFIG_PATH = path.join(baseDir, "config.json");

const DEFAULT_CONFIG = {
  printers: { customer: "", kitchen: "", bar: "", hookah: "" },
  settings: { port: 7777, paperWidth: 58, autoStart: true },
};

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
      return { ...DEFAULT_CONFIG };
    }
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      printers: { ...DEFAULT_CONFIG.printers, ...(parsed.printers || {}) },
      settings: { ...DEFAULT_CONFIG.settings, ...(parsed.settings || {}) },
    };
  } catch (err) {
    console.error("Failed to load config, using defaults:", err.message);
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(cfg) {
  const merged = {
    printers: { ...DEFAULT_CONFIG.printers, ...(cfg.printers || {}) },
    settings: { ...DEFAULT_CONFIG.settings, ...(cfg.settings || {}) },
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

module.exports = { loadConfig, saveConfig, CONFIG_PATH };
