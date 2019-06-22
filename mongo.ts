import { execSync, arrify } from './util'

export interface MongoConnectParams {
  host?: string
  port?: number
  db?: string
  username?: string
  password?: string
  authenticationDatabase?: string
  authenticationMechanism?: string
}

export interface MongoCommonParams {
  uri?: string
  collection?: string
}

export const makeUri = ({
  user,
  password,
  server,
  db,
  options: params
}: {
  user?: string
  password?: string
  server: string | string[]
  db?: string
  options?: { [K: string]: any } | string
}) => {
  return [
    'mongodb://',
    user ? user : '',
    user && password ? ':' + password : '',
    user ? '@' : '',
    arrify(server).join(','),
    ,
    db ? '/' + db : '',
    params
      ? '?' +
        (typeof params === 'string'
          ? params
          : Object.keys(params)
              .map(key => `${key}=${params[key]}`)
              .join('&'))
      : ''
  ].join('')
}

export const extractDbNameFromUri = (uri: string) =>
  uri
    .split('/')
    .slice(-1)[0]
    .split('?')[0]

export const extractServerNameFromUrl = (uri: string) =>
  uri.split('/')[2].replace(/.*@/, '')

type ParamVal = string | number | boolean
type CliParams = { [P: string]: ParamVal | ParamVal[] }

const wrapVal = (val: ParamVal, key: string) => {
  return key === 'uri' && (val as string)[0] !== '"' ? `"${val}"` : val
}

const toCliParams = (params: CliParams) => {
  return Object.keys(params)
    .map(key =>
      arrify(params[key])
        .map(val => {
          return val === true ? `--${key}` : `--${key} ${wrapVal(val, key)}`
        })
        .join(' ')
    )
    .join(' ')
}

export type MongoDumpOptions = MongoConnectParams &
  MongoCommonParams & {
    out?: string
    excludeCollection?: string | string[]
    excludeCollectionsWithPrefix?: string | string[]
  }

export type MongoRestoreOptions = MongoConnectParams &
  MongoCommonParams & {
    dir?: string
    nsExclude?: string | string[]
    nsInclude?: string | string[]
    nsFrom?: string | string[]
    nsTo?: string | string[]
    noIndexRestore?: boolean
    verbose?: number
    drop?: boolean
  }

export const mongodump = (options: MongoDumpOptions) => {
  const outDir = options.out
  console.log(`Running mongodump to ${outDir}`)
  const cmd = [`mongodump`, toCliParams(options as CliParams)].join(' ')
  console.log(`Executing ${cmd}`)
  execSync(cmd)
}

export const mongorestore = (options: MongoRestoreOptions) => {
  const outDir = options.dir
  console.log(`Running mongorestore from ${outDir}`)
  const opts = { ...options }
  const cmd = [`mongorestore`, toCliParams(opts as CliParams)].join(' ')
  console.log(`Executing ${cmd}`)
  execSync(cmd)
}
