# UIGen End-to-End Data Flow

## 1. User sends a message

`ChatContext` (`src/lib/contexts/chat-context.tsx`) calls `POST /api/chat` via the Vercel AI SDK's `useChat` hook.

Request body contains:
- Full message history
- Serialized VFS (`Record<string, FileNode>`)
- Optional `projectId` (if the user has a saved project)

## 2. API route processes the request

`src/app/api/chat/route.ts`:
1. Deserializes the VFS from the request body → `VirtualFileSystem` instance
2. Registers the two tools: `str_replace_editor` and `file_manager`
3. Calls `streamText()` from the Vercel AI SDK with `claude-haiku-4-5` (or mock)
4. Returns a streaming response

## 3. Stream arrives client-side

The Vercel AI SDK's `useChat` hook processes the stream. Tool calls from the model are intercepted by the `onToolCall` callback in `ChatContext`.

## 4. Tool calls mutate the VFS

`onToolCall` delegates to `FileSystemContext.handleToolCall` (`src/lib/contexts/file-system-context.tsx`):
- `str_replace_editor` → `create` / `str_replace` / `insert` applied to the in-memory VFS
- `file_manager` → `rename` / `delete` applied to the in-memory VFS

Each mutation increments `refreshTrigger` (a React state counter).

## 5. Preview re-renders

`PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) has `refreshTrigger` as a dependency:
1. Calls `createImportMap(vfs)` → Babel-transforms all JSX/TSX, creates blob URLs
2. Calls `createPreviewHTML(importMap, entry)` → builds a full HTML document
3. Sets the result as `iframe.srcdoc` → browser re-renders the component

## 6. Persistence (authenticated users only)

If `projectId` is present in the request and the user has a valid session:
- After streaming completes, the API route saves the updated messages + VFS to the `Project` row in SQLite via Prisma
- On next page load, the project is reconstructed from the DB
