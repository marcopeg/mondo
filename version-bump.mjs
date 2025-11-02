import { readFileSync, writeFileSync } from "fs";

// Read version directly from package.json (works in CI and locally)
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const targetVersion = pkg.version;

if (!targetVersion) {
	throw new Error("version-bump.mjs: Unable to determine target version from package.json");
}

// Read minAppVersion from manifest.json and bump version to target version
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// Update versions.json with target version and minAppVersion from manifest.json
let versions = {};
try {
	versions = JSON.parse(readFileSync("versions.json", "utf8"));
} catch (_) {
	// If versions.json does not exist or is invalid, start fresh
	versions = {};
}
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
