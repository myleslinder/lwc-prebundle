import { Command, flags } from '@oclif/command'
import { FALLBACK_LWC_ROOT } from '../constants/filepaths'
import { cachedImports } from '../utils/get-cache'
import resetImports from '../utils/reset-imports'

export default class Cleanup extends Command {
  static description = 'describe the command here'

  static flags = {
    help: flags.help({ char: 'h' }),
    root: flags.string({
      char: 'r',
      description: 'the path from the project root the lwc directory',
    }),
  }

  async run() {
    const { flags } = this.parse(Cleanup)
    await resetImports(flags.root || FALLBACK_LWC_ROOT, await cachedImports())
  }
}
