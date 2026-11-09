import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import { pipeline, retryLocked, withLock, run } from "./brain-pipeline.mjs"
import { createQueue, startWatcher } from "./brain-watch.mjs"
import { publish, publishable, checkBranch, checkRemote } from "./brain-publish.mjs"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function fixture() {
  await fs.mkdir(".obsidian-sync", { recursive: true })
  const root = await fs.mkdtemp(path.resolve(".obsidian-sync/workflow-test-"))
  await fs.mkdir(path.join(root, "vault/Public"), { recursive: true })
  await fs.mkdir(path.join(root, "public"))
  await fs.writeFile(path.join(root, "public/index.html"), "previous valid preview")
  const put = async (rel, data) => {
    const p = path.join(root, "vault/Public", rel)
    await fs.mkdir(path.dirname(p), { recursive: true })
    await fs.writeFile(p, data)
  }
  let builds = 0
  const run = (extra) =>
    pipeline({
      root,
      source: path.join(root, "vault/Public"),
      metadata: {},
      log: () => {},
      build: async (out) => {
        builds++
        await fs.mkdir(out)
        await fs.writeFile(path.join(out, "index.html"), "valid build " + builds)
      },
      checkOutput: async () => {},
      ...extra,
    })
  return { root, put, run, builds: () => builds }
}
const game = (title = "Game", more = "") =>
  `---\ntitle: ${title}\ntype: project\nvisibility: public\n${more}---\n## Overview\nA public prototype.\n`

test("transaction handles new/updated/deleted/renamed projects, screenshots, privacy and no-op", async () => {
  const f = await fixture()
  await f.put("Projects/Game.md", game())
  await f.put("Private/never.md", "PRIVATE CANARY")
  await f.put("secret.md", "---\nvisibility: private\n---\nPRIVATE CANARY")
  const first = await f.run()
  assert(first.changed.includes("content/brain/Projects/Game.md"))
  await assert.rejects(fs.access(path.join(f.root, "content/brain/Private/never.md")))
  assert.equal((await f.run()).built, false)
  assert.equal(f.builds(), 1)
  await f.put("Projects/Game.md", game("Updated"))
  await f.put("Projects/shot.png", Buffer.from([1, 2, 3]))
  await f.run()
  assert.equal(f.builds(), 2)
  await fs.rename(
    path.join(f.root, "vault/Public/Projects/Game.md"),
    path.join(f.root, "vault/Public/Projects/Renamed.md"),
  )
  const renamed = await f.run()
  assert(renamed.changed.includes("content/brain/Projects/Game.md"))
  assert(renamed.changed.includes("content/brain/Projects/Renamed.md"))
  await fs.unlink(path.join(f.root, "vault/Public/Projects/Renamed.md"))
  await fs.unlink(path.join(f.root, "vault/Public/Projects/shot.png"))
  await f.run()
  await assert.rejects(fs.access(path.join(f.root, "content/brain/Projects/Renamed.md")))
  await assert.rejects(fs.access(path.join(f.root, "content/brain/Projects/shot.png")))
})

test("invalid metadata, missing media, broken output and build failure restore last valid snapshot/preview", async () => {
  const f = await fixture()
  await f.put("Projects/Game.md", game())
  await f.run()
  const note = path.join(f.root, "content/brain/Projects/Game.md")
  const old = await fs.readFile(note, "utf8"),
    preview = await fs.readFile(path.join(f.root, "public/index.html"), "utf8")
  for (const bad of [game("Bad", "featured: wrong\n"), game("Bad", "cover: missing.png\n")]) {
    await f.put("Projects/Game.md", bad)
    await assert.rejects(f.run(), /validation failed/)
    assert.equal(await fs.readFile(note, "utf8"), old)
    assert.equal(await fs.readFile(path.join(f.root, "public/index.html"), "utf8"), preview)
  }
  await f.put("Projects/Game.md", game("Changed"))
  await assert.rejects(
    f.run({
      build: async () => {
        throw Error("build failed")
      },
    }),
    /build failed/,
  )
  await assert.rejects(
    f.run({
      checkOutput: async () => {
        throw Error("bad link")
      },
    }),
    /bad link/,
  )
  assert.equal(await fs.readFile(note, "utf8"), old)
  assert.equal(await fs.readFile(path.join(f.root, "public/index.html"), "utf8"), preview)
})

test("rapid events are debounced, work never overlaps, shutdown cancels pending events", async () => {
  let runs = 0,
    active = 0,
    max = 0
  const queue = createQueue(
    async () => {
      runs++
      active++
      max = Math.max(max, active)
      await sleep(50)
      active--
    },
    { debounce: 10 },
  )
  for (let i = 0; i < 12; i++) queue.request()
  await sleep(25)
  for (let i = 0; i < 12; i++) queue.request()
  await sleep(170)
  assert.equal(runs, 2)
  assert.equal(max, 1)
  queue.request()
  await queue.close()
  await sleep(30)
  assert.equal(runs, 2)
})

