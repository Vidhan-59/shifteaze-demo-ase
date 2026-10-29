
# Trainer Rostering Platform
## Complete Trainer Mobile UI Master Blueprint

---

# 0. SCOPE

This document defines only:

**Trainer Mobile Application**

It covers:

- mobile information architecture
- navigation
- screens
- screen hierarchy
- user flows
- UI components
- states
- interaction behavior
- notifications
- profile enrichment
- competency
- availability
- sessions
- open sessions
- interest
- nomination
- travel
- attendance
- error handling
- offline behavior
- accessibility
- Figma structure
- development sequence
- QA sequence

The architecture identifies the Trainer Mobile App as a dedicated channel, alongside other channels, and separately identifies the trainer's self-scoped responsibilities. 

---

# 1. THE MOBILE PRODUCT IN ONE SENTENCE

The app should make the trainer feel:

> **“This is my professional work calendar, my training opportunities, my readiness profile, and my required actions—all in one place.”**

Not:

> “This is another HR application.”

---

# 2. THE FOUR JOBS OF THE MOBILE APP

Everything should revolve around four jobs.

```text
MY WORK
What am I scheduled to deliver?

MY DECISIONS
What do I need to confirm, decline, or respond to?

MY OPPORTUNITIES
What open sessions am I eligible to take?

MY READINESS
Am I eligible and ready to receive assignments?
```

This is directly aligned with the trainer's defined personal calendar, pending-response view, open eligible sessions and leave balance.

---

# 3. MOBILE INFORMATION ARCHITECTURE

## Final navigation

I recommend five primary destinations:

```text
┌───────────────────────────────────────┐
│                                       │
│           CURRENT SCREEN              │
│                                       │
├───────────────────────────────────────┤
│ Home │ Schedule │ Open │ Profile │ More │
└───────────────────────────────────────┘
```

### 1. Home

Immediate actions and personal status.

### 2. Schedule

Everything happening on the trainer's calendar.

### 3. Open

Eligible open-session opportunities.

### 4. Profile

Readiness, skills, certifications, CV, experience, preferences.

### 5. More

Notifications, leave, travel, attendance history, settings, help.

---

# 4. IMPORTANT NAVIGATION DECISION

Do **not** make these primary tabs:

```text
Dashboard
Reports
Analytics
Assignments
Auction
Administration
```

Those belong to system/other roles.

The trainer should think in terms of:

```text
What am I doing?
What do I need to answer?
What can I take?
Am I ready?
```

---

# 5. HOME = ACTION CENTER

The Home screen should not attempt to show everything.

It should prioritize:

```text
1. Urgent action
2. Today
3. Upcoming
4. Open opportunities
5. Profile readiness
6. Alerts
```

---

# 6. SCREEN MAP

The complete mobile product is approximately:

```text
A. Authentication / activation        6
B. Home                               4
C. Schedule                           6
D. Session / response                 8
E. Open sessions                      5
F. Profile                           13
G. Competency                         6
H. Certification                      4
I. Availability / leave               6
J. Travel                             4
K. Notifications                      4
L. Attendance                         6
M. History / records                  4
N. Settings / help                    6
───────────────────────────────────────
≈ 82 views / flows / major states
```

That does **not** mean 82 totally unique layouts.

The target should be around:

**25–35 reusable mobile templates + many state variations.**

---

# 7. GLOBAL MOBILE SHELL

Every mobile screen should have four layers.

```text
SCREEN
│
├── Safe area
├── Navigation header
├── Content
└── Action area / bottom navigation
```

---

# 8. HEADER SYSTEM

There are three header types.

## Type A — Home header

```text
Good morning, Ramesh 👋
Kochi · Available                       🔔
```

## Type B — Standard detail

```text
←  Session Details
```

## Type C — Context header

```text
←  RTG Training
    18 Sep · Kochi
```

Don't make every screen look identical.

---

# 9. MOBILE DESIGN GRID

Recommended starting system:

```text
Screen width
360 / 390 / 430

Horizontal padding
16px

Card spacing
12–16px

Section spacing
24px

Primary button height
48–52px

Touch target
44px minimum
```

These are **UI recommendations**, not values defined by the source.

---

# 10. AUTHENTICATION MODULE

## M01 — Splash

### Purpose

Brand and session restoration.

```text
              LOGO

       Trainer Rostering

          loading...
```

No unnecessary animation.

---

## M02 — Sign In

```text
Welcome back

Work email / Employee ID

[________________]

[ CONTINUE ]

Use company SSO
```

Because the architecture includes identity, SSO and MFA in the identity layer.

---

## M03 — MFA

```text
Verify identity

Enter the 6-digit code

[ _ _ _ _ _ _ ]

Code expires in 00:54

Resend code

[ VERIFY ]
```

States:

```text
Default
Wrong code
Expired code
Resend
Locked
Success
```

---

## M04 — First-time activation

```text
Welcome, Ramesh

We've created your trainer profile.

Your next step:
Complete your professional profile.

[ START PROFILE ]
```

---

## M05 — Identity confirmation

This is critical because seeded HR data is not editable directly.

```text
CONFIRM YOUR DETAILS

Employee code
EMP-10482

Name
Ramesh Patel

Home site
Ahmedabad

BU
Logistics

Engagement
On-roll

Everything correct?

[ YES, CONTINUE ]

Something is wrong
```

If incorrect:

```text
REQUEST CORRECTION

Field
Home site

Current
Ahmedabad

Correct value
Kochi

Reason
[____________]

[ SUBMIT REQUEST ]
```

The architecture defines T0 seeded data as system-owned and directs corrections through a request rather than direct edits.

---

## M06 — Profile onboarding start

```text
Let's get your profile ready

This takes around a few steps.

Profile completeness

0%

1 Identity
2 Contact
3 Education
4 Experience
5 CV
6 Competencies
7 Certifications
8 Availability
9 Review

[ START ]
```

The nine-step enrichment sequence is explicitly defined in the architecture.

---

# 11. HOME MODULE

## M07 — Home

Recommended structure:

```text
Good morning, Ramesh 👋
Kochi · Available

┌─────────────────────────────┐
│ PROFILE                     │
│                             │
│ 78%                         │
│ ████████████░░              │
│ Recommendation Ready ✓      │
│                             │
│ 2 items remaining           │
│ [ COMPLETE ]                │
└─────────────────────────────┘

ACTION REQUIRED
─────────────────────────────
Schedule response
Due in 17h 42m

[ REVIEW ]

TODAY
─────────────────────────────
09:00–11:00
RTG Training
Kochi · Room B204
CONFIRMED

OPEN FOR YOU
─────────────────────────────
3 eligible sessions

[ VIEW OPEN SESSIONS ]
```

---

# 12. HOME RULE: DYNAMIC PRIORITY

The primary CTA should change according to the highest-priority action.

Examples:

```text
Profile incomplete
→ Complete Profile

Schedule awaiting response
→ Review Schedule

Session awaiting confirmation
→ Confirm Session

Certificate expiring
→ Update Certification

Open opportunities
→ View Open Sessions
```

This keeps Home operational instead of static.

---

# 13. PROFILE READINESS

The architecture gives PCS a 0–100 score and defines RecommendationReady as PCS ≥75 plus at least one verified competency.

So the UI should show:

```text
78%

Recommendation Ready ✓

Next:
Certification document
Availability preferences
```

Not merely:

```text
78%
```

The number needs meaning.

---

# 14. PROFILE STATUS BANNERS

### Ready

```text
✓ You're ready for trainer assignments
```

### Incomplete

