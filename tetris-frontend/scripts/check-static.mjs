import * as fs from "fs";
import * as path from "path";

const errors = [];

function checkDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      if (file.name.startsWith("[") && file.name.includes("]")) {
        const paramsFile = path.join(fullPath, "generateStaticParams.ts");
        const paramsFileAlt = path.join(fullPath, "generateStaticParams.tsx");
        if (!fs.existsSync(paramsFile) && !fs.existsSync(paramsFileAlt)) {
          errors.push(
            `Dynamic route ${fullPath} missing generateStaticParams.ts(x)`
          );
        }
      }
      checkDirectory(fullPath);
    } else if (file.name.endsWith(".ts") || file.name.endsWith(".tsx")) {
      const content = fs.readFileSync(fullPath, "utf-8");

      const forbiddenPatterns = [
        { pattern: /getServerSideProps/, name: "getServerSideProps" },
        { pattern: /getStaticProps/, name: "getStaticProps" },
        { pattern: /server-only/, name: "server-only import" },
        { pattern: /next\/headers/, name: "next/headers" },
        { pattern: /cookies\(\)/, name: "cookies()" },
        { pattern: /dynamic\s*=\s*['"]force-dynamic['"]/, name: "dynamic='force-dynamic'" },
      ];

      for (const { pattern, name } of forbiddenPatterns) {
        if (pattern.test(content)) {
          errors.push(`${fullPath} contains forbidden: ${name}`);
        }
      }

      if (fullPath.includes("/api/") || fullPath.includes("/pages/api/")) {
        errors.push(`${fullPath} contains API route (not allowed in static export)`);
      }
    }
  }
}

const appDir = path.resolve("./app");
if (fs.existsSync(appDir)) {
  checkDirectory(appDir);
}

const pagesDir = path.resolve("./pages");
if (fs.existsSync(pagesDir)) {
  checkDirectory(pagesDir);
}

if (errors.length > 0) {
  console.error("\n❌ Static export check failed:\n");
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
} else {
  console.log("✅ Static export check passed");
}

