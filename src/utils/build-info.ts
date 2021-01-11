import { promises as fs } from 'fs'

import {
  getImports,
  removeExtModules,
  isValidFileType,
  getDependenciesFromImport,
  updateProjectDependencyInfo,
} from './helpers'
import type {
  DependencyInfo,
  ComponentImportInfo,
  ProjectImportInfo,
} from './types'

const getPackageJson = async () => {
  const pkgJsonFile = await fs.readFile('./package.json')
  return JSON.parse(pkgJsonFile.toString())
}

export const buildProjectInfo = async (LWC_ROOT: string) => {
  const lwcRoot = await fs.readdir(LWC_ROOT)
  const packageJson = await getPackageJson()
  const lwcDirs = lwcRoot.filter(d =>
    removeExtModules(packageJson.dependencies, d)
  )

  const filePathsPromises = lwcDirs.reduce(
    async (filePathsPromise: Promise<string[] | []>, dirname) => {
      const filePaths = await filePathsPromise
      const fileNames = await fs.readdir(`${LWC_ROOT}/${dirname}`)
      const dirTargetFilePaths = fileNames.filter(isValidFileType).map(f => {
        return `${LWC_ROOT}/${dirname}/${f}`
      })
      return [...filePaths, ...dirTargetFilePaths]
    },
    Promise.resolve([])
  )

  const filePaths = await filePathsPromises
  const projectInfoPromise: Promise<ProjectImportInfo> = filePaths.reduce(
    async (projectDependencyInfoPromise, pathname) => {
      const {
        components,
        dependencies: knownDeps,
      } = await projectDependencyInfoPromise

      const pathSegments = pathname.split('/')
      const cmpName = pathSegments[pathSegments.length - 1]
      const fileName = cmpName.slice(0, cmpName.lastIndexOf('.'))
      const fileExtension = cmpName.slice(cmpName.lastIndexOf('.'))
      const bundleName = pathSegments[pathSegments.length - 2]
      const isCmpFile = cmpName === bundleName

      const fileBlob = await fs.readFile(pathname)
      const fileContents = fileBlob.toString()
      const statements = getImports(fileContents)

      let dependencies = { ...knownDeps }

      const fileDependencies: DependencyInfo[] = statements.map(statement => {
        const deps = getDependenciesFromImport(statement)
        dependencies = updateProjectDependencyInfo(dependencies, deps)
        return deps
      })

      const cmpInfo: ComponentImportInfo = {
        cmpName,
        bundleName,
        fileName,
        fileExtension,
        pathname,
        fileContents,
        isCmpFile,
        imports: {
          statements,
          dependencies: fileDependencies,
        },
      }

      return {
        dependencies,
        components: {
          ...components,
          [cmpName]: cmpInfo,
        },
      }
    },
    Promise.resolve({ dependencies: {}, components: {} })
  )
  return projectInfoPromise
}
