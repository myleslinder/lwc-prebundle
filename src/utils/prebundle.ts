import { resetFileImports, redirectCmpFileImports } from './helpers'
import { buildProjectInfo } from './build-info'
import { writeCacheFile } from './populate-cache'

import { writeDependencyBundles } from './write-bundles'

export const prebundle = async (LWC_ROOT: string) => {
  const projectInfo = await buildProjectInfo(LWC_ROOT)
  try {
    await writeDependencyBundles(LWC_ROOT, projectInfo.dependencies)
    Object.keys(projectInfo.components).forEach(cmpName => {
      projectInfo.components[cmpName].fileContents = ''
    })
    await writeCacheFile(projectInfo)
  } catch (error) {
    throw error
  } finally {
    await resetFileImports(LWC_ROOT, projectInfo.components)
  }
  await redirectCmpFileImports(
    LWC_ROOT,
    projectInfo.components,
    Object.keys(projectInfo.dependencies)
  )
}