```text
Complete your profile to become
eligible for assignments.

2 items remaining
```

### Submitted

```text
Profile submitted for verification

We'll notify you when the review is complete.
```

### Returned

```text
Profile needs attention

An assessor returned 2 items for correction.

[ REVIEW ]
```

### Suspended

```text
Your trainer profile is currently suspended.

Assignments are temporarily unavailable.

[ VIEW DETAILS ]
```

These states follow the profile lifecycle defined in the architecture.

---

# 15. TODAY CARD

This should be extremely compact.

```text
TODAY · 18 SEP

09:00–11:00
RTG Technical Training

Kochi
Room B204

CONFIRMED
```

If action is needed:

```text
10:00–12:00
Safety Training

AWAITING RESPONSE
Due in 4h
[ RESPOND ]
```

---

# 16. HOME ALERTS

Examples:

```text
⚠ Certificate expires in 7 days

✓ RTG competency verified

✈ Travel approved for Kochi

⚠ Session at risk
```

The notification architecture includes certificate warnings, competency verification, travel sanction, assignment events, at-risk sessions and profile reminders.

---

# 17. SCHEDULE MODULE

## M08 — Month View

```text
September 2026

MON TUE WED THU FRI SAT SUN
    1   2   3   4   5   6
7   8   9  10  11  12  13
14 15  16  17  18  19  20
21 22  23  24  25  26  27
```

Date can show a small status indicator.

---

# 18. M09 — Week View

This is likely the **highest-value mobile calendar view**.

```text
MON 18

09:00
████████████
RTG Training
Kochi

14:00
████████████
Safety
Kochi

TUE 19

16:00
▓▓▓▓▓▓▓▓
Travel
Ahmedabad → Kochi
```

---

# 19. M10 — Day View

```text
18 SEPTEMBER

08:00
│
09:00
┌─────────────────────────┐
│ RTG Training            │
│ 09:00–11:00             │
│ CONFIRMED               │
└─────────────────────────┘
│
11:00
│
14:00
┌─────────────────────────┐
│ Safety Training         │
│ AWAITING RESPONSE       │
└─────────────────────────┘
```

---

# 20. CALENDAR OBJECT TYPES

The mobile calendar should understand:

```text
SESSION
TRAVEL
LEAVE
BLACKOUT
OPEN OPPORTUNITY
```

Travel is a real calendar-occupying object in the source architecture.

---

# 21. CALENDAR STATUS SYSTEM

Maintain the source semantics:

```text
Grey    Draft
Blue    Published / awaiting response
Green   Confirmed
Amber   Unassigned / backfill
Red     At risk
Purple  Open / interest
Hatched Travel / leave / blackout
```



---

# 22. M11 — Schedule Filters

Bottom sheet:

```text
FILTER SCHEDULE

Status

☐ Confirmed
☐ Awaiting response
☐ Open
☐ At risk

Type

☐ Technical
☐ Foundation

Location

☐ Ahmedabad
☐ Kochi
☐ Mundra

[ APPLY FILTERS ]
```

---

# 23. M12 — Schedule Search

Search should support:

```text
Course
Skill
Site
Room
Session ID
```

Example:

```text
[ 🔍 RTG ]

Results
RTG Operations
RTG Simulator
RTG Safety
```

---

# 24. SESSION MODULE

This is the most important mobile interaction after Schedule.

The session state machine moves through Draft → Scheduled → Unassigned/Assigned → Confirmed → In Progress → Delivered → Verified.

The trainer should see only the states relevant to them.

---

# 25. M13 — Session Detail

```text
RTG Technical Training

18 Sep 2026
09:00–11:00

CONFIRMATION REQUIRED

📍 Kochi
🏫 Room B204
👥 14 learners

YOUR ROLE
Primary

REQUIREMENTS
RTG L4
Technical
Simulator

YOUR ELIGIBILITY
✓ Skill verified
✓ Certification valid
✓ Available
✓ Delivery mode supported
```

---

# 26. SESSION DETAIL INFORMATION ORDER

Always:

```text
1. What
2. When
3. Where
4. Your role
5. Requirements
6. Travel
7. Response deadline
8. Actions
```

Don't put technical database information at the top.

---

# 27. M14 — Session Requirement Detail

```text
SESSION REQUIREMENTS

Skill
RTG Operations

Minimum level
L4

Training type
Technical

Mode
Simulator

Equipment
RTG

Required trainer role
Primary
```

These are directly related to the session attributes driving eligibility.

---

# 28. M15 — Response Deadline

Sticky section:

```text
RESPONSE DUE

17h 42m remaining
```

The system has different SLAs for monthly schedule response, session-level response and emergency assignment.

---

# 29. M16 — Confirm

Confirmation sheet:

```text
CONFIRM SESSION?

RTG Technical Training
18 Sep
09:00–11:00
Kochi

By confirming:
• this session blocks your calendar
• required travel will be scheduled

[ CONFIRM ]
[ CANCEL ]
```

---

# 30. M17 — Confirm Success

```text
✓ SESSION CONFIRMED

RTG Technical Training

Your calendar has been updated.

Travel
Added

Next reminder
T-3 days
```

The architecture sends another session-level confirmation request in the pre-session window.

---

# 31. TWO-CONFIRMATION EXPERIENCE

This is a crucial UX detail.

The trainer sees:

### First confirmation

```text
MONTHLY SCHEDULE
```

### Later confirmation

```text
SESSION CONFIRMATION

Your session is coming up.

Please reconfirm by:
24 Sep
```

Do not make these feel like the exact same message.

The architecture intentionally has two nested response stages.

---

# 32. M18 — Decline

The first screen:

```text
DECLINE SESSION

Why are you declining?

○ Schedule conflict
○ Personal conflict
○ Leave
○ Travel issue
○ Other

Additional note

[___________________]

[ CONTINUE ]
```

Decline reason is mandatory.

---

# 33. M19 — Nomination

After decline:

```text
HELP FIND A REPLACEMENT?

You can nominate another trainer.

This is optional.

[ NOMINATE TRAINER ]
[ SKIP ]
```

---

# 34. M20 — Nominee Search

```text
NOMINATE TRAINER

[ 🔍 Search trainer ]

Suggested:

Ravi Patel
RTG L4 · Verified

Anil Kumar
RTG L4 · Verified

Mehul Shah
RTG L3 · Submitted
```

The nominee should never be presented as automatically eligible.

---

# 35. M21 — Nominee Validation

After selecting:

```text
CHECKING NOMINEE

Ravi Patel

✓ Competency
✓ Certification
✓ Availability
✓ Load
✓ Travel
✓ Deployable scope

Eligibility check complete
```

The actual system validates nomination eligibility.

---

# 36. M22 — Nomination Result

Eligible:

```text
✓ NOMINATION SUBMITTED

Ravi Patel has been nominated.

The scheduling team will make
the final assignment.
```

Ineligible:

```text
NOMINATION NOT ELIGIBLE

Ravi Patel cannot take this session.

Reason:
Certification expired.

Your nomination was not assigned.
```

The architecture says an ineligible nominee should not disappear silently; the exact failing filter is retained.

---

# 37. DECLINE SUCCESS

```text
DECLINE RECORDED

The session is now being backfilled.

You don't need to take any
further action.
```

This is important psychologically.

The trainer should know:

> “My job is finished.”

---

# 38. OPEN SESSIONS MODULE

The internal architecture calls this an auction, but the trainer-facing experience should be:

# **Open Sessions**

The architecture explicitly says the auction is trainer-initiated from the trainer's schedule/open-session projection.

---

# 39. M23 — Open Sessions List

