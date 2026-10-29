
# Trainer Rostering Platform
## Premium Visual UI System v1

---

# 1. THE VISUAL DIRECTION

## Design concept

**“Calm Intelligence for Workforce Operations.”**

The product should communicate three things simultaneously:

```text
CONTROL
“I can see what is happening.”

INTELLIGENCE
“The system helps me decide.”

TRUST
“I understand why the system says this.”
```

The product should **not** look like:

- a generic HR portal
- a government-style enterprise dashboard
- an over-designed “AI” product
- a banking app
- a dense ERP clone

It should feel like a **modern operating system for training capacity**.

---

# 2. DESIGN PERSONALITY

Use these six attributes as the design north star:

| Attribute | Meaning |
|---|---|
| **Calm** | No unnecessary visual noise |
| **Precise** | Information is structured and exact |
| **Premium** | High-quality spacing, typography and motion |
| **Operational** | Actions are obvious |
| **Explainable** | System decisions can be understood |
| **Human** | Trainers never feel like database records |

The recommendation system is particularly important here because it explicitly separates hard eligibility from weighted scoring and preserves exclusion reasons.

---

# 3. COLOR PHILOSOPHY

Do not use 15 bright enterprise colors.

Use:

```text
NEUTRALS
+
ONE PRIMARY BRAND COLOR
+
SEMANTIC STATUS COLORS
```

That gives the interface a sophisticated visual hierarchy.

---

# 4. PRIMARY COLOR SYSTEM

## Brand Primary

Recommended starting direction:

```text
Primary 900   #102A43
Primary 800   #173F5F
Primary 700   #1F5A7A
Primary 600   #2B6F91
Primary 500   #3B82A8
Primary 100   #EAF4F8
Primary 050   #F5FAFC
```

This gives you a professional **deep blue / blue-teal family**.

It works well because:

- blue communicates trust
- teal prevents the product from feeling like a generic corporate ERP
- dark blue gives strong desktop contrast
- pale blue provides subtle interaction surfaces

---

# 5. CORE NEUTRALS

```text
Ink 950       #0B1220
Ink 900       #111827
Ink 800       #1F2937
Ink 700       #374151
Ink 600       #4B5563
Ink 500       #6B7280
Ink 400       #9CA3AF
Ink 300       #D1D5DB
Ink 200       #E5E7EB
Ink 100       #F3F4F6
Surface       #F8FAFC
White         #FFFFFF
```

The UI should rely heavily on whitespace rather than borders.

---

# 6. STATUS COLORS

The architecture already defines the semantic status system, so preserve it across mobile and web:

| Product status | Recommended visual |
|---|---|
| Draft | Grey |
| Awaiting response | Blue |
| Confirmed | Green |
| Unassigned | Amber |
| At Risk | Red |
| Open / Interest | Purple |
| Travel / Leave / Blackout | Hatched |



Recommended tokens:

```text
Success
#178A5B
Light
#EAF8F2

Warning
#C98200
Light
#FFF5DD

Danger
#C83E3E
Light
#FCECEC

Info
#2878B5
Light
#EAF4FB

Auction / Open
#7654C7
Light
#F2EEFB

Neutral
#6B7280
Light
#F3F4F6
```

---

# 7. IMPORTANT COLOR RULE

Never communicate meaning with color alone.

Example:

```text
GREEN
✓ CONFIRMED

AMBER
! UNASSIGNED

RED
⚠ AT RISK

PURPLE
◉ OPEN
```

The icon + label + color combination makes the system accessible and much easier to scan.

---

# 8. BACKGROUND SYSTEM

The app should have very few pure white surfaces.

Recommended:

```text
App background
#F8FAFC

Card
#FFFFFF

Secondary surface
#F3F6F8

Selected
#EAF4F8

Pressed
#E1EEF3
```

This creates a subtle “layered workspace” effect without excessive shadows.

---

# 9. TYPOGRAPHY

## Recommended type direction

Use a highly legible modern sans-serif.

For Apple platforms:

```text
SF Pro
```

For cross-platform implementation, the engineering team can use an appropriate system/native equivalent.

