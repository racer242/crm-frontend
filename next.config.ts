import type { NextConfig } from "next";
import * as fs from "fs";
import * as path from "path";

// Get hash of all config files to detect changes
function getConfigHash(): string {
  const configDir = path.join(process.cwd(), "config");
  if (!fs.existsSync(configDir)) return "";

  let hash = "";
  const walk = (dir: string) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (file.endsWith(".json")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        hash += `${fullPath}:${content.length}:${stat.mtimeMs}|`;
      }
    }
  };
  walk(configDir);
  return hash;
}

const nextConfig: NextConfig = {
  webpack: (config, { dev, isServer }) => {
    if (dev && isServer) {
      // Watch config directory for changes
      config.watchOptions = {
        ignored: [/node_modules/],
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    return config;
  },

  // Force revalidation on each request during development
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              process.env.NODE_ENV === "development"
                ? "no-store, no-cache, must-revalidate"
                : "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

// Watch config files and restart server on changes (dev mode only)
if (process.env.NODE_ENV === "development" && typeof fs.watch === "function") {
  const configDir = path.join(process.cwd(), "config");

  if (fs.existsSync(configDir)) {
    let debounceTimer: NodeJS.Timeout | null = null;
    const configFiles = new Set<string>();

    // Collect all JSON files in config directory
    const collectFiles = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          collectFiles(fullPath);
        } else if (file.endsWith(".json")) {
          configFiles.add(fullPath);
        }
      }
    };
    collectFiles(configDir);

    // Watch each config file
    for (const file of configFiles) {
      try {
        fs.watch(file, (eventType) => {
          if (eventType === "change") {
            // Debounce to avoid multiple rapid restarts
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              console.log(
                "\n🔄 Config file changed — restarting dev server...\n",
              );
              // Signal Next.js to restart
              process.exit(0);
            }, 500);
          }
        });
      } catch (e) {
        // Ignore watch errors (file might be locked)
      }
    }

    // Also watch for new files in config directories
    const watchDirs = [configDir];
    for (const dir of configFiles) {
      const parentDir = path.dirname(dir);
      if (!watchDirs.includes(parentDir)) {
        watchDirs.push(parentDir);
      }
    }
    for (const dir of watchDirs) {
      try {
        fs.watch(dir, (eventType, filename) => {
          if (filename && filename.endsWith(".json")) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              console.log(
                "\n🔄 Config file changed — restarting dev server...\n",
              );
              process.exit(0);
            }, 500);
          }
        });
      } catch (e) {
        // Ignore watch errors
      }
    }
  }
}

export default nextConfig;
