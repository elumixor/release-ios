#!/usr/bin/env node
import { release } from "./index.js";

const args = process.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) {
  console.log(`Usage: release-ios [patch|minor|major|<x.y.z>] [options]

Bumps the iOS marketing version (CFBundleShortVersionString) via agvtool,
commits, tags as ios-v<version>, and pushes both the commit and the tag.

Arguments:
  patch | minor | major   Bump kind (default: patch)
  <x.y.z>                 Explicit semver

Options:
  --ios-dir <path>        Path to the directory holding the .xcodeproj
                          (default: apps/frontend/ios/App)
  --tag-prefix <prefix>   Tag prefix (default: ios-v)
  --remote <name>         Git remote (default: origin)
  --allow-dirty           Don't fail on a dirty working tree
  -h, --help              Show this help
`);
  process.exit(0);
}

const positional: string[] = [];
const opts: Record<string, string | boolean> = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--allow-dirty") opts.allowDirty = true;
  else if (a === "--ios-dir") opts.iosAppDir = args[++i] ?? "";
  else if (a === "--tag-prefix") opts.tagPrefix = args[++i] ?? "";
  else if (a === "--remote") opts.remote = args[++i] ?? "";
  else if (a?.startsWith("--")) throw new Error(`Unknown option: ${a}`);
  else if (a) positional.push(a);
}

try {
  const result = release({
    bump: positional[0],
    iosAppDir: opts.iosAppDir as string | undefined,
    tagPrefix: opts.tagPrefix as string | undefined,
    remote: opts.remote as string | undefined,
    allowDirty: opts.allowDirty as boolean | undefined,
  });
  console.log(`✓ ${result.previous} → ${result.next}  (pushed ${result.tag})`);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
