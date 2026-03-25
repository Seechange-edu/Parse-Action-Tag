import * as github from '@actions/github'

type Octokit = ReturnType<typeof github.getOctokit>

function parseOwnerRepo(full: string): {owner: string; repo: string} {
  const [owner, repo] = full.split('/')
  if (!owner || !repo) {
    throw new Error(`无效的仓库名 "${full}"，应为 owner/repo`)
  }
  return {owner, repo}
}

/**
 * 从 topRepository 上指定 Release tag 的 body 解析 branch；body 非 JSON 时尝试按 tag 名
 * `{repository}/{branch}/{timestamp}` 解析中间段为 branch。
 */
export async function resolveBranchFromTopTag(
  octokit: Octokit,
  topRepository: string,
  topTagName: string
): Promise<{branch: string; body: Record<string, unknown>}> {
  const {owner, repo} = parseOwnerRepo(topRepository)
  console.log('[topTagPush] resolveBranchFromTopTag 请求', {owner, repo, topTagName})
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
  let parsed: Record<string, unknown> = {}
  if (release.body?.trim()) {
    try {
      parsed = JSON.parse(release.body) as Record<string, unknown>
      console.log('[topTagPush] Release body 已解析为 JSON, keys', Object.keys(parsed))
    } catch {
      throw new Error(`Release「${topTagName}」的 body 不是合法 JSON`)
    }
  } else {
    console.log('[topTagPush] Release body 为空，将仅尝试从 tag 名解析 branch')
  }
  let branch = typeof parsed.branch === 'string' ? parsed.branch : ''
  if (branch) {
    console.log('[topTagPush] branch 来自 Release body JSON', {branch})
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
    throw new Error(
      `无法从 tag「${topTagName}」解析分支：请在 Release body 的 JSON 中提供 branch，或使用 {仓库名}/{分支名}/{时间戳} 格式的 tag`
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
  const {data: refData} = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `tags/${topTagName}`
  })
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