The visual hierarchy should be more important than the exact font.

---

# 10. TYPE SCALE

```text
Display       32 / 38 / Bold
Page Title    24 / 30 / Semibold
Section       18 / 24 / Semibold
Card Title    16 / 22 / Semibold
Body          14 / 20 / Regular
Body Medium   14 / 20 / Medium
Metadata      12 / 16 / Medium
Caption       11 / 14 / Medium
```

---

# 11. TYPOGRAPHY RULE

Do not make every label bold.

Use:

```text
Big
= WHAT

Medium
= WHAT IT MEANS

Small
= supporting metadata
```

Example:

```text
09:00–11:00
RTG Technical Training

Kochi • Room B204
Confirmed
```

The eye should land on the session first, not the metadata.

---

# 12. SPACING SYSTEM

Base grid:

```text
4
8
12
16
20
24
32
40
48
64
```

Mobile:

```text
Screen padding
16px

Card padding
16–20px

Section spacing
24px

Major section spacing
32px
```

Desktop:

```text
Page padding
24–32px

Card gap
16–24px

Large section gap
32–40px
```

---

# 13. CORNER RADIUS

Use moderate rounding.

```text
Small
8px

Component
10px

Card
14px

Large card
18px

Modal
20px

Pill
999px
```

Avoid giant “bubble UI.”

This is enterprise software.

It should feel controlled.

---

# 14. SHADOW SYSTEM

Do not use heavy shadows everywhere.

### Level 1

For cards:

```text
0 1px 2px rgba(...)
```

### Level 2

For floating surfaces:

```text
0 8px 24px rgba(...)
```

### Level 3

For modal:

```text
0 20px 50px rgba(...)
```

The shadow should mostly communicate **elevation**, not decoration.

---

# 15. APP HEADER

## Trainer mobile

```text
┌──────────────────────────────────────┐
│                                      │
│  Good morning, Ramesh            🔔  │
│  Kochi • Available                   │
│                                      │
└──────────────────────────────────────┘
```

Large breathing room.

No giant enterprise navbar.

---

# 16. BOTTOM NAVIGATION

Use five destinations:

```text
             ●
Home   Schedule   Open   Profile   More
```

Selected:

```text
Icon
+
short label
+
soft primary background
```

Unselected:

```text
icon
+
muted label
```

Do not use an oversized selected tab.

---

# 17. NAVIGATION ICON STYLE

Use:

- rounded geometry
- 1.8–2px stroke
- simple silhouettes
- no filled cartoon icons
- no unnecessary gradients

Suggested icons:

```text
Home        house
Schedule    calendar
Open        spark / layers
Profile     person
More        three dots
```

For important status:

```text
Confirmed   check-circle
Warning     triangle
Travel      plane
Leave       calendar-off
At Risk     alert-circle
```

---

# 18. BUTTON SYSTEM

## Primary

```text
┌─────────────────────────────┐
│       Confirm Session       │
└─────────────────────────────┘
```

Strong fill.

## Secondary

```text
┌─────────────────────────────┐
│        View Details         │
└─────────────────────────────┘
```

Light surface.

## Destructive

```text
Decline Session
```

Never make destructive actions visually stronger than necessary.

---

# 19. THE “APPLE-LIKE” QUALITY BAR

Don't copy Apple branding.

Take inspiration from the **quality principles**:

```text
Large breathing space
Precise typography
Quiet surfaces
Strong hierarchy
Minimal decoration
Fluid transitions
Obvious primary action
```

Then combine that with enterprise functionality.

That combination becomes the product identity.

---

# 20. SESSION CARD

This should become one of the most reused components.

```text
┌────────────────────────────────────────┐
│ 09:00–11:00                  CONFIRMED │
│                                        │
│ RTG Technical Training                 │
│                                        │
│ 📍 Kochi • Room B204                   │
│ 👥 14 learners                         │
│                                        │
│ Primary                                │
└────────────────────────────────────────┘
```

---

# 21. SESSION CARD VARIANTS

### Confirmed

```text
Green status indicator
```

### Awaiting

```text
Blue indicator
Countdown
CTA
```

### Unassigned

