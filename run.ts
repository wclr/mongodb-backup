import { runConfig } from './backup'

import { backupConfigEnvKey } from '.'

const envConfig = process.env[backupConfigEnvKey]

const config = envConfig
  ? (() => {
      try {
        return JSON.parse(envConfig)
      } catch (e) {
        console.log('Error parsing backup config')
        console.log(e)
        return null
      }
    })()
  : null

if (config) {
  runConfig(config)
} else {
  console.log('No proper backup config supplied.')
  process.exit(0)
}
