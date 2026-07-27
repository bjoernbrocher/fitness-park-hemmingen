import { readFile, mkdir, writeFile, cp, rm } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist");
const assets = [
  "index.html", "style.css", "app.js", "service-worker.js",
  "manifest.webmanifest", "icons/fitness-park-logo.png", "icons/icon-192.png", "icons/icon-512.png",
  "icons/maskable-512.png", "icons/apple-touch-icon.png", "icons/og.png"
];
const types = {
  ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8", ".webmanifest":"application/manifest+json",
  ".png":"image/png"
};

await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, "server"), { recursive: true });
const files = {};
for (const file of assets) {
  files[`/${file}`] = {
    body: (await readFile(resolve(root, file))).toString("base64"),
    type: types[extname(file)]
  };
}
files["/"] = files["/index.html"];
const worker = `const files=${JSON.stringify(files)};
function decode(value){const raw=atob(value),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes}
export default{async fetch(request){const url=new URL(request.url);const key=url.pathname.replace(/\\/$/,"")||"/";const file=files[key]||files["/index.html"];return new Response(decode(file.body),{headers:{"content-type":file.type,"cache-control":key==="/"?"no-cache":"public, max-age=3600","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin"}})}};`;
await writeFile(resolve(output, "server/index.js"), worker);
await cp(resolve(root, ".openai/hosting.json"), resolve(output, "hosting.json"));
console.log(`FITNESS PARK build: ${assets.length} assets embedded.`);
