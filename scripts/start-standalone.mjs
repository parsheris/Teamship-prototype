import { spawn } from "node:child_process"
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function loadEnvFile(file) {
  if (!existsSync(file)) return

  const contents = readFileSync(file, "utf8")

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const separator = trimmed.indexOf("=")
    if (separator < 1) continue

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvFile(path.join(root, ".env.local"))
loadEnvFile(path.join(root, ".env"))

const standaloneDir = path.join(root, ".next", "standalone")
const serverFile = path.join(standaloneDir, "server.js")

if (!existsSync(serverFile)) {
  console.error("[spark-kiosk] No standalone build found. Run `npm run build` first.")
  process.exit(1)
}

const assets = [
  [path.join(root, "public"), path.join(standaloneDir, "public")],
  [path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static")],
]

for (const [source, destination] of assets) {
  if (existsSync(source)) {
    rmSync(destination, { recursive: true, force: true })
    cpSync(source, destination, { recursive: true })
  } else if (!existsSync(destination)) {
    console.error(`[spark-kiosk] Missing build assets: ${source}`)
    process.exit(1)
  }
}

const env = { ...process.env }
env.DATA_DIR = path.resolve(root, env.DATA_DIR || ".data")

const adminFile = path.join(env.DATA_DIR, "admin.json")
if (!existsSync(adminFile)) {
  const pin = env.ADMIN_PIN?.trim()
  if (!pin || !/^\d{4}$/.test(pin)) {
    console.error(
      "[spark-kiosk] Set ADMIN_PIN to a 4-digit PIN before the first production start.",
    )
    process.exit(1)
  }
}

const child = spawn(process.execPath, [serverFile], {
  cwd: root,
  env,
  stdio: "inherit",
})

child.on("error", (error) => {
  console.error("[spark-kiosk] Could not start the server:", error)
  process.exit(1)
})

child.on("exit", (code) => {
  process.exit(code ?? 0)
})

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal)
  })
}