```text
OPEN SESSIONS

3 available

[ Date ] [ Site ] [ Skill ]

─────────────────────────

RTG Simulator
18 Sep
Kochi

MATCH
92%

✓ RTG L4
✓ Simulator
✓ Certification

[ VIEW ]
```

---

# 40. M24 — Open Session Detail

```text
RTG Simulator Training

18 Sep
14:00–16:00

Kochi
Simulator 02

14 learners

YOUR MATCH
92

Why you're eligible
✓ RTG L4
✓ Simulator
✓ Certificate valid
✓ No overlap

[ I'M INTERESTED ]
```

---

# 41. M25 — Match Explanation

```text
YOUR MATCH

92 / 100

Competency       29
Location         15
Schedule fit     11
Workload         10
Effectiveness     9
Cost              7
Continuity        6
Interest          0
Development       5
```

The source's scoring model is competency, location/travel, schedule fit, workload, effectiveness, cost, continuity, interest and development.

Use this only when the trainer wants explanation.

Don't make score details dominate the mobile card.

---

# 42. M26 — Express Interest

```text
REGISTER INTEREST

RTG Simulator Training
18 Sep · Kochi

This is NOT a booking.

If selected, you'll receive
an assignment request to confirm.

Optional note

[_______________________]

[ REGISTER INTEREST ]
```

This distinction is explicitly required by the source.

---

# 43. M27 — Interest Registered

```text
✓ INTEREST REGISTERED

RTG Simulator Training
18 Sep · Kochi

Registered 2h ago

This session is not yet assigned to you.

[ WITHDRAW INTEREST ]
```

---

# 44. M28 — My Interests

```text
MY INTERESTS

ACTIVE

RTG Simulator
18 Sep
Interested
Waiting for assignment

FILLED

Safety Training
15 Sep
Session filled

WITHDRAWN

OJT
10 Sep
You withdrew
```

Interest states include active, withdrawn, allocated and lapsed in the data model.

---

# 45. INTEREST RULES THE UI MUST REFLECT

The app must communicate these rules clearly:

```text
Interest does not reserve the session.
Interest does not block the calendar.
Overlapping interests can trigger a warning.
Interest is rechecked before assignment.
Withdrawal before assignment is not a rejection.
```

These are explicit rules in the architecture.

---

# 46. PROFILE MODULE

Profile is not one screen.

It is an operating system for trainer readiness.

The architecture divides profile data into:

```text
T0
Seeded

T1
Self-declared

T2
Verified

T3
Derived
```



The UI should visually preserve that trust model.

---

# 47. M29 — Profile Overview

```text
MY PROFILE

Ramesh Patel
Senior Trainer

78%
Profile completeness

✓ Recommendation Ready

────────────────────

PERSONAL
✓ Complete

EDUCATION
✓ Complete

EXPERIENCE
✓ Complete

COMPETENCIES
✓ 4 verified

CERTIFICATIONS
⚠ 1 expiring

AVAILABILITY
✓ Complete

DOCUMENTS
✓ Complete
```

---

# 48. PROFILE SECTION STATUS

Every section gets:

```text
✓ Complete
⚠ Needs attention
○ Not started
↻ Under review
✓ Verified
```

---

# 49. M30 — Contact & Personal

Fields:

```text
Mobile
Email
Address
Emergency contact
Languages
```

The profile source explicitly includes contact, address and languages.

---

# 50. M31 — Education

```text
EDUCATION

Bachelor of Engineering
ABC University
2019
Mechanical Engineering

Document
✓ Uploaded

[ EDIT ]
[ + ADD ]
```

---

# 51. M32 — Add Education

```text
QUALIFICATION
[ Bachelor of Engineering ]

INSTITUTION
[ ABC University ]

YEAR
[ 2019 ]

SPECIALISATION
[ Mechanical ]

DOCUMENT
[ UPLOAD ]

[ SAVE ]
```

---

# 52. M33 — Work Experience

Timeline style:

```text
WORK EXPERIENCE

2020–2022
Company A
Technical Trainer

2022–Present
Company B
Senior Trainer

Equipment
RTG
RMG
QC
```

The source captures employer, role, dates, domain, equipment and training delivery experience.

---

# 53. M34 — Add Experience

```text
EMPLOYER
ROLE
FROM
TO
DOMAIN
EQUIPMENT
TRAINING DELIVERED?

○ Yes
○ No

[ SAVE ]
```

---

# 54. M35 — CV Upload

```text
YOUR CV

No CV uploaded

Upload:
PDF
DOCX

[ UPLOAD CV ]
```

After upload:

```text
CV uploaded ✓

Processing...
```

---

# 55. M36 — CV Parsing Review

This is an important trust experience.

```text
CV REVIEW

We extracted:

Education
2 records

Experience
4 records

Skills
6 possible competencies

These are draft values.
Please review before saving.

[ REVIEW ]
```

The architecture says CV parsing pre-fills data as drafts and is never authoritative.

---

# 56. M37 — Extracted Skill Review

```text
RTG Operations

Detected from CV

Suggested level
L2

Source
CV parsed

Status
DRAFT

[ ACCEPT AS DRAFT ]
[ EDIT ]
[ DISCARD ]
```

A parsed competency is capped at L2 and cannot satisfy a hard eligibility gate until verified.

---

# 57. M38 — Competency List

```text
COMPETENCIES

RTG Operations
L4 · Verified
TCI 87

Simulator
L4 · Verified

OJT
L3 · Pending

Safety
L5 · Verified

[ + DECLARE SKILL ]
```

---

# 58. M39 — Competency Detail

```text
RTG OPERATIONS

Level
L4

Training type
Technical

Delivery modes
✓ Classroom
✓ Simulator
✓ OJT
✕ VILT

Equipment
RTG

State
VERIFIED

Source
Assessment

Confidence
High

Validity
Until 14 Jan 2027

TCI
87
```

The competency entity carries skill, level, training type, delivery capability, equipment, source, confidence, state, validity, evidence and derived TCI.

---

# 59. M40 — Self-Declare Competency

Controlled taxonomy only:

```text
SELECT SKILL

Search skills

RTG Operations
RMG Operations
QC Operations
Safety
OJT
Simulator
```

Then:

```text
SKILL
RTG Operations

Self-rated level
L1
L2
L3
L4
L5

Evidence
[ ADD DOCUMENT ]

[ SUBMIT ]
```

---

# 60. IMPORTANT COMPETENCY UI RULE

Never allow the trainer to make this look verified.

Show:

```text
SELF DECLARED
```

not:

```text
VERIFIED
```

Only the appropriate verifier can establish the verified state.

---

# 61. M41 — Evidence

```text
EVIDENCE

RTG certificate
✓ Uploaded

Training record
✓ Uploaded

Experience document
✓ Uploaded

[ + ADD EVIDENCE ]
```

---

# 62. M42 — Verification Status

```text
COMPETENCY REVIEW

RTG Operations

Self-declared
L4

Current status
Under verification

Submitted
12 Sep

Reviewer
Assessor

[ VIEW SUBMISSION ]
```

---

# 63. CERTIFICATION MODULE

## M43 — Certification List

```text
CERTIFICATIONS

RTG Certification
✓ Valid
Until Jan 2027

Safety
⚠ Expires in 21 days

OJT Clearance
✕ Expired
```

---

# 64. M44 — Certification Detail

```text
RTG CERTIFICATION

Certificate no.
CERT-4821

Issued
15 Jan 2024

Expires
14 Jan 2027

Status
VALID

[ VIEW DOCUMENT ]
```

---

