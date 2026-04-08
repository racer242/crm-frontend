/**
 * Fix: Add responsive grid classes to multi-block sections
 */
const fs = require("fs");
const configPath = "config/crm-config.json";
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

function getPage(id) { return config.pages.find(p => p.id === id); }

// Dashboard mainGrid - make first block wider (2:1 ratio)
const dash = getPage("dashboard");
if (dash) {
  const mainGrid = dash.sections.find(s => s.id === "mainGrid");
  if (mainGrid) {
    mainGrid.layout = { type: "grid", columns: 3 };
    // 2 cols for table, 1 for timeline = 2:1 ratio
    mainGrid.blocks[0].className = "col-12 lg:col-8";
    mainGrid.blocks[1].className = "col-12 lg:col-4";
  }
  console.log("✅ Dashboard grid ratios fixed");
}

// Orders - make form narrower
const orders = getPage("orders");
if (orders) {
  const formSection = orders.sections.find(s => s.id === "orderFormSection");
  if (formSection) {
    formSection.layout = { type: "grid", columns: 3 };
    formSection.blocks[0].className = "col-12 lg:col-8";
    formSection.blocks[1].className = "col-12 lg:col-4";
  }
  console.log("✅ Orders grid ratios fixed");
}

// Reports charts - 50/50
const reports = getPage("reports");
if (reports) {
  const chartsSection = reports.sections.find(s => s.id === "chartsSection");
  if (chartsSection) {
    chartsSection.layout = { type: "grid", columns: 2 };
    chartsSection.blocks[0].className = "col-12 md:col-6";
    chartsSection.blocks[1].className = "col-12 md:col-6";
  }
  console.log("✅ Reports grid ratios fixed");
}

// Settings - 50/50
const settings = getPage("settings");
if (settings) {
  const settingsForm = settings.sections.find(s => s.id === "settingsForm");
  if (settingsForm) {
    settingsForm.layout = { type: "grid", columns: 2 };
    settingsForm.blocks[0].className = "col-12 md:col-6";
    settingsForm.blocks[1].className = "col-12 md:col-6";
  }
  const securitySection = settings.sections.find(s => s.id === "securitySection");
  if (securitySection) {
    securitySection.layout = { type: "grid", columns: 2 };
    securitySection.blocks[0].className = "col-12 md:col-6";
    securitySection.blocks[1].className = "col-12 md:col-6";
  }
  console.log("✅ Settings grid ratios fixed");
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log("\n🎉 Grid ratios applied!");
