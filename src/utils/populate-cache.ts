import { promises as fs } from 'fs'
import { IMPORTS_CACHE, CACHE_FOLDER } from '../constants/filepaths'
import { doesCacheFolderExist } from './get-cache'
import { doesFileExist } from './helpers'
import { ProjectImportInfo, ProjectDependencyInfo } from './types'

export const writeCacheFile = async (projectInfo: ProjectImportInfo) => {
  const cacheFolderExists = await doesCacheFolderExist()
  if (!cacheFolderExists) {
    fs.mkdir(CACHE_FOLDER)
  }
  await fs.writeFile(IMPORTS_CACHE, JSON.stringify(projectInfo))
}

export const cacheOrDestroyBundles = async (
  LWC_ROOT: string,
  dependencies: ProjectDependencyInfo
) => {
  Object.keys(dependencies).forEach(async depName => {
    // check if there's a bundle in lwc with that name
    if (await doesFileExist(`${LWC_ROOT}/${depName}`)) {
      // if yes check if it has a export file
      if (await doesFileExist(`${LWC_ROOT}/${depName}/${depName}.js`)) {
        // if yes rename to move into cache
        await fs.rename(`${LWC_ROOT}/${depName}`, `${CACHE_FOLDER}/${depName}`)
      } else {
        const bundleDir = await fs.readdir(`${LWC_ROOT}/${depName}`)
        bundleDir.forEach(fName => {
          fs.unlink(`${LWC_ROOT}/${depName}/${fName}`)
        })

        fs.rmdir(`${LWC_ROOT}/${depName}`)
      }
    }
  })
}
