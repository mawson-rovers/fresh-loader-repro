import { assert, assertRejects, assertStringIncludes } from '@std/assert'
import { RequestedModuleType, Workspace } from '@deno/loader'
import { fresh } from '@fresh/plugin-vite'
import * as path from '@std/path'

Deno.test('Deno loader loads a clean file URL', async () => {
    const loader = await createLoader()
    const result = await loader.load(freshStyleFileUrl(fixturePath()), RequestedModuleType.Default)

    assert(result.kind === 'module')
})

Deno.test('Deno loader rejects a file URL made from a queried absolute path', async () => {
    const loader = await createLoader()
    const queriedUrl = freshStyleFileUrl(`${fixturePath()}?v=repro`)

    await assertRejects(
        () => loader.load(queriedUrl, RequestedModuleType.Default),
        Error,
        'module.js%3Fv=repro',
    )
})

Deno.test('Fresh Deno plugin loads a clean absolute file path', async () => {
    const plugin = await createFreshDenoPlugin()
    const result = await plugin.load.call(createLoadContext(), fixturePath())

    assert(isCodeResult(result))
    assertStringIncludes(result.code, "export const value = 'loaded'")
})

Deno.test('Fresh Deno plugin should load a queried absolute file path', async () => {
    const plugin = await createFreshDenoPlugin()
    const queriedPath = `${fixturePath()}?v=repro`

    const result = await plugin.load.call(createLoadContext(), queriedPath)

    assert(isCodeResult(result))
    assertStringIncludes(result.code, "export const value = 'loaded'")
})

type FreshDenoPlugin = {
    configResolved: () => Promise<void>
    load: (this: FreshLoadContext, id: string) => Promise<unknown>
}

type FreshLoadContext = {
    environment: {
        config: {
            consumer: 'server'
        }
    }
    getModuleInfo: (id: string) => {
        meta: {
            deno: {
                type: RequestedModuleType
            }
        }
    }
}

type CodeResult = {
    code: string
}

async function createLoader() {
    return await new Workspace({
        platform: 'node',
        cachedOnly: true,
    }).createLoader()
}

async function createFreshDenoPlugin(): Promise<FreshDenoPlugin> {
    const plugin = fresh().find((plugin) =>
        plugin && typeof plugin === 'object' && 'name' in plugin && plugin.name === 'deno'
    )
    assert(plugin && typeof plugin === 'object' && 'configResolved' in plugin && 'load' in plugin)

    const denoPlugin = plugin as unknown as FreshDenoPlugin
    await denoPlugin.configResolved()
    return denoPlugin
}

function createLoadContext(): FreshLoadContext {
    return {
        environment: {
            config: {
                consumer: 'server',
            },
        },
        getModuleInfo: () => ({
            meta: {
                deno: {
                    type: RequestedModuleType.Default,
                },
            },
        }),
    }
}

function fixturePath(): string {
    return path.fromFileUrl(new URL('./fixtures/module.js', import.meta.url))
}

function freshStyleFileUrl(id: string): string {
    return path.toFileUrl(id).href
}

function isCodeResult(result: unknown): result is CodeResult {
    return typeof result === 'object' && result !== null && 'code' in result && typeof result.code === 'string'
}
