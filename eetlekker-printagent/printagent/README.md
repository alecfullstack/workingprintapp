# Eetlekker PrintAgent

Local silent print agent for the **Eetlekker POS** web app.
Runs on the Windows POS terminal, exposes a tiny HTTP API on `http://127.0.0.1:7777`,
and prints **silently** to receipt / kitchen / bar / hookah thermal printers — no browser print dialog.

- Free, open-source, no paid services (no QZ Tray, no PrintNode).
- Pure Node.js + Express. Silent printing via [`pdf-to-printer`](https://github.com/artiebits/pdf-to-printer) (bundles SumatraPDF on Windows).
- Receipts rendered as PDF with bundled **DejaVu Sans Mono** font → full Cyrillic / Ukrainian support.
- Packageable into a single Windows `.exe` with [`pkg`](https://github.com/vercel/pkg).

---

## 1. Install & run (development)

Requires Node.js 18+.

```bash
cd printagent
npm install
npm start
```

Then open http://localhost:7777 — the admin / test page.

The first run creates `config.json` next to the app with default values.

---

## 2. Build a Windows `.exe`

```bash
npm install
npm run build:win
```

Output: `dist/EetlekkerPrintAgent.exe` (single file, no Node install required on the POS).

Copy these to the POS PC into one folder, e.g. `C:\EetlekkerPrintAgent\`:

```
EetlekkerPrintAgent.exe
config.json     (will be auto-created on first run)
fonts/          (the two DejaVu .ttf files — kept next to the exe)
```

> `pkg` bundles assets into the snapshot, but for safety keep the `fonts/` folder
> next to the exe so they can be replaced without rebuilding.

---

## 3. Auto-start on Windows boot

Easiest method — Startup folder shortcut:

1. Press `Win + R`, type `shell:startup`, press Enter.
2. Right-click → New → Shortcut → browse to `C:\EetlekkerPrintAgent\EetlekkerPrintAgent.exe`.
3. Done. It launches at every login.

For a true Windows Service, use [NSSM](https://nssm.cc/):

```bat
nssm install EetlekkerPrintAgent "C:\EetlekkerPrintAgent\EetlekkerPrintAgent.exe"
nssm start EetlekkerPrintAgent
```

---

## 4. HTTP API

Server binds **only** to `127.0.0.1` — never reachable from the LAN.

| Method | Path        | Purpose                                            |
|-------:|-------------|----------------------------------------------------|
| GET    | `/status`   | Health check                                       |
| GET    | `/printers` | List installed Windows printers                    |
| GET    | `/config`   | Read current config                                |
| POST   | `/config`   | Update printer mappings & settings                 |
| POST   | `/print`    | Print a receipt / kitchen ticket                   |
| GET    | `/`         | Admin / test web page                              |

### `POST /print` payload

```json
{
  "printerRole": "customer",
  "printerName": "EPSON TM-T20III",
  "receiptType": "customer_bill",
  "restaurant": { "name": "Сказка Востока", "address": "...", "phone": "..." },
  "order": { "id": "POS-MOLEEMT6", "tableNumber": "28", "createdAt": "2026-05-01 14:26:13", "status": "open" },
  "items": [
    { "name": "Сулугуні в лаваші 140гр", "qty": 1, "price": 125, "total": 125, "station": "kitchen" }
  ],
  "totals": { "subtotal": 295, "discount": 0, "total": 295, "paid": 0, "remaining": 295 },
  "payment": { "status": "unpaid", "method": null }
}
```

Resolution order for the target printer:

1. `printerName` (if provided and installed)
2. `config.json` → `printers[printerRole]`
3. Windows default printer

### CORS

Allowed origins (regex):

- `http://localhost`, `http://127.0.0.1` (any port)
- `https://*.lovable.app`, `https://*.lovableproject.com`
- `https://*.eetlekker.online`

---

## 5. `config.json`

```json
{
  "printers": {
    "customer": "EPSON TM-T20III",
    "kitchen":  "Kitchen Printer",
    "bar":      "Bar Printer",
    "hookah":   "Hookah Printer"
  },
  "settings": {
    "port": 7777,
    "paperWidth": 58,
    "autoStart": true
  }
}
```

`paperWidth` accepts `58` or `80` (mm).

---

## 6. Eetlekker POS — frontend integration

Drop this helper into your web app:

```js
const PRINT_AGENT = "http://127.0.0.1:7777";

export async function isPrintAgentConnected() {
  try {
    const r = await fetch(`${PRINT_AGENT}/status`, { cache: "no-store" });
    const j = await r.json();
    return !!j.ok;
  } catch { return false; }
}

export async function printReceipt(payload) {
  try {
    const status = await fetch(`${PRINT_AGENT}/status`).then(r => r.json());
    if (!status.ok) throw new Error("PrintAgent not connected");

    const res = await fetch(`${PRINT_AGENT}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!result.ok) throw new Error(result.error || "Print failed");
    return result;
  } catch (err) {
    console.error("PrintAgent error:", err);
    throw err;
  }
}

// Use it like this — fall back to browser print if agent is offline:
export async function printOrFallback(payload, renderHtmlForBrowser) {
  if (await isPrintAgentConnected()) {
    return printReceipt(payload);
  }
  // Fallback: open browser print dialog with rendered HTML
  const w = window.open("", "_blank", "width=400,height=600");
  w.document.write(renderHtmlForBrowser(payload));
  w.document.close();
  w.focus();
  w.print();
}
```

---

## 7. Receipt layouts

**Customer bill** — restaurant header, order ID, table, date, items with qty/price/line total,
subtotal, discount, total, paid, remaining, payment status, "Дякуємо!".

**Kitchen / Bar / Hookah ticket** — big station header (`КУХНЯ` / `БАР` / `КАЛЬЯН`), table,
order ID, time, only items where `station === printerRole`, large readable font,
modifiers and comments shown, **no prices**.

Cyrillic / Ukrainian renders correctly because text is rasterized as PDF using the bundled
DejaVu Sans Mono font — the printer driver just sees a PDF.

---

## 8. Troubleshooting

| Symptom                           | Fix                                                                 |
|-----------------------------------|---------------------------------------------------------------------|
| `Printer not found`               | Check exact name in Windows Printers; re-pick it in the admin page. |
| Empty / corrupt receipts          | Make sure the printer's Windows driver is set to roll paper width.  |
| CORS error from POS               | Add your domain to the regex list in `src/server.js`.               |
| Garbled Cyrillic                  | Confirm `fonts/DejaVuSansMono.ttf` is next to the exe.              |
| Port 7777 already in use          | Change `settings.port` in `config.json`.                            |
