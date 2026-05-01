// Renders a receipt as a PDF buffer using pdfkit.
// Uses a bundled Unicode TTF (DejaVuSansMono) so Cyrillic/Ukrainian renders
// correctly regardless of the printer's installed fonts.
//
// Paper widths supported: 58mm (~164pt printable) and 80mm (~226pt printable).
// We render at the printable width and let the Windows driver scale to fit.

const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

function fontPath(name) {
  // When packaged with pkg, assets are inside the snapshot. pkg supports fs reads.
  if (process.pkg) {
    return path.join(path.dirname(process.execPath), "fonts", name);
  }
  return path.join(__dirname, "..", "fonts", name);
}

function resolveFont(name) {
  const p = fontPath(name);
  if (fs.existsSync(p)) return p;
  // fallback to snapshot path
  const snap = path.join(__dirname, "..", "fonts", name);
  return fs.existsSync(snap) ? snap : null;
}

function mmToPt(mm) {
  return (mm / 25.4) * 72;
}

function buildPdf(payload) {
  return new Promise((resolve, reject) => {
    const paperWidthMm = payload._paperWidthMm || 58;
    const widthPt = mmToPt(paperWidthMm);
    // Use a tall page; pdfkit can't auto-size, so we use a generous height.
    // Most Windows thermal drivers crop to actual content for roll paper.
    const heightPt = 1200;

    const doc = new PDFDocument({
      size: [widthPt, heightPt],
      margins: { top: 8, bottom: 8, left: 6, right: 6 },
    });

    const regular = resolveFont("DejaVuSansMono.ttf");
    const bold = resolveFont("DejaVuSansMono-Bold.ttf") || regular;

    if (regular) {
      doc.registerFont("mono", regular);
      if (bold) doc.registerFont("mono-bold", bold);
    }

    const FONT = regular ? "mono" : "Courier";
    const FONT_BOLD = bold ? "mono-bold" : "Courier-Bold";

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const printableWidth = widthPt - 12;
    const charsPerLine = paperWidthMm <= 58 ? 32 : 48;

    const isKitchen = ["kitchen", "bar", "hookah"].includes(payload.printerRole);

    // ----- HEADER -----
    if (isKitchen) {
      const stationLabel =
        payload.printerRole === "kitchen"
          ? "КУХНЯ"
          : payload.printerRole === "bar"
          ? "БАР"
          : "КАЛЬЯН";
      doc.font(FONT_BOLD).fontSize(20).text(stationLabel, { align: "center" });
      doc.moveDown(0.3);
      doc.font(FONT_BOLD).fontSize(14);
      if (payload.order?.tableNumber) {
        doc.text(`Стіл №${payload.order.tableNumber}`, { align: "center" });
      }
      doc.font(FONT).fontSize(10);
      if (payload.order?.id) doc.text(`Замовлення: ${payload.order.id}`, { align: "center" });
      if (payload.order?.createdAt) doc.text(payload.order.createdAt, { align: "center" });
    } else {
      const r = payload.restaurant || {};
      doc.font(FONT_BOLD).fontSize(12).text(r.name || "", { align: "center" });
      doc.font(FONT).fontSize(8);
      if (r.address) doc.text(r.address, { align: "center" });
      if (r.phone) doc.text(r.phone, { align: "center" });
      doc.moveDown(0.3);
      doc.font(FONT).fontSize(9);
      if (payload.order?.id) doc.text(`Чек: ${payload.order.id}`);
      if (payload.order?.createdAt) doc.text(`Дата: ${payload.order.createdAt}`);
      if (payload.order?.tableNumber) doc.text(`Стіл: ${payload.order.tableNumber}`);
    }

    // separator
    doc.moveDown(0.4);
    doc.font(FONT).fontSize(9).text("-".repeat(charsPerLine));
    doc.moveDown(0.2);

    // ----- ITEMS -----
    const items = Array.isArray(payload.items) ? payload.items : [];
    const filtered = isKitchen
      ? items.filter((i) => (i.station || "").toLowerCase() === payload.printerRole)
      : items;

    if (isKitchen) {
      doc.font(FONT_BOLD).fontSize(13);
      filtered.forEach((it) => {
        doc.text(`${it.qty || 1} x  ${it.name || ""}`);
        if (it.modifiers && it.modifiers.length) {
          doc.font(FONT).fontSize(10);
          it.modifiers.forEach((m) => doc.text(`   + ${m}`));
          doc.font(FONT_BOLD).fontSize(13);
        }
        if (it.comment) {
          doc.font(FONT).fontSize(10).text(`   * ${it.comment}`);
          doc.font(FONT_BOLD).fontSize(13);
        }
        doc.moveDown(0.15);
      });
    } else {
      doc.font(FONT).fontSize(9);
      filtered.forEach((it) => {
        const name = `${it.qty || 1}x ${it.name || ""}`;
        const total = formatMoney(it.total ?? (it.price || 0) * (it.qty || 1));
        doc.text(name, { continued: false });
        // price line right-aligned
        const priceLine = `${formatMoney(it.price || 0)} = ${total}`;
        doc.text(priceLine, { align: "right" });
      });

      doc.moveDown(0.2);
      doc.text("-".repeat(charsPerLine));
      const t = payload.totals || {};
      const p = payload.payment || {};
      doc.font(FONT).fontSize(10);
      row(doc, "Сума:", formatMoney(t.subtotal));
      if (t.discount) row(doc, "Знижка:", formatMoney(t.discount));
      doc.font(FONT_BOLD).fontSize(12);
      row(doc, "ВСЬОГО:", formatMoney(t.total));
      doc.font(FONT).fontSize(10);
      if (t.paid != null) row(doc, "Сплачено:", formatMoney(t.paid));
      if (t.remaining != null) row(doc, "До сплати:", formatMoney(t.remaining));

      doc.moveDown(0.2);
      doc.text(`Статус: ${translatePayStatus(p.status)}`);
      if (p.method) doc.text(`Метод: ${p.method}`);

      doc.moveDown(0.6);
      doc.font(FONT_BOLD).fontSize(11).text("Дякуємо!", { align: "center" });
    }

    doc.moveDown(1);
    doc.end();
  });
}

function row(doc, label, value) {
  const y = doc.y;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.text(label, { continued: false });
  doc.y = y;
  doc.text(value, { align: "right" });
}

function formatMoney(n) {
  if (n == null || isNaN(Number(n))) return "0.00";
  return Number(n).toFixed(2);
}

function translatePayStatus(s) {
  const map = { unpaid: "Не сплачено", paid: "Сплачено", partial: "Частково" };
  return map[s] || s || "-";
}

module.exports = { buildPdf };
