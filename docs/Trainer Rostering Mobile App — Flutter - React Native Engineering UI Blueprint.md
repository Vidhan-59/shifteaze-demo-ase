
# TRAINER ROSTERING MOBILE APP
## Flutter / React Native Engineering UI Blueprint

---

# 1. FINAL TECHNOLOGY DECISION

## Primary

### Flutter

```text
Language:
Dart

Framework:
Flutter

Architecture:
Feature-first + layered architecture

Pattern:
MVVM / ViewModel-oriented

Navigation:
Router-based navigation

State:
Reactive state management

Networking:
REST API / JSON

Local:
Encrypted local persistence + cache

Push:
FCM / APNs through backend orchestration
```

Flutter's official architecture guidance recommends separating UI from data and, for larger applications, organizing the app into layers with view models and repositories; Flutter itself is declarative and widget-based.

---

## Alternative

### React Native

```text
Language:
TypeScript

Framework:
React Native

Architecture:
Feature-first + layered architecture

Pattern:
MVVM-ish / feature hooks + services

Navigation:
React Navigation

Networking:
REST API / JSON

Local:
Secure storage + local database/cache

Push:
FCM / APNs
```

React Native's current documentation says new projects target TypeScript by default, and its navigation documentation points developers toward React Navigation for common stack/tab navigation patterns.

---

# 2. FLUTTER VS REACT NATIVE FOR THIS APP

| Requirement | Flutter | React Native |
|---|---|---|
| iOS | Excellent | Excellent |
| Android | Excellent | Excellent |
| Complex calendar | Excellent | Excellent |
| Enterprise forms | Excellent | Excellent |
| Animation | Excellent | Excellent |
| Custom UI consistency | Excellent | Excellent |
| Native integrations | Strong | Strong |
| Team already knows React | Less ideal | ✅ Advantage |
| Team already knows Dart | ✅ Advantage | Less ideal |
| Single UI rendering model | ✅ Strong | Different native components |
| Cross-platform visual control | ✅ Strong | Strong |
| Learning curve | Medium | Medium |
| Long-term maintainability | Excellent with structure | Excellent with structure |

### Final recommendation

```text
Flutter + Dart
```

**provided the engineering team is comfortable with Dart.**

If the team is already deeply invested in TypeScript/React, use:

```text
React Native + TypeScript
```

Do not run both in production for the same mobile app.

---

# 3. MOBILE APP ARCHITECTURE

The mobile app should NOT be:

```text
Screen
→ API call
→ JSON
→ UI
```

That becomes difficult to maintain.

Instead:

```text id="j6g0g1"
┌─────────────────────────────────────────────┐
│                 PRESENTATION                │
│                                             │
│ Screens / Widgets / Components              │
│ ViewModels / Controllers                    │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│                    DOMAIN                   │
│                                             │
│ Use Cases / Business rules                  │
│ Session logic                               │
│ Eligibility presentation                    │
│ Response rules                              │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│                     DATA                    │
│                                             │
│ API Client                                  │
│ Repositories                                │
│ DTOs                                        │
│ Local Cache                                 │
│ Secure Storage                              │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│                 EXTERNAL SYSTEMS            │
│                                             │
│ Backend API                                 │
│ Auth / SSO                                  │
│ Push                                        │
│ Camera                                      │
│ Location                                    │
│ File system                                 │
└─────────────────────────────────────────────┘
```

This separation is especially appropriate because the app has many states and asynchronous workflows. Flutter's current architecture guidance explicitly emphasizes separation of concerns, view models, repositories, testability and UI-as-a-function-of-state.

---

# 4. FINAL MOBILE FEATURE MODULES

```text id="2ioaw7"
lib/
│
├── core/
│   ├── theme/
│   ├── routing/
│   ├── network/
│   ├── storage/
│   ├── errors/
│   ├── permissions/
│   ├── notifications/
│   ├── analytics/
│   └── utils/
│
├── features/
│   │
│   ├── auth/
│   ├── home/
│   ├── schedule/
│   ├── sessions/
│   ├── open_sessions/
│   ├── profile/
│   ├── competency/
│   ├── certification/
│   ├── availability/
│   ├── leave/
│   ├── travel/
│   ├── notifications/
│   ├── attendance/
│   └── history/
│
└── shared/
    ├── widgets/
    ├── models/
    ├── components/
    └── constants/
```

This is **feature-first architecture**.

Do not create:

```text
widgets/
controllers/
models/
services/
```

as giant global folders containing hundreds of unrelated files.

Each feature owns its own UI/data/state.

---

# 5. FLUTTER FEATURE STRUCTURE

Example:

```text id="z2r1fw"
features/
└── schedule/
    ├── data/
    │   ├── datasources/
    │   │   └── schedule_remote_datasource.dart
    │   ├── dto/
    │   │   ├── session_dto.dart
    │   │   └── travel_block_dto.dart
    │   └── repositories/
    │       └── schedule_repository_impl.dart
    │
    ├── domain/
    │   ├── entities/
    │   │   ├── session.dart
    │   │   └── travel_block.dart
    │   ├── repositories/
    │   │   └── schedule_repository.dart
    │   └── usecases/
    │       ├── get_schedule.dart
    │       └── get_session.dart
    │
    └── presentation/
        ├── pages/
        │   ├── schedule_page.dart
        │   └── session_detail_page.dart
        ├── widgets/
        │   ├── session_card.dart
        │   ├── calendar_event.dart
        │   └── travel_block.dart
        └── viewmodels/
            └── schedule_view_model.dart
```