test("locked files retry; shared lock excludes concurrent operations", async () => {
  let attempts = 0
  await retryLocked(
    async () => {
      if (++attempts < 3) throw Object.assign(Error("locked"), { code: "EBUSY" })
    },
    { delay: async () => {} },
  )
  assert.equal(attempts, 3)
  const f = await fixture()
  await withLock(f.root, () =>
    assert.rejects(
      withLock(f.root, () => {}),
      /Another brain/,
    ),
  )
  await fs.access(path.join(f.root, ".obsidian-sync"))
  await assert.rejects(fs.access(path.join(f.root, ".obsidian-sync/pipeline.lock")))
})

test("actual Public-only watcher ignores private subtree events and closes cleanly", async () => {
  const f = await fixture()
  const source = path.join(f.root, "vault/Public")
  let runs = 0
  const watcher = await startWatcher({
    source,
    update: async () => {
      runs++
    },
    debounce: 15,
  })
  try {
    await watcher.ready
    await sleep(100)
    assert.equal(runs, 1)
    await f.put("Private/ignored.md", "CANARY")
    await sleep(1400)
    assert.equal(runs, 1)
    await f.put("visible.md", "Public")
    const deadline = Date.now() + 5000
    while (runs < 2 && Date.now() < deadline) await sleep(50)
    assert.equal(runs, 2)
  } finally {
    await watcher.close()
  }
  await f.put("after-stop.md", "Public")
  await sleep(100)
  assert.equal(runs, 2)
})

function fakeGit({
  branch = "v5",
  staged = "",
  shallow = "false",
  origin = "https://github.com/FerhadDev/SecondBrain-Website.git",
  remote = "head",
  dirty = "content/brain/note.md\0",
  absent = false,
} = {}) {
  const calls = []
  let added = false
  const call = async (args) => {
    calls.push(args)
    if (args[0] === "branch") return branch
    if (args[0] === "remote") return origin
    if (args.includes("--is-shallow-repository")) return shallow
    if (args[0] === "ls-remote") return absent ? "" : remote + "\trefs/heads/v5"
    if (args[0] === "rev-parse") return args[1] === "FETCH_HEAD" ? remote : "head"
    if (args[0] === "add") {
      added = true
      return ""
    }
    if (args[0] === "diff" && args.includes("--name-only"))
      return args.includes("--cached")
        ? added
          ? dirty
          : staged
        : args.includes("content/brain")
          ? dirty
          : ""
    return ""
  }
  return { call, calls }
}

test("publisher refuses wrong branches/remotes, staged work, shallow clones and differing remote history", async () => {
  for (const options of [
    { branch: "main" },
    { origin: "https://github.com/other/repo" },
    { staged: "package.json\0" },
    { shallow: "true" },
  ]) {
    const mock = fakeGit(options)
    await assert.rejects(checkBranch(mock.call))
    assert(!mock.calls.some((c) => ["add", "commit", "push"].includes(c[0])))
  }
  for (const options of [{ remote: "incoming" }, { absent: true }])
    await assert.rejects(checkRemote(fakeGit(options).call))
  for (const p of [
    "content/brain/Private/secret.md",
    "content/brain/../secret.md",
    ".env",
    "content/brain/a.html",
    "node_modules/a.md",
    "website/private.json",
  ])
    assert(!publishable(p))
})

test("publisher cancellation/no-op never stages; confirmed push is explicit, scoped and never forced", async () => {
  const f = await fixture()
  await fs.mkdir(path.join(f.root, "content/brain"), { recursive: true })
  await fs.writeFile(
    path.join(f.root, "content/brain/note.md"),
    "---\nvisibility: public\n---\nPublic text\n",
  )
  for (const options of [{ yes: false }, { yes: true, dirty: "" }, { yes: true }]) {
    const mock = fakeGit(options.dirty === undefined ? {} : { dirty: options.dirty })
    const result = await publish({
      root: f.root,
      call: mock.call,
      synchronize: async () => {},
      confirm: async () => options.yes,
      log: () => {},
    })
    assert.equal(result.pushed, options.yes && options.dirty !== "")
    const mutations = mock.calls.filter((c) => ["add", "commit", "push"].includes(c[0]))
    if (!result.pushed) assert.equal(mutations.length, 0)
    else {
      assert(mutations[0].some((a) => a.startsWith("--pathspec-from-file=")))
      assert.deepEqual(mutations.at(-1), ["push", "origin", "HEAD:refs/heads/v5"])
      assert(!mutations.flat().includes("--force"))
    }
  }
})

