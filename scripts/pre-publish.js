#!/usr/bin/env node

/**
 * Pre-publish script that updates workspace dependencies to published versions
 * This ensures packages can be published with correct dependency versions
 */

const fs = require("node:fs");
const path = require("node:path");


function getPackageJsonPath(packageName) {
  return path.join(
    __dirname,
    "..",
    "packages",
    packageName,
    "package.json",
  );
}

// Read the current version of a package
function getPackageVersion(packageName) {
  const packageJson = JSON.parse(
    fs.readFileSync(getPackageJsonPath(packageName), "utf8"),
  );
  return packageJson.version;
}

function readPackageJson(packageName) {
  return JSON.parse(fs.readFileSync(getPackageJsonPath(packageName), "utf8"));
}

function writePackageJson(packageName, packageJson) {
  fs.writeFileSync(
    getPackageJsonPath(packageName),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
}

function setDependency(packageJson, field, dependencyName, version) {
  packageJson[field] = packageJson[field] || {};
  packageJson[field][dependencyName] = version;
}

function removeDependency(packageJson, field, dependencyName) {
  const section = packageJson[field];
  if (!section || !Object.prototype.hasOwnProperty.call(section, dependencyName)) {
    return false;
  }
  delete section[dependencyName];
  if (Object.keys(section).length === 0) {
    delete packageJson[field];
  }
  return true;
}

// Define which packages depend on which other packages and where those dependencies live during development
const dependencyMatrix = {
  artifacts: [
    {
      dependencyName: "@ai-sdk-tools/store",
      versionFrom: "store",
      sourceField: "devDependencies",
      targetField: "dependencies",
    },
  ],
  devtools: [
    {
      dependencyName: "@ai-sdk-tools/store",
      versionFrom: "store",
      sourceField: "devDependencies",
      targetField: "dependencies",
    },
  ],
  agents: [
    {
      dependencyName: "@ai-sdk-tools/debug",
      versionFrom: "debug",
      sourceField: "dependencies",
      targetField: "dependencies",
    },
    {
      dependencyName: "@ai-sdk-tools/memory",
      versionFrom: "memory",
      sourceField: "dependencies",
      targetField: "dependencies",
    },
  ],
  memory: [
    {
      dependencyName: "@ai-sdk-tools/debug",
      versionFrom: "debug",
      sourceField: "dependencies",
      targetField: "dependencies",
    },
  ],
  "ai-sdk-tools": [
    {
      dependencyName: "@ai-sdk-tools/agents",
      versionFrom: "agents",
      sourceField: "dependencies",
      targetField: "dependencies",
    },
    {
      dependencyName: "@ai-sdk-tools/artifacts",
      versionFrom: "artifacts",
      sourceField: "dependencies",
      targetField: "dependencies",
    },
    {
      dependencyName: "@ai-sdk-tools/cache",
      versionFrom: "cache",
      sourceField: "dependencies",
      targetField: "dependencies",
    },
    {
      dependencyName: "@ai-sdk-tools/devtools",
      versionFrom: "devtools",
      sourceField: "dependencies",
      targetField: "dependencies",
    },
    {
      dependencyName: "@ai-sdk-tools/memory",
      versionFrom: "memory",
      sourceField: "dependencies",
      targetField: "dependencies",
    },
    {
      dependencyName: "@ai-sdk-tools/store",
      versionFrom: "store",
      sourceField: "dependencies",
      targetField: "dependencies",
    },
  ],
};

function updatePackageJson(packageName, dependencyConfigs) {
  const packageJson = readPackageJson(packageName);

  dependencyConfigs.forEach(
    ({ dependencyName, versionFrom, sourceField, targetField }) => {
      const version = `^${getPackageVersion(versionFrom)}`;

      if (sourceField !== targetField) {
        if (
          removeDependency(packageJson, sourceField, dependencyName)
        ) {
          console.log(
            `  📦 Moved ${dependencyName} from ${sourceField} to ${targetField}`,
          );
        }
      }

      setDependency(packageJson, targetField, dependencyName, version);
      console.log(`  📦 Set ${dependencyName} to version ${version}`);
    },
  );

  writePackageJson(packageName, packageJson);
  console.log(`✅ Updated ${packageName} dependencies for publishing`);
}

function restorePackageJson(packageName, dependencyConfigs) {
  const packageJson = readPackageJson(packageName);

  dependencyConfigs.forEach(
    ({ dependencyName, sourceField, targetField }) => {
      if (targetField !== sourceField) {
        if (
          removeDependency(packageJson, targetField, dependencyName)
        ) {
          console.log(
            `  📦 Moved ${dependencyName} from ${targetField} to ${sourceField}`,
          );
        }
      }

      setDependency(packageJson, sourceField, dependencyName, "workspace:*");
      console.log(`  📦 Set ${dependencyName} to workspace:*`);
    },
  );

  writePackageJson(packageName, packageJson);
  console.log(`✅ Restored ${packageName} to development mode`);
}

const command = process.argv[2];

if (command === "prepare") {
  console.log("🚀 Preparing packages for publishing...");
  Object.entries(dependencyMatrix).forEach(([packageName, configs]) => {
    updatePackageJson(packageName, configs);
  });
} else if (command === "restore") {
  console.log("🔄 Restoring packages to development mode...");
  Object.entries(dependencyMatrix).forEach(([packageName, configs]) => {
    restorePackageJson(packageName, configs);
  });
} else {
  console.log("Usage: node pre-publish.js [prepare|restore]");
  process.exit(1);
}
