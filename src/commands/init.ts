import { Command, flags } from '@oclif/command'
import augmentIgnoreFiles from '../utils/ignore-files'

export default class Init extends Command {
  static description = 'Configure your project for usage with lwc-prebundle'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  async run() {
    augmentIgnoreFiles()
  }
}
