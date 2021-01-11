import {
  ComponentImportInfo,
  DependencyInfo,
  ProjectDependencyInfo,
} from './types'
import { promises as fs } from 'fs'

export const removeExtModules = (dependencies: any, s: string) => {
  return !dependencies[s] && !s.startsWith('.') && !s.includes('config')
}

export const isValidFileType = (fileName: string) => fileName.endsWith('.js')

export const getImports = (s: string) => {
  const importRegexPattern = /import(?:["'\s]*([\w*{}\n\r\t, ]+)from\s*)?["'\s].*([@\w/_-]+)["'\s].*;+$/
  const isImportStatement = (s: string) => importRegexPattern.test(s)
  const isCommentedOut = (s: string) =>
    !s.startsWith('//') && !s.startsWith('/*')
  return s.split('\n').filter(isImportStatement).filter(isCommentedOut)
}

export const normalizeImportName = (name: string) => {
  return name.replaceAll('/', '__lwc__')
}

export const denormalizeImportName = (name: string) => {
  return name.replaceAll('__lwc__', '/')
}

const isExternalDependency = (s: string) => {
  return (
    s.startsWith('.') ||
    s.startsWith('@salesforce') ||
    s.startsWith('lightning') ||
    s === 'lwc'
  )
}

const getModulesFromImport = (importStatement: string) => {
  let listStart = importStatement.search(/([{])/)
  let listEnd = importStatement.search(/([}])/)
  let isDefault = false

  if (listStart < 0) {
    listStart = 'import'.length
    listEnd = importStatement.search(/from/)
    isDefault = true
  }
  let names = importStatement.slice(listStart + 1, listEnd)
  if (isDefault) {
    names = names.trim()
  }
  return {
    names: names.split(','),
    isDefault,
  }
}

export const getDependenciesFromImport = (importStatement: string) => {
  const dependencyStart = importStatement.search(/(['"])/)
  const dependencyPortion = importStatement.slice(dependencyStart + 1)
  const dependencyEnd = dependencyPortion.search(/(['"])/)

  const name = normalizeImportName(dependencyPortion.slice(0, dependencyEnd))
  const isNamespaced = name.startsWith('c/')
  const isExternal = isExternalDependency(name)
  const modules = getModulesFromImport(importStatement)
  return {
    name,
    isNamespaced,
    isExternal,
    modules,
  }
}

export const updateProjectDependencyInfo = (
  dependencies: ProjectDependencyInfo,
  newDeps: DependencyInfo
) => {
  if (newDeps.isExternal) {
    return { ...dependencies }
  }
  const {
    modules: { isDefault, names },
  } = newDeps
  if (dependencies[newDeps.name] === undefined) {
    return {
      ...dependencies,
      [newDeps.name]: {
        isDefault,
        modules: names,
      },
    }
  }
  const existingModules = dependencies[newDeps.name].modules
  const modulesToAdd = names.filter(name => !existingModules.includes(name))
  return {
    ...dependencies,
    [newDeps.name]: {
      isDefault,
      modules: [...existingModules, ...modulesToAdd],
    },
  }
}

export const doesFileExist = async (path: string) => {
  try {
    await fs.access(path)
    return true
  } catch (error) {
    return false
  }
}

export const constructXmlFile = (v = '50') =>
  `<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata"><apiVersion>${
    v ? (v.includes('.') ? v : `${v}.0`) : '50.0'
  }</apiVersion><isExposed>false</isExposed></LightningComponentBundle>`

export const makeExportStatement = (
  name: string,
  modules: string[],
  isDefaultExport: boolean
) => {
  if (isDefaultExport) {
    return `import ${modules.join('')} from "${denormalizeImportName(
      name
    )}";export default ${modules.join('')};
      `
  }
  return `export {${modules.join(', ')}} from "${denormalizeImportName(name)}";`
}

export const updateImportsLocation = (s: string, deps: string[]) => {
  let newCodeString = s
  deps.forEach((dep: string) => {
    newCodeString = newCodeString
      .replaceAll(
        `"${denormalizeImportName(dep)}"`,
        `"c/${denormalizeImportName(dep)}"`
      )
      .replaceAll(
        `'${denormalizeImportName(dep)}'`,
        `'c/${denormalizeImportName(dep)}'`
      )
  })
  return newCodeString
}

export const resetFileImports = (
  LWC_ROOT: string,
  components: { [cmpName: string]: ComponentImportInfo }
) => {
  const writePromises = Object.keys(components).map(async cmpName => {
    const cmpInfo = components[cmpName]
    const path = cmpInfo.pathname
    const newContents = cmpInfo.fileContents
    cmpInfo.imports.dependencies.forEach(depInfo => {
      cmpInfo.fileContents.replaceAll(`c/${depInfo.name}`, depInfo.name)
    })

    return fs.writeFile(path, newContents)
  })
  return Promise.all(writePromises)
}

export const redirectCmpFileImports = async (
  LWC_ROOT: string,
  components: { [cmpName: string]: ComponentImportInfo },
  dependencyNames: string[]
) => {
  const writePromises = Object.keys(components).map(async cmpName => {
    const cmpInfo = components[cmpName]
    const path = cmpInfo.pathname
    return fs.writeFile(
      path,
      updateImportsLocation(cmpInfo.fileContents, dependencyNames)
    )
  })
  return Promise.all(writePromises)
}