---

# 6. REACT NATIVE FEATURE STRUCTURE

Equivalent:

```text id="v7e9u3"
src/
└── features/
    └── schedule/
        ├── api/
        │   └── scheduleApi.ts
        ├── models/
        │   ├── Session.ts
        │   └── TravelBlock.ts
        ├── hooks/
        │   └── useSchedule.ts
        ├── services/
        │   └── ScheduleService.ts
        ├── screens/
        │   ├── ScheduleScreen.tsx
        │   └── SessionDetailScreen.tsx
        ├── components/
        │   ├── SessionCard.tsx
        │   └── TravelBlock.tsx
        └── state/
            └── scheduleStore.ts
```

---

# 7. MOBILE NAVIGATION ARCHITECTURE

## Flutter

Conceptually:

```text
ShellRoute
│
├── Home
├── Schedule
├── Open
├── Profile
└── More
```

Inside Schedule:

```text
Schedule
 ├── Session Detail
 ├── Travel Detail
 └── Leave Detail
```

Inside Profile:

```text
Profile
 ├── Contact
 ├── Education
 ├── Experience
 ├── CV
 ├── Competency
 ├── Certification
 └── Availability
```

Flutter has built-in navigation primitives and a router system for more complex navigation/deep linking.

---

# 8. REACT NATIVE NAVIGATION

Recommended structure:

```text id="5k5kbt"
RootNavigator
│
├── AuthStack
│
└── AppTabs
    │
    ├── HomeStack
    ├── ScheduleStack
    ├── OpenStack
    ├── ProfileStack
    └── MoreStack
```

React Navigation supports common stack and tab navigation patterns on iOS and Android.

---

# 9. ROUTE LIST

The mobile app should have concrete routes.

```text id="xst8ng"
/login
/mfa
/activation

/home

/schedule
/schedule/week
/schedule/day
/session/:id
/session/:id/respond
/session/:id/decline
/session/:id/nominate

/open
/open/:id
/open/:id/interest
/interests

/profile
/profile/contact
/profile/education
/profile/experience
/profile/cv
/profile/competencies
/profile/competencies/:id
/profile/certifications
/profile/certifications/:id
/profile/availability
/profile/review

/leave
/leave/apply
/leave/:id

/travel
/travel/:id

/notifications

/attendance
/attendance/:sessionId/check-in
/attendance/:sessionId/live
/attendance/:sessionId/complete

/history
/settings
/help
```

---

# 10. HOME SCREEN — FLUTTER CONCEPT

Example widget tree:

```text id="7in0d7"
Scaffold
│
├── SafeArea
│   └── CustomScrollView
│       ├── SliverAppBar
│       ├── ProfileReadinessCard
│       ├── ActionRequiredCard
│       ├── TodaySection
│       ├── OpenSessionsPreview
│       └── AlertsSection
│
└── BottomNavigationBar / NavigationBar
```

The current Flutter framework is widget-based and declarative, so this decomposition maps naturally to reusable widgets.

---

# 11. HOME VIEW MODEL

Conceptual:

```dart
class HomeViewModel {
  final TrainerSummary trainer;
  final ProfileReadiness readiness;
  final List<ActionItem> actions;
  final List<Session> todaySessions;
  final List<OpenSession> openSessions;
  final List<NotificationItem> alerts;

  final HomeStatus status;
}
```

The UI becomes:

```text
if status == loading
    show skeleton

if status == ready
    show content

if status == error
    show retry

if status == offline
    show cached content + offline banner
```

This is the “UI is a function of state” approach described in Flutter's architecture guidance.

---

# 12. HOME MOBILE STATES

Implement explicitly:

```text id="98k5y7"
HomeLoading
HomeReady
HomeEmpty
HomeOffline
HomePartial
HomeError
HomeSuspended
```

Do not let every screen invent its own state system.

---

# 13. SCHEDULE SCREEN — ENGINEERING

Flutter widget structure:

```text id="hxy2nc"
SchedulePage
│
├── ScheduleHeader
├── CalendarModeSelector
├── DateNavigator
├── ScheduleCalendar
│   ├── SessionEvent
│   ├── TravelEvent
│   ├── LeaveEvent
│   └── BlackoutEvent
└── TodayFloatingAction
```

---

# 14. CALENDAR DATA MODEL

```dart
abstract class CalendarItem {}

class SessionItem extends CalendarItem {
  DateTime start;
  DateTime end;
  SessionStatus status;
}

class TravelItem extends CalendarItem {
  DateTime start;
  DateTime end;
  String origin;
  String destination;
}

class LeaveItem extends CalendarItem {
  DateTime start;
  DateTime end;
}

class BlackoutItem extends CalendarItem {
  DateTime date;
}
```

That maps the architecture's requirement that travel, leave and blackout occupy the availability/calendar model.

