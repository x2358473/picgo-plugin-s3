import picgo from 'picgo'
import uploader, { IUploadResult } from './uploader'
import { formatPath } from './utils'

interface IS3UserConfig {
  accessKeyID: string
  secretAccessKey: string
  bucketName: string
  uploadPath: string
  region?: string
  endpoint?: string
  urlPrefix?: string
}

export = (ctx: picgo) => {
  const config = (ctx: picgo) => {
    const defaultConfig: IS3UserConfig = {
      accessKeyID: '',
      secretAccessKey: '',
      bucketName: '',
      uploadPath: '{year}/{month}/{md5}.{extName}',
      endpoint: '',
      urlPrefix: '',
    }
    let userConfig = ctx.getConfig<IS3UserConfig>('picBed.aws-s3')
    userConfig = { ...defaultConfig, ...(userConfig || {}) }
    return [
      {
        name: 'accessKey',
        type: 'input',
        default: userConfig.accessKeyID,
        required: true,
        message: 'access key id',
        alias: '应用密钥 ID',
      },
      {
        name: 'secretKey',
        type: 'input',
        default: userConfig.secretAccessKey,
        required: true,
        message: 'secret access key',
        alias: '应用密钥',
      },
      {
        name: 'bucketName',
        type: 'input',
        default: userConfig.bucketName,
        required: true,
        alias: '桶',
      },
      {
        name: 'uploadPath',
        type: 'input',
        default: userConfig.uploadPath,
        required: true,
        alias: '文件路径',
      },
      {
        name: 'region',
        type: 'input',
        default: userConfig.region,
        required: true,
        alias: '地区',
      },
      {
        name: 'endpoint',
        type: 'input',
        default: userConfig.endpoint,
        required: true,
        alias: '自定义节点',
      },
      {
        name: 'urlPrefix',
        type: 'input',
        default: userConfig.urlPrefix,
        message: 'https://img.example.com/bucket-name/',
        required: true,
        alias: '自定义域名',
      },
    ]
  }

  const handle = async (ctx: picgo) => {
    let userConfig: IS3UserConfig = ctx.getConfig('picBed.aws-s3')
    if (!userConfig) {
      throw new Error("Can't find aws s3 uploader config")
    }
    userConfig.urlPrefix = userConfig.urlPrefix.replace(/\/?$/, '')

    const client = uploader.createS3Client(
      userConfig.accessKeyID,
      userConfig.secretAccessKey,
      userConfig.region,
      userConfig.endpoint
    )

    const output = ctx.output

    const tasks = output.map((item, idx) =>
      uploader.createUploadTask(
        client,
        userConfig.bucketName,
        formatPath(item, userConfig.uploadPath),
        item,
        idx
      )
    )

    try {
      const results: IUploadResult[] = await Promise.all(tasks)
      for (let result of results) {
        const { index, url, imgURL } = result

        delete output[index].buffer
        output[index].url = url

        if (userConfig.urlPrefix) {
          output[index].imgUrl = `${userConfig.urlPrefix}/${imgURL}`
        } else {
          output[index].imgUrl = url
        }
      }

      return ctx
    } catch (err) {
      ctx.log.error('上传到 AWS S3 发生错误，请检查配置是否正确')
      ctx.log.error(err)
      ctx.emit('notification', {
        title: 'AWS S3 上传错误',
        body: '请检查配置是否正确',
        text: '',
      })
      throw err
    }
  }

  // const commands = (ctx: picgo) => [{
  // label : '',
  // key : '',
  // name : 'test',
  // async handle(ctx: picgo, guiApi: any) {}
  // }]
  const register = () => {
    ctx.helper.uploader.register('aws-s3', {
      handle,
      config,
      name: 'AWS S3 上传',
    })
  }
  return {
    // commands,
    register,
  }
}