```text
Amber indicator
OPEN
```

### At Risk

```text
Red indicator
Deadline
Action
```

### Open Session

```text
Purple indicator
Match percentage
Interest CTA
```

---

# 22. STATUS PILL

Make it compact.

```text
● CONFIRMED
● AWAITING RESPONSE
● UNASSIGNED
● AT RISK
◉ OPEN
```

Avoid giant rectangular colored badges.

---

# 23. MATCH SCORE DESIGN

Do not make a giant “92% AI” badge.

Use:

```text
MATCH

92
────
Strong fit
```

or:

```text
MATCH 92
Strong fit
```

For admin, expose the complete breakdown.

The architecture's recommendation design is based on hard filters followed by weighted scoring, with score breakdown retained.

---

# 24. PROFILE READINESS

Use a subtle ring:

```text
          78%
       ╭──────╮
      │        │
      ╰───────╯

Recommendation Ready
```

Underneath:

```text
2 items remaining
```

This is much better than:

```text
PROFILE 78%
```

The user needs to know what the number means.

---

# 25. COUNTDOWN COMPONENT

Critical for assignment responses.

```text
RESPONSE DUE

17h 42m
```

When urgent:

```text
⚠ RESPONSE DUE
1h 26m
```

Keep the timer visually secondary to the action itself.

---

# 26. ADMIN SIDEBAR

Desktop:

```text
┌───────────────────────┐
│ Logo                  │
│                       │
│ Overview              │
│ Schedule              │
│ Exceptions        12  │
│ Assignments           │
│ Trainers              │
│ Venues                │
│ Availability          │
│ Reports               │
│                       │
│ ───────────────────   │
│ Administration        │
│ Policies              │
│ Skills                │
│ Integrations          │
│ Audit                 │
└───────────────────────┘
```

Exception count should be a real operational signal, not decoration.

The architecture identifies Exceptions as the main operational screen for site schedulers.

---

# 27. ADMIN DESKTOP COLOR BALANCE

Important:

**Do not make the entire dashboard colorful.**

Use:

```text
90% neutral
7% primary
3% semantic
```

The red/amber/purple should appear only when something deserves attention.

That creates visual urgency.

If everything is colorful, nothing is urgent.

---

# 28. EXCEPTION CARD

```text
┌──────────────────────────────────────────┐
│ 🔴 AT RISK                         18 SEP│
│                                          │
│ RTG Technical Training                   │
│ Kochi                                    │
│                                          │
│ Primary trainer unconfirmed              │
│                                          │
│ 41h remaining                            │
│                                          │
│ [ FIND BACKUP ]                          │
└──────────────────────────────────────────┘
```

Primary action should always be visible.

---

# 29. ADMIN ASSIGNMENT LAYOUT

This screen should feel like an **operations workstation**.

```text
┌─────────────────────────────────────────────────────────────┐
│ Session #4821                                               │
├───────────────────┬───────────────────────┬─────────────────┤
│ SESSION CONTEXT   │ CANDIDATES            │ DETAIL          │
│                   │                       │                 │
│ RTG L4            │ Recommended           │ Ravi Patel      │
│ Kochi             │                       │ MATCH 94        │
│ 09:00             │ ★ Ravi       94       │                 │
│ Simulator         │   Anil        92       │ Competency ✓   │
│                   │   Priya       88       │ Cert ✓         │
│                   │                       │ Travel —       │
│                   │ Interested             │                 │
│                   │   Raj         86       │ [ ASSIGN ]     │
└───────────────────┴───────────────────────┴─────────────────┘
```

This creates three mental zones:

```text
WHAT
WHO
WHY
```

That is the right information architecture for the assignment workflow.

---

# 30. CANDIDATE CARD VISUAL HIERARCHY

```text
★ Ravi Patel                    94

HOT LEAD • INTERESTED • LOCAL

RTG L4
TCI 91
18h weekly load

Competency 29/30
Location 15/15
Schedule 11/12

[ VIEW ]          [ ASSIGN ]
```

The source calls for score, major contributing subscores, home site, travel implications, load and badges.

---