---

# 15. SESSION CARD — FLUTTER

Reusable:

```text id="v0h6ts"
SessionCard(
  session: session,
  status: SessionStatus.confirmed,
  onTap: ...
)
```

Internally:

```text
SessionCard
├── Time
├── Title
├── Location
├── Room
├── StatusChip
└── Optional Action
```

---

# 16. SESSION STATE ENUM

Flutter:

```dart
enum SessionStatus {
  awaitingResponse,
  confirmed,
  open,
  atRisk,
  inProgress,
  completed,
  cancelled,
}
```

React Native:

```ts
type SessionStatus =
  | 'awaiting_response'
  | 'confirmed'
  | 'open'
  | 'at_risk'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
```

The names should map to the underlying system states rather than invent unrelated mobile states. The source defines the session/assignment lifecycle explicitly.

---

# 17. SESSION DETAIL

The mobile page structure:

```text id="l9w0k4"
CustomScrollView

Header
│
Session summary
│
Course information
│
Location
│
Your role
│
Requirements
│
Your eligibility
│
Travel
│
Response deadline
│
History
│
Sticky action area
```

---

# 18. RESPONSE STATE

```dart
enum ResponseStage {
  scheduleLevel,
  sessionLevel,
}
```

This is important because the architecture says the trainer confirms/declines at both schedule and session stages.

---

# 19. RESPONSE UI STATE

```text id="r0cy0j"
AssignmentState
│
├── Proposed
├── Notified
├── Confirming
├── Confirmed
├── Declining
├── Declined
└── Error
```

---

# 20. CONFIRM ACTION

Flutter:

```text
Confirm button
   ↓
showModalBottomSheet
   ↓
confirmation summary
   ↓
repository.confirmAssignment()
   ↓
state = confirmed
   ↓
refresh schedule
```

The important point:

**Do not directly mutate the calendar widget.**

Update the application state.

The calendar rebuilds from state.

---

# 21. DECLINE ACTION

```text id="gjn2p3"
Tap Decline
 ↓
open DeclineSheet
 ↓
select reason
 ↓
optional note
 ↓
optional nomination
 ↓
submit
 ↓
server response
 ↓
update assignment state
 ↓
refresh schedule
```

The decline reason must be mandatory and nomination optional.

---

# 22. NOMINATION UI

React Native component structure:

```text
DeclineScreen
├── ReasonSelector
├── RemarksInput
├── NominationToggle
├── TrainerSearch
├── NomineeCard
└── SubmitButton
```

Flutter equivalent:

```text id="0zxlqj"
DeclinePage
 ├── RadioListTile
 ├── TextField
 ├── SwitchListTile
 ├── SearchAnchor
 └── FilledButton
```

---

# 23. OPEN SESSIONS

The mobile app should technically treat this as:

```text
OpenSessionProjection
```

rather than creating a completely separate calendar universe.

The source states that auction/open-session visibility is projected from unassigned sessions into each eligible trainer's own view.

---

# 24. OPEN SESSION MODEL

```ts
type OpenSession = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  site: Location;
  requirements: Requirement[];
  matchScore: number;
  isEligible: boolean;
  interestState?: InterestState;
};
```

---

# 25. INTEREST STATE

```text id="8dyy9e"
active
withdrawn
allocated
lapsed
```

These correspond to the underlying interest lifecycle.

---

# 26. INTEREST ACTION

```text id="3a25u7"
User taps:
I'm Interested

        ↓

POST /sessions/{id}/interest

        ↓

Success

        ↓

OpenSessionInterestRegistered

        ↓

UI changes:
I'm Interested
     ↓
Interest Registered
```

---

# 27. MATCH SCORE UI

Mobile:

```text id="6l4o1t"
MATCH

92
Strong fit

[ WHY? ]
```

Expanded:

```text id="w2f0my"
Competency
29/30

Location
15/15

Schedule fit
11/12

Workload
10/12

Effectiveness
9/10
```

The source defines nine scoring dimensions.

---

# 28. PROFILE ARCHITECTURE

Flutter:

```text id="6a6u5g"
ProfilePage
│
├── ProfileHeader
├── ReadinessCard
├── IdentitySection
├── ContactSection
├── EducationSection
├── ExperienceSection
├── CvSection
├── CompetencySection
├── CertificationSection
├── AvailabilitySection
└── SubmitSection
```

---

# 29. PROFILE WIZARD STATE

```dart
class ProfileWizardState {
  final int currentStep;
  final int totalSteps;
  final double completeness;
  final Map<String, bool> completion;
  final bool canSubmit;
  final SubmissionStatus status;
}
```

The source explicitly defines a nine-step enrichment wizard with a live completeness meter.

---

# 30. PROFILE STEPS

```text
01 Identity
02 Contact
03 Education
04 Experience
05 CV
06 Competency
07 Certification
08 Availability
09 Review
```

---

# 31. FORM PERSISTENCE

Each step should save progressively.

```text id="s7kvu2"
User enters Education
        ↓
Save draft
        ↓
Navigate away
        ↓
Return later
        ↓
Data still present
```

This matches the source's design that each enrichment step writes immediately so the trainer can leave and return.

