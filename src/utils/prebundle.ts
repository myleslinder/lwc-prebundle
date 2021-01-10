import type { PreBundledCacheItem } from '../types/cache'

import { promises as fs } from 'fs'

import { rollup } from 'rollup'
import resolve from '@rollup/plugin-node-resolve'
import auto from '@rollup/plugin-auto-install'

import { CACHE_FOLDER } from '../constants/filepaths'
import { cachedImports } from './get-cache'
import resetImports from './reset-imports'

const removeExtModules = (dependencies: any, s: string) => {
  return !dependencies[s] && !s.startsWith('.') && !s.includes('config')
}

const isJsFile = (fileName: string) => fileName.endsWith('.js')
const getImports = (s: string) => {
  const importRegexPattern = /import(?:["'\s]*([\w*{}\n\r\t, ]+)from\s*)?["'\s].*([@\w/_-]+)["'\s].*;+$/
  const isImportStatement = (s: string) => importRegexPattern.test(s)
  const isCommentedOut = (s: string) =>
    !s.startsWith('//') && !s.startsWith('/*')
  return s.split('\n').filter(isImportStatement).filter(isCommentedOut)
}

const normalizeImportName = (name: string) => {
  return name.replaceAll('/', '__lwc__')
}

const denormalizeImportName = (name: string) => {
  return name.replaceAll('__lwc__', '/')
}

const pluckModuleName = (importStatement: string) => {
  const moduleStart = importStatement.search(/(['"])/)
  const modulePortion = importStatement.slice(moduleStart + 1)
  const moduleEnd = modulePortion.search(/(['"])/)

  const modName = modulePortion.slice(0, moduleEnd)
  if (!modName.startsWith('c/')) {
    return normalizeImportName(modName)
  }
  return null
}

const isInternalOrSfImports = (s: string) => {
  return (
    s === null ||
    s.startsWith('.') ||
    s.startsWith('@salesforce') ||
    s.startsWith('lightning') ||
    s === 'lwc'
  )
}

type ItemNames = {
  names: string[]
  isDefaultExport: boolean
}
type ItemNamePlucker = (
  importStatement: string,
  existing: string[]
) => ItemNames
const pluckItemNames: ItemNamePlucker = (
  importStatement: string,
  existing: string[]
) => {
  if (existing === undefined) {
    existing = []
  }
  let listStart = importStatement.search(/([{])/)
  let listEnd = importStatement.search(/([}])/)
  let isDefaultExport = false

  if (listStart < 0) {
    listStart = 'import'.length
    listEnd = importStatement.search(/from/)
    isDefaultExport = true
  }
  let names = importStatement.slice(listStart + 1, listEnd)
  if (isDefaultExport) {
    names = names.trim()
  }
  return {
    names: names.split(',').filter(name => !existing.includes(name)),
    isDefaultExport,
  }
}

const constructXmlFile = (v = '50') =>
  `<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata"><apiVersion>${
    v ? (v.includes('.') ? v : `${v}.0`) : '50.0'
  }</apiVersion><isExposed>false</isExposed></LightningComponentBundle>`

const doesFileExist = async (path: string) => {
  try {
    await fs.access(path)
    return true
  } catch (error) {
    return false
  }
}

// lwc currently only supports export import
// for named exports so need to treat default differently
const makeExportStatement = (name: string, info: PreBundledCacheItem) => {
  if (info.isDefaultExport) {
    return `import ${info.items.join('')} from "${denormalizeImportName(
      name
    )}";export default ${info.items.join('')};
    `
  }
  return `export {${info.items.join(', ')}} from "${denormalizeImportName(
    name
  )}";`
}

const updateImportsLocation = (s: string, deps: string[]) => {
  let newCodeString = s
  const seenDeps = new Set()
  deps.forEach((dep: string) => {
    if (!seenDeps.has(dep)) {
      newCodeString = newCodeString
        .replaceAll(
          `"${denormalizeImportName(dep)}"`,
          `"c/${denormalizeImportName(dep)}"`
        )
        .replaceAll(
          `'${denormalizeImportName(dep)}'`,
          `'c/${denormalizeImportName(dep)}'`
        )

      seenDeps.add(dep)
    }
  })
  return newCodeString
}

export const prebundle = async (LWC_ROOT: string) => {
  const moduleInfo: { [name: string]: PreBundledCacheItem } | {} = {}
  const pkgJsonFile = await fs.readFile('./package.json')
  const pkgJsonContents = JSON.parse(pkgJsonFile.toString())
  const dependencies = pkgJsonContents.dependencies
  const lwcRoot = await fs.readdir(LWC_ROOT)
  const lwcDirs = lwcRoot.filter(d => removeExtModules(dependencies, d))

  lwcDirs.forEach(async dir => {
    const files = await fs.readdir(`${LWC_ROOT}/${dir}`)
    const jsfiles = files.filter(isJsFile)

    jsfiles.forEach(async f => {
      const codeFile = await fs.readFile(`${LWC_ROOT}/${dir}/${f}`)
      const codeString = codeFile.toString()
      const importDeclarations = getImports(codeString)

      importDeclarations.forEach(d => {
        const modName = pluckModuleName(d) ?? ''
        if (!isInternalOrSfImports(modName)) {
          const info: PreBundledCacheItem | {} = moduleInfo[modName] || {}
          const itemNames = pluckItemNames(d, info.items)
          if (info.items === undefined) {
            moduleInfo[modName] = {
              items: itemNames.names,
              isDefaultExport: itemNames.isDefaultExport,
            }
          } else {
            info.items = [...info.items, ...itemNames.names]
            info.isDefaultExport = itemNames.isDefaultExport
          }
        }
      })

      const moduleNames = Object.keys(moduleInfo)

      moduleNames.forEach(async name => {
        const cache = await cachedImports()
        if (cache && cache[name]) {
          if (
            cache[name].isDefaultExport === moduleInfo[name].isDefaultExport
          ) {
            let countInCache = 0
            for (let i of moduleInfo[name].items) {
              if (!cache[name].items.includes(i)) {
                break
              }
              countInCache++
            }

            if (countInCache === moduleInfo[name].items.length) {
              const doesCachedFileExist = await doesFileExist(
                `${CACHE_FOLDER}/${name}`
              )
              if (doesCachedFileExist) {
                await fs.rename(
                  `${CACHE_FOLDER}/${name}`,
                  `${LWC_ROOT}/${name}`
                )
                moduleInfo[name].cacheHit = true
                return
              }
            }
          }
        }
        const doesTargetBundleExist = await doesFileExist(`${LWC_ROOT}/${name}`)
        if (!doesTargetBundleExist) {
          await fs.mkdir(`${LWC_ROOT}/${name}`)
        }
        await fs.writeFile(
          `${LWC_ROOT}/${name}/${name}.js-meta.xml`,
          constructXmlFile('50.0')
        )
        const addedStatement = makeExportStatement(name, moduleInfo[name])

        await fs.writeFile(
          `${LWC_ROOT}/${name}/external_module.js`,
          addedStatement
        )

        moduleInfo[name].input = {
          input: `${LWC_ROOT}/${name}/external_module.js`,
          plugins: [auto(), resolve()],
        }
        moduleInfo[name].output = {
          format: 'esm',
          file: `${LWC_ROOT}/${name}/${name}.js`,
        }

        try {
          const bundle = await rollup(moduleInfo[name].input)
          bundle.write(moduleInfo[name].output)
        } catch (error) {
          await resetImports(LWC_ROOT, {
            ...moduleInfo,
            [denormalizeImportName(name)]: {},
          })
          throw error
        }

        await fs.writeFile(
          `${LWC_ROOT}/${dir}/${f}`,
          updateImportsLocation(codeString, moduleNames)
        )
      })
    })
  })
}
