# android-mcp — barn product

Hard-fork merge of `us-all/android-mcp-server` (v1.14.4) → estate identity
`@estate/android-mcp`. ADB-based, Android-**generic** MCP server with first-class
**device profiles** — each device is one profile resolved to a concrete ADB
serial. No TV/handset special-casing; profiles are the SSOT.

## Device profiles (`src/profiles.ts`)

| profile | id (serial) | model | adb target | role |
|---------|-------------|-------|-----------|------|
| `hisense-wuyishan` (default) | `0000dc9a7d3e0b65` | SmartTV 4K FFM | `10.0.0.225:5555` | living-room TV |
| `pixel-9-pro-xl` | `4C121FDAS0004Y` | Pixel 9 Pro XL | `10.0.0.77:36993` | hardware auth SSOT |

Select a profile with `ANDROID_PROFILE=<name|id|model>`; resolve at runtime
with the `list-profiles` tool. Index 0 (Hisense) is the default.

> Pixel ADB port is volatile (`:36993` rotates when re-paired via wireless
> debugging / Flotilla MCP `:25245`) — update `pixel-9-pro-xl.adbSerial` when it
> changes. The profile id (ro.serialno) is stable.

## Why this fork

us-all's complete surface (device/UI/apps/logcat/files/system/shell, 76 tools)
was chosen over martingeidobler (25 tools, emulator-oriented) and
nexus-android (native) after a trio-compare. The compare (token Jaccard
0.01–0.03 — independent engines) is pinned in
`pens/agentic-moment/products/site/compare/fixtures/android-mcp-compare.json`.

## Access & security

- ADB: `adb connect <host>:<port>`, then target via `ANDROID_SERIAL` or a profile.
- Read-only by default. Writes need `ANDROID_MCP_ALLOW_WRITE=true`; shell needs
  `ANDROID_MCP_ALLOW_SHELL=true` (separate gates).
- HTTP transport requires `MCP_HTTP_TOKEN` (or `MCP_HTTP_SKIP_AUTH=true`).

## Run / test / build

```bash
pnpm install --frozen-lockfile
pnpm test          # 94 upstream + profiles tests
pnpm build         # tsc + dist
node dist/index.js # stdio MCP (or MCP_TRANSPORT=http for LAN)
```

## Upstream

Forked 2026-10-31 from https://github.com/us-all/android-mcp-server (MIT).
`@us-all/mcp-toolkit` npm dep retained as-is (real runtime dependency).