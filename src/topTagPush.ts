import * as github from '@actions/github'

type Octokit = ReturnType<typeof github.getOctokit>

function parseOwnerRepo(full: string): {owner: string; repo: string} {
  const [owner, repo] = full.split('/')
  if (!owner || !repo) {
    throw new Error(`无效的仓库名 "${full}"，应为 owner/repo`)
  }
  return {owner, repo}
}

/** 附注 tag 的 message 若为 JSON 且含 branch，则取出。getRef 404 时返回空（无权限与 tag 不存在在 GitHub 上均为 404） */
async function branchFromAnnotatedTagMessage(
  octokit: Octokit,
  owner: string,
  repo: string,
  topTagName: string
): Promise<string> {
  let refData: Awaited<
    ReturnType<Octokit['rest']['git']['getRef']>
  >['data']
  try {
    const res = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `tags/${topTagName}`
    })
    refData = res.data
  } catch (e: unknown) {
    const status = (e as {status?: number}).status
    if (status === 404) {
      console.log(
        '[topTagPush] git.getRef tags/* 返回 404：无法读取该 tag（可能 tag 不存在，或 token 无权访问该仓库；私有库无权限时与 getReleaseByTag 404 常同时出现）'
      )
      return ''
    }
    throw e
  }
  if (refData.object.type !== 'tag') {
    return ''
  }
  const {data: tagData} = await octokit.rest.git.getTag({
    owner,
    repo,
    tag_sha: refData.object.sha
  })
  const msg = (tagData.message || '').trim()
  if (!msg) {
    return ''
  }
  try {
    const o = JSON.parse(msg) as Record<string, unknown>
    return typeof o.branch === 'string' ? o.branch : ''
  } catch {
    return ''
  }
}

/**
 * 从 topRepository 上指定 tag 解析 branch：优先 GitHub Release body。
 *
 * 注意：getReleaseByTag 返回 404 时，有时是「确实没有 Release / 只有 git tag」，但在私有仓库或
 * Token 无权访问目标仓库时，GitHub 也常返回 404（而不是 403），页面上能看到 Release 不代表
 * 当前 githubToken 能通过 API 读到。此时应换用对该仓库有 contents:read（及后续写 ref 所需权限）的 PAT，
 * 或依赖下方的 tagBranch / git tag 等回退逻辑。
 */
