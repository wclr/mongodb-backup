import { join, resolve, relative, basename } from 'path'
import * as fs from 'fs-extra'
import * as aws from 'aws-sdk'
import { mongodump, MongoDumpOptions } from './mongo'
import {
  Config,
  BackupTaskConfig,
  UploadConfig,
  NotificationConfig
} from './index'
import * as schedule from 'node-schedule'

const zipDir = (source: string, out: string) => {
  const archiver = require('archiver')
  const archive = archiver('zip', { zlib: { level: 9 } })
  const stream = fs.createWriteStream(out)

  return new Promise((resolve, reject) => {
    archive
      .directory(source, false)
      .on('error', reject)
      .pipe(stream)

    stream.on('close', () => resolve())
    archive.finalize()
  })
}

const uploadFile = async (filePath: string, uploadConfig: UploadConfig) => {
  const s3 = new aws.S3()

  const { bucket, folder = '' } = uploadConfig
  const fileName = basename(filePath)
  const key = [folder, fileName].filter(_ => !!_).join('/')
  const data = await fs.readFile(filePath)
  console.log(`Uploading ${filePath} to AWS ${bucket}/${key}`)
  await s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: data
    })
    .promise()
}

const padZero = (size: number) => (n: number) => {
  const nStr = n.toString()
  return nStr.length < size
    ? Array(size - nStr.length + 1).join('0') + nStr
    : nStr
}

const padZero2 = padZero(2)

const dumpsDir = resolve('.tmp')
const getDateSuffix = () => {
  const d = new Date()
  return [
    [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(padZero2).join(''),
    [d.getHours(), d.getMinutes()].map(padZero2).join('')
  ].join('_')
}
const runDump = async (options: MongoDumpOptions, out: string) => {
  mongodump({
    ...options,
    out
  })
}

const getDiffSec = (date: Date) =>
  Math.round((new Date().getTime() - date.getTime()) / 1000)

type TaskRunResult = {
  fileName: string
  dumpTimeSec: number
  uploadTimeSec: number
  fileSizeMB: string
}

export const runTask = async (
  task: BackupTaskConfig,
  config: Config
): Promise<TaskRunResult> => {
  const startTime = new Date()

  const dateSuffix = getDateSuffix()
  const taskFolder = join(dumpsDir, [task.name, dateSuffix].join('_'))
  for await (const dump of task.dumps) {
    await runDump(dump, taskFolder)
  }
  const dumpTimeSec = getDiffSec(startTime)
  let uploadTimeSec: number = 0
  const zipFile = taskFolder + '.zip'
  await zipDir(taskFolder, zipFile)
  const fileSizeMB = ((await fs.stat(zipFile)).size / 1024 / 1024).toFixed(1)
  if (task.upload !== false) {
    const uploadConfig = {
      ...config.upload,
      ...task.upload
    } as UploadConfig
    if (uploadConfig.awsConfig) {
      aws.config.region = uploadConfig.awsConfig.region
      aws.config.accessKeyId = uploadConfig.awsConfig.accessKeyId
      aws.config.secretAccessKey = uploadConfig.awsConfig.secretAccessKey
    }
    if (uploadConfig.bucket) {
      const startTime = new Date()
      await uploadFile(zipFile, uploadConfig)
      uploadTimeSec = getDiffSec(startTime)
      if (uploadConfig.removeAfterUpload !== false) {
        await fs.remove(taskFolder)
        await fs.remove(zipFile)
      }
    }
  }
  return {
    fileName: zipFile,
    dumpTimeSec,
    uploadTimeSec,
    fileSizeMB
  }
}

type CompletedTasks = {
  task: BackupTaskConfig
  result?: TaskRunResult
  error?: Error
}[]

export const sendNotification = async (
  notification: NotificationConfig,
  completed: CompletedTasks
) => {
  let hasError = false
  const html = completed.reduce((html, { task, result, error }) => {
    const wrapP = (text: string) => `<p>${text}</p>`
    const getResultHtml = (result: TaskRunResult) => {
      return [
        wrapP(`Dump completed in ${result.dumpTimeSec} sec`),
        wrapP(`File  ${result.fileName}, size: ${result.fileSizeMB} MB`),
        wrapP(`Upload completed in ${result.uploadTimeSec} sec`)
      ].join('')
    }
    if (error) hasError = true
    return (
      html +
      wrapP(
        `<b>Task ${task.name} completed` +
          (error ? ' with error' + error.toString() : '.') +
          '</b>'
      ) +
      (result ? getResultHtml(result) : '')
    )
  }, '')
  const subject = hasError ? 'Error while backup' : 'MongoDB backup completed.'

  const { fromAddress, toAddress } = notification
  const ses = new aws.SES()
  console.log(`Sending notification to ${toAddress}`)
  const request: aws.SES.Types.SendEmailRequest = {
    Source: fromAddress,
    Destination: {
      ToAddresses: [toAddress]
    },
    Message: {
      Subject: {
        Data: subject
      },
      Body: {
        Html: {
          Data: html
        }
      }
    }
  }
  try {
    await ses.sendEmail(request).promise()
    console.log('Notification sent.')
  } catch (e) {
    console.log('Error while sending email', e)
  }
}

const runBackupTasks = async (tasks: BackupTaskConfig[], config: Config) => {
  const completed: CompletedTasks = []
  if (tasks) {
    for await (const task of tasks) {
      try {
        if (!task.dumps) {
          throw new Error('No tasks dump options')
        }
        console.log(`Running backup task ${task.name}.`)
        const result = await runTask(task, config)
        const time = result.dumpTimeSec + result.uploadTimeSec
        console.log(`Backup task ${task.name} completed in ${time} sec.`)
        completed.push({ task, result })
      } catch (error) {
        console.log(`Error while running backup task ${task.name}`, error)
        completed.push({ task, error })
      }
    }
    const notificationConfig = config.notification
    if (notificationConfig) {
      await sendNotification(notificationConfig, completed)
    }
  }
}

export const runConfig = async (config: Config) => {
  console.log('MongoDB Backup Service.')

  if (config.jobs) {
    for (const job of config.jobs) {
      console.log('Configuring backup scheduled job to run on', job.schedule)
      schedule.scheduleJob(job.schedule, () => {
        console.log('Running backup job on', job.schedule)
        runBackupTasks(job.tasks, config)
      })
    }
  }

  if (config.tasks) {
    await runBackupTasks(config.tasks, config)
  }
}
