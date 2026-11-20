import { promises as fs } from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"

const locks = new Map<string, Promise<unknown>>()

export function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(process.cwd(), ".data")
}

export function getDataFile(name: string): string {
  return path.join(getDataDir(), name)
}

export async function withFileLock<T>(file: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(file) ?? Promise.resolve()
  const run = previous.then(task, task)

  locks.set(
    file,
    run.then(
      () => undefined,
      () => undefined,
    ),
  )

  return run
}

export async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    const contents = await fs.readFile(file, "utf8")
    return JSON.parse(contents) as T
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === "ENOENT") return fallback
    if (error instanceof SyntaxError) {
      console.error(`[spark-kiosk] Could not parse ${file}; starting fresh.`)
      return fallback
    }
    throw error
  }
}

export async function writeJsonFile(file: string, value: unknown): Promise<void> {
  const directory = path.dirname(file)
  const temporaryFile = `${file}.${process.pid}.${randomUUID()}.tmp`
  const contents = `${JSON.stringify(value, null, 2)}\n`

  await fs.mkdir(directory, { recursive: true, mode: 0o700 })
  await fs.writeFile(temporaryFile, contents, { encoding: "utf8", mode: 0o600 })
  await fs.rename(temporaryFile, file)
}
