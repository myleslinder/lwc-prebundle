import { Command, flags } from '@oclif/command'
import { FALLBACK_LWC_ROOT } from '../constants/filepaths'
import { getCachedProjectInfo } from '../utils/get-cache'
import { resetFileImports } from '../utils/helpers'
import { cacheOrDestroyBundles } from '../utils/populate-cache'

export default class Cleanup extends Command {
  static description = 'describe the command here'

  static flags = {
    help: flags.help({ char: 'h' }),
    root: flags.string({
      char: 'r',
      description: 'the path from the project root to the lwc directory',
    }),
  }

  async run() {
    const { flags } = this.parse(Cleanup)
    const projectCache = await getCachedProjectInfo()
    if (projectCache) {
      await resetFileImports(
        flags.root || FALLBACK_LWC_ROOT,
        projectCache.components
      )
      await cacheOrDestroyBundles(
        flags.root || FALLBACK_LWC_ROOT,
        projectCache.dependencies
      )
    }
  }
}
