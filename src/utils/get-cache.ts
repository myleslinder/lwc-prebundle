import type { ProjectImportInfo } from './types'

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
export const isDepInCache = async (depName: string) => {
  try {
    await fs.access(`${CACHE_FOLDER}/${depName}`)
    return true
  } catch (error) {
    return false
  }
}

export const getCachedProjectInfo = async () => {
  if (await doesCacheFileExist()) {
    const cacheBlob = await fs.readFile(`${IMPORTS_CACHE}`)
    const cacheJson: ProjectImportInfo = JSON.parse(cacheBlob.toString())
    return cacheJson
  }
}

export const checkCachedModules = async (
  depName: string,
  modules: string[]
) => {
  const cacheJson = await getCachedProjectInfo()
  if (cacheJson) {
    // eslint-disable-next-line prefer-const
    for (let name of modules) {
      if (
        cacheJson.dependencies[depName] === undefined ||
        !cacheJson.dependencies[depName].modules.includes(name)
      ) {
        return false
      }
    }
    return true
  }
  return false
}

export const doesCacheFolderExist = async () => {
  try {
    await fs.access(CACHE_FOLDER)
    return true
  } catch (error) {
    return false
  }
}
