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
  // prod-* 变体（如 prod-aimcup）走生产通道 prod，与 dev-* 归到 dev 同理
  if (branch.startsWith('prod-') && branch.length > 'prod-'.length) {
    return 'prod'
  }
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
  NEXUS_AI_FRONTEND = 'act-nexus-ai-frontend',
  NEXUS_AI_BACKEND = 'act-nexus-ai-backend',
  SFS = 'smart_file_system',
  AI_TUTOR = 'AI-Tutor-Backend',
  SEECHANGE_SLIDESHOW = 'seechange-slides',
  THINK_AND_SPEAK = 'think-and-speak'
}

const REPOSITORY_ENV_MAP = {
    [RepositoryEnum.CMS_FRONTEND]: {
      dev: {
        NAME: 'cms-dev',
        ACTIVE: 'dev',
        // IMAGE: 'registry.digitalocean.com/seechange/cms:dev',
        PORT: 3000,
        OUT_PORT: 13003
      },
      uat: {
        NAME: 'cms-uat',
        ACTIVE: 'uat',
        // IMAGE: 'registry.digitalocean.com/seechange/cms:uat',
        PORT: 3000,
        OUT_PORT: 3003
      },
      prod: {
        NAME: 'cms',
        ACTIVE: 'prod',
        PORT: 3000,
        OUT_PORT: 3003
      }
    },
    [RepositoryEnum.CMS_BACKEND]: {
      dev: {
        NAME: 'cms-api-dev',
        ACTIVE: 'dev',
        // IMAGE: 'registry.digitalocean.com/seechange/cms-api:dev',
        PORT: 9003,
        OUT_PORT: 19003,
        RUN_ARGS: '-m 1024m -e SPRING_PROFILES_ACTIVE=dev -v /home/forge/dev-cms-api.seechange-edu.com/logs:/app/logs'
      },
      uat: {
        NAME: 'cms-api-uat',
        ACTIVE: 'uat',
        // IMAGE: 'registry.digitalocean.com/seechange/cms-api:uat',
        PORT: 9003,
        OUT_PORT: 9003,
        RUN_ARGS: '-m 1024m -e SPRING_PROFILES_ACTIVE=uat -v /home/forge/uat-cms-api.seechange-edu.com/logs:/app/logs'
      },
      prod: {
        NAME: 'cms-api',
        ACTIVE: 'prod',
        PORT: 9003,
        OUT_PORT: 9003,
        RUN_ARGS: '-m 1024m -e SPRING_PROFILES_ACTIVE=prod -v /home/forge/prod-cms-api.seechange-edu.com/logs:/app/logs'
      }
    },
    [RepositoryEnum.THINK_AND_SPEAK_BACKEND]: {
      dev: {
        NAME: 'think-and-speak-api-dev',
        // IMAGE: 'registry.digitalocean.com/seechange/think-and-speak-api:dev',
        ACTIVE: 'dev',
        PORT: 9001,
        OUT_PORT: 19001,
        PORT1: 9011,
        OUT_PORT1: 19011,
        RUN_ARGS: '-m 2048m -e SPRING_PROFILES_ACTIVE=dev -v /home/forge/dev-think-and-speak-api.seechange-edu.com/logs:/app/logs'
      },
      uat: {
        NAME: 'think-and-speak-api-uat',
        // IMAGE: 'latest',
        // IMAGE: 'registry.digitalocean.com/seechange/think-and-speak-api:uat',
        ACTIVE: 'uat',
        PORT: 9001,
        OUT_PORT: 9001,
        PORT1: 9011,
        OUT_PORT1: 9011,
        RUN_ARGS: '-m 2048m -e SPRING_PROFILES_ACTIVE=uat -v /home/forge/uat-think-and-speak-api.seechange-edu.com/logs:/app/logs'
      },
      prod: {
        NAME: 'think-and-speak-api',
        ACTIVE: 'prod',
        PORT: 9001,
        OUT_PORT: 9001,
        PORT1: 9011,
        OUT_PORT1: 9011,
        RUN_ARGS: '-m 3072m -e SPRING_PROFILES_ACTIVE=prod -v /home/forge/prod-think-and-speak-api.seechange-edu.com/logs:/app/logs'
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
      },
      prod: {
        PREV_NAME: 'speaking-exercise-web',
        NAME: 'think-and-speak-web-prod',
        ACTIVE: 'prod',
        PORT: 3000,
        OUT_PORT: 3000
      }
    },
    [RepositoryEnum.EVENT_BACKEND]: {
      dev: {
        NAME: 'event-api-dev',
        ACTIVE: 'dev',
        // IMAGE: 'registry.digitalocean.com/seechange/event-api:dev',
        PORT: 9002,
        OUT_PORT: 19002,
        RUN_ARGS: '-m 1024m -e SPRING_PROFILES_ACTIVE=dev -v /home/forge/dev-event-api.seechange-edu.com/logs:/app/logs'
      },
      uat: {
        NAME: 'event-api-uat',
        ACTIVE: 'uat',
        // IMAGE: 'registry.digitalocean.com/seechange/event-api:uat',
        PORT: 9002,
        OUT_PORT: 9002,
        RUN_ARGS: '-m 1024m -e SPRING_PROFILES_ACTIVE=uat -v /home/forge/uat-event-api.seechange-edu.com/logs:/app/logs'
      },
      prod: {
        NAME: 'event-api',
        ACTIVE: 'prod',
        PORT: 9002,
        OUT_PORT: 9002,
        RUN_ARGS: '-m 1024m -e SPRING_PROFILES_ACTIVE=prod -v /home/forge/prod-event-api.seechange-edu.com/logs:/app/logs'
      }
    },
    [RepositoryEnum.EVENT_FRONTEND]: {
      dev: {
        NAME: 'scmun-dev',
        ACTIVE: 'dev',
        // IMAGE: 'registry.digitalocean.com/seechange/scmun:dev',
        PORT: 3000,
        OUT_PORT: 13002
      },
      uat: {
        NAME: 'scmun-uat',
        ACTIVE: 'uat',
        // IMAGE: 'registry.digitalocean.com/seechange/scmun:uat',
        PORT: 3000,
        OUT_PORT: 3002
      },
      prod: {
        NAME: 'scmun',
        ACTIVE: 'prod',
        PORT: 3000,
        OUT_PORT: 3002
      },
      // 语义对齐 event-frontend/prod:<tag>：ECR 路径 prod（PUSHREF / IMAGE_REPO_SUBPATH），镜像 tag 用 IMAGE（ci.yml 里 IMAGE_TAG=$IMAGE）
      'prod-aimcup': {
        NAME: 'aimcup-prod',
        ACTIVE: 'aimcup-prod',
        PORT: 3000,
        OUT_PORT: 3009,
        ENV_FILE: 'prod-aimcup.env',
        IMAGE_REPO_SUBPATH: 'prod',
        IMAGE: 'aimcup-prod'
      },
      // 语义同 prod-aimcup：ECR .../prod:scmun-school；发版 tag 如 school-v2.2.6 解析见 resolveProdEnvBranchFromReleaseTag
      'prod-school': {
        NAME: 'scmun-school',
        ACTIVE: 'scmun-school',
        PORT: 3000,
        OUT_PORT: 3004,
        ENV_FILE: 'prod.env',
        IMAGE_REPO_SUBPATH: 'prod',
        IMAGE: 'scmun-school'
      },
      'dev-oxford':{
        NAME: 'dev-oxford',
        ACTIVE: 'dev-oxford',
        // IMAGE: 'registry.digitalocean.com/seechange/scmun:dev-oxford',
        PORT: 3000,
        OUT_PORT: 13004
      },
      'dev-ipdc':{
        NAME: 'dev-ipdc',
        ACTIVE: 'dev-ipdc',
        // IMAGE: 'registry.digitalocean.com/seechange/scmun:dev-ipdc',
        PORT: 3000,
        OUT_PORT: 3008
      },
      'dev-ipdc-judge':{
        NAME: 'dev-ipdc-judge',
        ACTIVE: 'dev-ipdc-judge',
        // IMAGE: 'registry.digitalocean.com/seechange/scmun:dev-ipdc-judge',
        PORT: 3000,
        OUT_PORT: 13006
      },
      'dev-aimcup':{
        NAME: 'dev-aimcup',
        ACTIVE: 'dev-aimcup',
        // IMAGE: 'registry.digitalocean.com/seechange/scmun:dev-aimcup',
        PORT: 3000,
        OUT_PORT: 13009
      }
    },
    [RepositoryEnum.OFFICIAL_WEBSITE]: {
      dev: {
        NAME: 'official-website-dev',
        ACTIVE: 'dev',
        // IMAGE: 'registry.digitalocean.com/seechange/official-website:dev',
        PORT: 3000,
        OUT_PORT: 13007
      },
      uat: {
        NAME: 'official-website-uat',
        ACTIVE: 'uat',
        // IMAGE: 'registry.digitalocean.com/seechange/official-website:uat',
        PORT: 3000,
        OUT_PORT: 3007
      },
      prod: {
        NAME: 'official-website',
        ACTIVE: 'prod',
        PORT: 3000,
        OUT_PORT: 3007
      }
    },
    [RepositoryEnum.NEXUS_AI_FRONTEND]: {
      dev: {
        NAME: 'nexus-ai-frontend-dev',
        ACTIVE: 'dev',
        PORT: 80,
        OUT_PORT: 15173
      },
      uat: {
        NAME: 'nexus-ai-frontend-uat',
        ACTIVE: 'uat',
        PORT: 80,
        OUT_PORT: 25173
      },
      prod: {
        NAME: 'nexus-ai-frontend-prod',
        ACTIVE: 'prod',
        PORT: 80,
        OUT_PORT: 5173
      }
    },
    [RepositoryEnum.NEXUS_AI_BACKEND]: {
      dev: {
        NAME: 'nexus-ai-backend-dev',
        ACTIVE: 'dev',
        PORT: 8000,
        OUT_PORT: 18000
      },
      uat: {
        NAME: 'nexus-ai-backend-uat',
        ACTIVE: 'uat',
        PORT: 8000,
        OUT_PORT: 28000
      },
      prod: {
        NAME: 'nexus-ai-backend-prod',
        ACTIVE: 'prod',
        PORT: 8000,
        OUT_PORT: 8000
      }
    },
    [RepositoryEnum.SFS]: {
      dev: {
        NAME: 'smart-file-system-dev',
        ACTIVE: 'dev',
        PORT: 5000,
        OUT_PORT: 18002
      },
      uat: {
        NAME: 'smart-file-system-uat',
        ACTIVE: 'uat',
        PORT: 5000,
        OUT_PORT: 28002
      },
      prod: {
        NAME: 'smart-file-system-prod',
        ACTIVE: 'prod',
        PORT: 5000,
        OUT_PORT: 8002
      }
    },
    [RepositoryEnum.AI_TUTOR]: {
      dev: {
        NAME: 'ai-tutor-backend-dev',
        ACTIVE: 'dev',
        PORT: 8001,
        OUT_PORT: 18001
      },
      uat: {
        NAME: 'ai-tutor-backend-uat',
        ACTIVE: 'uat',
        PORT: 8001,
        OUT_PORT: 8001
      },
      prod: {
        NAME: 'ai-tutor-backend-prod',
        ACTIVE: 'prod',
        PORT: 8001,
        OUT_PORT: 8001
      }
    },
    [RepositoryEnum.SEECHANGE_SLIDESHOW]: {
      dev: {
        NAME: 'seechange-slideshow-dev',
        ACTIVE: 'dev',
        PORT: 80,
        OUT_PORT: 15174
      },
      uat: {
        NAME: 'seechange-slideshow-uat',
        ACTIVE: 'uat',
        PORT: 80,
        OUT_PORT: 25174
      },
      prod: {
        NAME: 'seechange-slideshow-prod',
        ACTIVE: 'prod',
        PORT: 80,
        OUT_PORT: 5174
      }
    },
    [RepositoryEnum.THINK_AND_SPEAK]: {
        dev: {
            NAME: 'think-and-speak-dev',
            ACTIVE: 'dev',
            PORT: 3000,
            OUT_PORT: 13005
        },
        uat: {
            NAME: 'think-and-speak-uat',
            ACTIVE: 'uat',
            PORT: 3000,
            OUT_PORT: 3005
        },
        prod: {
            NAME: 'think-and-speak',
            ACTIVE: 'prod',
            PORT: 3000,
            OUT_PORT: 3005
        }
    }
  }

/**
 * 发版 tag → 环境表键：`-aimcup` → prod-aimcup；含 `school`（如 school-v2.2.6、v1.0.0-school）→ prod-school；否则 prod。
 */
export function resolveProdEnvBranchFromReleaseTag(topTagName: string): string {
  const tag = topTagName.trim()
  if (!tag) {
    return 'prod'
  }
  if (tag.includes('-aimcup')) {
    return 'prod-aimcup'
  }
  if (tag.toLowerCase().includes('school')) {
    return 'prod-school'
  }
  return 'prod'
}

export const getEnvValueByBranch = (repository: string, branch: string): any => {
  const envValueMap =
    REPOSITORY_ENV_MAP[repository as keyof typeof REPOSITORY_ENV_MAP] || null
  if (!envValueMap) {
    return null
  }
  const envValue = envValueMap?.[branch as keyof typeof envValueMap] || envValueMap.dev
  if (!envValue) {
    return null
  }
  return envValue
}