---

# 32. PROFILE COMPLETENESS

Client-side display:

```text id="7f9m36"
78%
```

Server is authoritative.

Mobile does NOT calculate final readiness independently.

Conceptually:

```text
Server PCS
     ↓
ProfileReadiness DTO
     ↓
ViewModel
     ↓
UI
```

Why?

Because readiness is part of the actual rosterability rule.

---

# 33. COMPETENCY MODEL

Mobile object:

```ts
type TrainerCompetency = {
  skillId: string;
  skillName: string;
  level: 1 | 2 | 3 | 4 | 5;
  trainingType: 'technical' | 'foundation' | 'both';
  deliveryModes: DeliveryMode[];
  equipmentCode?: string;
  source: CompetencySource;
  confidence: number;
  state: CompetencyState;
  validFrom?: string;
  validTo?: string;
  tci?: number;
};
```

These dimensions are directly specified in the architecture.

---

# 34. CERTIFICATION MODEL

```ts
type Certification = {
  id: string;
  name: string;
  certificateNumber?: string;
  issueDate: string;
  expiryDate: string;
  status: 'valid' | 'expiring' | 'expired' | 'pending';
  documentId?: string;
};
```

---

# 35. AVAILABILITY MODEL

```ts
type Availability = {
  preferredSlots: TimeSlot[];
  preferredLocations: string[];
  deployableSites: string[];
  blackoutDates: string[];
  leaveRequests: LeaveRequest[];
  travelBlocks: TravelBlock[];
};
```

Preferences are soft matching inputs, while leave/blackout/travel affect availability.

---

# 36. TRAVEL MODEL

```ts
type TravelBlock = {
  id: string;
  origin: string;
  destination: string;
  startAt: string;
  endAt: string;
  mode: 'air' | 'rail' | 'road';
  travelMinutes: number;
  approvalState: string;
};
```

The architecture makes travel a first-class calendar object with origin, destination, timing, mode and approval status.

---

# 37. MOBILE TRAVEL UX

User taps session:

```text id="1s7gic"
Travel Required
```

Tap:

```text
[ View Travel ]
```

Then:

```text
Ahmedabad
   ↓
Kochi

17 Sep
Departure

18 Sep
Session

18 Sep
Return
```

---

# 38. LEAVE DATA FLOW

```text id="w8ekg2"
LeaveScreen
 ↓
LeaveViewModel
 ↓
POST /leave
 ↓
Pending
 ↓
Calendar refresh
```

Mobile calendar should immediately display the request state according to server result.

Pending leave is treated as occupied by the engine, so the app should make that clear.

---

# 39. ATTENDANCE TECHNICAL FLOW

```text id="0n36bw"
Session
 ↓
Start Session
 ↓
Permission Manager
 ├── Camera
 └── Location
 ↓
QR / Geo Verification
 ↓
Check-in
 ↓
InProgress
 ↓
Attendance capture
 ↓
End Session
 ↓
Delivered
```

The architecture specifies QR / geo-fence capability in the attendance module.

---

# 40. CAMERA LAYER

Flutter concept:

```text
AttendanceQrScanner
```

React Native concept:

```text
AttendanceQrScanner.tsx
```

Responsibilities:

```text id="awf7zw"
Request permission
Open camera
Scan QR
Validate payload
Return result
```

Do not put API/business logic inside the camera widget.

---

# 41. LOCATION LAYER

Create:

```text id="6ddqss"
LocationService
```

Methods:

```text
getCurrentLocation()
checkPermission()
checkSessionGeoFence()
```

The screen should not directly call platform location APIs.

---

# 42. PUSH NOTIFICATION ARCHITECTURE

The server is the source of notification truth.

Mobile receives:

```text id="1a3mwb"
Push Token
 ↓
Backend notification
 ↓
FCM/APNs
 ↓
Mobile Notification Handler
 ↓
Deep Link Router
 ↓
Target Screen
```

The architecture includes push, WhatsApp, email and in-app notification events with different SLAs.

---

# 43. DEEP-LINK MAPPING

```text
assignment
→ /session/:id

certificate_expiry
→ /profile/certifications/:id

profile_incomplete
→ /profile/{missingSection}

open_sessions
→ /open

travel
→ /travel/:id

attendance
→ /attendance/:sessionId
```

---

# 44. NOTIFICATION PAYLOAD

Conceptually:

```json
{
  "type": "SESSION_RESPONSE_REQUIRED",
  "entityId": "4821",
  "deepLink": "/session/4821",
  "priority": "high"
}
```

The mobile router then decides where to navigate.

---

# 45. STATE MANAGEMENT

For Flutter, choose **one primary state-management strategy**.

My recommendation for this app:

```text id="r9rt0m"
Riverpod-style reactive architecture
+
ViewModels / Notifiers
```

or another team-approved reactive solution.

For React Native:

```text id="c9qk7n"
Server-state layer
+
local UI state
+
feature store
```

The critical principle is:

```text id="4glrvf"
Server state
≠
UI state
≠
temporary form state
```

---

# 46. SERVER STATE

Examples:

