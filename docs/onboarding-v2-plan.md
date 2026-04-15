# Onboarding v2 — Input UX plan

**Status:** planning only. Do not implement before Phase 2 ships.

## Why this doc exists

Today's onboarding (`src/app/onboarding/page.tsx`, 5 steps) is a funnel full of raw
number inputs. The user types salary, expenses, debt balance, debt service, goal
target, goal current, goal month — eleven fields in total, most of them large
currency figures they have to recall or estimate.

The Phase 1 / 1.5 work made the *payoff* of onboarding strong (reveal scene,
absolute stat strip, guided checklist) — but the *input* side is still a cold
form. Users churn at expenses and debts because:

- they don't know the number to the nearest lira
- typing a five-figure number feels like a commitment to accuracy they can't honor
- there's no scaffolding — the blank field implies "we expect this to be correct"

v2 reframes input as **"pick a rough shape, then tune."** The user is never asked
to type a precise number from memory. The system gives them a starting point that
is directionally correct, and they adjust it.

## Current flow (as of commit 699c183)

| Step | File lines | Inputs | Notes |
|---|---|---|---|
| `hello` | greeting only | 0 | free |
| `income` | step form | `salary`, `otherIncome` | raw currency text inputs |
| `expenses` | step form | `fixedExpenses`, `variableExpenses` | two big numbers, no category split |
| `debts` | step form | `debtBalance`, `debtService` | two fields, user must know both |
| `goal` | step form | `goalName`, `goalTarget`, `goalCurrent`, `goalMonth` | four fields, feels like a form |

Backend sink: `AlphaIntakePayload` → `POST /api/alpha/intake` (custom mode) →
populates `income_lines`, `expense_lines`, `debt_accounts`, `goals` for `user_id=1`.

## Target flow

### Step 1 — Hello (unchanged)

One screen, name + lifestyle descriptor (single select). Sets tone, no numeric input.

### Step 2 — Income

**From:** two blank text fields.
**To:** band picker + fine tune.

1. **Band picker (segmented control)**

   `< 20K` · `20–40K` · `40–80K` · `80–150K` · `150K+`

   One tap. Writes `salary = midpoint(band)`. No keyboard.

2. **Fine tune (slider + live label)**

   Slider bounded to the band. Live label shows the current value in
   `formatCurrency(x, { compact: true })`. Snap to 500-lira increments.

3. **Other income (optional collapsed row)**

   "Freelance, rental, side income?" → tap to expand → same band picker,
   smaller. Default collapsed to keep the step one-screen.

**Tech notes**
- New component: `src/components/onboarding/BandPicker.tsx` — accepts
  `bands: { label: string; min: number; max: number }[]`, emits value on change.
- Reuse native `<input type="range">` with custom styling — no new dep.
- Step still writes to the same `Draft` shape. The `salary` / `otherIncome`
  fields remain strings; the picker just fills them. **No API change.**

### Step 3 — Expenses

**From:** two blank text fields (fixed / variable).
**To:** lifestyle template → category breakdown → tweak.

1. **Template picker**

   Three lifestyle presets tied to the step 1 descriptor:

   | Template | Rent | Food | Transport | Utilities | Subscriptions | Other |
   |---|---|---|---|---|---|---|
   | Lean | 30% | 15% | 8% | 5% | 2% | 5% |
   | Comfortable | 35% | 18% | 10% | 6% | 4% | 10% |
   | Generous | 40% | 22% | 12% | 8% | 6% | 15% |

   Percentages are of post-tax salary from step 2. On pick, the system computes
   absolute lira per category and shows them as a list.

2. **Per-category tweak**

   Each row has a ± button pair (nudge by 500) and a tap-to-edit text field for
   users who want to be exact. Running total updates live at the top:
   "Total monthly spend: ₺X".

3. **Split into fixed vs variable**

   Hidden from the user. Internally: rent/utilities/subscriptions → fixed,
   food/transport/other → variable. Sink to `fixedExpenses` / `variableExpenses`
   on step advance so `AlphaIntakePayload` stays unchanged.

**Tech notes**
- New component: `src/components/onboarding/ExpenseTemplates.tsx`.
- Templates live in a new file `src/lib/onboarding-templates.ts` — plain data,
  no runtime logic, easy to tune.
- The step 1 lifestyle descriptor (which we already collect but currently
  ignore) should preselect a template. `Lean`/`Comfortable`/`Generous` maps
  1:1 to the descriptor values.

### Step 4 — Debts

**From:** two blank text fields.
**To:** yes/no gate → type picker → amount slider.

