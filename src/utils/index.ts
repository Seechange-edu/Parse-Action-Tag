/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable github/array-foreach */

export const getBranchByHead = (ref: string): string => {
  if (ref.includes('refs/heads/')) {
    return ref.replace('refs/heads/', '')
  }
  return ''
}

export const getBranchByTag = (ref: string): string => {
  if (ref.includes('refs/tags/release/')) {
    const commitMsg = ref.replace('refs/tags/', '')
    const index = commitMsg.lastIndexOf('-v')
    return commitMsg.slice(0, index)
  }
  return ''
}

export const getSyncBranch = (ref: string): string => {
  if (ref.includes('refs/heads/')) {
    return ref.replace('refs/heads/', '')
  }
  if (ref.includes('refs/tags/release/')) {
    const commitMsg = ref.replace('refs/tags/', '')
    const index = commitMsg.lastIndexOf('-dev-v')
    return commitMsg.slice(0, index)
  }
  return ''
}

export const getEnvPathByBranch = (branch: string): string => {
  if (['dev', 'uat', 'prod'].includes(branch)) {
    return branch
  }
  return 'dev'
}

export const getTagUrl = (repository: string): string => {
  return `https://api.github.com/repos/${repository}/releases`
}

/**
 * 格式化时间
 *
 * @param  {time} 时间
 * @param  {cFormat} 格式
 * @return {String} 字符串
 *
 * @example formatTime('2018-1-29', '{y}/{m}/{d} {h}:{i}:{s}') // -> 2018/01/29 00:00:00
 */
export const formatTime = (dateTime: any, cFormat: string): string => {
  let time = dateTime
  if (`${time}`.length === 10) {
    time = +time * 1000
  }

  const format = cFormat || '{y}-{m}-{d} {h}:{i}:{s}'
  let date
  if (typeof time === 'object') {
    date = time
  } else {
    date = new Date(time)
  }

  const formatObj: any = {
    y: date.getFullYear(),
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay()
  }
  const time_str = format.replace(/{(y|m|d|h|i|s|a)+}/g, (result, key) => {
    let value = formatObj[key]
    if (key === 'a')
      return ['一', '二', '三', '四', '五', '六', '日'][value - 1]
    if (result.length > 0 && value < 10) {
      value = `0${value}`
    }
    return value || 0
  })
  return time_str
}

enum RepositoryEnum {
  CMS_FRONTEND = 'cms-frontend',
  CMS_BACKEND = 'cms_backend',
  THINK_AND_SPEAK_BACKEND = 'think-and-speak-backend',
  THINK_AND_SPEAK_FRONTEND = 'think-and-speak-frontend',
  EVENT_BACKEND = 'event-backend',
  EVENT_FRONTEND = 'event-frontend',
  OFFICIAL_WEBSITE = 'official_website',
}

