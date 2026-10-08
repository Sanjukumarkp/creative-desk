# Creative Desk

A private workspace for planning, producing and reviewing ad creative.

**Brand brief → Campaign → Concept → Script versions (shot list + prompts) → Uploaded versions → Review and compare → Client sign-off**

Every uploaded file knows which concept, which script version, which shot and which prompt produced it, so you can see why v3 beat v2.

## What's in it

- **Brand briefs.** Product, audience, voice, proof points, approved claims and a "never say" list. Claude reads the brief every time it writes.
- **Campaign board.** Concepts move through Ideas → Scripted → In production → In review → Approved (or Killed). Uploading and reviewing move them along automatically.
- **Concepts with Claude.** Generate a batch from the brief (it skips angles you already have), or refine one concept with an instruction and accept or discard the suggested revision.
- **Scripts as shot lists.** Each beat has timing, visual, voiceover, caption text and a paste-ready prompt for any image or video tool. Editing always saves a new version, so old ones stay untouched. You can also write and edit scripts entirely by hand.
- **Claims check.** Every script is scanned for wording that gets supplement ads rejected (cure/treat/prevent, disease names, "FDA approved", "clinically proven", weight-loss numbers, and so on) plus the brand's own "never say" list. It's a tripwire for review, not legal advice.
- **Uploads for big files.** Drag and drop videos or images up to 5 GB each. They go straight from your browser to storage, never through the server. A thumbnail, dimensions and duration are captured in the browser on upload.
- **Storyboards.** Attach a frame or clip to any shot and it appears next to that shot in the shot list.
- **Version stack.** Every upload is the next version of its concept, with tool, prompt, settings and "what changed" recorded.
- **Review.** Timestamped notes pinned to the timeline, resolve and reopen, status per version.
- **Compare.** Pick 2–4 versions and play them in sync. Choose which one you hear, step frame by frame, and see each version's prompt and changes underneath.
- **Client review links.** One link per campaign. Brands see every version you've moved out of Draft, leave timestamped notes, and approve or request changes without logging in. Revoke a link at any time.

## Deploy on Vercel (about 15 minutes)

1. **Put the code on GitHub.** Unzip the download first. GitHub and Vercel can't read inside a zip, so a repo holding `creative-desk.zip` deploys as an empty site that shows "404: NOT_FOUND". Open the unzipped `creative-desk` folder, select everything inside it (`app`, `components`, `lib`, `scripts`, `package.json`, `vercel.json` and the rest), and drag that into GitHub's **Add file → Upload files**. When you're done, `package.json` should sit at the top level of the repo, not inside a subfolder.
2. **Import it in Vercel.** Go to vercel.com → Add New → Project, and pick the repo. The included `vercel.json` tells Vercel it's a Next.js app. Don't deploy yet if it asks; the first deploy will fail without the steps below. (If it does deploy, that's fine, just redeploy at the end.)
3. **Add a database.** In the project, open **Storage** → **Create** → **Neon (Postgres)** → connect it to the project. This sets `DATABASE_URL` for you.
4. **Add file storage.** In **Storage** → **Create** → **Blob** → choose **Public** access → connect it to the project. This sets `BLOB_READ_WRITE_TOKEN`.
5. **Add the rest of the environment variables** under Settings → Environment Variables:
   - `ANTHROPIC_API_KEY`: create one at console.anthropic.com
   - `APP_PASSWORD`: the password you'll sign in with
   - `AUTH_SECRET`: any long random string (run `openssl rand -hex 32`, or mash the keyboard for 40+ characters)
   - Optional: `ANTHROPIC_MODEL` (defaults to `claude-sonnet-5-5`)
6. **Deploy** (Deployments → Redeploy). The database tables are created automatically during the build.
7. Open the site, sign in, and add your first brand.

### Notes on storage

- Blob files are stored with long random names. Anyone who has a file's exact URL can view it, but the URLs can't be guessed. The app itself and everything in it stays behind your password. Client review links only show versions you've moved out of Draft.
- Deleting a version, concept, campaign or brand also deletes its files from storage.
- To move to Cloudflare R2 or S3 later, only `lib/storage.ts`, `app/api/upload/route.ts` and `lib/media-client.ts` need to change.

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run db:migrate
npm run dev
```

Uploads work locally as long as `BLOB_READ_WRITE_TOKEN` is set. Without it, everything else works and the uploader tells you storage isn't connected.

## How it's built

- Next.js 16 (App Router, server actions), React 19, TypeScript
- Postgres via `postgres` (schema in `scripts/schema.sql`, applied by `scripts/migrate.mjs` before every build; it's safe to rerun)
- Vercel Blob client uploads (multipart for files over 50 MB)
- Claude via `@anthropic-ai/sdk`, using forced tool calls for structured output (`lib/ai.ts`)
- Password gate in `proxy.ts`, and every owner action re-checks the session

| Path | What it is |
| --- | --- |
| `app/page.tsx` | Brands, versions waiting on review, open client notes |
| `app/brands/[id]` | Brief editor and campaigns |
| `app/campaigns/[id]` | Concept generator, board, client review links |
| `app/concepts/[id]` | Concept, script and shot list versions, storyboard, version stack, uploader |
| `app/assets/[id]` | Review player, notes, how it was made, lineage |
| `app/compare` | Synced side-by-side playback |
| `app/share/[token]` | The client's review pages |
| `app/actions.ts` | Every write (server actions) |
| `lib/claims.ts` | Risky-claims rules (edit to suit your clients) |

## Good next steps

1. **Performance data.** Pull spend, hook rate and CTR from Meta for each version once it's live, and show it next to the version. This closes the loop from concept to result.
2. **Generate from inside the app.** Send a shot's prompt straight to Runway, Veo or similar through their APIs and file the result as a version automatically.
3. **Export specs.** One-click 9:16, 4:5 and 1:1 renders for ad upload.
