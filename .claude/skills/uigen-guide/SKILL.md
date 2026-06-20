---
name: uigen-guide
description: UIGen codebase onboarding and navigation guide. Use when the user asks how UIGen works, where something lives, how the preview pipeline works, how a message flows through the system, or wants to create a new component.
allowed-tools: Read, Bash
---

# UIGen Codebase Guide

UIGen is an AI-powered React component generator. Users describe a component; Claude writes JSX/TSX into an in-memory virtual file system; a sandboxed iframe renders it live using ES module import maps and Babel.

## Essential Facts

- **Entry point:** `src/app/api/chat/route.ts` — handles all AI interactions
- **VFS:** `src/lib/file-system.ts` — pure in-memory tree, serialized as JSON for transport
- **AI tools:** `src/lib/tools/str-replace.ts` + `src/lib/tools/file-manager.ts`
- **Preview:** `src/components/preview/PreviewFrame.tsx` + `src/lib/transform/jsx-transformer.ts`
- **Auth:** `src/lib/auth.ts` (JWT, HTTP-only cookies, 7-day expiry)
- **DB:** Prisma + SQLite (`prisma/dev.db`), client at `src/generated/prisma/`
- **Model fallback:** `src/lib/provider.ts` — returns `MockLanguageModel` when no API key is set

## Progressive Disclosure

**Only read `references/architecture.md`** when the user asks about internals, the VFS design, the Babel transform pipeline, or the import map.

**Only read `references/data-flow.md`** when the user asks how a message flows end-to-end through the system (chat → API → stream → tool call → preview).

**Only run `scripts/find-usages.sh`** when the user wants to know where a specific file or symbol is imported or referenced across `src/`. Run it as:
```bash
bash .claude/skills/uigen-guide/scripts/find-usages.sh <term>
```

**Only read `assets/component-template.tsx`** when the user wants to create a new React component and needs a starting point that matches project conventions.

**Only read `assets/design-guidelines-color-palette.png`** when the user specifically asks about colors, design tokens, branding, or which shade to use for a UI element.

## File Usage Reference

| # | External File | Example Prompt | File Loaded |
|---|---|---|---|
| 0 | _(none)_ | "What is UIGen and what are its key files?" | ❌ SKILL.md only |
| 1 | `references/architecture.md` | "How does the Babel transform pipeline work in UIGen and how does the import map get generated?" | ✅ |
| 2 | `references/data-flow.md` | "How does a message flow end-to-end in UIGen, from the user sending a chat message all the way to the iframe re-rendering?" | ✅ |
| 3 | `scripts/find-usages.sh` | "Where is VirtualFileSystem imported and referenced across the src/ folder?" | ✅ |
| 4 | `assets/component-template.tsx` | "I want to create a new React component — can you give me a starting point that matches the project conventions?" | ✅ |
| 5 | `assets/design-guidelines-color-palette.png` | "What colors should I use for a primary button in UIGen?" | ✅ |
