import os from "node:os";

// Non-internal IPv4 addresses of this machine's network interfaces - used
// both to print the LAN URL on startup and to generate an HTTPS certificate
// valid for whichever address other devices will actually connect to.
export function getLanAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        addresses.push(entry.address);
      }
    }
  }
  return addresses;
}