# 31. EXPLAINABLE AI DESIGN

Never write:

> “AI says Ravi is best.”

Instead:

```text
RECOMMENDED MATCH

Why?

✓ Required skill verified
✓ Certification valid
✓ No schedule overlap
✓ Travel feasible
✓ Within load limits

Score contributors:
Competency
Location
Schedule fit
Workload
```

This respects the architecture's distinction between deterministic hard filters and weighted scoring.

---

# 32. “WHY NOT?” DESIGN

This is a premium feature.

```text
Why not available?

Certification expired
─────────────────────
7 trainers

Schedule overlap
─────────────────────
6 trainers

Leave
─────────────────────
4 trainers

Travel infeasible
─────────────────────
2 trainers
```

Tap:

```text
Certification expired
```

Then show:

```text
7 candidates

Ravi Patel
Expired 12 Sep

Anil Kumar
Expires before session

...
```

This turns the engine into a transparent operational tool.

---

# 33. HOT LEAD VISUAL LANGUAGE

Do not use flame emojis in the actual product UI.

Use a subtle:

```text
★ HOT LEAD
```

or:

```text
HOT LEAD
```

with a premium accent.

The architecture specifically uses `HOT LEAD` for a nominated trainer who is also independently eligible.

---

# 34. TRAVEL DESIGN

Travel should visually occupy the calendar.

Example:

```text
17 SEP

16:00
▓▓▓▓▓▓▓▓
TRAVEL
Ahmedabad → Kochi

18 SEP

09:00
████████
SESSION
RTG Training
```

Use a **hatched pattern** rather than another strong status color.

That directly follows the architecture's “hatched” travel/leave/blackout semantics.

---

# 35. TRAVEL CARD

```text
┌────────────────────────────────────┐
│ ✈ CROSS-LOCATION DEPLOYMENT       │
│                                    │
│ Ahmedabad                          │
│       ↓                            │
│ Kochi                              │
│                                    │
│ 17 Sep → 19 Sep                    │
│                                    │
│ Travel        4h 10m               │
│ Accommodation      Required        │
│ Sanction             Approved      │
└────────────────────────────────────┘
```

---

# 36. PROFILE UI

The profile should look like a **professional identity card**, not a government form.

Top:

```text
RAMESH PATEL
Senior Trainer

Recommendation Ready ✓

78%
Profile completeness
```

Then sections:

```text
Professional
Competencies
Certifications
Experience
Availability
Documents
```

The architecture makes profile quality a readiness gate, so this screen must feel important, not optional.

---

# 37. PROFILE FIELD OWNERSHIP

Use subtle labels:

```text
● HR VERIFIED
● SELF DECLARED
● VERIFIED
● SYSTEM GENERATED
```

Example:

```text
Employee ID
EMP-10482

HR VERIFIED
```

```text
Preferred location
Kochi
Self Declared
```

```text
TCI
87

System Generated
```

That directly reflects the T0/T1/T2/T3 field-ownership model.

---

# 38. DOCUMENT UI

For certificates:

```text
RTG Certification

✓ Valid
Expires Jan 2027

[ VIEW CERTIFICATE ]
```

For expiring:

```text
⚠ Expiring in 21 days
```

For expired:

```text
✕ Expired
Assignment eligibility blocked
```

---

# 39. MOBILE BOTTOM SHEETS

Use bottom sheets for:

```text
Filters
Session actions
Decline reason
Nomination
Match explanation
Travel details
```

Why?

Because they preserve context.

The user should not constantly leave the calendar.

---

# 40. MODALS

Use full modal dialogs only for:

```text
Destructive action
Critical approval
Commit assignment
Irreversible change
```

Example:

```text
ASSIGN TRAINER?

Ravi Patel
Primary

The system will re-check
eligibility before committing.

[ ASSIGN ]
[ CANCEL ]
```

---

# 41. MOTION DESIGN

The app should feel alive—but controlled.

Recommended motion:

```text
Button press
120ms

Card transition
180–220ms

Bottom sheet
250–300ms

Page transition
250ms

Success confirmation
300ms
```

Do not animate dashboards constantly.

Motion should explain:

