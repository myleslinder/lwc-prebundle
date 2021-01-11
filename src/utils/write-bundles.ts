import type { ProjectDependencyInfo } from './types'
import { promises as fs } from 'fs'
import { rollup } from 'rollup'
import auto from '@rollup/plugin-auto-install'
import resolve from '@rollup/plugin-node-resolve'
import { doesFileExist, constructXmlFile, makeExportStatement } from './helpers'
import { CACHE_FOLDER } from '../constants/filepaths'
import {
  checkCachedModules,
  doesCacheFileExist,
  doesCacheFolderExist,
  isDepInCache,
} from './get-cache'

const canServeCachedDependencyBundle = async (
  depName: string,
  modules: string[]
) => {
  return (
    doesCacheFolderExist() &&
    doesCacheFileExist() &&
    isDepInCache(depName) &&
    checkCachedModules(depName, modules)
  )
}

export const writeDependencyBundles = async (
  LWC_ROOT: string,
  dependencyInfos: ProjectDependencyInfo
) => {
  const bundles = Object.keys(dependencyInfos).map(async depName => {
    const path = `${LWC_ROOT}/${depName}`
    const depBundleExists = await doesFileExist(path)
    // the rollup exercise will error out of user cmp file with same name as  module exists
    if (!depBundleExists) {
      if (
        await canServeCachedDependencyBundle(
          depName,
          dependencyInfos[depName].modules
        )
      ) {
        return fs.rename(`${CACHE_FOLDER}/${depName}`, path)
      }
      await fs.mkdir(`${path}`)
    }

    await fs.writeFile(`${path}/${depName}.js-meta.xml`, constructXmlFile())
    const addedStatement = makeExportStatement(
      depName,
      dependencyInfos[depName].modules,
      dependencyInfos[depName].isDefault
    )
    const input = `${path}/external_module.js`
    await fs.writeFile(input, addedStatement)

    const bundle = await rollup({ input, plugins: [auto(), resolve()] })
    return bundle.write({ format: 'esm', file: `${path}/${depName}.js` })
  })
  return Promise.all(bundles)
}
