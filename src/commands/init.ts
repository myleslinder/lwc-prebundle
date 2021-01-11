import { Command, flags } from '@oclif/command'
// import inquirer = require('inquirer')
import augmentIgnoreFiles from '../utils/ignore-files'

export default class Init extends Command {
  static description = 'Configure your project for usage with lwc-prebundle'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  async run() {
    // let responses: any = await inquirer.prompt([
    //   {
    //     name: 'type',
    //     message: 'Select a project type',
    //     type: 'list',
    //     choices: [{ name: 'TypeScript' }, { name: 'JavaScript' }],
    //   },
    // ])
    await augmentIgnoreFiles()
  }
}
