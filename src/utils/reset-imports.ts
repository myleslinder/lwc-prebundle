import type { Cache as PreBundleCache } from '../types/cache'

import { promises as fs } from 'fs'
import { cachedImports } from './get-cache'

const isJsFile = (fileName: string) => fileName.endsWith('.js')

const removeExternalAllowDep = (s: string) => {
  return !s.startsWith('.') && !s.includes('config')
}

export default async (
  LWC_ROOT: string,
  overwriteCache: PreBundleCache | null = null
) => {
  const lwcDirs = await fs.readdir(LWC_ROOT)
  lwcDirs.filter(removeExternalAllowDep).forEach(async dir => {
    const cache = overwriteCache ?? (await cachedImports())
    if (cache !== null) {
      if (cache[dir]) {
        await fs.rename(`${LWC_ROOT}/${dir}`, `.lwc-prebundle/${dir}`)
        return
      }
      const files = await fs.readdir(`${LWC_ROOT}/${dir}`)
      files.filter(isJsFile).forEach(async f => {
        const codeFile = await fs.readFile(`${LWC_ROOT}/${dir}/${f}`)
        let codeString = codeFile.toString()
        Object.keys(cache).forEach(name => {
          codeString = codeString.replaceAll(`c/${name}`, name)
        })
        await fs.writeFile(`${LWC_ROOT}/${dir}/${f}`, codeString)
      })
    }
  })
}
