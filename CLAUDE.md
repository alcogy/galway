You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

**Rule**
Write CLAUDE.md (this file) entirely in English, except when quoting screen items or labels.

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Project Constraints & Technical Specification

### Runtime & Deployment
- **Framework**: SvelteKit 2 + Svelte 5
- **Deployment Target**: Cloudflare Pages
- **Runtime Environment**: Cloudflare Workers Runtime (Edge Runtime)
- **Constraint**: NO Node.js native modules (`fs`, `path`, etc.). Use Web Standard APIs or Edge-compatible libraries only.

### Package Management
- **Package Manager**: Bun
- Use `bun add` / `bun remove` for dependencies.
- Use `bunx` instead of `npx`.
- Use `bun run <script>` for scripts.

### Database
- **DB**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM (`drizzle-orm/d1`)
- **Runtime access**: `platform.env.DB` binding (never `DATABASE_URL` at runtime)
- **Local dev**: Wrangler's local D1 via `getPlatformProxy()` in `hooks.server.ts`
- **Config file**: `wrangler.jsonc` (NOT `wrangler.toml`)
- **D1 binding**: `binding: "DB"`, `database_name: "aes-supplier-db"`
- **Migrations dir**: `./drizzle` (managed by drizzle-kit generate + wrangler d1 migrations apply)

