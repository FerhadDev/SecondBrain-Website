import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { sync } from './sync-obsidian.mjs'

await fs.mkdir(path.resolve('.obsidian-sync'), { recursive: true })

test('public-only links, exclusion, updates, renames, deletion and repeatability', async () => {
  const root = await fs.mkdtemp(path.resolve('.obsidian-sync/fixture-'))
  const source = path.join(root, 'Public'), destination = path.join(root, 'content/brain')
  const options = { source, destination, reportPath: path.join(root, 'report.json') }
  const put = async (name, text) => { const file = path.join(source, name); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, text) }
  await put('A.md', '[[Public/Projects/B|Project]] [[Private/Secret|Secret alias]] [[Missing]]')
  await put('Projects/B.md', '# Real project')
  await put('Private/Secret.md', 'PRIVATE CANARY')
  await put('Templates/T.md', 'TEMPLATE CANARY')
  await put('.obsidian/settings.json', '{}')
  await put('.hidden.md', 'HIDDEN CANARY')
  await put('unsafe.md', '[secret](../../Private/Secret.md)')
  await put('html.md', '<img src="../../Private/Secret.png">')
  await put('image.png', Buffer.from([1, 2, 3]))
  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.writeFile(path.join(root, 'content/index.md'), 'KEEP HOMEPAGE')
  const first = await sync(options)
  assert.deepEqual(first.synchronized, ['A.md', 'Projects/B.md', 'image.png'])
  const published = await fs.readFile(path.join(destination, 'A.md'), 'utf8')
  assert.match(published, /Projects\/B.md/)
  assert.doesNotMatch(published, /Secret|Private|Missing/)
  assert.equal(await fs.readFile(path.join(source, 'A.md'), 'utf8'), '[[Public/Projects/B|Project]] [[Private/Secret|Secret alias]] [[Missing]]')
  const before = (await fs.stat(path.join(destination, 'A.md'))).mtimeMs
  assert.deepEqual(await sync(options), first)
  assert.equal((await fs.stat(path.join(destination, 'A.md'))).mtimeMs, before)
  await fs.rename(path.join(source, 'Projects/B.md'), path.join(source, 'Projects/C.md'))
  await put('A.md', '[[Projects/C]] updated')
  await sync(options)
  await assert.rejects(fs.stat(path.join(destination, 'Projects/B.md')))
  assert.match(await fs.readFile(path.join(destination, 'A.md'), 'utf8'), /updated/)
  await fs.unlink(path.join(source, 'Projects/C.md'))
  await sync(options)
  await assert.rejects(fs.stat(path.join(destination, 'Projects/C.md')))
  assert.equal(await fs.readFile(path.join(root, 'content/index.md'), 'utf8'), 'KEEP HOMEPAGE')
  await assert.rejects(sync({ ...options, destination: source }), /overlap/)
})

test('generated Markdown has one final newline without changing source or interior formatting', async () => {
  const root = await fs.mkdtemp(path.resolve('.obsidian-sync/eof-fixture-'))
  const source = path.join(root, 'Public'), destination = path.join(root, 'content/brain')
  await fs.mkdir(source)
  const original = '---\nvisibility: public\n---\n# Heading\n\nParagraph  \nHard break\n\n- Item\n\n[[B]]\n\n![Image](image.png)\nFinal hard break  \r\n\r\n \t\r\n'
  await fs.writeFile(path.join(source, 'A.md'), original)
  await fs.writeFile(path.join(source, 'B.md'), '# Target\n\n')
  await fs.writeFile(path.join(source, 'image.png'), Buffer.from([1, 2, 3]))
  const options = { source, destination, reportPath: path.join(root, 'report.json') }
  await sync(options)
  const expected = original.replace('[[B]]', '[B](brain/B.md)').replace('(image.png)', '(brain/image.png)').replace(/(?:\r?\n[ \t]*)+$/, '') + '\n'
  const output = await fs.readFile(path.join(destination, 'A.md'), 'utf8')
  assert.equal(output, expected)
  assert.equal(await fs.readFile(path.join(source, 'A.md'), 'utf8'), original)
  await sync(options)
  assert.equal(await fs.readFile(path.join(destination, 'A.md'), 'utf8'), output)
})

