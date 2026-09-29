## Summary

<!-- What changed and why. -->

## Verification

<!-- See docs/VERIFICATION.md. "UNVERIFIED IS NOT PASS." -->

- [ ] `npm run verify` green
- [ ] Scene / `render.ts` decisions changed: moved to `…` with a test that fails without the change, or N/A
- Live check (gameplay/presentation changes), each probe command verbatim:

  ```bash
  npm run probe -- --query "…" --steps "…" --name …
  ```

  - Asserted (`expect:` / `waitFor:`):
  - Screenshots read, and what they showed:

- Modes touched: <!-- level 1 / generated / inverted / store / boss / upgrade modal / death / pause / LEARN -->
  - Probed:
  - Not checked (and why):

## Review pass

<!-- ship-plan: pr-review findings verbatim + fix-pr-findings fixed/hollered/skipped. -->

## Skipped / needs a human

<!-- Every hollered or skipped item, named individually; "None" if none. -->
