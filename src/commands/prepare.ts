import { Command, flags } from '@oclif/command'
import { FALLBACK_LWC_ROOT } from '../constants/filepaths'
import { prebundle } from '../utils/prebundle'

export default class Prepare extends Command {
  static description = 'describe the command here'

  static flags = {
    help: flags.help({ char: 'h' }),
    root: flags.string({
      char: 'r',
      description: 'the path from the project root the lwc directory',
    }),
  }

  // static args = [{ name: 'lwc-root' }]

  async run() {
    const { flags } = this.parse(Prepare)
    await prebundle(flags.root || FALLBACK_LWC_ROOT)
  }
}