export const getEnvValueByBranch = (repository: string, branch: string): any => {
  const repositoryMap = {
    [RepositoryEnum.CMS_FRONTEND]: {
      dev: {
        NAME: 'cms-dev',
        ACTIVE: 'dev',
        IMAGE: 'registry.digitalocean.com/seechange/cms:dev',
        PORT: 3000,
        OUT_PORT: 13003
      },
      uat: {
        NAME: 'cms-uat',
        ACTIVE: 'uat',
        IMAGE: 'registry.digitalocean.com/seechange/cms:uat',
        PORT: 3000,
        OUT_PORT: 3003
      },
    },
    [RepositoryEnum.CMS_BACKEND]: {
      dev: {
        NAME: 'cms-api-dev',
        ACTIVE: 'dev',
        IMAGE: 'registry.digitalocean.com/seechange/cms-api:dev',
        PORT: 9003,
        OUT_PORT: 19003,
        RUN_ARGS: '-m 1024m -e SPRING_PROFILES_ACTIVE=dev -v /home/forge/dev-cms-api.seechange-edu.com/logs:/app/logs'
      },
      uat: {
        NAME: 'cms-api-uat',
        ACTIVE: 'uat',
        IMAGE: 'registry.digitalocean.com/seechange/cms-api:uat',
        PORT: 9003,
        OUT_PORT: 9003,
        RUN_ARGS: '-m 1024m -e SPRING_PROFILES_ACTIVE=uat -v /home/forge/uat-cms-api.seechange-edu.com/logs:/app/logs'
      }
    },
    [RepositoryEnum.THINK_AND_SPEAK_BACKEND]: {
      dev: {
        NAME: 'think-and-speak-api-dev',
        IMAGE: 'registry.digitalocean.com/seechange/think-and-speak-api:dev',
        ACTIVE: 'dev',
        PORT: 9001,
        OUT_PORT: 19001,
        PORT1: 9011,
        OUT_PORT1: 19011,
        RUN_ARGS: '-m 1024m -e SPRING_PROFILES_ACTIVE=dev -v /home/forge/dev-think-and-speak-api.seechange-edu.com/logs:/app/logs'
      },
      uat: {
        NAME: 'think-and-speak-api-uat',
        // IMAGE: 'latest',
        IMAGE: 'registry.digitalocean.com/seechange/think-and-speak-api:uat',
        ACTIVE: 'uat',
        PORT: 9001,
        OUT_PORT: 9001,
        PORT1: 9011,
        OUT_PORT1: 9011,
        RUN_ARGS: '-m 1024m -e SPRING_PROFILES_ACTIVE=uat -v /home/forge/uat-think-and-speak-api.seechange-edu.com/logs:/app/logs'
      }
    },
    [RepositoryEnum.THINK_AND_SPEAK_FRONTEND]: {
      dev: {
        PREV_NAME: 'speaking-exercise-web-dev',
        NAME: 'think-and-speak-web-dev',
        ACTIVE: 'dev',
        // IMAGE: 'registry.digitalocean.com/seechange/speaking-exercise-web:dev',
        PORT: 3000,
        OUT_PORT: 13000
      },
      uat: {
        PREV_NAME: 'speaking-exercise-web-uat',
        NAME: 'think-and-speak-web-uat',
        ACTIVE: 'uat',
        // IMAGE: 'registry.digitalocean.com/seechange/speaking-exercise-web:uat',
        PORT: 3000,
        OUT_PORT: 3000
      }
    },
    [RepositoryEnum.EVENT_BACKEND]: {
      dev: {
        NAME: 'event-api-dev',
        ACTIVE: 'dev',
        IMAGE: 'registry.digitalocean.com/seechange/event-api:dev',
        PORT: 9002,
        OUT_PORT: 19002,
        RUN_ARGS: '-m 1024m -e SPRING_PROFILES_ACTIVE=dev -v /home/forge/dev-event-api.seechange-edu.com/logs:/app/logs'
      },
      uat: {
        NAME: 'event-api-uat',
        ACTIVE: 'uat',
        IMAGE: 'registry.digitalocean.com/seechange/event-api:uat',
        PORT: 9002,
        OUT_PORT: 9002,
        RUN_ARGS: '-m 1024m -e SPRING_PROFILES_ACTIVE=uat -v /home/forge/uat-event-api.seechange-edu.com/logs:/app/logs'
      }
    },
    [RepositoryEnum.EVENT_FRONTEND]: {
      dev: {
        NAME: 'scmun-dev',
        ACTIVE: 'dev',
        IMAGE: 'registry.digitalocean.com/seechange/scmun:dev',
        PORT: 3000,
        OUT_PORT: 13002
      },
      uat: {
        NAME: 'scmun-uat',
        ACTIVE: 'uat',
        IMAGE: 'registry.digitalocean.com/seechange/scmun:uat',
        PORT: 3000,
        OUT_PORT: 3002
      },
      'dev-oxford':{
        NAME: 'dev-oxford',
        ACTIVE: 'dev-oxford',
        IMAGE: 'registry.digitalocean.com/seechange/scmun:dev-oxford',
        PORT: 3000,
        OUT_PORT: 13004
      },
      'dev-ipdc':{
        NAME: 'dev-ipdc',
        ACTIVE: 'dev-ipdc',
        IMAGE: 'registry.digitalocean.com/seechange/scmun:dev-ipdc',
        PORT: 3000,
        OUT_PORT: 3008
      },
      'dev-ipdc-judge':{
        NAME: 'dev-ipdc-judge',
        ACTIVE: 'dev-ipdc-judge',
        IMAGE: 'registry.digitalocean.com/seechange/scmun:dev-ipdc-judge',
        PORT: 3000,
        OUT_PORT: 13006
      }
    },
    [RepositoryEnum.OFFICIAL_WEBSITE]: {
      dev: {
        NAME: 'official-website-dev',
        ACTIVE: 'dev',
        IMAGE: 'registry.digitalocean.com/seechange/official-website:dev',
        PORT: 3000,
        OUT_PORT: 13007
      },
      uat: {
        NAME: 'official-website-uat',
        ACTIVE: 'uat',
        IMAGE: 'registry.digitalocean.com/seechange/official-website:uat',
        PORT: 3000,
        OUT_PORT: 3007
      }
    }
  }
  const envValueMap = repositoryMap[repository as keyof typeof repositoryMap] || null
  if (!envValueMap) {
    return null
  }
  const envValue = envValueMap?.[branch as keyof typeof envValueMap] || envValueMap.dev 
  if (!envValue) {
    return null
  }
  return envValue
}