# 65. M45 — Renew Certification

```text
RENEW CERTIFICATION

New certificate
[ UPLOAD ]

Certificate number
[________]

Issue date
[________]

Expiry date
[________]

[ SUBMIT ]
```

---

# 66. M46 — Expired Certification

```text
CERTIFICATION EXPIRED

OJT Clearance

Expired:
12 Sep 2026

Impact:
You may not be eligible for sessions
requiring this certification.

[ UPDATE DOCUMENT ]
```

Certification validity is a hard eligibility condition for assignment.

---

# 67. AVAILABILITY MODULE

The source treats availability as a combination of leave, blackout dates, preferences, holiday calendars and travel blocks.

---

# 68. M47 — Availability Overview

```text
AVAILABILITY

Status
AVAILABLE

Preferred slots
Morning
Afternoon

Preferred locations
Ahmedabad
Kochi

Deployable locations
Ahmedabad
Mundra
Kochi

Blackout dates
2
```

---

# 69. M48 — Availability Calendar

```text
SEP 2026

● Available
■ Session
▓ Travel
▲ Leave
○ Blackout
```

The calendar should combine these objects instead of using separate disconnected modules.

---

# 70. M49 — Preferences

```text
PREFERENCES

Preferred slots

☑ Morning
☑ Afternoon
☐ Night

Preferred locations

☑ Ahmedabad
☑ Kochi
☐ Mundra

Willing to travel

☑ Yes
```

Preferences should be communicated as preferences, not guaranteed assignment criteria. The source specifically says preferences are soft signals for schedule fit, not hard filters.

---

# 71. M50 — Blackout Date

```text
ADD BLACKOUT

Date
18 Sep

Reason
Personal

Notes
[____________]

[ SAVE BLACKOUT ]
```

---

# 72. LEAVE MODULE

## M51 — Leave Overview

```text
LEAVE

Balance
8 days

UPCOMING

22–24 Sep
Pending approval

10–11 Oct
Approved

[ APPLY LEAVE ]
```

---

# 73. M52 — Apply Leave

```text
APPLY LEAVE

From
22 Sep

To
24 Sep

Reason
Personal

Notes
[____________]

Conflicts detected
2 sessions

[ SUBMIT REQUEST ]
```

---

# 74. M53 — Leave Conflict

```text
LEAVE CONFLICT

Your requested leave overlaps
with 2 scheduled sessions.

18 Sep — RTG
19 Sep — Safety

Your request can still be submitted.

[ REVIEW SESSIONS ]
[ SUBMIT LEAVE ]
```

The architecture says pending leave is treated conservatively as occupied, and approved leave blocks the calendar.

---

# 75. M54 — Leave Detail

```text
LEAVE REQUEST

22–24 Sep

Status
PENDING

Submitted
10 Sep

Approval path
Reporting manager
→ Site head

[ CANCEL REQUEST ]
```

---

# 76. TRAVEL MODULE

Travel is not a decorative badge.

It is an actual schedule object.

---

# 77. M55 — Travel Overview

```text
TRAVEL

UPCOMING

Ahmedabad → Kochi
17 Sep

Travel block
16:00–07:00

Status
Approved

[ VIEW ]
```

---

# 78. M56 — Travel Detail

```text
CROSS-LOCATION TRAVEL

Ahmedabad
     ↓
     ✈
     ↓
Kochi

Outbound
17 Sep · 16:00

Session
18 Sep · 09:00

Return
18 Sep · 18:00

Travel time
4h 10m

Approval
Approved
```

---

# 79. M57 — Travel Calendar Block

The Schedule screen should visibly show:

```text
17 SEP

16:00
▓▓▓▓▓▓▓▓▓▓▓
TRAVEL
Ahmedabad → Kochi

18 SEP

09:00
██████████
RTG Training
```

---

# 80. TRAVEL INTERRUPTION STATE

If travel changes:

```text
⚠ TRAVEL PLAN CHANGED

Your Kochi assignment may be
affected by the updated travel plan.

[ VIEW TRAVEL ]
```

The architecture includes session changes after travel booking, disruption and multi-leg travel cases.

---

# 81. NOTIFICATION CENTER

## M58 — Notifications

Split into:

```text
URGENT
ACTION
REMINDERS
UPDATES
```

Example:

```text
URGENT

⚠ Session at risk
Kochi · 18 Sep

ACTION

Schedule response
Due in 17h

REMINDER

Session reconfirmation
T-3 days

UPDATES

✓ Competency verified
```

---

# 82. NOTIFICATION DETAIL

```text
SESSION RESPONSE REQUIRED

RTG Technical Training
18 Sep
09:00–11:00
Kochi

You must respond by:
17h 42m

[ OPEN SESSION ]
```

Notifications should deep-link directly to the correct action.

---

# 83. NOTIFICATION DEEP LINKS

Every operational notification should have a direct destination.

```text
Schedule published
→ Schedule

Session assignment
→ Session Detail

Open sessions
→ Open

Certificate expiring
→ Certification

Competency verified
→ Competency

Profile incomplete
→ Exact missing section

Travel sanction
→ Travel
```

The notification matrix explicitly includes these event types and channels.

---

# 84. NOTIFICATION PREFERENCE SCREEN

## M59

```text
NOTIFICATION PREFERENCES

Assignments
☑ Push
☑ WhatsApp
☑ Email

Open sessions
☑ Daily digest
☐ Individual alerts

Certificate expiry
☑ Email
☑ In-app

Travel
☑ Push
☑ WhatsApp
```

Do not allow trainers to disable critical compliance/assignment communication without whatever policy controls are later defined.

---

# 85. ATTENDANCE

The architecture includes an attendance module with QR and geo-fence capability.

---

# 86. M60 — Session Starting

On the day:

```text
TODAY

RTG Training
09:00–11:00

Starts in
00:18:42

Kochi
Room B204

[ START SESSION ]
```

---

# 87. M61 — Check In

```text
CHECK IN

RTG Training
Room B204

Choose:

[ SCAN SESSION QR ]

or

[ VERIFY LOCATION ]
```

---

# 88. M62 — QR Scan

```text
SCAN QR

Point your camera
at the session QR code.
```

States:

```text
Camera permission
Granted
Denied
QR detected
Invalid QR
Expired QR
```

---

# 89. M63 — Geo Verification

If geo-fence is active:

```text
VERIFY LOCATION

Checking your location...

✓ You are at the assigned site.
```

If failed:

```text
LOCATION NOT VERIFIED

You appear to be outside
the session location.

[ TRY AGAIN ]
[ CONTACT SUPPORT ]
```

---

# 90. M64 — Session In Progress

```text
SESSION IN PROGRESS

RTG Technical Training

Started
09:02

Learners
14

Attendance
12 / 14

[ MANAGE ATTENDANCE ]

[ END SESSION ]
```

---

# 91. M65 — End Session

```text
END SESSION?

Attendance
14 / 14

Session duration
2h 03m

Notes
[____________]

[ END SESSION ]
```

The session lifecycle moves from InProgress to Delivered after attendance is captured.

---

# 92. ATTENDANCE HISTORY

## M66

```text
ATTENDANCE HISTORY

18 Sep
RTG Training
✓ Completed

14 Sep
Safety
✓ Completed

10 Sep
OJT
✓ Completed
```

---

# 93. DELIVERY HISTORY

The trainer should eventually have:

```text
Sessions delivered
Hours delivered
Skills delivered
Feedback
Recency
Utilisation
```

The source treats delivery history, feedback, TCI, utilisation and recency as derived/system-owned data rather than editable trainer inputs.

