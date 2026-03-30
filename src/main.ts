import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  formatTime,
  getBranchByHead,
  getBranchByTag,
  getEnvPathByBranch,
  getEnvValueByBranch,
  getTagUrl
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
    const tagBranchInput: string = core.getInput('tagBranch')
    const teamsWebhook: string = core.getInput('teamsUrl')
    const type: string = core.getInput('type')
    console.log('[stringify/parse] inputs', {
      type,
      repository: topRepository || '(empty)',
      tagName: topTagName || '(empty)',
      tagBranch: tagBranchInput || '(empty)',
      githubToken: githubToken ? `set(len=${githubToken.length})` : '(empty)'
    })
    console.log('[context] ref', ref)

    if (type === 'stringify') {
      const {repository, pusher} = pushPayload || {}
      const {full_name} = repository || {}
      const {name: pusherName} = pusher || {}
      console.log('[stringify] pushPayload.repository', {full_name, pusherName})

      let branch: string
      let outRepository: string

      if (topTagName?.trim()) {
        console.log('[stringify] 走 tagName 分支: 从 top 仓库 Release 解析分支并更新 ref，环境使用 prod')
        const octokit = github.getOctokit(githubToken)
        if (!topRepository?.trim()) {
          core.setFailed(
            '指定 tagName 时必须提供 repository（top 仓库，格式 owner/repo）'
          )
          return
        }
        const topRepo = topRepository.trim()
        const tag = topTagName.trim()
        console.log('[stringify][tagName] topRepo, tag', {topRepo, tag})
        const resolved = await resolveBranchFromTopTag(
          octokit,
          topRepo,
          tag,
          tagBranchInput
        )
        const tagResolvedBranch = resolved.branch
        console.log('[stringify][tagName] resolveBranchFromTopTag 结果', {
          tagResolvedBranch,
          bodyKeys: Object.keys(resolved.body || {}),
          bodyRepository: resolved.body.repository
        })
        const fromBody =
          typeof resolved.body.repository === 'string'
            ? resolved.body.repository
            : ''
        const [, fromPush] = (full_name || '').split('/')
        outRepository = fromBody || fromPush || ''
        console.log('[stringify][tagName] outRepository 来源', {
          fromBody,
          fromPush,
          outRepository
        })
        if (!outRepository) {
          core.setFailed(
            '无法确定子仓库名：请在 Release body 的 JSON 中提供 repository，或确保 push 事件包含 repository.full_name'
          )
          return
        }
        console.log('[stringify][tagName] 即将 pushBranchToTagCommit', {
          topRepo,
          tag,
          tagResolvedBranch
        })
        await pushBranchToTagCommit(octokit, topRepo, tag, tagResolvedBranch)
        core.info(
          `已根据 tag「${tag}」将 ${topRepo} 的分支「${tagResolvedBranch}」更新为与该 tag 相同的提交；环境配置使用 prod`
        )
        branch = 'prod'
        console.log('[stringify][tagName] Git 分支已对齐；用于 env/tagMessage 的 branch 固定为 prod')
      } else {
        console.log('[stringify] 走 ref 分支: 从 github.context.ref 解析分支')
        branch = getBranchByHead(ref) || getBranchByTag(ref)
        const [, out] = full_name.split('/')
        outRepository = out
        console.log('[stringify][ref] branch, outRepository', {branch, outRepository})
      }

      const [, topRepositoryName] = topRepository.split('/')

      console.log('topRepository: ', topRepository)
      console.log('[stringify] topRepositoryName, branch(用于 env)', {
        topRepositoryName,
        branch
      })
      const tagUrl = getTagUrl(topRepository || full_name)
      const timesTamp = formatTime(new Date(), '{yy}-{mm}-{dd}-{h}-{i}-{s}')
      console.log('[stringify] tagUrl, timesTamp', {tagUrl, timesTamp})

      const envValue = getEnvValueByBranch(topRepositoryName, branch)
        || getEnvValueByBranch(outRepository, branch)
      console.log('[stringify] getEnvValueByBranch 尝试顺序', [
        `${topRepositoryName} + ${branch}`,
        `${outRepository} + ${branch}`
      ])
      console.log('envValue: ', envValue)

      if (!envValue) {
        core.setFailed(`${outRepository} ${branch} 环境变量不存在`)
        return
      }

      const tagName = `${outRepository}/${branch}/${timesTamp}`
      const pushRef = getEnvPathByBranch(branch)
      console.log('[stringify] getEnvPathByBranch(branch)', {branch, pushRef})
      const tagMessage = {
        branch,
        repository: outRepository,
        pushRef,
        pusherName,
        envValue
      }
      console.log('tagName: ', tagName)
      console.log('tagUrl: ', tagUrl)
      console.log('tagMessage: ', tagMessage)
      console.log('githubToken:***** ',  `Bearer ${githubToken}`)
      console.log('[stringify] POST release 请求体摘要', {
        tag_name: tagName,
        bodyLength: JSON.stringify(tagMessage).length
      })
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
      console.log('[stringify] 完成, release id / html_url 如有则见 ret.data')
    }
    if (type === 'parse') {
      console.log('[parse] 开始解析 release body')
      const {release} = pushPayload || {}
      const {body} = release || {}
      console.log('[parse] release.body 是否存在 / 长度', {
        hasBody: Boolean(body),
        bodyLength: typeof body === 'string' ? body.length : 0
      })
      const tagInfo: any = JSON.parse(body)
      console.log('tagInfo: ', tagInfo)
      const {
        branch: tagBranch,
        repository: tagRepository,
        pusherName,
        pushRef,
        envValue,
      } = tagInfo || {}
      const refBranch = topTagName?.trim() ? topTagName.trim() : tagBranch
      console.log('Branch----', tagBranch)
      console.log('refBranch----', refBranch)
      console.log('repository----', tagRepository)
      console.log('pusherName----', pusherName)
      console.log('pushRef----', pushRef)
      console.log('envValue---- ', JSON.stringify(envValue))

      core.exportVariable('BRANCH', refBranch)
      core.exportVariable('REPOSITORY', tagRepository)
      core.exportVariable('PUSHREF', pushRef)
      const envKeys = Object.keys(envValue || {})
      console.log('[parse] 即将 exportVariable 的 env 键数量', envKeys.length, envKeys)
      Object.keys(envValue).forEach((key) => {
        core.exportVariable(key, envValue[key])
      })
      // 发送 teams 消息
      core.exportVariable('TEAMS_WEBHOOK', teamsWebhook)
      console.log('[parse] exportVariable 完成')
    }
  } catch (error) {
    const e: any = error
    console.log('[error]', e?.message, e?.status, e?.response?.data)
    if (e?.stack) {
      console.log('[error] stack', e.stack)
    }
    core.setFailed(e.message)
  }
}
run()
