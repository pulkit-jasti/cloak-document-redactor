const DIR_NAME = 'cloak-models'

type Meta = { headers: [string, string][] }

type SyncAccessHandle = {
  write: (buffer: Uint8Array, options: { at: number }) => number
  truncate: (size: number) => void
  flush: () => void
  close: () => void
}

type SyncFileHandle = FileSystemFileHandle & { createSyncAccessHandle: () => Promise<SyncAccessHandle> }

let dirPromise: Promise<FileSystemDirectoryHandle> | null = null

function getDir() {
  dirPromise ??= navigator.storage.getDirectory().then((root) => root.getDirectoryHandle(DIR_NAME, { create: true }))
  return dirPromise
}

function fileName(key: string | Request) {
  const url = typeof key === 'string' ? key : key.url
  return encodeURIComponent(url)
}

async function getFile(dir: FileSystemDirectoryHandle, name: string) {
  try {
    return await (await dir.getFileHandle(name)).getFile()
  } catch {
    return null
  }
}

async function removeIfExists(dir: FileSystemDirectoryHandle, name: string) {
  try {
    await dir.removeEntry(name)
    return true
  } catch {
    return false
  }
}

async function writeBody(handle: FileSystemFileHandle, response: Response) {
  const access = await (handle as SyncFileHandle).createSyncAccessHandle()
  try {
    access.truncate(0)
    let offset = 0
    if (response.body) {
      const reader = response.body.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        offset += access.write(value, { at: offset })
      }
    }
    access.flush()
  } finally {
    access.close()
  }
}

export const opfsCache = {
  async match(key: string | Request): Promise<Response | undefined> {
    const dir = await getDir()
    const name = fileName(key)
    const metaFile = await getFile(dir, `${name}.meta`)
    if (!metaFile) return undefined
    const data = await getFile(dir, name)
    if (!data) return undefined
    const meta = JSON.parse(await metaFile.text()) as Meta
    const headers = new Headers(meta.headers)
    headers.set('content-length', String(data.size))
    return new Response(data, { status: 200, headers })
  },

  async put(key: string | Request, response: Response): Promise<void> {
    const dir = await getDir()
    const name = fileName(key)
    await removeIfExists(dir, `${name}.meta`)
    try {
      await writeBody(await dir.getFileHandle(name, { create: true }), response)
      const metaHandle = await dir.getFileHandle(`${name}.meta`, { create: true })
      await writeBody(metaHandle, new Response(JSON.stringify({ headers: [...response.headers] } satisfies Meta)))
    } catch (err) {
      await removeIfExists(dir, name)
      throw err
    }
  },

  async delete(key: string | Request): Promise<boolean> {
    const dir = await getDir()
    const name = fileName(key)
    const hadMeta = await removeIfExists(dir, `${name}.meta`)
    const hadData = await removeIfExists(dir, name)
    return hadMeta || hadData
  },
}

export function isOpfsAvailable() {
  return typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function' &&
    typeof FileSystemFileHandle !== 'undefined' && 'createSyncAccessHandle' in FileSystemFileHandle.prototype
}
