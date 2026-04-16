const fs = require("fs");
const path = require("path");

// Read main config
const mainConfigPath = path.join(__dirname, "..", "config", "crm-config.json");
const content = fs.readFileSync(mainConfigPath, "utf8");
const config = JSON.parse(content);

// Check if api section exists in config
if (!config.config || !config.config.api) {
  console.log("No 'config.api' section found in crm-config.json");
  process.exit(0);
}

const apiSection = config.config.api;

// Create api directory if not exists
const apiDir = path.join(__dirname, "..", "config", "api");
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// Create full API config with baseURL, timeout and endpoints
const apiConfig = {
  baseURL: apiSection.baseURL,
  timeout: apiSection.timeout,
  endpoints: apiSection.endpoints || {},
};

// Write endpoints separately (just the endpoints object)
const endpointsFile = path.join(apiDir, "endpoints.json");
fs.writeFileSync(
  endpointsFile,
  JSON.stringify(apiSection.endpoints || {}, null, 2),
);
console.log(`✓ Created ${endpointsFile}`);

// Update main config - keep baseURL and timeout, reference only endpoints
config.config.api = {
  baseURL: apiSection.baseURL,
  timeout: apiSection.timeout,
  endpoints: { $ref: "./api/endpoints.json" },
};

// Write updated main config
fs.writeFileSync(mainConfigPath, JSON.stringify(config, null, 2));
console.log(
  "\n✓ Updated main crm-config.json with $ref reference for api endpoints",
);

// Print summary
console.log("\n=== API Configuration Summary ===");
console.log(`Endpoints file: ${endpointsFile}`);
if (apiSection.endpoints) {
  const endpointNames = Object.keys(apiSection.endpoints);
  console.log(`Total endpoints defined: ${endpointNames.length}`);
  endpointNames.forEach((name) => {
    const ep = apiSection.endpoints[name];
    console.log(`  - ${name}: ${ep.method || "GET"} ${ep.path || "-"}`);
  });
}

console.log(
  "\nNote: baseURL and timeout remain in main config for convenience",
);
