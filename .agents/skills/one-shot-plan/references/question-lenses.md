# Question lenses

Use these as a **coverage checklist** for the whole dump (Decide **or** Proposed locks). Do not invent a Decide question just to tick a lens — if research already settles it, put a Proposed lock.

Skip a lens only when it cannot apply to the work. Never skip **scope**, **failure**, **docs**, or **v1 vs out of scope**.

## Must cover

| Lens                   | What to resolve                                                       |
| ---------------------- | --------------------------------------------------------------------- |
| **Scope**              | In / out for this change; what “done” means                           |
| **Failure**            | Errors, empty states, rollback, partial success, user-visible failure |
| **Docs**               | Which docs/READMEs change, or explicit **Docs: none** + reason        |
| **v1 vs out of scope** | What ships now vs explicitly deferred (no silent stretch goals)       |

## Usually cover

| Lens                   | What to resolve                                      |
| ---------------------- | ---------------------------------------------------- |
| **Users / UX**         | Who uses it; happy path; copy; accessibility if UI   |
| **Data model**         | Types, persistence, migrations, idempotency          |
| **API / contracts**    | Inputs, outputs, versioning, callers that break      |
| **Control flow**       | Ordering, state machine, who owns the transition     |
| **Integration**        | Existing modules to reuse vs new surface             |
| **Auth / permissions** | Who can do what; trust boundaries                    |
| **Observability**      | Logs, metrics, traces, user-facing diagnostics       |
| **Testing**            | Acceptance checks, unit/integration/e2e expectations |
| **Performance**        | Budgets, hot paths, caching — only if relevant       |
| **Compatibility**      | Feature flags, rollout, back-compat, migrations      |
| **Security / privacy** | Secrets, PII, injection, dangerous defaults          |
| **Ops / config**       | Env vars, defaults, deploy steps                     |

## Domain extras

Add topic groups when the product needs them (e.g. Controls, Combat, Billing). Same rule: real forks → Decide; settled defaults → Proposed locks.

## Placement rule

- **Decide** — preference, product tradeoff, or research conflict
- **Proposed locks** — “today’s code / docs already imply X”; convention; low-stakes default you would pick for a weaker implementer