test("publisher refuses failed validation and source edits during confirmation", async () => {
  const f = await fixture()
  await fs.mkdir(path.join(f.root, "content/brain"), { recursive: true })
  const file = path.join(f.root, "content/brain/note.md")
  await fs.writeFile(file, "Public")
  const mock = fakeGit()
  await assert.rejects(
    publish({
      root: f.root,
      call: mock.call,
      synchronize: async () => {
        throw Error("invalid")
      },
      confirm: async () => true,
    }),
    /invalid/,
  )
  await assert.rejects(
    publish({
      root: f.root,
      call: mock.call,
      synchronize: async () => {},
      confirm: async () => {
        await fs.writeFile(file, "changed")
        return true
      },
      log: () => {},
    }),
    /changed during confirmation/,
  )
  assert(!mock.calls.some((c) => ["commit", "push"].includes(c[0])))
})

test("remote race aborts before staging; failed push retains a local commit without force retry", async () => {
  const f = await fixture()
  await fs.mkdir(path.join(f.root, "content/brain"), { recursive: true })
  await fs.writeFile(path.join(f.root, "content/brain/note.md"), "Public")
  const mock = fakeGit()
  let confirmed = false
  const race = async (args) =>
    confirmed && args[0] === "rev-parse" && args[1] === "FETCH_HEAD" ? "incoming" : mock.call(args)
  await assert.rejects(
    publish({
      root: f.root,
      call: race,
      synchronize: async () => {},
      confirm: async () => {
        confirmed = true
        return true
      },
      log: () => {},
    }),
    /Local\/remote/,
  )
  assert(!mock.calls.some((c) => ["add", "commit", "push"].includes(c[0])))
  const fail = fakeGit()
  const call = async (args) => {
    if (args[0] === "push") throw Error("non-fast-forward")
    return fail.call(args)
  }
  await assert.rejects(
    publish({
      root: f.root,
      call,
      synchronize: async () => {},
      confirm: async () => true,
      log: () => {},
    }),
    /commit remains local/,
  )
  assert.equal(fail.calls.filter((c) => c[0] === "commit").length, 1)
})

test("blocked failure diagnostics cannot prevent rollback; mutations during build are rejected", async () => {
  const f = await fixture()
  await f.put("Projects/Game.md", game())
  await f.run()
  const note = path.join(f.root, "content/brain/Projects/Game.md")
  const old = await fs.readFile(note, "utf8")
  const preview = await fs.readFile(path.join(f.root, "public/index.html"), "utf8")
  await fs.mkdir(path.join(f.root, ".obsidian-sync/failed-report.json"))
  await f.put("Projects/Game.md", game("Bad", "featured: wrong\n"))
  await assert.rejects(f.run(), /validation failed/)
  assert.equal(await fs.readFile(note, "utf8"), old)
  await f.put("Projects/Game.md", game("Updated"))
  await assert.rejects(
    f.run({
      checkOutput: async () => {
        await fs.appendFile(note, "Concurrent edit\n")
      },
    }),
    /changed during build/,
  )
  assert.equal(await fs.readFile(note, "utf8"), old)
  assert.equal(await fs.readFile(path.join(f.root, "public/index.html"), "utf8"), preview)
})

test("publisher binds approval to the validated snapshot and rejects dirty website-owned pages", async () => {
  const f = await fixture()
  await fs.mkdir(path.join(f.root, "content/brain"), { recursive: true })
  await fs.writeFile(path.join(f.root, "content/brain/note.md"), "Public")
  const mock = fakeGit()
  let prompted = false
  await assert.rejects(
    publish({
      root: f.root,
      call: mock.call,
      synchronize: async () => ({ digest: "older-snapshot" }),
      confirm: async () => {
        prompted = true
        return true
      },
      log: () => {},
    }),
    /changed after validation/,
  )
  assert.equal(prompted, false)
  assert(!mock.calls.some((c) => ["add", "commit", "push"].includes(c[0])))
  const dirtyCode = async (args) =>
    args[0] === "diff" && !args.includes("--cached") && args.includes("content")
      ? "content/index.md\0"
      : mock.call(args)
  await assert.rejects(checkBranch(dirtyCode), /Uncommitted build/)
})

test("stopping a build waits for the aborted child to close", async () => {
  const controller = new AbortController()
  const task = run(process.execPath, ["-e", "setTimeout(() => {}, 30000)"], {
    signal: controller.signal,
  })
  controller.abort()
  await assert.rejects(task, (error) => error.name === "AbortError")
})
