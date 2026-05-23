import { execFileSync, execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface ReleaseOptions {
  /** Bump kind or explicit semver. Default: "patch". */
  bump?: "patch" | "minor" | "major" | string;
  /** Repo root (where `git` and the `apps/...` paths resolve from). Default: process.cwd(). */
  cwd?: string;
  /** Path to the directory containing the Xcode project (the one holding `*.xcodeproj`). Default: `apps/frontend/ios/App`. */
  iosAppDir?: string;
  /** Tag prefix. Default: "ios-v". */
  tagPrefix?: string;
  /** Git remote to push to. Default: "origin". */
  remote?: string;
  /** If true, skip the dirty-tree check (dangerous). Default: false. */
  allowDirty?: boolean;
}

export interface ReleaseResult {
  previous: string;
  next: string;
  tag: string;
}

const sh = (cmd: string, args: string[], cwd: string): string =>
  execFileSync(cmd, args, { cwd, encoding: "utf8" }).trim();

function readMarketingVersion(iosAppDir: string): string {
  // agvtool reads CFBundleShortVersionString from Info.plist. When the plist
  // uses $(MARKETING_VERSION), agvtool returns the placeholder — fall back to
  // parsing the .xcodeproj/project.pbxproj for the actual build setting.
  const fromAgv = sh("xcrun", ["agvtool", "what-marketing-version", "-terse1"], iosAppDir);
  if (/^\d+\.\d+/.test(fromAgv)) return fromAgv;

  const xcodeproj = readdirSync(iosAppDir).find((f) => f.endsWith(".xcodeproj"));
  if (!xcodeproj) throw new Error(`No .xcodeproj found in ${iosAppDir}`);
  const pbxproj = readFileSync(resolve(iosAppDir, xcodeproj, "project.pbxproj"), "utf8");
  const match = pbxproj.match(/MARKETING_VERSION\s*=\s*([0-9]+(?:\.[0-9]+){1,2})/);
  if (!match) throw new Error(`MARKETING_VERSION not found in ${xcodeproj}/project.pbxproj`);
  // Normalize 1.0 → 1.0.0 so bumping works
  const v = match[1] as string;
  const parts = v.split(".");
  while (parts.length < 3) parts.push("0");
  return parts.join(".");
}

function bumpVersion(current: string, bump: string): string {
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump;
  const match = current.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Cannot parse current marketing version: ${current}`);
  const [major, minor, patch] = match.slice(1).map(Number) as [number, number, number];
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  if (bump === "major") return `${major + 1}.0.0`;
  throw new Error(`Unknown bump: ${bump}. Use patch|minor|major|<x.y.z>`);
}

export function release(opts: ReleaseOptions = {}): ReleaseResult {
  const bump = opts.bump ?? "patch";
  const cwd = resolve(opts.cwd ?? process.cwd());
  const iosAppDir = resolve(cwd, opts.iosAppDir ?? "apps/frontend/ios/App");
  const tagPrefix = opts.tagPrefix ?? "ios-v";
  const remote = opts.remote ?? "origin";

  const previous = readMarketingVersion(iosAppDir);
  const next = bumpVersion(previous, bump);
  const tag = `${tagPrefix}${next}`;

  if (!opts.allowDirty) {
    const dirty = sh("git", ["status", "--porcelain"], cwd);
    if (dirty) throw new Error("Working tree not clean — commit or stash first.");
  }

  const existing = sh("git", ["tag", "-l", tag], cwd);
  if (existing) throw new Error(`Tag ${tag} already exists.`);

  // agvtool both prints and exits 0 even with no change; pipe its output to capture changed files.
  execSync(`xcrun agvtool new-marketing-version ${next}`, { cwd: iosAppDir, stdio: "ignore" });

  sh("git", ["add", "--all", "apps/frontend/ios"], cwd);
  sh("git", ["commit", "-m", `release(ios): v${next}`], cwd);
  sh("git", ["tag", tag], cwd);
  sh("git", ["push", remote], cwd);
  sh("git", ["push", remote, tag], cwd);

  return { previous, next, tag };
}
