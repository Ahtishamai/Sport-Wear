# Putting changes live

The site is a Next.js app: the code is **compiled** before it can run. Hostinger's
Git auto-deployment only copies the files across, so a push on its own changes
nothing on design-sportswear.com — the server keeps serving the build it already
has. Something has to build and restart it.

## The quick way

In hPanel, after the auto-deploy has pulled:

1. **Websites → your site → Advanced → Node.js**
2. Press **NPM Install**, then **NPM Build** (this is the step that is usually missed)
3. Press **Restart**

## The one-command way

With SSH access to the site folder:

```bash
bash scripts/deploy.sh
```

It pulls, installs, builds and restarts. Run it after every push you want live.

## Making it automatic

Hostinger can run a command after each pull. Point it at the same script
(**Websites → Git → Auto deployment**, deploy/post-receive command):

```bash
bash scripts/deploy.sh
```

If the build runs out of memory on a small plan, build locally and upload the
`.next` folder instead — or raise the memory in `scripts/deploy.sh`.

## If the build fails with "OS can't spawn worker thread"

```
thread '<unnamed>' panicked at tokio ... worker.rs
OS can't spawn worker thread: Resource temporarily unavailable (os error 11)
Next.js build worker exited with code: null and signal: SIGABRT
```

That is the build host refusing to start more threads, not a fault in the
code. The build is already set up to avoid it:

- `next.config.ts` builds on a single worker (`experimental.cpus: 1`,
  `workerThreads: false`).
- Product and collection pages are no longer built up front. They are built
  the first time somebody opens them and cached from then on, so the deploy
  does a fraction of the work.

If it still happens, the host is very tight on threads. Either raise the
limit (`ulimit -u`) or build somewhere else and upload the `.next` folder.

To go back to building every page up front — on a machine with room for it —
set `PRERENDER_PAGES=1` in the environment before the build.

## Checking it worked

Open any shirt product page. If the deploy took, the order box offers
**Individual / Team**. If it still shows only the size run, the app is running
the old build.

Pages are cached for five minutes, so give it that long before judging.

## What does *not* need a deploy

Anything stored in the database shows up immediately — products, prices,
collections, page sections, reviews, settings and uploaded images. Only code
changes need building.
