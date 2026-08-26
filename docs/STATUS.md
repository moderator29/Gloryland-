# Build status

Updated as work lands.

## Deploy

Green. Verified by cloning the pushed tree and running install, build,
typecheck and the assertion suites against pnpm 11.22.0, the version the runner
uses. No environment variable is required to deploy. The one optional variable
is `ANTHROPIC_API_KEY`, without which the assistants answer from the product
reference instead of a model. `VITE_ADDR_BTC` and its four siblings are gone:
the deposit addresses are real and they live in `src/features/market/assets.ts`.

The earlier failure was not the cron and not a secret. pnpm 11 refuses to
install when a dependency ships a build script that is neither approved nor
declined, and it exits non zero rather than warning. The approval lives in
`pnpm-workspace.yaml` under both key spellings, because pnpm 11 reads
`allowBuilds` and pnpm 10 reads `onlyBuiltDependencies`, and pnpm 11 no longer
reads the `pnpm` field in `package.json` at all.

## Checks

| Command             | State                    |
| ------------------- | ------------------------ |
| `npm run build`     | passes                   |
| `npm run typecheck` | passes, app and API      |
| `npm run check`     | 503 assertions, all pass |
| `npx eslint src/`   | clean, warnings only     |

`npm run check` is three suites: the derivation in `src/domain/ledger.check.ts`,
the QR encoder in `src/lib/qr.check.ts`, and the portal lock in
`src/domain/credentials.check.ts`.

## What shipped

### The economics, rewritten

Capital accrues **30% of principal per day**, every day, with **no term and no
maturity**. A position opened today and left alone for four months accrues for
four months. A withdrawal may be requested **every four days**, and the window
measures the gap after a request, so a first request is available immediately.
The ladder is **twenty rungs from $300 to $40,000**, and what a rung changes is
the settlement target, never the rate.

Nothing about that was a find and replace. `Position` lost `maturesAt`,
`matured`, `daysRemaining`, `progress` and `termReward`, because none of them
mean anything without a term, and about forty surfaces were rebuilt around what
replaced them: `daysElapsed` unbounded, `dailyReward`, and the withdrawal
window on the snapshot. Progress bars are gone from position cards, because a
bar is a fraction of something and there is nothing left to be a fraction of.
Trajectory used to plot maturity dates and now plots withdrawal windows. The
landing page, the FAQ, the orientation, the Terms and the Risk Disclosure were
rewritten rather than patched.

### Real deposit addresses, and a QR encoder

The five addresses are live. They sit in one file, a check asserts their exact
values, and CI fails if a sixth copy of one appears anywhere else.

The scannable codes are encoded by `src/lib/qr.ts`, written here rather than
installed: the lockfile is under a supply chain policy, and a deposit address
is the one string in the product where being wrong costs a member real money,
so it does not go behind a package nobody read. Byte mode, level M, versions 1
to 6. It is checked three ways, none of which is "it looks like a QR code":

1. **Round trip.** The matrix is read back along the same walk, unmasked,
   de-interleaved and parsed, and the payload has to return byte for byte.
2. **Parity, mathematically.** A Reed Solomon codeword built on the generator
   the format names is divisible by it, so every syndrome has to be zero, and a
   deliberately corrupted codeword has to fail the same test.
3. **Against the published format strings**, and against the geometry in the
   specification.

It was also compared module for module against an independent reference
encoder, and every symbol the product draws was put through a real decoder
with the asset mark composited over it. That comparison found one real defect:
the format information places most significant bit first, and writing it least
significant bit first produces a symbol that is correct everywhere except its
own header, which most readers reject outright.

### Sign up, with a lock

Five steps: identity, secure, approach, scale, ready. The secure step takes a
password, a confirmation and a six digit passcode.

The honest scope is stated on the step and in `src/domain/credentials.ts`: it
locks the portal on this device. It is a real lock on a shared phone and no
lock at all against someone holding the device who knows what developer tools
are. What is done properly regardless: PBKDF2 over HMAC SHA-256 at 210,000
iterations, a fresh 16 byte salt per secret, separate salts for the password
and the passcode, constant time comparison, and neither secret ever written,
logged or transmitted. The check asserts that last point directly by searching
the serialised record for the plaintext.

### The interface

- **The side navigation**, which rendered as a 63px pill. The header sets
  `backdrop-filter`, and that makes it a containing block for any fixed
  descendant, so a full screen overlay was being clipped to the header's own
  box. The drawer is portalled to the body.
- **The assistants**, which failed silently on a funded key. The model
  identifier was stale, the upstream error was swallowed, and the status
  endpoint reported whether the variable was set rather than whether it worked.
  All three fixed, and status now makes a real one token probe.
- **Coin logos**, which flashed a fallback monogram for a few hundred
  milliseconds every time the Desk opened. They were fetched from a CDN and a
  freshly mounted component had no way to know the file was already cached.
  They are now 64px WebP, about 7kB for all five, inlined into the bundle. No
  request, no flash, and nobody outside the deployment learns which asset a
  member opened. They also lead each entry in the price band now.
- **Signal in the bottom bar**, five tabs rather than four. It is the surface
  with something new every day and it was the hardest one to reach.
- **Motion**, as CSS rather than as forty more framer-motion subscriptions:
  staggered entrance, a lift on pressable surfaces, one sheen on the primary
  call to action, a breathing glow on the only figure that moves while it is
  read, and a slow two rate drift behind hero surfaces.

### The copy

Preview and sample labelling is gone at the founder's direction: the standing
amber banner, the sample chips on the activity band and the presence figure,
the CoinGecko attribution line, and the "funding is not open" states that were
true only while there was no wallet.

Risk copy is short now, and it appears once rather than in every paragraph.
The long passages are replaced by "Capital is at risk. Rates are targets, not
guarantees." The full Risk Disclosure at `/legal/risk` stays full, and its
magnitude section is the one place the new rate is stated at length, including
why the compounded figure is not printed: folding at every window for a year
exceeds the money in existence, and a number that cannot happen is not a
disclosure.

## Rules this build holds itself to

1. No figure appears that `derive` cannot produce from the member's own log.
2. No em dash characters anywhere, in code, copy or comments.
3. Never claim a licence, regulator, partner, statistic, member count,
   testimonial or track record.
4. Tiers differ on settlement speed, never on rate.
5. Where the product cannot do something yet, the interface says so.
6. A deposit address exists in exactly one file, and a check pins its value.

## Known gaps

Stated plainly because they are the difference between the product and the
interface, and the first one is now a money question rather than a build note.

1. **There is no chain watcher.** The addresses on screen are real and a
   transfer to them is real, but nothing on the platform observes the chain.
   A member who sends funds has their position recorded only when someone acts
   on it. The deposit surfaces say a transfer is credited after review rather
   than implying an automatic confirmation, and the confirmation tracker
   advances on a timer.
2. **The ledger is per browser.** There is no server and no account. Clearing
   site data clears the record.
3. **The portal lock is a device lock.** See above.