```text id="xv4l8t"
Current schedule
Trainer profile
Certification list
Open sessions
Notifications
Leave status
Assignments
```

---

# 47. UI STATE

Examples:

```text id="5q5j1h"
Selected date
Selected calendar mode
Open bottom sheet
Filter visibility
Expanded card
Current wizard step
```

---

# 48. FORM STATE

Examples:

```text id="jnv3l6"
Draft education
Draft experience
Draft CV review
Draft competency
Draft leave request
```

Do not mix these three categories together.

---

# 49. NETWORK STATE

Globally define:

```text id="n8z3v2"
InitialLoading
Refreshing
Submitting
Success
Failure
Offline
Retrying
```

Then every feature can use the same infrastructure.

---

# 50. API LAYER

Create one API client.

Flutter:

```text id="3p7gx4"
ApiClient
AuthInterceptor
RetryInterceptor
LoggingInterceptor
ErrorMapper
```

React Native:

```text id="glumc1"
apiClient.ts
authInterceptor.ts
errorMapper.ts
```

---

# 51. DTO → DOMAIN MAPPING

Don't allow raw JSON to spread across widgets.

Bad:

```text id="j73b3w"
widget.session["session_date"]
```

Good:

```text id="kcl9eh"
API JSON
 ↓
SessionDto
 ↓
Session
 ↓
ViewModel
 ↓
Widget
```

This is particularly important for this system because backend states are detailed and should not become UI coupling.

---

# 52. AUTHENTICATION FLOW

```text id="x8xpxb"
App Launch
 ↓
Token exists?
 ├── No → Login
 └── Yes
      ↓
Token valid?
 ├── No → Refresh
 └── Yes → Home
```

---

# 53. AUTH TOKEN STORAGE

Use platform-secure storage.

Never:

```text id="6uslnp"
plain local storage
plain text file
shared preferences for secrets
```

Use:

```text
iOS Keychain
Android Keystore-backed secure storage
```

---

# 54. SESSION REFRESH

When backend token expires:

```text id="h1tc9d"
API 401
 ↓
refresh token
 ↓
retry original request
 ↓
if refresh fails
 ↓
clear session
 ↓
Login
```

Centralize this in the network layer.

---

# 55. OFFLINE-FIRST STRATEGY

For this app, I would build **offline-aware**, not necessarily full offline-first.

Cache:

```text id="3jm9ny"
Current schedule
Upcoming sessions
Travel
Profile
Competencies
Certifications
Recent notifications
```

Queue carefully:

```text id="plg0xn"
Profile draft
Attendance
Safe local actions
```

But don't pretend an assignment confirmation is final while offline.

---

# 56. OFFLINE CONFIRMATION

Example:

```text id="9c5wwe"
You're offline.

Your response is saved and will
be sent when you're back online.

[ SAVE RESPONSE ]
```

After sync:

```text id="8o7fie"
✓ Response sent
```

---

# 57. DESIGN SYSTEM IN CODE

Flutter:

```text id="6v3fcg"
AppColors
AppTextStyles
AppSpacing
AppRadius
AppShadows
AppIcons
AppTheme
```

React Native:

```text id="k4hshj"
colors.ts
typography.ts
spacing.ts
radii.ts
shadows.ts
theme.ts
```

---

# 58. COMPONENT LIBRARY IN CODE

```text id="cw8a2c"
PrimaryButton
SecondaryButton
StatusChip
SessionCard
OpenSessionCard
ProfileReadinessCard
CertificationCard
CompetencyCard
TravelCard
NotificationCard
CalendarEvent
Countdown
EmptyState
ErrorState
Skeleton
BottomSheet
ConfirmDialog
```

---

# 59. UI STATE + BACKEND STATE

Important example:

Backend:

```text
NOTIFIED
```

Mobile:

```text
AWAITING RESPONSE
```

Backend:

```text
AUCTION_INTEREST = ACTIVE
```

Mobile:

```text
INTEREST REGISTERED
```

Backend:

```text
TRAVEL_BLOCK
```

Mobile:

```text
TRAVEL
Ahmedabad → Kochi
```

This is how the domain model becomes human-friendly UI.

---

# 60. MOBILE PERMISSION MANAGER

Create one abstraction:

```text id="g9q9jz"
PermissionService
```

Capabilities:

```text
Camera
Location
Notifications
Photos / Files
```

Then each feature calls the abstraction.

---

# 61. ANALYTICS

Mobile events:

```text
app_opened
login_success
profile_started
profile_step_completed
profile_submitted
session_opened
session_confirmed
session_declined
nomination_started
nomination_submitted
open_sessions_opened
interest_registered
interest_withdrawn
leave_submitted
travel_opened
attendance_started
attendance_completed
notification_opened
```

These are recommended engineering analytics events.

---

# 62. CRASH / ERROR MONITORING

Production mobile should capture:

```text id="j4tz2j"
Crash
API failure
Navigation failure
Permission failure
Sync failure
Attendance failure
QR failure
Deep-link failure
```

Do not expose technical stack traces to the trainer.

---

# 63. TESTING PYRAMID

## Unit

Test:

```text id="b6x9ot"
ViewModels
Use cases
Validation
Date calculations
State reducers
```

