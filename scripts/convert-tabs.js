const fs = require("fs");
const path = require("path");

const files = [
  "config/pages/statistics.json",
  "config/pages/orders.json",
  "config/pages/settings.json",
  "config/pages/components.json",
];

let tabCount = 0;

files.forEach((filePath) => {
  const fullPath = path.join(process.cwd(), filePath);
  let content = fs.readFileSync(fullPath, "utf8");

  // Find TabView components and convert their tabs
  content = content.replace(/"componentType":\s*"TabView"/g, (match) => {
    tabCount++;
    return match;
  });

  // Convert tabs array format from old to new
  // Old: { "label": "...", "content": { "type": "table", "data": [...], "columns": [...] } }
  // New: { "id": "...", "props": { "header": "..." }, "components": [{ "type": "component", "componentType": "DataTable", ... }] }

  // We need to find and replace the entire tabs structure
  // This is complex JSON manipulation, so we'll parse and rebuild

  try {
    const json = JSON.parse(content);

    function convertTabs(obj) {
      if (!obj || typeof obj !== "object") return;

      if (obj.componentType === "TabView" && obj.props && obj.props.tabs) {
        obj.props.tabs = obj.props.tabs.map((tab, idx) => {
          if (tab.content && tab.content.type === "table") {
            return {
              id: `${tab.label?.toLowerCase().replace(/\s+/g, "_") || "tab_" + idx}`,
              props: {
                header: tab.label || "Tab " + (idx + 1),
              },
              components: [
                {
                  id: `${tab.label?.toLowerCase().replace(/\s+/g, "_") || "tab_" + idx}_table`,
                  type: "component",
                  componentType: "DataTable",
                  props: {
                    value: tab.content.data || [],
                    columns:
                      tab.content.columns?.map((col, i) => ({
                        field: col.field,
                        header: col.header,
                        sortable: col.sortable !== false,
                      })) || [],
                  },
                },
              ],
            };
          }
          // For non-table content, keep as is for now
          return tab;
        });
      }

      if (obj.componentType === "Accordion" && obj.props && obj.props.tabs) {
        obj.props.tabs = obj.props.tabs.map((tab, idx) => {
          return {
            id: tab.id || `accordion_tab_${idx}`,
            props: {
              header: tab.header || tab.label || "Tab " + (idx + 1),
            },
            components: tab.components || [],
          };
        });
      }

      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key])) {
          obj[key].forEach(convertTabs);
        } else if (typeof obj[key] === "object") {
          convertTabs(obj[key]);
        }
      }
    }

    convertTabs(json);
    fs.writeFileSync(fullPath, JSON.stringify(json, null, 2), "utf8");
    console.log(`Updated: ${filePath}`);
  } catch (e) {
    console.error(`Error processing ${filePath}: ${e.message}`);
  }
});

console.log(`\nConverted ${tabCount} TabView components`);
