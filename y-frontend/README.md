# Installing & running the frontend

This is just a Solid.js project, so running a dev server should be pretty simple:

1. Install Node.js and a package manager (I like [pnpm](https://pnpm.io/), but you can use npm/yarn/etc.) 
2. Clone the repo, if not done already.
3. `cd y-frontend`
4. `cp -n config/config.example.json config/config.json`, update `config/config.json` with the right config for you.
5. `pnpm install`
6. `pnpm dev`

# Building the frontend

Just run `pnpm build` (perform the insatll steps first)