## Widget/component

Test:

```text id="tst9wo"
SessionCard
CalendarEvent
ProfileProgress
Buttons
Forms
```

## Integration

Test:

```text id="cy9vd2"
Login
Schedule loading
Confirm session
Decline
Nomination
Interest
Leave
Attendance
```

## E2E

Test:

```text id="75q9uv"
Trainer logs in
→ sees schedule
→ confirms session
→ receives reminder
→ checks in
→ completes session
```

---

# 64. UI TEST MATRIX

Every core screen:

```text id="2toer5"
iOS
Android

Light mode
Dark mode, if adopted

Small screen
Large screen

Online
Offline

Slow network

Empty
Loaded
Error

Long content
No content
```

---

# 65. ACCESSIBILITY

Flutter and React Native can both support accessible semantics, but build them intentionally.

Every action:

```text id="7m1brv"
semantic label
role
state
hint
```

Examples:

```text
“Confirm session button”
“Session status confirmed”
“Response due in 17 hours”
```

---

# 66. MOBILE PERFORMANCE RULES

Do not:

```text id="zk1pnt"
fetch entire trainer history on Home
render hundreds of calendar events unnecessarily
rebuild every widget on every state update
decode huge documents on main UI path
load all notifications at once
```

Instead:

```text id="3meq3z"
pagination
lazy loading
memoization/selectors
incremental fetch
image/document optimization
cached queries
```

---

# 67. CALENDAR PERFORMANCE

Month view:

```text id="1u1uy3"
fetch month summary
```

Day view:

```text id="6s5t8j"
fetch detailed events
```

Session detail:

```text id="9vo9jz"
fetch full session
```

Don't fetch full details for every item in a month.

---

# 68. PROFILE PERFORMANCE

Home should receive a compact:

```text
TrainerSummary
```

not the entire trainer profile.

Profile screen fetches:

```text
TrainerProfile
```

Competency screen fetches:

```text
TrainerCompetency[]
```

This keeps mobile payloads smaller.

---

# 69. FINAL API MODULES

Recommended mobile API domains:

```text id="08e3vp"
AuthApi
HomeApi
ScheduleApi
SessionApi
AssignmentApi
OpenSessionApi
ProfileApi
CompetencyApi
CertificationApi
AvailabilityApi
LeaveApi
TravelApi
NotificationApi
AttendanceApi
HistoryApi
```

---

# 70. MOBILE BACKEND CONTRACT

The mobile API should return **presentation-friendly DTOs**, not raw database rows.

Example:

```json
{
  "id": "4821",
  "title": "RTG Technical Training",
  "status": "AWAITING_RESPONSE",
  "startAt": "2026-09-18T09:00:00",
  "endAt": "2026-09-18T11:00:00",
  "location": {
    "site": "Kochi",
    "room": "B204"
  },
  "trainerRole": "PRIMARY",
  "response": {
    "required": true,
    "dueAt": "2026-09-18T23:00:00"
  }
}
```

This dramatically simplifies the mobile UI.

---

# 71. FINAL FLUTTER PROJECT STRUCTURE

```text id="2phxgd"
lib/
│
├── app/
│   ├── app.dart
│   ├── router.dart
│   └── bootstrap.dart
│
├── core/
│   ├── network/
│   ├── storage/
│   ├── auth/
│   ├── permissions/
│   ├── notifications/
│   ├── theme/
│   ├── errors/
│   └── analytics/
│
├── shared/
│   ├── widgets/
│   ├── models/
│   └── extensions/
│
└── features/
    ├── auth/
    ├── home/
    ├── schedule/
    ├── session/
    ├── open_sessions/
    ├── profile/
    ├── competency/
    ├── certification/
    ├── availability/
    ├── leave/
    ├── travel/
    ├── notification/
    ├── attendance/
    └── history/
```

---

# 72. FINAL REACT NATIVE PROJECT STRUCTURE

```text id="v1on7p"
src/
│
├── app/
│   ├── navigation/
│   ├── providers/
│   └── App.tsx
│
├── core/
│   ├── api/
│   ├── auth/
│   ├── storage/
│   ├── permissions/
│   ├── notifications/
│   ├── theme/
│   ├── analytics/
│   └── errors/
│
├── components/
│
└── features/
    ├── auth/
    ├── home/
    ├── schedule/
    ├── session/
    ├── openSessions/
    ├── profile/
    ├── competency/
    ├── certification/
    ├── availability/
    ├── leave/
    ├── travel/
    ├── notifications/
    ├── attendance/
    └── history/
```

---

# 73. FINAL MOBILE BUILD STAGES

## STAGE 01 — Product Contract

Freeze:

```text
User journey
Screen list
Routes
States
API contract
Permissions
```

---

## STAGE 02 — Flutter / React Native Foundation

Create:

```text
Project
Theme
Routing
Networking
Secure storage
Environment config
Logging
Error handling
Analytics
```

---

## STAGE 03 — Design System

Implement:

```text
Buttons
Cards
Status
Typography
Spacing
Bottom sheets
Dialogs
Calendar primitives
Forms
```

---

## STAGE 04 — Authentication

