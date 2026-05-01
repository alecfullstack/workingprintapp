const fs = require("fs");
const os = require("os");
const path = require("path");
const ptp = require("pdf-to-printer");

async function listPrinters() {
  try {
    const list = await ptp.getPrinters();
    // ptp returns objects with `name` and possibly `deviceId`. Default flag is
    // not always provided — fetch separately.
    let defaultName = "";
    try {
      defaultName = await ptp.getDefaultPrinter().then((p) => (p && p.name) || "");
    } catch (_) {}
    return list.map((p) => ({
      name: p.name || p.deviceId || String(p),
      isDefault: (p.name || "") === defaultName,
    }));
  } catch (err) {
    if (process.platform !== "win32") {
      // Dev fallback so the admin UI still works on macOS/Linux.
      return [{ name: "Mock Printer", isDefault: true }];
    }
    throw err;
  }
}

async function printPdfBuffer(buffer, printerName) {
  const tmpFile = path.join(os.tmpdir(), `eetlekker-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  fs.writeFileSync(tmpFile, buffer);
  try {
    if (process.platform !== "win32") {
      // Dev: don't actually print. Just resolve.
      console.log(`[dev] would print ${tmpFile} to "${printerName}"`);
      return;
    }
    const opts = { silent: true };
    if (printerName) opts.printer = printerName;
    await ptp.print(tmpFile, opts);
  } finally {
    setTimeout(() => {
      try { fs.unlinkSync(tmpFile); } catch (_) {}
    }, 15000);
  }
}

module.exports = { listPrinters, printPdfBuffer };