---

# 94. MY HISTORY

## M67

```text
MY HISTORY

Sessions
128

Delivered
121

Cancelled
2

Declined
5

Attendance
98%

Recent activity
────────────────
RTG — 18 Sep
Safety — 16 Sep
OJT — 14 Sep
```

Derived metrics should be read-only.

---

# 95. REJECTION / DECLINE HISTORY

## M68

```text
RESPONSE HISTORY

Recent 30 days

Schedule response
✓ Confirmed

Session decline
Travel issue

Session decline
Personal conflict

Current status
Normal
```

The architecture uses a rejection ledger with derived countability/weights; the app should avoid exposing raw punitive mechanics unless the product later decides trainers need them, but the status/history itself should remain understandable.

---

# 96. PROFILE CHANGE REQUESTS

## M69

```text
CHANGE REQUESTS

Home site
Pending

Requested
12 Sep

Certification
Approved

Experience
Rejected

[ VIEW DETAILS ]
```

---

# 97. CHANGE REQUEST DETAIL

```text
FIELD
Home Site

Current
Ahmedabad

Requested
Kochi

Status
Pending

Submitted
12 Sep
```

---

# 98. “WHY AM I NOT ELIGIBLE?” — MOBILE

This deserves its own design pattern.

Suppose a trainer sees an unavailable/open session or receives a reason.

Show:

```text
NOT ELIGIBLE

You cannot currently take this session.

Reason

Certification expired

Your certification
OJT Clearance

Expired
12 Sep 2026

[ UPDATE CERTIFICATION ]
```

This is much better than:

```text
Eligibility: false
```

---

# 99. MULTI-REASON ELIGIBILITY

If there are several blockers:

```text
NOT ELIGIBLE

2 conditions need attention

✕ Certification expired
✕ Travel window unavailable

✓ Competency
✓ Delivery mode
✓ Deployable scope
```

---

# 100. MOBILE “SYSTEM TRUST” MODEL

Every important piece of information should reveal its source when useful.

Example:

```text
TCI 87
System generated
```

```text
L4
Assessment verified
```

```text
Preferred location: Kochi
Self declared
```

```text
Employee code
HR supplied
```

This follows the four-tier ownership model.

---

# 101. HOME → SESSION FLOW

```text
HOME
 ↓
Action Required
 ↓
Session Detail
 ↓
Review
 ↓
Confirm
 ↓
Success
 ↓
Schedule
```

This should be almost frictionless.

---

# 102. HOME → OPEN SESSION FLOW

```text
HOME
 ↓
Open for You
 ↓
Open Sessions
 ↓
Session Detail
 ↓
Why Eligible?
 ↓
I'm Interested
 ↓
Registered
```

---

# 103. SESSION → DECLINE → NOMINATION

```text
SESSION
 ↓
DECLINE
 ↓
REASON
 ↓
NOMINATE?
 ↓
SEARCH TRAINER
 ↓
VALIDATE
 ↓
SUBMITTED
```

---

# 104. PROFILE → READY FLOW

```text
HOME
 ↓
Profile 62%
 ↓
Complete Profile
 ↓
Education
 ↓
Experience
 ↓
CV
 ↓
Competency
 ↓
Certification
 ↓
Availability
 ↓
Review
 ↓
Submit
 ↓
Under Verification
 ↓
Verified
 ↓
Recommendation Ready
```

---

# 105. LEAVE FLOW

```text
PROFILE / MORE
 ↓
Availability
 ↓
Leave
 ↓
Apply
 ↓
Conflict Check
 ↓
Submit
 ↓
Pending
 ↓
Approved / Rejected
```

---

# 106. ATTENDANCE FLOW

```text
SCHEDULE
 ↓
TODAY
 ↓
SESSION
 ↓
START
 ↓
QR / GEO
 ↓
CHECK-IN
 ↓
IN PROGRESS
 ↓
ATTENDANCE
 ↓
END
 ↓
DELIVERED
```

---

# 107. TRAVEL FLOW

```text
SESSION
 ↓
Travel Required
 ↓
Travel Detail
 ↓
Calendar Block
 ↓
Approved
 ↓
Travel
 ↓
Session
 ↓
Return
```

---

# 108. APP HOME STATE MATRIX

Home can have at least these major states.

| State | Primary message |
|---|---|
| New user | Complete your profile |
| Ready | You're ready |
| Pending response | Respond to assignment |
| Open opportunities | You have opportunities |
| Travel upcoming | Prepare for trip |
| Certificate warning | Update certification |
| At risk session | Action required |
| No activity | Your schedule is clear |
| Suspended | Assignments unavailable |

---

# 109. SCHEDULE STATE MATRIX

```text
No schedule
Draft-ish incoming data
Confirmed
Awaiting response
Open opportunity
Travel
Leave
Blackout
At risk
Completed
Cancelled
```

Do not make every one a different page.

Same component.

Different state.

---

# 110. SESSION STATE MATRIX

The backend has:

```text
Proposed
Notified
Confirmed
Declined
Released
Delivered
Cancelled
```



Mobile presentation:

```text
AWAITING RESPONSE
CONFIRMED
DECLINED
AT RISK
IN PROGRESS
COMPLETED
CANCELLED
```

---

# 111. OPEN SESSION STATE MATRIX

```text
Available
Interested
Interest withdrawn
Assigned
Filled
Expired
No longer eligible
```

The underlying interest model supports active, withdrawn, allocated and lapsed states.

---

# 112. PROFILE STATE MATRIX

```text
Seeded
Invited
Enriching
Submitted
Verified
Recommendation Ready
Change Requested
Suspended
Inactive
```



---

# 113. EMPTY STATES

Every module needs purposeful empty states.

## Schedule

```text
No sessions this week

Your schedule is clear.
```

## Open Sessions

```text
No eligible open sessions

We'll notify you when opportunities
become available.
```

## Competency

```text
No competencies added

Declare your first skill to begin
your verification journey.
```

## Notifications

```text
You're all caught up.
```

## Leave

```text
No upcoming leave requests.
```

---

# 114. ERROR STATES

Never write:

```text
Something went wrong.
```

Use context.

```text
SESSION COULD NOT BE CONFIRMED

This session was assigned to
another trainer before your response.

[ BACK TO SCHEDULE ]
```

---

# 115. STALE DATA

If the session changed while open:

```text
SESSION UPDATED

The session details changed while
you were viewing this page.

[ REFRESH ]
```

This is especially important because assignment and eligibility can change between list rendering and commit.

---

# 116. OFFLINE EXPERIENCE

The mobile app should remain useful during poor connectivity.

### Offline-readable

Cache:

```text
Current schedule
Confirmed sessions
Travel blocks
Leave
Profile summary
Certificates
Open-session snapshot
```

### Offline-actionable

Safe locally queued actions may include:

```text
Attendance check-in
Attendance capture
Profile draft changes
```

But actions that require current eligibility should not be falsely presented as final.

Example:

```text
OFFLINE

Your response will be sent
when you're back online.

[ SAVE RESPONSE ]
```

This is a **recommended mobile behavior**, not explicitly defined in the source.

---

# 117. NETWORK RECOVERY

After reconnection:

```text
SYNCING

3 changes pending

✓ Profile updated
✓ Attendance uploaded
✓ Leave request sent
```

Conflict:

```text
SYNC CONFLICT

Your profile changed on another device.

Choose:
Keep server version
Review changes
```

---

# 118. PERMISSION DESIGN

### Camera

Needed for attendance QR.

Ask only when needed:

```text
Allow camera access
to scan session QR codes.
```

### Location