```text
Login
SSO/MFA
Token management
Session restore
Logout
```

---

## STAGE 05 — Home

```text
Home API
Home ViewModel
Profile readiness
Action center
Today
Open sessions preview
Alerts
```

---

## STAGE 06 — Schedule

```text
Month
Week
Day
Session events
Travel
Leave
Blackout
Filters
```

---

## STAGE 07 — Session

```text
Detail
Eligibility
Response deadline
Confirm
Decline
```

---

## STAGE 08 — Nomination

```text
Reason
Trainer search
Nominee validation
Success
Failure
```

---

## STAGE 09 — Open Sessions

```text
List
Filters
Detail
Match score
Why eligible
Interest
Withdrawal
```

---

## STAGE 10 — Profile

```text
Overview
Identity
Contact
Education
Experience
CV
Competency
Certification
Availability
Review
Submit
```

---

## STAGE 11 — Leave

```text
Apply
Conflict detection
Pending
Approved
Rejected
Cancel
```

---

## STAGE 12 — Travel

```text
Travel detail
Calendar block
Approval state
Changed travel
Trip
```

---

## STAGE 13 — Notifications

```text
Push
Deep links
In-app center
Notification preferences
```

---

## STAGE 14 — Attendance

```text
Session start
Camera
QR
Location
Check-in
Attendance
End
```

---

## STAGE 15 — History

```text
Delivered sessions
Attendance
Responses
Interests
Profile changes
```

---

## STAGE 16 — Offline / Sync

```text
Caching
Queued actions
Sync engine
Conflict handling
Retry
```

---

## STAGE 17 — Quality

```text
Unit
Widget
Integration
E2E
Accessibility
Performance
Security
```

---

## STAGE 18 — Release

```text
Dev
 ↓
QA
 ↓
UAT
 ↓
Pilot trainers
 ↓
Production
 ↓
Monitoring
 ↓
Iteration
```

---

# 74. WHAT THE FRONTEND TEAM ACTUALLY BUILDS FIRST

Do not build 80 screens.

First sprint:

```text id="3v5w3b"
App Shell
Login
Home
Bottom Navigation
```

Second:

```text id="o8r2nj"
Schedule
Session Card
Calendar
Session Detail
```

Third:

```text id="n1f8ky"
Confirm
Decline
Nomination
```

Fourth:

```text id="opv2gw"
Open Sessions
Interest
```

Fifth:

```text id="k0n2l6"
Profile
Competency
Certification
```

Then:

```text id="fw4n3m"
Leave
Travel
Notifications
Attendance
```

---

# 75. FIRST MOBILE MVP

The actual MVP should be:

```text id="2x5aj8"
LOGIN
 ↓
HOME
 ↓
SCHEDULE
 ↓
SESSION DETAIL
 ↓
CONFIRM
 ↓
DECLINE
 ↓
NOMINATE
 ↓
OPEN SESSIONS
 ↓
INTEREST
 ↓
PROFILE
 ↓
NOTIFICATIONS
```

Then add attendance and advanced availability.

---

# 76. MVP TECHNICAL VERTICAL SLICE

```text id="9f5o6v"
Frontend
Flutter / React Native
      ↓
API
      ↓
Auth
      ↓
Session
      ↓
Assignment
      ↓
Notification
      ↓
Database
```

Test the **whole chain**, not only the UI.

---

# 77. GOLDEN USER JOURNEY

```text id="h58l7u"
Trainer receives assignment
        ↓
Push notification
        ↓
Tap notification
        ↓
Deep link opens Session Detail
        ↓
Review requirements
        ↓
Confirm
        ↓
API updates assignment
        ↓
Schedule refreshes
        ↓
Travel block appears
        ↓
T-3 day notification
        ↓
Reconfirm
        ↓
Session day
        ↓
QR / Geo
        ↓
Check-in
        ↓
Deliver
        ↓
Attendance
        ↓
Completed
```

The underlying architecture explicitly models assignment/notification/confirmation, travel, session lifecycle and attendance.  

---

# 78. THE SECOND GOLDEN JOURNEY

```text id="xd1v0z"
Trainer opens Open
        ↓
Eligible sessions
        ↓
Open Session Detail
        ↓
Match 92
        ↓
Why?
        ↓
I'm Interested
        ↓
Interest registered
        ↓
Wait
        ↓
Assignment notification
        ↓
Session Detail
        ↓
Confirm
```

The architecture defines this interest as non-booking and requires revalidation at assignment.

---

# 79. THE THIRD GOLDEN JOURNEY

```text id="43xj2s"
Assignment
 ↓
Decline
 ↓
Reason
 ↓
Nominate
 ↓
Search
 ↓
Validate
 ↓
Submit
 ↓
Back to schedule
```

---

# 80. WHAT “DONE” MEANS FOR EACH SCREEN

A mobile screen is production-ready only when:

```text id="00n7j1"
✓ UI
✓ Navigation
✓ ViewModel/state
✓ API integration
✓ Loading
✓ Empty
✓ Error
✓ Success
✓ Permission
✓ Offline behavior
✓ Analytics event
✓ Accessibility
✓ Unit tests
✓ Widget/component tests
```

---

