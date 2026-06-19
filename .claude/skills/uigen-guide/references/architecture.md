# UIGen Architecture

## Virtual File System (`src/lib/file-system.ts`)

`VirtualFileSystem` is a `Map<string, FileNode>` held entirely in memory. All paths are normalized to start with `/`.

Key methods:
- `writeFile(path, content)` — create or overwrite
- `readFile(path)` — returns content string or throws
- `deleteFile(path)` — removes node
- `rename(from, to)` — moves a node
- `serialize()` — returns `Record<string, FileNode>` for JSON transport
- `deserializeFromNodes(nodes)` — reconstructs from serialized form

The VFS is **serialized into the chat request body** so the API route can reconstruct it without a database round-trip on every message.

## AI Tools

### `str_replace_editor` (`src/lib/tools/str-replace.ts`)

Mirrors Anthropic's text editor tool interface. Supported commands:

| command | behaviour |
|---------|-----------|
| `create` | Creates a new file (or overwrites) |
| `str_replace` | Replaces an exact string match within a file |
| `insert` | Inserts lines after a given line number |
| `view` | Returns file content (used by the model to read before editing) |

### `file_manager` (`src/lib/tools/file-manager.ts`)

| command | behaviour |
|---------|-----------|
| `rename` | Renames/moves a file |
| `delete` | Removes a file from the VFS |

## Preview Pipeline (`src/lib/transform/jsx-transformer.ts`)

When `refreshTrigger` increments, `PreviewFrame` calls two functions:

1. **`createImportMap(vfs)`**
   - Iterates all `.jsx`/`.tsx` files in the VFS
   - Runs each through Babel (`@babel/standalone`) to plain JS
   - Wraps each output in a `Blob` and calls `URL.createObjectURL`
   - Maps local import paths → blob URLs
   - Maps third-party packages → `esm.sh` CDN URLs
   - Pins `react` and `react-dom` to version 19 explicitly

2. **`createPreviewHTML(importMap, entryPath)`**
   - Builds a full HTML document string
   - Injects `<script type="importmap">` with the generated map
   - Adds an ES module `<script>` that imports the entry file
   - Sets this as the iframe's `srcdoc`

The iframe is sandboxed (`sandbox="allow-scripts"`) — no cookies, no top-level navigation.

## Auth (`src/lib/auth.ts`)

- JWT signed with `AUTH_SECRET` env var
- Stored as an HTTP-only cookie named `session` (7-day expiry)
- `bcrypt` for password hashing (10 rounds)
- Middleware (`src/middleware.ts`) guards `/api/projects` and `/api/filesystem`
- `/api/chat` is intentionally unprotected — anonymous generation is allowed

## Anonymous Work Preservation

`src/lib/anon-work-tracker.ts` saves in-progress VFS state to `sessionStorage`. If an anonymous user signs up mid-session, the app offers to migrate their work into the new account.

## Provider / Mock Fallback (`src/lib/provider.ts`)

`getLanguageModel()` checks `ANTHROPIC_API_KEY`. If absent or still the placeholder:
- Returns `MockLanguageModel`
- Mock returns canned Counter/Card/Form components
- Useful for local dev without an API key
