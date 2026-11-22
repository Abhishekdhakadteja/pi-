import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Standby copy on Cloudflare Workers. No incremental cache needed: pages are dynamic.
export default defineCloudflareConfig();
