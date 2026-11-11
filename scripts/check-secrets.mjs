// Prompt 8 check: makes sure no secret value ended up in the code sent to the browser.
// Run after "npm run build":  npm run check:secrets
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const SECRET_VARS = ["SUPABASE_SERVICE_ROLE_KEY", "PATIENT_SESSION_SECRET", "CRON_SECRET", "INBOUND_WEBHOOK_SECRET"];
const dir = ".next/static";
if (!existsSync(dir)) {
  console.error("Run `npm run build` first.");
  process.exit(1);
}
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(dir);

let bad = 0;
for (const name of SECRET_VARS) {
  const value = process.env[name];
  const needles = [name, ...(value && value.length >= 8 ? [value] : [])];
  for (const n of needles) {
    const hits = files.filter((f) => readFileSync(f, "utf8").includes(n));
    if (hits.length) {
      bad++;
      console.error(`LEAK: ${n === name ? name : name + " value"} found in ${hits.join(", ")}`);
    }
  }
}
console.log(bad ? `FAILED: ${bad} secret(s) visible in browser code.` : `OK: no secrets in ${files.length} browser files.`);
process.exit(bad ? 1 : 0);