export async function resolveBranchFromTopTag(
  octokit: Octokit,
  topRepository: string,
  topTagName: string,
  fallbackBranch?: string
): Promise<{branch: string; body: Record<string, unknown>}> {
  const {owner, repo} = parseOwnerRepo(topRepository)
  console.log('[topTagPush] resolveBranchFromTopTag 请求', {owner, repo, topTagName})
  let parsed: Record<string, unknown> = {}

  try {
    const {data: release} = await octokit.rest.repos.getReleaseByTag({
      owner,
      repo,
      tag: topTagName
    })
    console.log('[topTagPush] getReleaseByTag 返回', {
      tag_name: release.tag_name,
      name: release.name,
      bodyLength: release.body?.length ?? 0,
      target_commitish: release.target_commitish
    })
    if (release.body?.trim()) {
      try {
        parsed = JSON.parse(release.body) as Record<string, unknown>
        console.log('[topTagPush] Release body 已解析为 JSON, keys', Object.keys(parsed))
      } catch {
        throw new Error(`Release「${topTagName}」的 body 不是合法 JSON`)
      }
    } else {
      console.log('[topTagPush] Release body 为空，将尝试 tagBranch / tag 名 / 附注 message')
    }
  } catch (e: unknown) {
    const status = (e as {status?: number}).status
    if (status !== 404) {
      throw e
    }
    console.log(
      '[topTagPush] getReleaseByTag 404：可能原因包括：1) 该 tag 未关联 Release、仅有 git tag；2) 私有仓库或 Token 无权限时 GitHub 也返回 404（界面仍可能显示 Release）。将改用 tagBranch / tag 名 / 附注 tag 解析分支；若需读 Release body，请确认 githubToken 对仓库',
      `${owner}/${repo}`,
      '有读取权限（如 PAT 的 repo 范围）'
    )
    parsed = {}
  }

  let branch = typeof parsed.branch === 'string' ? parsed.branch : ''
  if (branch) {
    console.log('[topTagPush] branch 来自 Release body JSON', {branch})
  }

  if (!branch && fallbackBranch?.trim()) {
    branch = fallbackBranch.trim()
    console.log('[topTagPush] branch 来自 action 输入 tagBranch', {branch})
  }

  if (!branch) {
    const parts = topTagName.split('/')
    if (parts.length >= 3) {
      branch = parts[1] || ''
    }
    if (branch) {
      console.log('[topTagPush] branch 来自 tag 名分段', {parts, branch})
    }
  }

  if (!branch) {
    branch = await branchFromAnnotatedTagMessage(octokit, owner, repo, topTagName)
    if (branch) {
      console.log('[topTagPush] branch 来自附注 tag 的 JSON message', {branch})
    }
  }

  if (!branch) {
    throw new Error(
      `无法从 tag「${topTagName}」解析要更新的分支名（${owner}/${repo}）。若 getReleaseByTag 与 git.getRef 均 404，多半是 githubToken 对该仓库无读取权限（界面仍可见 Release）；请换用对该仓库有 repo / contents:read 权限的 PAT。` +
        `解析成功后，更新分支 ref 还需要 contents:write。` +
        `也可临时设置 tagBranch，但仍需 token 能访问该仓库才能完成后续步骤。` +
        `其他方式：Release body JSON 含 branch；{仓库}/{分支}/{时间戳} 格式 tag；附注 tag 的 JSON message 含 branch。`
    )
  }
  console.log('[topTagPush] resolveBranchFromTopTag 成功', {branch})
  return {branch, body: parsed}
}

/** 将 tag 指向的提交写回 refs/heads/{branch}（不存在则创建），等效于把该分支推到 tag 所在提交 */
export async function pushBranchToTagCommit(
  octokit: Octokit,
  topRepository: string,
  topTagName: string,
  branch: string
): Promise<void> {
  const {owner, repo} = parseOwnerRepo(topRepository)
  console.log('[topTagPush] pushBranchToTagCommit 开始', {
    owner,
    repo,
    topTagName,
    branch
  })
  let refData: Awaited<
    ReturnType<Octokit['rest']['git']['getRef']>
  >['data']
  try {
    const res = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `tags/${topTagName}`
    })
    refData = res.data
  } catch (e: unknown) {
    const status = (e as {status?: number}).status
    if (status === 404) {
      throw new Error(
        `pushBranchToTagCommit：无法读取 ${owner}/${repo} 的 tag「${topTagName}」（git.getRef 404）。` +
          `请使用对该仓库有 contents:read 的 token（跨仓库时不能用默认 GITHUB_TOKEN）；更新分支还需 contents:write。`
      )
    }
    throw e
  }
  console.log('[topTagPush] git.getRef tags/*', {
    ref: refData.ref,
    objectType: refData.object.type,
    objectSha: refData.object.sha
  })
  let sha: string
  if (refData.object.type === 'tag') {
    const {data: tagData} = await octokit.rest.git.getTag({
      owner,
      repo,
      tag_sha: refData.object.sha
    })
    sha = tagData.object.sha as string
    console.log('[topTagPush] annotated tag 解析到 commit sha', {sha})
  } else {
    sha = refData.object.sha
    console.log('[topTagPush] lightweight tag / 直接指向 commit', {sha})
  }
  try {
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha,
      force: true
    })
    console.log('[topTagPush] git.updateRef 成功', {ref: `heads/${branch}`, sha})
  } catch (e: unknown) {
    const status = (e as {status?: number}).status
    console.log('[topTagPush] git.updateRef 失败', {status, branch, sha})
    if (status === 404 || status === 422) {
      console.log('[topTagPush] 尝试 git.createRef', {ref: `refs/heads/${branch}`, sha})
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha
      })
      console.log('[topTagPush] git.createRef 成功')
    } else {
      throw e
    }
  }
}
