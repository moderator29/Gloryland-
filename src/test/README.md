# Tests above the domain layer

`npm run check` covers `derive` with assertions and needs nothing installed.
Everything in here needs a runner, and the runner is installed on demand:

```sh
npm run test:install   # once per checkout
npm run test
npm run typecheck:test # the tests, checked against the same rules as the app
```

## Why it is not in package.json

The deploy runner verifies `pnpm-lock.yaml` against a supply chain policy
before it installs anything, and it refuses the install outright if the
lockfile does not pass. Adding the test toolchain grew the lockfile by more
than two hundred entries, and a policy rejection there stops the deploy rather
than the tests.

So the toolchain is installed by `npm run test:install`, which resolves without
writing to the lockfile, and CI runs that step before the tests. The lockfile
that reaches the runner stays byte identical to the one it has already
verified, and a test dependency can never be the reason a deploy fails.

The trade is that a fresh checkout cannot run `npm run test` until it has run
`npm run test:install` once. That is one command, and it is the right side of
the trade.

## What is covered, and why these

The suites are chosen for what has actually broken, not for coverage.

- **`src/features/explain/definitions.test.ts`** does not check wording. It
  derives each figure and checks that the words still agree with what `derive`
  produces. Standing changed basis in the ledger and the definition explaining
  standing kept describing the old rule for hours with nothing to notice. This
  is the guard against that class of drift.
- **`src/components/shell/Gate.test.tsx`** walks all four steps the way a
  person does, because every defect that matters in sign up is a defect in the
  order of things rather than in the markup.
- **`src/features/market/assets.test.ts`** guards the deposit addresses two
  ways: the runtime shape, and the source text, because the failure was a
  literal in a file and a literal is what has to be impossible to add back.
