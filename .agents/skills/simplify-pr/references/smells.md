# Agent-additive smells (reference)

Read from the simplify-pr skill when judging borderline cases.

## Size

- **Fat scene**: `PlayScene` / UI scenes accumulating simulation, scoring, or
  layout math that belongs in a system or `domain/` helper.
- **Fat system**: one system file owning unrelated concerns (input + movement +
  scoring + render bookkeeping).
- **Fat class/module**: new class with many methods when a few functions would
  do; “service” objects that only hold collaborators.
- **Long function**: deep nesting, multi-phase procedural blobs — split only if
  the split removes duplication; otherwise simplify the logic in place.

Heuristic (not a hard rule): new or heavily edited units over ~150–200 lines,
or functions over ~40–60 lines, deserve a hard look — but size alone is not a
finding without a simpler shape.

## Premature abstraction

Classic agent residue:

- `FooManager` / `FooService` / `FooController` / `FooHandler` for one feature
- `BaseFoo` / `AbstractFoo` / `IFoo` with a single implementer
- `createFooFactory` / registry / plugin hooks with one registration
- Wrapper that only forwards to bitecs or Phaser APIs
- “Sync engine” or mirror framework instead of one local map in the render bridge

Prefer: delete the type, keep the function; or inline at the single call site.

## Duplication / consolidation

- Same clamp/countdown/grid/math already in `src/domain`
- Parallel pellet/score/history helpers that should share one module
- Copy-pasted maze/collision checks instead of extending `movement` / maze domain
- Near-identical Text style or HUD update blocks that should use `ui/textStyles`

Prefer: consolidate into the existing helper; delete the new twin.

## Indirection & ceremony

- Function whose body is one call with renamed args
- Options/config object constructed once, read once, never extended
- Feature flags or strategy enums with a single live branch
- Unused parameters “for future use”
- Dead code paths left beside the new path
- Comments that narrate what the next line does (out of scope for this skill —
  use `/no-comments`)

## Layer & architecture (pac-rogue)

Flag when the PR introduces or worsens:

| Bad                                          | Prefer                                   |
| -------------------------------------------- | ---------------------------------------- |
| Movement / collect / clock rules in a scene  | Phaser-free system or `domain/`          |
| Phaser imports under `src/domain`            | keep domain pure                         |
| GameObjects as position source of truth      | ECS `Position`; render mirrors           |
| New ECS world/manager/entity class hierarchy | bitecs SoA + systems as now              |
| Global mutable gameplay singleton            | world + components + scene-local bridges |
| New npm dependency for a 20-line helper      | stdlib / existing code                   |

Cite `docs/ARCHITECTURE.md` (anti-abstraction rules, ECS boundary table) or
`AGENTS.md` when filing these.

## Additive dependency smell

A new package is a smell unless the PR clearly needs it and nothing in-tree
suffices. Finding should say: remove the dep and keep the small local helper,
or justify why local code is worse.

## What not to flag

- Necessary bridge files (`playerInput`, `render`) that must touch Phaser
- Small pure domain helpers even if numerous — composition is wanted
- Tests that look “verbose” but pin behavior
- Pre-existing debt untouched by the PR
- Style nits already owned by formatter/lint

## Action verbs

| Action          | Means                                                       |
| --------------- | ----------------------------------------------------------- |
| **remove**      | Delete the symbol, file, branch, or dependency              |
| **simplify**    | Shrink in place: flatten control flow, drop options, inline |
| **consolidate** | Merge two+ overlapping units into one existing home         |