Ask only when needed for geo verification:

```text
Allow location access
to verify attendance at the session site.
```

Don't request all permissions at first launch.

---

# 119. FILE UPLOAD UX

For CV/certificates:

```text
Upload document

Take photo
Choose file
Choose from files
```

Status:

```text
Uploading...
Processing...
Uploaded ✓
Rejected ✕
```

---

# 120. DOCUMENT VIEWER

For certificates:

```text
[ Document Preview ]

Certificate
RTG Certification

Page 1 / 2

[ Download ]
[ Close ]
```

---

# 121. GLOBAL SEARCH

Search should be limited and purposeful.

Trainer mobile search:

```text
Sessions
Skills
Documents
Notifications
```

Don't turn this into enterprise universal search.

---

# 122. DESIGN SYSTEM — MOBILE COMPONENTS

The first component library should contain:

```text
AppHeader
BottomNav
Button
IconButton
Avatar
StatusPill
Badge
Card
SessionCard
OpenSessionCard
ProfileCard
ProgressRing
Countdown
Timeline
Calendar
CalendarEvent
TravelBlock
LeaveBlock
NotificationCard
TrainerReadiness
CompetencyCard
CertificationCard
DocumentCard
Stepper
SearchField
FilterChip
FilterSheet
BottomSheet
ConfirmDialog
Toast
AlertBanner
EmptyState
Skeleton
```

---

# 123. COMPONENT VARIANTS

### SessionCard

```text
Confirmed
Awaiting
Open
At Risk
Completed
Cancelled
```

### CertificationCard

```text
Valid
Expiring
Expired
Pending
```

### CompetencyCard

```text
Draft
Submitted
Verified
Expired
Rejected
```

### TravelBlock

```text
Planned
Approved
Pending
Changed
Cancelled
```

---

# 124. MOBILE COPY SYSTEM

Keep action labels extremely explicit.

Use:

```text
Confirm Session
Decline Session
Nominate Trainer
I'm Interested
Withdraw Interest
Apply Leave
Upload CV
Add Skill
Submit Profile
Update Certification
Start Session
Check In
End Session
View Travel
```

Avoid:

```text
Process
Proceed
Manage
Continue
Action
```

unless context makes the meaning obvious.

---

# 125. MICROCOPY PRINCIPLE

The app should always tell the trainer:

```text
WHAT HAPPENED
WHY
WHAT NOW
```

Example:

```text
Your nomination could not be used.

Reason:
The trainer's certification is expired.

Next:
You don't need to do anything.
The session has returned to backfill.
```

---

# 126. CONFIRMATION LANGUAGE

Don't use:

> Are you sure?

Prefer:

```text
Confirm session?

RTG Training
18 Sep · 09:00

This will add the session
to your confirmed schedule.
```

The user understands the consequence.

---

# 127. DESTRUCTIVE ACTION LANGUAGE

Decline:

```text
Decline this session?
```

Then:

```text
Please select a reason.
```

No emotional wording.

---

# 128. NOTIFICATION URGENCY

The source uses different notification timing by event.

Mobile should therefore have:

```text
LOW
Information

MEDIUM
Reminder

HIGH
Response required

CRITICAL
At risk / suspension / immediate action
```

---

# 129. PUSH NOTIFICATION DESIGN

Example:

```text
Trainer Rostering

RTG Training needs your response.

Kochi · 18 Sep · 09:00

Respond within 17h.
```

Open directly to the session.

---

# 130. DAILY OPEN-SESSION DIGEST

The source specifically recommends a daily digest rather than a push per open session.

Mobile:

```text
3 new open sessions

RTG Simulator
Kochi

Safety
Mundra

OJT
Ahmedabad

[ VIEW ALL ]
```

---

# 131. CERTIFICATION NOTIFICATION

```text
Certification expiring

Your Safety certification expires
in 7 days.

[ UPDATE CERTIFICATION ]
```

The architecture specifies T-30, T-15 and T-7 alerts.

---

# 132. PROFILE COMPLETION NOTIFICATION

```text
Your profile is 68% complete.

Complete Competencies to become
eligible for more assignments.

[ COMPLETE NOW ]
```

---

# 133. HOME WIDGET PRIORITY ENGINE

The mobile Home should conceptually calculate:

```text
Highest urgency
       ↓
Compliance
       ↓
Assignment response
       ↓
Session risk
       ↓
Travel
       ↓
Profile
       ↓
Opportunities
```

This ordering is a **recommended UX prioritization**, while the source provides the underlying event types and SLAs.

---

# 134. MOBILE DASHBOARD SHOULD NOT HAVE

Do not clutter Home with:

```text
Pie charts
Complex bar charts
BU KPIs
Trainer ranking
Management analytics
System-wide fill rate
```

The trainer doesn't own those decisions.

---

# 135. MOBILE PROFILE SHOULD NOT HAVE

Do not expose unnecessary internal engine settings.

Never show:

```text
Weight profile
Engine configuration
Backend IDs
Recommendation algorithm settings
System locks
Database status
```

The trainer needs **the result and the reason**, not internal administration.

---

# 136. MOBILE AI SHOULD NOT SAY

Avoid:

```text
AI selected you.
```

Prefer:

```text
You match this session because:

✓ RTG L4 verified
✓ Simulator cleared
✓ Certification valid
✓ Schedule available
```

The architecture uses deterministic eligibility plus weighted scoring.

---

# 137. THE MOST IMPORTANT MOBILE DESIGN PRINCIPLE

### Never expose backend complexity as UI complexity.

Backend:

```text
trainer_readiness
hard filters
TCI
weighted profile
interest signal
travel feasibility
rejection ledger
score snapshot
```

Mobile:

```text
Ready
Eligible
Match
Travel required
Respond
Interested
Confirmed
```

That is the correct abstraction.

---

# 138. MOBILE HOME FINAL WIREFRAME

```text
┌──────────────────────────────┐
│ Good morning, Ramesh 👋   🔔 │
│ Kochi · Available             │
├──────────────────────────────┤
│ PROFILE                      │
│                              │
│ 78%                          │
│ █████████████░░              │
│ Recommendation Ready ✓       │
│ [ COMPLETE ]                 │
├──────────────────────────────┤
│ ACTION REQUIRED         ⚠   │
│                              │
│ Monthly schedule response    │
│ Due in 17h 42m               │
│ [ REVIEW ]                   │
├──────────────────────────────┤
│ TODAY                        │
│ 09:00–11:00                  │
│ RTG Training                 │
│ Kochi · Room B204            │
│ ✓ Confirmed                  │
├──────────────────────────────┤
│ OPEN FOR YOU                 │
│ 3 eligible opportunities     │
│ [ VIEW OPEN SESSIONS ]       │
├──────────────────────────────┤
│ ALERTS                       │
│ ⚠ Certificate expires soon   │
└──────────────────────────────┘

 HOME  SCHEDULE  OPEN  PROFILE  MORE
```

---

# 139. MOBILE SCHEDULE FINAL WIREFRAME

```text
┌──────────────────────────────┐
│ ← Schedule              🔍  │
│ September 2026              │
│                              │
│ [ Month ] [ Week ] [ Day ]  │
│                              │
│ MON 18                      │
│                              │
│ 09:00                        │
│ ┌────────────────────────┐ │
│ │ RTG Training            │ │
│ │ Kochi · Room B204       │ │
│ │ ✓ CONFIRMED             │ │
│ └────────────────────────┘ │
│                              │
│ 14:00                        │
│ ┌────────────────────────┐ │
│ │ Safety                  │ │
│ │ ⚠ RESPONSE REQUIRED     │ │
│ └────────────────────────┘ │
│                              │
│ 16:00                        │
│ ░░ TRAVEL ░░                │
│ Ahmedabad → Kochi           │
└──────────────────────────────┘
```

