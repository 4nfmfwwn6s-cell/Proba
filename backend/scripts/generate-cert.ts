// Generates a self-signed HTTPS certificate covering localhost, 127.0.0.1,
// ::1, and this machine's current LAN IP address(es), so the app can be
// served over HTTPS on your local network - required for microphone access
// on iOS Safari (and any modern browser) outside of localhost.
//
// Run with: npm run generate-cert
// Pass extra hostnames/IPs if auto-detection misses the right one, e.g.:
//   npm run generate-cert -- 192.168.1.42
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "selfsigned";
import { getLanAddresses } from "../src/lib/network.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certsDir = path.join(__dirname, "..", "..", "certs");

// Apple's ATS policy rejects TLS server certificates valid for more than
// 825 days, even when manually trusted - 824 stays safely under that.
const VALIDITY_DAYS = 824;

const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
function isIpAddress(value: string): boolean {
  return IPV4_RE.test(value) || value.includes(":");
}

async function main() {
  const extraHosts = process.argv.slice(2);
  const lanAddresses = getLanAddresses();

  if (lanAddresses.length === 0 && extraHosts.length === 0) {
    console.warn(
      "Warning: no LAN network interface was detected. The certificate will only cover localhost -" +
        " pass your device's IP explicitly, e.g. `npm run generate-cert -- 192.168.1.42`."
    );
  }

  const hosts = [...new Set(["localhost", "127.0.0.1", "::1", ...lanAddresses, ...extraHosts])];

  const altNames = hosts.map((host) =>
    isIpAddress(host) ? ({ type: 7, ip: host } as const) : ({ type: 2, value: host } as const)
  );

  const notBeforeDate = new Date();
  const notAfterDate = new Date(notBeforeDate.getTime() + VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  const pems = await generate([{ name: "commonName", value: "English Coach (local dev)" }], {
    keySize: 2048,
    algorithm: "sha256",
    notBeforeDate,
    notAfterDate,
    extensions: [
      { name: "basicConstraints", cA: false },
      {
        name: "keyUsage",
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true,
      },
      { name: "extKeyUsage", serverAuth: true },
      { name: "subjectAltName", altNames },
    ],
  });

  fs.mkdirSync(certsDir, { recursive: true });
  fs.writeFileSync(path.join(certsDir, "cert.pem"), pems.cert);
  fs.writeFileSync(path.join(certsDir, "key.pem"), pems.private);

  console.log(`Generated a self-signed HTTPS certificate:\n  ${path.join(certsDir, "cert.pem")}\n  ${path.join(certsDir, "key.pem")}`);
  console.log("\nValid for:");
  for (const host of hosts) console.log(`  - ${host}`);
  console.log(`\nExpires: ${notAfterDate.toDateString()} (${VALIDITY_DAYS} days from now)`);
  console.log(
    "\nRestart the backend (and the Vite dev server, if it's running) to pick this up." +
      " See the README's 'HTTPS for LAN / iOS mic access' section for how to trust this" +
      " certificate on Windows and iOS."
  );
}

main().catch((err) => {
  console.error("Failed to generate certificate:", err);
  process.exit(1);
});
