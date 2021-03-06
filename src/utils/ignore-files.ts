import { promises as fs } from 'fs'

const ignoreFiles: { name: string; insert: string }[] = [
  { name: '.forceignore', insert: '\n# LWC Prebundle\n**/external_module.js' },
  { name: '.gitignore', insert: '\n# LWC Prebundle\n.lwc-prebundle/' },
]

export default async () => {
  ignoreFiles.forEach(async info => {
    try {
      await fs.access(info.name)

      const file = await fs.readFile(info.name)
      const fileContents = file.toString()

      if (!fileContents.includes(info.insert)) {
        await fs.appendFile(info.name, info.insert)
      }
    } catch (error) {
      throw error
    }
  })
}
