# @elumixor/release-ios

One-shot iOS release script: bumps `CFBundleShortVersionString` via `agvtool`, commits, tags `ios-v<version>`, and pushes. Pairs with a tag-triggered CI workflow (fastlane / GitHub Actions) that builds and uploads to TestFlight.

## Install

```bash
bun add -D @elumixor/release-ios
```

Add to your root `package.json`:

```json
{ "scripts": { "release": "release-ios" } }
```

## Use

```bash
bun run release            # patch bump (1.0.2 → 1.0.3)
bun run release minor      # 1.0.3 → 1.1.0
bun run release major      # 1.0.3 → 2.0.0
bun run release 1.2.0      # explicit version
```

## Options

```
--ios-dir <path>      directory holding .xcodeproj  (default: apps/frontend/ios/App)
--tag-prefix <prefix> tag prefix                    (default: ios-v)
--remote <name>       git remote                    (default: origin)
--allow-dirty         skip the dirty-tree check
```

## Programmatic

```ts
import { release } from "@elumixor/release-ios";

const { previous, next, tag } = release({ bump: "minor" });
```