1. **Gate: "Any loans or credit card debt?"**

   Two big tap targets: `No, I'm clean` / `Yes, I have some`.

   If `No` → skip the rest, write zeros, advance. This is the common path for
   the target persona and we should not punish it with empty fields.

2. **Type picker (only if Yes)**

   Multi-select chips: `Mortgage` · `Auto loan` · `Student loan` · `Credit card` · `Personal loan`.

   Each chip reveals one row with a balance slider + monthly payment slider.
   Sliders bounded by sensible ranges per type (mortgage goes up to 5M;
   credit card caps at 100K).

3. **Sum preview**

   Running totals at the top: "Total owed: ₺X · Monthly service: ₺Y".

**Tech notes**
- Sliders here are the value-add. The current `debtBalance` / `debtService`
  single numbers collapse multiple loans into one, which loses information the
  user could have surfaced with a few taps.
- `AlphaIntakePayload` currently has one debt object — needs extending to an
  array. This is the first step that requires a **backend shape change**.
  Migration: new `debts: DebtEntry[]` field, intake route reads array and falls
  back to the old singleton for backwards-compat during rollout.

### Step 5 — Goal

**From:** four blank text fields.
**To:** template → name → amount/date sliders.

1. **Goal template picker**

   Six preset goals as cards with icons:
   `Emergency fund` · `Apartment down payment` · `Car` · `Wedding` · `Travel` · `Retirement boost` · `Custom`.

   Each preset seeds a reasonable target (emergency = 6× monthly expenses;
   apartment = 25% of a typical lira price in user's city if we know it, else
   1M default; etc.). Target is editable.

2. **Name field (pre-filled)**

   Template sets a default name. User can edit. Not blank.

3. **Target amount slider + fine tune**

   Slider range depends on template. `formatCurrency` live label. The user
   rarely needs to type; for odd targets they can tap the label to enter exact.

4. **Target date picker**

   Replace the `YYYY-MM` text input with a year-month picker component. Or
   simpler: three chips (`1 yr` / `3 yrs` / `5 yrs`) + "choose a date" escape.

5. **Current amount slider**

   Default 0. Slider 0 → target. One drag if they already have some saved.

**Tech notes**
- Goal template seed data in `src/lib/onboarding-templates.ts` alongside
  expense templates.
- Reuse the month-picker pattern from `/goals` edit modal if one exists;
  otherwise build a minimal one.
- `AlphaIntakePayload.goal` shape stays the same — all template logic lives
  in the UI, not the schema.

## Step 6 (new) — Review & commit

Not in current flow. Insert before the reveal scene.

One screen, three columns:

- **Cash flow** — income, expenses, allocatable surplus
- **Net worth** — cash, debts, net position
- **First goal** — name, target, monthly needed

Each column has an `Edit` link that jumps back to the relevant step. The
`Continue` button is the actual intake submission.

This step does two things:
1. Lets the user catch mistakes before we persist.
2. Shows them the computed outputs (allocatable surplus, monthly goal
   contribution) — which is the first taste of the copilot's thinking.

## Non-goals for v2

- **Bank integration (Plaid-equivalent).** Long-term vision. Needs legal
  review, a Turkish provider, and a backend ingestion pipeline. v2 is
  entirely client-side with presets and sliders.
- **AI-assisted guess from chat.** ("Tell me about your life and I'll
  estimate your expenses.") Tempting but brittle — defer until Phase 3+.
- **Multi-currency.** Assumes TRY throughout. USD/EUR accounts stay a
  post-v2 feature.

## Rough sequence

| Order | Work | Est |
|---|---|---|
| 1 | `BandPicker` + income step | ~4 commits |
| 2 | `ExpenseTemplates` + expense step | ~5 commits |
| 3 | Debts shape change (array) + intake route backcompat | ~4 commits |
| 4 | Debts step UI | ~3 commits |
| 5 | Goal templates + goal step | ~5 commits |
| 6 | Review & commit step | ~3 commits |
| 7 | Remove legacy text-input code paths | ~2 commits |

Total: ~26 commits. Target: one sprint after Phase 2 ships. Roll out behind
a feature flag (`?onboardingV2=1`) so we can A/B against v1 before cutting
over.

## Open questions

- Should the lifestyle descriptor from step 1 *prefill* the expense template,
  or *force* it? Forcing is friendlier; prefilling is more honest.
- Do we localize band labels to user's region? (20–40K means different things
  in Istanbul vs. Bursa.) Needs a city chip in step 1 if yes.
- Debt shape change: do we migrate existing user_id=1 rows, or is alpha still
  disposable enough that we just reset on deploy?
