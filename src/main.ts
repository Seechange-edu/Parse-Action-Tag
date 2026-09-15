import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  formatTime,
  getBranchByHead,
  getBranchByTag,
  getEnvPathByBranch,
  getEnvValueByBranch,
  getTagUrl,
  resolveProdEnvBranchFromReleaseTag
} from './utils'
import {pushBranchToTagCommit, resolveBranchFromTopTag} from './topTagPush'

import axios from 'axios'
// debug is only output if you set the secret `ACTIONS_STEP_DEBUG` to true
const ref = github.context.ref
const pushPayload: any = github.context.payload

console.log('github-----', github)
console.log('github.context', github.context)

async function run(): Promise<void> {
  try {
    const topRepository: string = core.getInput('repository')
    const githubToken: string = core.getInput('githubToken')
    const topTagName: string = core.getInput('tagName')
    const teamsWebhook: string = core.getInput('teamsUrl')
    const type: string = core.getInput('type')
    const remoteHost: string = core.getInput('remoteHost')
    const extra: string = core.getInput('extra')

    if (type === 'stringify') {
        // tagName wins over the ref. 部署方用 branch 做镜像 tag、checkout 的 ref
        // 和读 release notes 的目标，所以传了 tagName 就必须用它。PROD 现在由
        // repository_dispatch 触发（ref 是 refs/heads/dev），靠 ref 推断会把
        // 镜像打成 prod:dev、并且读不到 release notes。
        const branchFromRef = getBranchByHead(ref) || getBranchByTag(ref)
        const branch = topTagName.trim() || branchFromRef
        const {repository, pusher} = pushPayload || {}
        const {full_name} = repository || {}
        const {name: pusherName} = pusher || {}
        const [, outRepository] = full_name.split('/')
        const [, topRepositoryName] = topRepository.split('/')
  
        console.log('topRepository: ', topRepository)
        const tagUrl = getTagUrl(topRepository || full_name)
        const timesTamp = formatTime(new Date(), '{yy}-{mm}-{dd}-{h}-{i}-{s}')

        const envLookupBranch = topTagName
          ? resolveProdEnvBranchFromReleaseTag(topTagName)
          : branch

        const baseEnvValue =
          getEnvValueByBranch(topRepositoryName, envLookupBranch) ||
          getEnvValueByBranch(outRepository, envLookupBranch)
        console.log('envValue: ', baseEnvValue)
  
        if (!baseEnvValue) {
          core.setFailed(`${outRepository} ${branch} 环境变量不存在`)
          return
        }

        // `extra` 合并进 envValue，parse 端会一并导出为环境变量，不需要再加一个字段。
        // 用途是把「本次改了什么」告诉部署方，例如只改前端时不必重启后端。
        let envValue = baseEnvValue
        if (extra.trim()) {
          try {
            const parsedExtra = JSON.parse(extra)
            if (parsedExtra && typeof parsedExtra === 'object' && !Array.isArray(parsedExtra)) {
              envValue = {...baseEnvValue, ...parsedExtra}
            } else {
              core.setFailed('extra 必须是一个 JSON 对象')
              return
            }
          } catch (e) {
            // 静默忽略会让部署方拿到错误的默认值，那比直接失败更难查。
            core.setFailed(`extra 不是合法 JSON: ${extra}`)
            return
          }
        }
        console.log('envValue (merged): ', envValue)
  
        const tagName = `${outRepository}/${branch}/${timesTamp}`
        const tagMessage = {
          branch,
          repository: outRepository,
          pushRef: getEnvPathByBranch(envLookupBranch),
          pusherName,
          envValue,
          remoteHost,
          teamsWebhook
        }
        console.log('tagName: ', tagName)
        console.log('tagUrl: ', tagUrl)
        console.log('tagMessage: ', tagMessage)
        console.log('githubToken:***** ',  `Bearer ${githubToken}`)
        const ret = await axios({
          method: 'POST',
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'content-type': 'application/json',
            Authorization: `Bearer ${githubToken}`
          },
          url: tagUrl,
          data: {
            tag_name: tagName,
            body: JSON.stringify(tagMessage)
          }
        })
        console.log('ret------: ', ret.data)
      }
      if (type === 'parse') {
        const {release} = pushPayload || {}
        const {body} = release || {}
        const tagInfo: any = JSON.parse(body)
        console.log('tagInfo: ', tagInfo)
        const {
          branch: tagBranch,
          repository: tagRepository,
          pusherName,
          pushRef,
          envValue,
          remoteHost,
          teamsWebhook
        } = tagInfo || {}
        console.log('Branch----', tagBranch)
        console.log('repository----', tagRepository)
        console.log('pusherName----', pusherName)
        console.log('pushRef----', pushRef)
        console.log('envValue---- ', JSON.stringify(envValue))
        console.log('remoteHost----', remoteHost)
        console.log('teamsWebhook----', teamsWebhook)
        core.exportVariable('BRANCH', tagBranch)
        core.exportVariable('REPOSITORY', tagRepository)
        core.exportVariable('PUSHREF', pushRef)
        core.exportVariable('REMOTE_HOST', remoteHost)
        core.exportVariable('TEAMS_WEBHOOK', teamsWebhook)
        Object.keys(envValue).forEach((key) => {
          core.exportVariable(key, envValue[key])
        })
      }
    } catch (error) {
      const e: any = error
      core.setFailed(e.message)
    }
}
run()
