import * as aws from 'aws-sdk'
import { execSync } from './util'
import { runConfig, sendNotification, runTask } from './backup'
import { Config } from './index'
import { backupConfigEnvKey, AWSConfig } from '.'

const mongoHost = process.env.DOCKER_HOST_IP

const awsConfig = require('./.tmp/aws.json') as AWSConfig

const config: Config = {
  tasks: [
    {
      name: 'bbooks-reader',
      dumps: [
        {
          uri: `mongodb://${mongoHost}/bbooks_reader_dev`,
          collection: 'users'
        }
      ]
    }
  ],
  upload: {
    bucket: 'mongodb-dump-test',
    awsConfig
    //folder: 'nested/folder'
  }
}

const testDocker = () => {
  const dockerImage = 'whitecolor/mongodb-backup:latest'

  const envStr = [
    `-e "${backupConfigEnvKey}=${JSON.stringify(config).replace(/"/g, '\\"')}"`
  ].join(' ')
  execSync(`docker run --name mongo-backup --rm ${envStr} ${dockerImage}`)
}

// aws.config.loadFromPath('.tmp/aws.json')
// runConfig(config)

// const CronJob = require('cron').CronJob
// new CronJob('* * * * * *', function() {
//   console.log('You will see this message every second')
// },  null, true)
