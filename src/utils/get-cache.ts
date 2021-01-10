import type { Cache as PreBundleCache } from '../types/cache'

import { promises as fs } from 'fs'
import { IMPORTS_CACHE, CACHE_FOLDER } from '../constants/filepaths'

export const doesCacheFileExist = async () => {
  try {
    await fs.access(IMPORTS_CACHE)
    return true
  } catch (error) {
    return false
  }
}
export const doesCacheFolderExist = async () => {
  try {
    await fs.access(CACHE_FOLDER)
    return true
  } catch (error) {
    return false
  }
}

type CacheReturner = () => Promise<PreBundleCache> | null

export const cachedImports: CacheReturner = async () => {
  if (await doesCacheFileExist()) {
    const cacheFile = await fs.readFile(IMPORTS_CACHE)
    return JSON.parse(cacheFile.toString())
  }
  return null
}
