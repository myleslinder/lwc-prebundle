import type { Cache as PreBundleCache } from '../types/cache'

import { promises as fs } from 'fs'
import { IMPORTS_CACHE, CACHE_FOLDER } from '../constants/filepaths'
import { doesCacheFileExist, doesCacheFolderExist } from './get-cache'

export const cacheImports = async (newImports: PreBundleCache) => {
  const cacheFolderExists = await doesCacheFolderExist()
  if (!cacheFolderExists) {
    fs.mkdir(CACHE_FOLDER)
  }
  const cacheExists = await doesCacheFileExist()
  const newCache = { ...newImports }
  if (cacheExists) {
    const file = await fs.readFile(IMPORTS_CACHE)
    const existingCache: PreBundleCache = JSON.parse(file.toString())
    Object.keys(newImports).forEach(name => {
      if (newImports[name].cacheHit) {
        newCache[name] = existingCache[name]
      } else {
        newCache[name] = newImports[name]
      }
    })
  }
  await fs.writeFile(CACHE_FOLDER, JSON.stringify(newCache))
}
