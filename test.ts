import * as aws from 'aws-sdk'
import { execSync } from './util'
import { runConfig, sendNotification, runTask } from './backup'
import { Config } from './index'
import { backupConfigEnvKey, AWSConfig } from '.'

const mongoHost = process.env.DOCKER_HOST_IP

const awsConfig = require('./.tmp/aws.json') as AWSConfig

const tasks = [
  {
    name: 'bbooks-reader',
    dumps: [
      {
        uri: `mongodb://${mongoHost}/bbooks_reader_dev`,
        collection: 'users'
      }
    ]
  }
]

const config: Config = {
  jobs: [
    {
      schedule: '0 0 0 ? * 1/3',
      //schedule: '0 42 * * * *',
      
      tasks
    }
  ],
  //tasks,
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

var schedule = require('node-schedule');

console.log('Wating for something')
// var j = schedule.scheduleJob('42 * * * * *', function(){
//   console.log('The answer to life, the universe, and everything!');
// });

// aws.config.loadFromPath('.tmp/aws.json')
//runConfig(config)

// const CronJob = require('cron').CronJob
// new CronJob('* * * * * *', function() {
//   console.log('You will see this message every second')
// },  null, true)