---

# 140. SESSION FINAL WIREFRAME

```text
┌──────────────────────────────┐
│ ← Session Details           │
├──────────────────────────────┤
│ RTG Technical Training       │
│                              │
│ 18 Sep                       │
│ 09:00–11:00                  │
│                              │
│ 📍 Kochi                     │
│ 🏫 Room B204                 │
│ 👥 14 learners               │
├──────────────────────────────┤
│ YOUR ROLE                    │
│ Primary                      │
├──────────────────────────────┤
│ REQUIREMENTS                 │
│ RTG L4                       │
│ Technical                    │
│ Simulator                    │
├──────────────────────────────┤
│ ELIGIBILITY                  │
│ ✓ Skill                      │
│ ✓ Certification             │
│ ✓ Availability               │
├──────────────────────────────┤
│ RESPONSE                     │
│ Due in 17h 42m               │
├──────────────────────────────┤
│ [ DECLINE ] [ CONFIRM ]      │
└──────────────────────────────┘
```

---

# 141. OPEN SESSION FINAL WIREFRAME

```text
┌──────────────────────────────┐
│ Open Sessions              │
│ 3 opportunities             │
│                              │
│ [ Date ][ Site ][ Skill ]   │
├──────────────────────────────┤
│ RTG Simulator                │
│ 18 Sep · Kochi               │
│                              │
│ MATCH 92                     │
│                              │
│ ✓ RTG L4                     │
│ ✓ Simulator                  │
│ ✓ Certificate                │
│                              │
│ [ I'M INTERESTED ]           │
├──────────────────────────────┤
│ Safety Training              │
│ 19 Sep · Mundra              │
│                              │
│ MATCH 88                     │
│                              │
│ [ I'M INTERESTED ]           │
└──────────────────────────────┘
```

---

# 142. PROFILE FINAL WIREFRAME

```text
┌──────────────────────────────┐
│ Profile                      │
├──────────────────────────────┤
│                              │
│ Ramesh Patel                 │
│ Senior Trainer               │
│                              │
│ 78%                          │
│ ████████████░░               │
│ Recommendation Ready ✓       │
│                              │
├──────────────────────────────┤
│ Personal                ✓    │
│ Education               ✓    │
│ Experience              ✓    │
│ Competencies            ✓    │
│ Certifications          ⚠    │
│ Availability            ✓    │
│ Documents               ✓    │
│                              │
│ [ COMPLETE PROFILE ]         │
└──────────────────────────────┘
```

---

# 143. DESIGN TOKENS

Recommended initial tokens:

## Surface

```text
Background
#F7F9FB

Card
#FFFFFF

Secondary
#F1F5F8
```

## Text

```text
Primary
#101828

Secondary
#475467

Muted
#667085
```

## Brand

```text
Primary
#245D78

Primary Light
#EAF4F7
```

## Semantic

```text
Success
#18865B

Warning
#C27A00

Danger
#C23B3B

Info
#2D76A5

Open
#7250B5
```

These are recommended design tokens; the source only specifies the semantic meaning of the status colors, not specific hex values.

---

# 144. TYPOGRAPHY

Recommended starting scale:

```text
Screen Title     24
Section          18
Card Title       16
Body             14
Metadata         12
Caption          11
```

Use the platform-native system font for each OS unless the final brand system requires another typeface.

---

# 145. APP MOTION

Motion should communicate state.

Examples:

```text
Confirm
→ card briefly changes state

Interest
→ button transforms to Registered

Profile completion
→ progress ring updates

Notification
→ destination opens directly

Attendance
→ Check-in → In Progress
```

Avoid decorative animations.

---

# 146. MOBILE ACCESSIBILITY

Build from day one:

```text
Readable contrast
No color-only status
Large touch targets
Dynamic font tolerance
Screen-reader labels
Keyboard support for external keyboards
Reduced motion
Clear focus states
```

Especially important because the product has many state colors.

---

# 147. Figma FILE STRUCTURE

```text
00 — Cover

01 — Mobile UX Architecture
    User Journey
    Information Architecture
    Navigation
    Flow Maps

02 — Design Tokens
    Color
    Typography
    Spacing
    Radius
    Elevation

03 — Components
    Buttons
    Inputs
    Session
    Calendar
    Profile
    Certification
    Competency
    Notification
    Travel

04 — Authentication

05 — Home

06 — Schedule

07 — Session

08 — Open Sessions

09 — Profile

10 — Competency

11 — Certification

12 — Availability

13 — Leave

14 — Travel

15 — Notifications

16 — Attendance

17 — History

18 — Settings

19 — All States

20 — Prototype

21 — Developer Handoff
```

---

# 148. FIGMA COMPONENT NAMING

Use structured names:

```text
SessionCard / Confirmed
SessionCard / Awaiting
SessionCard / Open
SessionCard / AtRisk
SessionCard / Completed

Status / Confirmed
Status / Awaiting
Status / Open
Status / Risk

Button / Primary
Button / Secondary
Button / Destructive

Profile / Ready
Profile / Incomplete
Profile / Verification

Certification / Valid
Certification / Expiring
Certification / Expired
```

---

# 149. DEVELOPER HANDOFF

Every screen should specify:

```text
Screen ID
Route
Purpose
Data required
API state
Component list
CTA
Navigation
Loading state
Empty state
Error state
Offline state
Analytics event
Permission requirement
```

Example:

```text
T09 Session Detail

Route:
session/:id

Requires:
session
assignment
trainer readiness
travel

Actions:
confirm
decline

States:
notified
confirmed
declined
at-risk
cancelled
```

---

# 150. ANALYTICS EVENTS FOR MOBILE

Even though analytics dashboards are not a trainer UI, the mobile app should emit useful events.

Examples:

```text
login_completed
profile_started
profile_completed
cv_uploaded
competency_declared
profile_submitted
session_viewed
session_confirmed
session_declined
nomination_created
open_session_viewed
interest_registered
interest_withdrawn
leave_submitted
travel_viewed
attendance_started
attendance_completed
notification_opened
```

These are recommended instrumentation events, not explicitly enumerated in the architecture.

---

# 151. QA MATRIX

Every important screen should be tested in:

```text
iOS
Android

Slow network
Offline
Reconnect

Small phone
Large phone

Long names
Long course names
Long location names

No data
Lots of data

Expired certificate
Pending leave
Travel required
At-risk session
```

---

# 152. GOLDEN PATH — FINAL MOBILE JOURNEY

The main trainer journey should be:

```text
LOGIN
 ↓
HOME
 ↓
PROFILE READY
 ↓
SCHEDULE
 ↓
ASSIGNED SESSION
 ↓
CONFIRM
 ↓
TRAVEL / CALENDAR
 ↓
PRE-SESSION REMINDER
 ↓
RECONFIRM
 ↓
CHECK IN
 ↓
DELIVER
 ↓
ATTENDANCE
 ↓
HISTORY
```

---

# 153. SECOND GOLDEN PATH — OPEN SESSION

```text
HOME
 ↓
OPEN
 ↓
ELIGIBLE SESSION
 ↓
MATCH EXPLANATION
 ↓
I'M INTERESTED
 ↓
INTEREST REGISTERED
 ↓
WAIT
 ↓
ASSIGNMENT
 ↓
CONFIRM
 ↓
SCHEDULE
```

---

