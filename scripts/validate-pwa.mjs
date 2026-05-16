import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "sw.js",
  "manifest.webmanifest",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png"
];

const fail = (message) => {
  throw new Error(message);
};

for (const file of requiredFiles) {
  const details = await stat(path.join(root, file));
  if (!details.isFile()) {
    fail(`${file} is missing`);
  }
}

const [html, app, serviceWorker, manifestText] = await Promise.all([
  readFile(path.join(root, "index.html"), "utf8"),
  readFile(path.join(root, "app.js"), "utf8"),
  readFile(path.join(root, "sw.js"), "utf8"),
  readFile(path.join(root, "manifest.webmanifest"), "utf8")
]);

const manifest = JSON.parse(manifestText);

if (!html.includes('rel="manifest" href="manifest.webmanifest"')) {
  fail("index.html does not link the web app manifest");
}

if (!app.includes("beforeinstallprompt") || !app.includes("serviceWorker.register")) {
  fail("app.js does not wire PWA install and service worker registration");
}

if (!serviceWorker.includes("cache.addAll(APP_SHELL)") || !serviceWorker.includes("fetch")) {
  fail("sw.js does not cache the app shell or handle fetches");
}

if (manifest.display !== "standalone") {
  fail("manifest display must be standalone");
}

if (!manifest.start_url || !manifest.icons?.some((icon) => icon.sizes === "192x192")) {
  fail("manifest must include start_url and a 192x192 icon");
}

if (!manifest.icons?.some((icon) => icon.sizes === "512x512")) {
  fail("manifest must include a 512x512 icon");
}

console.log("PWA validation passed.");
