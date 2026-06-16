# Fresh Deno Loader Query Repro

Minimal unit-test repro for `@fresh/plugin-vite` passing Vite cache-busted absolute file IDs through the Deno loader.

The bug is triggered whenever Fresh's Deno Vite plugin is asked to load an absolute file path that includes a query
suffix, for example:

```text
/.../module.js?v=...
```

Fresh's Deno Vite plugin converts that ID to a file URL and passes the URL, including the query string, to
`@deno/loader`.

These tests reproduce the core failure without starting Vite's dev server:

- `@deno/loader` loads a clean file URL but rejects a file URL made from a queried absolute path.
- Fresh's actual `deno` Vite plugin, created via `fresh()`, loads a clean absolute file path but rejects the same path
  with `?v=...` appended.

```sh
deno task test
```

The final test is expected to fail until Fresh strips query metadata from absolute file paths before calling
`@deno/loader`:

```text
Fresh Deno plugin should load a queried absolute file path ... FAILED
Error: Import 'file:///.../module.js%3Fv=repro' failed, not found.
```

The lower-level test mirrors Fresh's internal loader path:

```ts
path.toFileUrl(idWithQuery).href
loader.load(url.href, RequestedModuleType.Default)
```

The expected failure is:

```text
Error: Import 'file:///.../module.js%3Fv=repro' failed, not found.
```

The clean file path loads successfully. The queried file path is encoded as `%3Fv=...` in the file URL and fails in
`@deno/loader`.

