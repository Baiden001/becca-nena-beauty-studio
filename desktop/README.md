# Becca Nena POS: desktop app

The till as a normal Windows (or Mac) program. It opens the live website's
till (`/admin/walk-in`) in its own window, so every website update shows up
straight away with no reinstalling. On top of the website it adds:

- **Silent receipts**: receipts go straight to the receipt printer, no print dialog.
- **Cash drawer**: opens by itself after cash sales (drawer plugged into the
  receipt printer with the RJ11 cable). Also from *Till → Open cash drawer*
  (Ctrl+D) and the till's menu.
- **Customer screen** opens full screen on the second monitor at start-up.
- **Start with the computer** (optional).
- A friendly offline screen that reconnects by itself.

## Getting the installer

1. On GitHub open **Actions → Desktop app → Run workflow** (it also runs by
   itself when anything in `desktop/` changes on `main`).
2. When it's green, open the run and download **Becca-Nena-POS-Windows** from
   *Artifacts*. Unzip it and run `Becca-Nena-POS-Setup-1.0.0.exe`.
3. Windows may say "Windows protected your PC" because the app isn't code-signed
   yet: click **More info → Run anyway**. (A code-signing certificate removes
   this warning; it's a yearly paid certificate.)

## First start

The settings window opens by itself (later: *Till → Settings…*, Ctrl+,):

1. **Receipt printer**: pick the thermal printer and press *Print a test
   receipt*. In Windows' printer preferences set the paper to the 80 mm roll.
2. **Cash drawer**: press *Test the drawer*. If nothing happens, switch the
   connector to *Pin 5* and test again.
3. **Screens & start-up**: tick what you want, then **Save**.
4. Sign in to the till as usual. The sign-in is remembered.

## Building it yourself

```bash
cd desktop
npm install
npm start          # run it
npm run dist:win   # build the installer (on Windows)
```

The website address is in *Settings* (default `https://beccanenabeautystudio.com`).