test('normal and escaped table aliases preserve public links, literal pipes, relative paths and table cells', async () => {
  const root = await fs.mkdtemp(path.resolve('.obsidian-sync/table-links-'))
  const source = path.join(root, 'Public'), destination = path.join(root, 'content/brain')
  const put = async (name, body) => { const file = path.join(source, name); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, body) }
  const original = [
    '---', 'title: Skills', 'visibility: public', '---',
    '[[Public/Skills/Unity]] [[Public/Skills/Unity|Unity alias]]',
    '| Skill | Evidence |', '| --- | --- |',
    '| [[Public/Skills/Unity\\|Unity and C#]] | [[Public/Projects/Game\\|Game]] |',
    '| [[Public/Skills/Unity\\|Unity \\| C#]] | [[Projects/Game\\|Game alias]] |',
    '| [[Public/Skills/Unity#Usage\\|Section]] | [[Skills/Unity]] |',
    '| [[Missing\\|MISSING_ALIAS]] | [[Private/Secret\\|PRIVATE_ALIAS]] |',
  ].join('\n') + '\n'
  await put('Skills.md', original)
  await put('Skills/Unity.md', '---\ntitle: Unity\ntype: skill\nvisibility: public\n---\n## Usage\n[[../Projects/Game\\|Relative game]]\n')
  await put('Projects/Game.md', '---\ntitle: Game\ntype: project\nvisibility: public\n---\n[[../Skills/Unity|Unity]]\n')
  await put('Private/Secret.md', 'PRIVATE CANARY')
  await put('hidden.md', '---\nvisibility: private\n---\nEXCLUDED CANARY')
  await put('Legacy.md', '[[Projects]] [[Missing#Architecture and behavior]] [[Missing#Player feedback]] [[hidden\\|EXCLUDED_ALIAS]]')
  const options = { source, destination, reportPath: path.join(root, 'report.json') }
  const report = await sync(options)
  const output = await fs.readFile(path.join(destination, 'Skills.md'), 'utf8')
  assert(output.includes('[Unity](brain/Skills/Unity.md)'))
  assert(output.includes('[Unity alias](brain/Skills/Unity.md)'))
  assert(output.includes('[Unity and C#](brain/Skills/Unity.md)'))
  assert(output.includes('[Unity \\| C#](brain/Skills/Unity.md)'))
  assert(output.includes('[Section](brain/Skills/Unity.md#Usage)'))
  assert(output.includes('[Game alias](brain/Projects/Game.md)'))
  assert.equal(output.split('\n').filter(l => l.startsWith('|')).map(l => (l.match(/(?<!\\)\|/g) || []).length).join(','), original.split('\n').filter(l => l.startsWith('|')).map(l => (l.match(/(?<!\\)\|/g) || []).length).join(','))
  assert(!/MISSING_ALIAS|PRIVATE_ALIAS|Private|CANARY/.test(output))
  assert.equal(report.issues.filter(i => i.file === 'Skills.md').length, 2)
  const legacy = await fs.readFile(path.join(destination, 'Legacy.md'), 'utf8')
  assert.equal((legacy.match(/Unavailable public reference/g) || []).length, 4)
  assert(!/EXCLUDED_ALIAS|Architecture|Player feedback/.test(legacy))
  assert((await fs.readFile(path.join(destination, 'Skills/Unity.md'), 'utf8')).includes('[Relative game](brain/Projects/Game.md)'))
  assert.equal(await fs.readFile(path.join(source, 'Skills.md'), 'utf8'), original)
  assert.deepEqual(await sync(options), report)
  assert.equal(await fs.readFile(path.join(destination, 'Skills.md'), 'utf8'), output)
})

test('source symbolic links are excluded', async t => {
  const root = await fs.mkdtemp(path.resolve('.obsidian-sync/link-fixture-'))
  const source = path.join(root, 'Public')
  await fs.mkdir(source)
  await fs.mkdir(path.join(root, 'outside'))
  await fs.writeFile(path.join(root, 'outside/secret.md'), 'CANARY')
  try { await fs.symlink(path.join(root, 'outside'), path.join(source, 'escape'), 'junction') }
  catch (e) { if (e.code === 'EPERM') return t.skip('OS requires symlink privilege'); throw e }
  const result = await sync({ source, destination: path.join(root, 'content/brain'), reportPath: path.join(root, 'report.json') })
  assert.equal(result.synchronized.length, 0)
  assert.equal(result.excluded.length, 1)
})