# 154. THIRD GOLDEN PATH — DECLINE

```text
SESSION
 ↓
DECLINE
 ↓
REASON
 ↓
NOMINATE
 ↓
VALIDATE
 ↓
SUBMIT
 ↓
DONE
```

---

# 155. FOURTH GOLDEN PATH — PROFILE

```text
INVITE
 ↓
LOGIN
 ↓
IDENTITY
 ↓
CONTACT
 ↓
EDUCATION
 ↓
EXPERIENCE
 ↓
CV
 ↓
COMPETENCY
 ↓
CERTIFICATION
 ↓
AVAILABILITY
 ↓
REVIEW
 ↓
SUBMIT
 ↓
VERIFY
 ↓
READY
```

---

# 156. FIFTH GOLDEN PATH — LEAVE

```text
MORE
 ↓
LEAVE
 ↓
APPLY
 ↓
CONFLICT CHECK
 ↓
SUBMIT
 ↓
PENDING
 ↓
APPROVED
 ↓
CALENDAR BLOCKED
```

---

# 157. THE FINAL MOBILE STATE MACHINE

The mobile app should feel like one connected state machine:

```text
PROFILE
Seeded
 ↓
Enriching
 ↓
Submitted
 ↓
Verified
 ↓
Recommendation Ready
 ↓
Suspended / Inactive
```

At the same time:

```text
SESSION
Notified
 ↓
Confirmed
 ↓
Ready to Deliver
 ↓
In Progress
 ↓
Delivered
```

And:

```text
OPEN SESSION
Available
 ↓
Interested
 ↓
Assigned
 ↓
Confirmed
```

The architecture defines these state machines underneath the mobile experience.

---

# 158. THE FINAL MOBILE DESIGN PHILOSOPHY

The app should constantly translate:

```text
COMPLEX BACKEND
        ↓
SIMPLE HUMAN DECISION
```

For example:

Backend knows:

```text
14 hard filters
9 scoring dimensions
TCI
readiness projection
travel feasibility
weight profile
interest signal
```

Trainer sees:

```text
✓ You're eligible
MATCH 92
Travel required
Response due in 17h
Confirm
```

That's the right abstraction.

---

# 159. FINAL DEVELOPMENT PROCESS — MOBILE ONLY

## Phase 1
Product + mobile UX foundation

```text
Requirements
↓
Trainer journey
↓
Mobile IA
↓
Screen inventory
↓
State map
```

## Phase 2
Mobile design system

```text
Tokens
↓
Components
↓
Session
Calendar
Profile
Notifications
```

## Phase 3
Authentication

```text
Login
MFA
Activation
Identity
```

## Phase 4
Home + Schedule

```text
Home
Calendar
Session cards
Travel
Leave
```

## Phase 5
Session response

```text
Session Detail
Confirm
Decline
Nomination
```

## Phase 6
Open Sessions

```text
Open
Match
Interest
Withdraw
History
```

## Phase 7
Profile

```text
Identity
Contact
Education
Experience
CV
Competency
Certification
Availability
Review
```

## Phase 8
Travel + Leave

```text
Travel
Travel block
Leave
Blackout
Preferences
```

## Phase 9
Attendance

```text
Start
QR
Geo
Attendance
End
History
```

## Phase 10
Notifications

```text
Push
Deep links
In-app center
Preferences
```

## Phase 11
Offline + resilience

```text
Cached schedule
Draft profile
Queued action
Sync
Conflict
```

## Phase 12
Polish

```text
Motion
Accessibility
Microcopy
Performance
Error states
Empty states
```

## Phase 13
Prototype

Build three connected mobile journeys:

```text
Confirm
Open Session Interest
Decline + Nomination
```

## Phase 14
Pilot

Test real trainers with:

```text
Profile completion
Schedule response
Open-session interest
Attendance
Travel
Notifications
```

## Phase 15
Scale

Add:

```text
Advanced profile
Advanced competency
Trip optimization visibility
More offline capability
Deeper history
```

---

# 160. WHAT SHOULD BE BUILT FIRST

Do not start with the full profile.

Build in this exact order:

```text
1. Mobile shell
2. Home
3. Schedule
4. Session Detail
5. Confirm
6. Decline
7. Open Sessions
8. Interest
9. Profile
10. Competency
11. Certification
12. Availability
13. Leave
14. Travel
15. Notifications
16. Attendance
17. History
18. Offline
19. Polish
```

---

# 161. THE FIRST PROTOTYPE SHOULD HAVE ONLY 12 REAL SCREENS

Before expanding:

```text
1  Login
2  Home
3  Schedule
4  Session Detail
5  Confirm Sheet
6  Confirm Success
7  Open Sessions
8  Open Session Detail
9  Interest Sheet
10 Profile
11 Competency
12 Notifications
```

If those work beautifully, expand.

---

# 162. THE MOST IMPORTANT 5 SCREENS

The product's first visual benchmark should be:

```text
01 HOME
02 SCHEDULE
03 SESSION DETAIL
04 OPEN SESSIONS
05 PROFILE
```

And the most important interaction benchmark is:

```text
SESSION
→ CONFIRM
→ CALENDAR
```

The second:

```text
OPEN
→ INTEREST
→ WAIT
```

The third:

```text
SESSION
→ DECLINE
→ NOMINATE
```

---

# 163. THE FINAL MOBILE UI ARCHITECTURE

```text
                 TRAINER MOBILE APP
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
      WORK            DECISIONS       OPPORTUNITIES
       │                 │                 │
   Schedule          Confirm            Open
   Today             Decline            Match
   Travel            Nominate            Interest
   Attendance         Respond             My Interests
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                      READINESS
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
     Profile         Competency       Certification
        │
   Availability
        │
      Leave
        │
       CV
```

---

# 164. FINAL PRODUCT EXPERIENCE

When the trainer opens the app:

```text
“I know what I'm doing.”
```

When a session arrives:

```text
“I know why I was assigned.”
```

When an open session appears:

```text
“I know why I can take it.”
```

When a decline happens:

```text
“I know exactly what happens next.”
```

When travel is required:

```text
“I can see how it affects my calendar.”
```

When I reach the training site:

```text
“I can check in and complete the session.”
```

When my profile is incomplete:

```text
“I know exactly what I need to fix.”
```

That is the complete mobile UX goal.

---

# 165. FINAL MOBILE UI BUILD ROADMAP

```text
                REQUIREMENTS
                     ↓
              MOBILE UX ARCHITECTURE
                     ↓
                DESIGN SYSTEM
                     ↓
             AUTH / ACTIVATION
                     ↓
              HOME + SCHEDULE
                     ↓
              SESSION RESPONSE
                     ↓
              OPEN SESSIONS
                     ↓
                 PROFILE
                     ↓
              COMPETENCY
                     ↓
              CERTIFICATION
                     ↓
               AVAILABILITY
                     ↓
                  LEAVE
                     ↓
                  TRAVEL
                     ↓
               NOTIFICATIONS
                     ↓
                ATTENDANCE
                     ↓
                  HISTORY
                     ↓
            OFFLINE / RESILIENCE
                     ↓
            ACCESSIBILITY / POLISH
                     ↓
                 PROTOTYPE
                     ↓
                    QA
                     ↓
                PILOT USERS
                     ↓
                  RELEASE
                     ↓
                 IMPROVE
```

This keeps the entire UI scope on the **Trainer Mobile App**, while still respecting the underlying architecture and state model. The architecture's trainer capabilities, profile lifecycle, assignment response flow, open-session/auction behavior, travel model, notification matrix and attendance module all map cleanly into this mobile structure.     