```text
CHANGE
HIERARCHY
FEEDBACK
```

not entertain.

---

# 42. SUCCESS ANIMATION

After confirmation:

```text
      ✓

SESSION CONFIRMED

Calendar updated
Travel block added
```

A very subtle scale/fade.

No giant celebration.

This is enterprise scheduling.

---

# 43. ERROR LANGUAGE

Never:

> Something went wrong.

Prefer:

```text
ASSIGNMENT COULD NOT BE COMPLETED

Ravi Patel is no longer available.

Reason:
A competing session was confirmed
2 minutes ago.

[ REFRESH CANDIDATES ]
```

The architecture explicitly anticipates stale candidate data and commit-time revalidation.

---

# 44. EMPTY STATE LANGUAGE

Never:

> No data.

Instead:

```text
NO OPEN SESSIONS

There are currently no sessions
you are eligible to take.

We'll notify you when new
opportunities become available.
```

Human language wins.

---

# 45. LOADING LANGUAGE

Instead of:

```text
Loading...
```

Use contextual skeletons.

Assignment:

```text
Finding eligible trainers...

██████████
██████████████
██████████
```

Recommendation engine workloads are designed to be pre-computed / queued rather than blocking user requests, so the UI should communicate progress when relevant.

---

# 46. MOBILE HOME VISUAL PRIORITY

The visual priority should be:

```text
1. Critical action
2. Today's schedule
3. Upcoming schedule
4. Open opportunities
5. Profile
6. Information
```

Not:

```text
Analytics
Graphs
KPIs
Charts
```

The trainer doesn't need a corporate dashboard on their phone.

---

# 47. ADMIN HOME VISUAL PRIORITY

For Site Scheduler:

```text
1. At Risk
2. Unassigned
3. Awaiting response
4. Classroom conflicts
5. Schedule coverage
6. Capacity
7. Analytics
```

The architecture explicitly makes exceptions the operational center.

---

# 48. ADMIN DATA GRID

Avoid dense spreadsheet styling.

Instead:

```text
Trainer        Status      Match   Load   Travel
──────────────────────────────────────────────────
Ravi Patel     Ready       94      18h    Local
Anil Kumar     Ready       92      26h    Cross
Priya Shah     Ready       88      16h    Local
```

Use whitespace between rows.

Keep borders subtle.

---

# 49. DESKTOP GRID SYSTEM

Recommended:

```text
12-column grid
24px gutter
32px outer margin
```

Typical:

```text
Sidebar
240px

Main
Flexible

Right detail panel
360–420px
```

Assignment screen:

```text
20%
55%
25%
```

---

# 50. MOBILE GRID

```text
4px base
16px side padding
8px inner spacing
```

Avoid multi-column mobile forms.

Use:

```text
ONE COLUMN
```

almost everywhere.

---

# 51. ACCESSIBILITY

Build this in from day one.

Minimum rules:

```text
Touch target ≥ 44×44
Keyboard support on desktop
Visible focus states
Color + icon + text
Readable contrast
Dynamic text tolerance
Screen-reader labels
No tiny metadata as required information
```

---

# 52. ICON + TEXT RULE

Never:

```text
[   ✓   ]
```

alone for a critical state.

Prefer:

```text
✓ CONFIRMED
```

The interface should remain understandable even with color removed.

---

# 53. THE DESIGN SYSTEM TOKEN STRUCTURE

In Figma, create:

```text id="yk4k3n"
Primitives
│
├── Color
├── Typography
├── Spacing
├── Radius
├── Shadow
└── Motion

Semantic
│
├── Surface
├── Text
├── Border
├── Primary
├── Success
├── Warning
├── Danger
├── Info
└── Open

Components
│
├── Navigation
├── Button
├── Form
├── Card
├── Calendar
├── Session
├── Trainer
├── Assignment
├── Travel
├── Notification
└── Data
```

---

# 54. FIGMA COMPONENT NAMING

Use:

```text
Button / Primary / Default
Button / Primary / Loading
Button / Primary / Disabled

SessionCard / Confirmed
SessionCard / Awaiting
SessionCard / Open
SessionCard / Risk

TrainerCard / Recommended
TrainerCard / Interested
TrainerCard / HotLead
TrainerCard / CrossBU
TrainerCard / Excluded
```

