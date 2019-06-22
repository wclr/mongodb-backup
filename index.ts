import { MongoDumpOptions } from './mongo'

export type Recurrence = number | string
export type RecurrenceSegment = Recurrence | Recurrence[]

export type Schedule = {
  date: RecurrenceSegment
  dayOfWeek: RecurrenceSegment
  hour: RecurrenceSegment
  minute: RecurrenceSegment
  month: RecurrenceSegment
  second: RecurrenceSegment
  year: RecurrenceSegment
}

export type NotificationConfig = {
  fromAddress: string,
  toAddress: string
}

export type UploadConfig = {
  bucket: string
  folder?: string
  awsConfig?: AWSConfig
  removeAfterUpload?: boolean
}

export type BackupTaskConfig = {
  name: string
  dumps: MongoDumpOptions[]
  upload?: UploadConfig | false
}

export type Config = {
  tasks?: BackupTaskConfig[]
  jobs?: { schedule: string | Schedule; tasks: BackupTaskConfig[] }[]
  upload?: UploadConfig,
  notification?: NotificationConfig
}

export type AWSConfig = {
  accessKeyId: string
  secretAccessKey: string
  region: string
}

export const backupConfigEnvKey = 'BACKUP_CONFIG'
