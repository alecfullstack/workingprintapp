# Eetlekker PrintAgent — Easy Install

You have **two** options. Pick one.

---

## Option A — You already have the installer (`EetlekkerPrintAgent-Setup.exe`)

This is the normal case for restaurant staff installing on a POS PC.

1. Double-click **`EetlekkerPrintAgent-Setup.exe`**.
2. Click **Yes** when Windows asks for admin permission.
3. Click **Next → Next → Install → Finish**.
4. The admin page opens automatically at <http://127.0.0.1:7777>.
5. Pick your printers for *Customer / Kitchen / Bar / Hookah* and click **Save**.

That's it. The agent now:

- Runs in the background.
- **Auto-starts every time Windows boots.**
- Listens on `127.0.0.1:7777` for the Eetlekker POS web app.
- Prints silently — no browser print dialog, ever.

To uninstall: **Settings → Apps → Eetlekker PrintAgent → Uninstall**.

---

## Option B — You need to build the installer first (one-time, on any Windows PC)

You only do this **once**, on a developer/office PC — **not** on the POS.

1. Install **Node.js LTS**: <https://nodejs.org> (click Next, Next, Finish).
2. Install **Inno Setup 6**: <https://jrsoftware.org/isdl.php> (click Next, Next, Finish).
3. Open the `printagent` folder.
4. Double-click **`BUILD-INSTALLER.bat`**.
5. Wait ~2 minutes. When it says **DONE**, your installer is at:

   ```
   printagent\dist-installer\EetlekkerPrintAgent-Setup.exe
   ```

6. Copy that **one single file** to every POS PC and follow **Option A** above.

---

## What the installer does

| Step                            | Detail                                                              |
|---------------------------------|---------------------------------------------------------------------|
| Installs to                     | `C:\Program Files\Eetlekker PrintAgent\`                            |
| Adds desktop shortcut           | Yes (optional checkbox)                                             |
| Adds Start Menu shortcut        | Yes                                                                 |
| Auto-start at Windows boot      | Yes (optional checkbox, on by default)                              |
| Opens firewall port 7777        | Localhost only — not reachable from the network                     |
| Bundles Cyrillic fonts          | Yes — Ukrainian / Russian receipts print correctly                  |
| Needs Node.js on the POS?       | **No.** Everything is bundled into the `.exe`.                      |
| Needs Internet on the POS?      | No.                                                                 |

---

## Troubleshooting

- **"Windows protected your PC" SmartScreen warning** → click *More info* → *Run anyway*.
  (Happens because the installer is not code-signed. Harmless.)
- **Printer not listed in admin page** → make sure the printer is installed in
  Windows *Settings → Printers & scanners*, then refresh the admin page.
- **Need to change settings later** → open <http://127.0.0.1:7777> from any browser
  on the POS PC, or use the Start Menu shortcut "Open Admin Page".
