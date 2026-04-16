const fs = require("fs");
const path = require("path");

// Read main config
const mainConfigPath = path.join(__dirname, "..", "config", "crm-config.json");
const content = fs.readFileSync(mainConfigPath, "utf8");
const config = JSON.parse(content);

// Get pages array
const pages = config.pages;

// Page names to extract (in order they appear in pages array)
const pageNames = [];
pages.forEach((page, idx) => {
  if (page && page.id) {
    pageNames.push(page.id);
  }
});

console.log(`Found ${pageNames.length} pages to extract`);

// Create pages directory if not exists
const pagesDir = path.join(__dirname, "..", "config", "pages");
if (!fs.existsSync(pagesDir)) {
  fs.mkdirSync(pagesDir, { recursive: true });
}

// Extract each page to separate file
pageNames.forEach((name) => {
  const pageData = pages.find((p) => p.id === name);
  if (pageData) {
    const filePath = path.join(pagesDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));
    console.log(`✓ Created ${filePath}`);
  } else {
    console.warn(`⚠ Warning: Could not find page with id "${name}"`);
  }
});

// Update main config with $ref links
config.pages = pageNames.map((name) => ({ $ref: `./pages/${name}.json` }));

// Write updated main config
fs.writeFileSync(mainConfigPath, JSON.stringify(config, null, 2));
console.log("\n✓ Updated main crm-config.json with $ref references");

// Print summary
console.log("\n=== Split Configuration Summary ===");
console.log(`Pages extracted: ${pageNames.length}`);
console.log(`Files created in: ${pagesDir}`);
pageNames.forEach((name) => console.log(`  - ${name}.json`));