# 81. FINAL MOBILE TECHNOLOGY STACK

## Recommended Flutter stack

```text
Frontend
Flutter

Language
Dart

Architecture
Feature-first
Layered
MVVM-oriented

Navigation
Flutter Router

State
Reactive state management

Networking
REST + JSON

Storage
Secure storage
Local database/cache

Push
FCM / APNs

Camera
QR scanner

Location
Native location service

Files
Native file picker

Monitoring
Crash + performance monitoring

CI/CD
Automated build/test/release
```

Flutter's official architecture material emphasizes layered architecture, view models, repositories, testability and separation of concerns, making this structure a natural fit for the app's complexity.

---

# 82. REACT NATIVE ALTERNATIVE STACK

```text
Frontend
React Native

Language
TypeScript

Architecture
Feature-first
Layered

Navigation
React Navigation

State
Server-state + feature store

Networking
REST + JSON

Storage
Secure storage
Local cache/database

Push
FCM / APNs

Camera
Native camera/QR package

Location
Native location module

Files
Native document picker

Monitoring
Crash + performance monitoring

CI/CD
Automated build/test/release
```

React Native officially supports TypeScript and current new projects use TypeScript by default; React Navigation is documented as the standard community navigation option.

---

# 83. FINAL DECISION

For this specific Trainer Mobile App:

```text id="1l5jtb"
                 TRAINER MOBILE APP
                         │
                 ┌───────┴───────┐
                 │               │
              FLUTTER        REACT NATIVE
                / DART          / TS
                 │
                 └───────┬───────┘
                         │
                   SAME UX SYSTEM
                         │
      ┌──────────────────┼──────────────────┐
      │                  │                  │
   Schedule           Session            Profile
      │                  │                  │
   Open               Response          Competency
      │                  │                  │
 Interest            Nomination        Certification
      │                  │                  │
   Travel             Attendance        Availability
```

**The UX does not change based on Flutter vs React Native.**  
Only the implementation language, component model and project architecture change.

---

# 84. FINAL ENGINEERING PROCESS

```text id="y5iq9b"
01  Freeze mobile requirements
02  Freeze mobile navigation
03  Freeze mobile states
04  Freeze API contracts
05  Create Figma design system
06  Create Flutter/RN project
07  Build app shell
08  Build authentication
09  Build Home
10  Build Schedule
11  Build Session
12  Build Confirm / Decline
13  Build Nomination
14  Build Open Sessions
15  Build Interest
16  Build Profile
17  Build Competency
18  Build Certification
19  Build Availability
20  Build Leave
21  Build Travel
22  Build Notifications
23  Build Attendance
24  Build History
25  Build Offline / Sync
26  Integrate backend
27  Unit testing
28  Widget/UI testing
29  E2E testing
30  Accessibility
31  Performance
32  Security
33  UAT
34  Pilot
35  Production release
36  Monitor
37  Improve
```

---

# 85. THE MOST IMPORTANT RULE

The frontend developer should **not invent business rules**.

For example, the backend determines:

```text
Eligible?
Certification valid?
Travel feasible?
Leave conflict?
Load violation?
Assignment state?
```

The mobile app determines:

```text
How to display it.
How to ask the user.
How to show loading.
How to show the result.
How to navigate.
```

This keeps the app aligned with the source architecture and prevents business logic from being duplicated inconsistently on mobile.

---

# 86. FINAL MOBILE PRODUCT ARCHITECTURE

```text
                        TRAINER MOBILE APP
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
            WORK           OPPORTUNITY        PROFILE
             │                 │                 │
          Schedule            Open             Readiness
          Today               Match            Competency
          Sessions            Interest         Certification
          Travel              My Interests     CV
          Attendance                           Experience
             │                                  Availability
             └─────────────────┬────────────────┘
                               │
                         NOTIFICATIONS
                               │
                         ACTION CENTER
                               │
                         BACKEND API
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
     Identity              Scheduling              Engine
        │                      │                      │
       Auth                 Sessions             Eligibility
       SSO                  Assignment            Scoring
       MFA                  Response              Travel
        │                      │                   Diagnostics
        └──────────────────────┼──────────────────────┘
                               │
                         ODOO / SERVICES
```

---

# 87. FINAL ANSWER TO “WHAT LANGUAGE?”

### Flutter version

```text
Flutter
+
Dart
+
Feature-first architecture
+
MVVM-oriented ViewModels
+
Repository pattern
+
Reactive state
+
Router navigation
```

### React Native version

```text
React Native
+
TypeScript
+
Feature-first architecture
+
Hooks / ViewModels
+
Repository / Service pattern
+
Reactive state
+
React Navigation
```

### My primary choice

```text
🔥 FLUTTER + DART
```

because this application has a large amount of custom enterprise UI—calendar rendering, status visualization, multi-step forms, cards, bottom sheets, custom workflow states and dense-but-clean components—and Flutter's widget/declarative model gives very strong control over a consistent cross-platform design. Flutter's official architecture documentation also gives a solid layered/MVVM-oriented foundation for a scalable app.

React Native remains a very strong implementation path, especially for a team already standardized on TypeScript/React. Current React Native projects use TypeScript by default.