This makes development handoff significantly easier.

---

# 55. DESIGN VARIABLES

Create variables for:

```text
Color / Primary
Color / Surface
Color / Text
Color / Success
Color / Warning
Color / Danger
Color / Auction

Spacing / xs
Spacing / sm
Spacing / md
Spacing / lg
Spacing / xl

Radius / sm
Radius / md
Radius / lg

Shadow / card
Shadow / floating
Shadow / modal
```

---

# 56. DESIGN SYSTEM LAYERS

I would structure the UI library in four levels:

```text
LEVEL 1
Foundations

LEVEL 2
Primitive Components

LEVEL 3
Domain Components

LEVEL 4
Screens
```

This prevents the common mistake of designing complete pages before the component system stabilizes.

---

# 57. FIRST 5 VISUAL FRAMES TO CREATE

In Figma:

```text
01 — Trainer Home
02 — Trainer Schedule
03 — Session Detail
04 — Open Sessions
05 — Admin Assignment
```

Then make each screen in three versions:

```text
Default
Loading
Critical state
```

That gives us **15 frames immediately**.

---

# 58. FIRST VISUAL PROTOTYPE

Connect:

```text
HOME
 ↓
SCHEDULE
 ↓
SESSION
 ↓
CONFIRM
 ↓
SUCCESS
```

Second flow:

```text
HOME
 ↓
OPEN
 ↓
SESSION
 ↓
INTEREST
 ↓
REGISTERED
```

Third:

```text
ADMIN
 ↓
EXCEPTIONS
 ↓
ASSIGNMENT
 ↓
CANDIDATE
 ↓
WHY
 ↓
ASSIGN
 ↓
SUCCESS
```

These three flows cover the central operational loop of the system.

---

# 59. THE HERO SCREEN

If the client sees only one screen in a demo, show:

## Admin Assignment War Room

Because it demonstrates:

```text
Session
+
Eligibility
+
AI recommendation
+
Auction
+
Nomination
+
Explainability
+
Travel
+
Assignment
```

That screen communicates the **actual product differentiation** better than a dashboard.

---

# 60. THE “WOW” MOMENT

The strongest prototype interaction:

```text
SESSION #4821
        ↓
CLICK “ASSIGN”
        ↓
SYSTEM ANALYZES
        ↓
Recommended candidates appear
        ↓
HOT LEAD surfaces
        ↓
Travel candidate shows trip
        ↓
Admin clicks WHY
        ↓
Score breakdown opens
        ↓
Admin assigns
        ↓
Trainer receives assignment
```

That is the story you want the client to remember.

---

# 61. VISUAL PRODUCT PRINCIPLE

The UI should constantly translate:

```text
SYSTEM COMPLEXITY
        ↓
USER SIMPLICITY
```

The backend may contain:

```text
TCI
Readiness projections
Hard filters
Weighted scoring
Travel feasibility
Rejection ledger
Assignment states
Auction interest
```

The user should see:

```text
READY
ELIGIBLE
92 MATCH
TRAVEL REQUIRED
CONFIRM
DECLINE
ASSIGN
```

This is the design challenge.

The complexity exists underneath.

The interface should expose only the complexity required to make a good decision.

---

# 62. FINAL VISUAL DNA

The finished product should feel like:

```text
                    TRAINER ROSTERING

        ┌────────────────────────────────┐
        │        Calm white space        │
        │                                │
        │       Strong typography        │
        │                                │
        │    Subtle blue primary         │
        │                                │
        │   Green / amber / red only     │
        │       when meaningful          │
        │                                │
        │   Precise cards & calendar     │
        │                                │
        │       Fast interactions        │
        │                                │
        │  Explanations instead of magic │
        └────────────────────────────────┘
```

The product's visual identity should communicate:

**“This system is intelligent, but I remain in control.”**

That matches the architecture's design: the engine filters and ranks, while the scheduler ultimately acts through an explicit assignment workflow and can inspect reasons.