# Trainer Rostering Mobile App
## Flutter Implementation Specification — v1.0

### 1. Scope

This specification covers the **Trainer Mobile App only**.

The trainer is a self-scoped user. The mobile application must allow the trainer to manage their own profile and enrichment data, view their own schedule, respond to assignments, nominate replacements, discover eligible Open Sessions, register interest, manage availability/leave/preferences, receive notifications, and mark attendance. The source architecture explicitly defines these trainer use cases.

The mobile app is a client of the authoritative Rostering Platform API. The app must not become the source of truth for eligibility, assignment, certification validity, load limits, travel feasibility, or attendance authorization.

---

# 2. Recommended Flutter stack

## Framework

**Flutter + Dart**

Flutter's current official architecture guidance supports separation between UI, application/state logic, repositories, and data sources, which fits this product's workflow-heavy structure.

## Core packages

The exact dependency versions should be locked in `pubspec.lock` during implementation. As of September 2026, the current package pages show:

```yaml
dependencies:
  flutter:
    sdk: flutter

  flutter_riverpod: ^3.4.3
  go_router: ^18.0.1
  dio: ^5.11.1
  flutter_secure_storage: ^11.2.0
  json_annotation: ^4.12.0
  freezed_annotation: ^3.1.0
```

The current published versions are documented on pub.dev.

Use compatible versions of:

```text
freezed
json_serializable
build_runner
```

for code generation.

`go_router` is suitable because it supports declarative routing, redirects, nested routes, deep linking and `ShellRoute`, which maps directly to the five-tab trainer shell.

`dio` provides interceptors, cancellation, multipart upload and configurable networking behavior, which are useful for this application.

`flutter_secure_storage` is appropriate for storing sensitive authentication material in platform secure storage.

---

# 3. Project structure

```text
lib/
│
├── main.dart
│
├── app/
│   ├── app.dart
│   │
│   ├── router/
│   │   ├── app_router.dart
│   │   ├── route_names.dart
│   │   ├── route_guards.dart
│   │   └── deep_link_handler.dart
│   │
│   ├── theme/
│   │   ├── app_theme.dart
│   │   ├── app_colors.dart
│   │   ├── app_spacing.dart
│   │   ├── app_typography.dart
│   │   └── component_theme.dart
│   │
│   └── config/
│       ├── app_config.dart
│       └── feature_flags.dart
│
├── core/
│   ├── network/
│   │   ├── api_client.dart
│   │   ├── auth_interceptor.dart
│   │   ├── retry_policy.dart
│   │   ├── connectivity_service.dart
│   │   └── api_error_mapper.dart
│   │
│   ├── auth/
│   │   ├── auth_session.dart
│   │   ├── auth_repository.dart
│   │   └── auth_state.dart
│   │
│   ├── storage/
│   │   ├── secure_storage_service.dart
│   │   ├── local_database.dart
│   │   └── cache_policy.dart
│   │
│   ├── notifications/
│   │   ├── push_notification_service.dart
│   │   ├── notification_router.dart
│   │   └── notification_payload.dart
│   │
│   ├── permissions/
│   │   ├── permission_service.dart
│   │   ├── camera_service.dart
│   │   └── location_service.dart
│   │
│   ├── files/
│   │   ├── file_picker_service.dart
│   │   └── document_upload_service.dart
│   │
│   ├── errors/
│   │   ├── app_exception.dart
│   │   └── failure.dart
│   │
│   └── utils/
│       ├── date_utils.dart
│       ├── duration_utils.dart
│       └── validators.dart
│
├── shared/
│   ├── widgets/
│   │   ├── app_scaffold.dart
│   │   ├── app_button.dart
│   │   ├── app_text_field.dart
│   │   ├── app_dropdown.dart
│   │   ├── app_bottom_sheet.dart
│   │   └── app_dialog.dart
│   │
│   ├── cards/
│   │   ├── session_card.dart
│   │   ├── open_session_card.dart
│   │   ├── travel_card.dart
│   │   ├── leave_card.dart
│   │   └── certification_card.dart
│   │
│   ├── badges/
│   │   ├── status_badge.dart
│   │   ├── competency_badge.dart
│   │   └── verification_badge.dart
│   │
│   ├── states/
│   │   ├── loading_state.dart
│   │   ├── empty_state.dart
│   │   ├── error_state.dart
│   │   └── offline_state.dart
│   │
│   └── forms/
│       ├── date_range_field.dart
│       ├── document_uploader.dart
│       └── multi_select_field.dart
│
└── features/
    │
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
    ├── history/
    └── settings/
```

Each feature follows:

```text
presentation
domain
data
```

Example:

```text
features/session/
│
├── data/
│   ├── datasources/
│   │   └── session_remote_datasource.dart
│   ├── dto/
│   │   ├── session_dto.dart
│   │   └── assignment_dto.dart
│   └── repositories/
│       └── session_repository_impl.dart
│
├── domain/
│   ├── entities/
│   │   ├── session.dart
│   │   └── assignment.dart
│   ├── repositories/
│   │   └── session_repository.dart
│   └── usecases/
│       ├── get_session.dart
│       ├── confirm_assignment.dart
│       ├── decline_assignment.dart
│       └── nominate_replacement.dart
│
└── presentation/
    ├── screens/
    │   ├── session_detail_screen.dart
    │   ├── session_response_screen.dart
    │   ├── decline_screen.dart
    │   └── nomination_screen.dart
    │
    ├── widgets/
    │   ├── session_header.dart
    │   ├── assignment_response_panel.dart
    │   ├── sla_countdown.dart
    │   └── nomination_card.dart
    │
    └── controllers/
        └── session_controller.dart
```

---

# 4. Application entry point

## `main.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  runApp(
    const ProviderScope(
      child: TrainerRosteringApp(),
    ),
  );
}
```

## `app.dart`

```dart
import 'package:flutter/material.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';

class TrainerRosteringApp extends StatelessWidget {
  const TrainerRosteringApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Trainer Rostering',
      theme: AppTheme.light(),
      routerConfig: appRouter,
      debugShowCheckedModeBanner: false,
    );
  }
}
```

---

# 5. Authentication architecture

The source defines a sequence:

```text
Seeded
  ↓
Invited
  ↓
first login
  ↓
Enriching
  ↓
SubmittedForVerification
  ↓
Verified
  ↓
RecommendationReady
```

A seeded user can log in before they become rosterable. `RecommendationReady` requires the completeness threshold plus at least one verified competency. 

Therefore login state and rosterability must be separate.

```text
Authenticated
≠
Rosterable
```

---

# 6. Authentication states

```dart
enum AuthStatus {
  unknown,
  unauthenticated,
  authenticating,
  authenticated,
  requiresActivation,
  requiresMfa,
  suspended,
  inactive,
  failure,
}
```

```dart
class AuthState {
  final AuthStatus status;
  final AuthSession? session;
  final String? error;

  const AuthState({
    required this.status,
    this.session,
    this.error,
  });
}
```

---

# 7. Routes

```text
/auth/login
/auth/mfa
/auth/activation

/home

/schedule
/schedule/month
/schedule/week
/schedule/day

/session/:id
/session/:id/respond
/session/:id/decline
/session/:id/nominate

/open
/open/:id
/open/:id/interest
/open/:id/withdraw

/interests

/profile
/profile/identity
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
/attendance/:sessionId
/attendance/:sessionId/check-in
/attendance/:sessionId/live
/attendance/:sessionId/complete

/history

/settings
/help
```

---

# 8. Root router

```dart
final appRouter = GoRouter(
  initialLocation: '/home',
  redirect: (context, state) {
    final authenticated = authState.isAuthenticated;

    final loggingIn = state.matchedLocation.startsWith('/auth');

    if (!authenticated && !loggingIn) {
      return '/auth/login';
    }

    if (authenticated && loggingIn) {
      return '/home';
    }

    return null;
  },
  routes: [
    GoRoute(
      path: '/auth/login',
      builder: (_, __) => const LoginScreen(),
    ),

    GoRoute(
      path: '/auth/mfa',
      builder: (_, __) => const MfaScreen(),
    ),

    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) {
        return TrainerShell(
          navigationShell: navigationShell,
        );
      },
      branches: [
        // Home
        // Schedule
        // Open
        // Profile
        // More
      ],
    ),
  ],
);
```

`ShellRoute`/nested navigation is one of the reasons `go_router` fits this application.

---

# 9. Trainer shell

Bottom navigation:

```text
Home
Schedule
Open
Profile
More
```

Flutter widget:

```text
Scaffold
├── body
└── NavigationBar
    ├── Home
    ├── Schedule
    ├── Open
    ├── Profile
    └── More
```

The selected tab must survive nested navigation within that branch.

---

# 10. Design tokens

Use centralized tokens.

```dart
class AppSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const xl = 32.0;
}
```

Typography:

```dart
class AppTypography {
  static const pageTitle = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w700,
  );

  static const sectionTitle = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w700,
  );

  static const body = TextStyle(
    fontSize: 15,
  );

  static const caption = TextStyle(
    fontSize: 13,
  );
}
```

The exact brand colors should come from the final design system; the architecture already defines semantic status meanings rather than prescribing a visual palette.

---

# 11. Core status mapping

```dart
enum SessionUiStatus {
  draft,
  awaitingResponse,
  confirmed,
  open,
  atRisk,
  inProgress,
  completed,
  cancelled,
}
```

Mapping:

```text
Grey    → Draft
Blue    → Published / awaiting response
Green   → Confirmed
Amber   → Unassigned / backfill
Red     → At Risk
Purple  → Open / interest
Hatched → Travel / leave / blackout
```

These semantics are defined by the source architecture and should remain consistent throughout the app.

---

# 12. Home screen

## Route

```text
/home
```

## Widget tree

```text
HomeScreen
│
├── AppHeader
│   ├── Greeting
│   └── NotificationButton
│
├── ProfileCompletenessCard
│
├── ActionRequiredSection
│   └── ActionItemCard[]
│
├── TodaySection
│   └── SessionCard[]
│
├── UpcomingSection
│   └── SessionCard[]
│
├── OpenSessionsSection
│   └── OpenSessionCard[]
│
└── LeaveSummaryCard
```

## UX

```text
Good morning, Rahul 👋

Profile completeness
72 / 100
██████████████░░

[ Complete profile ]

ACTION REQUIRED

Monthly schedule
Response required
31h remaining
[ Review ]

TODAY

09:00 – 13:00
RTG Operations
Mundra
CONFIRMED
[ View ]

OPEN SESSIONS
3 sessions match your profile
[ See all ]

LEAVE
6 days remaining
```

The architecture identifies the trainer landing information as personal calendar, pending responses with SLA countdown, eligible open sessions and leave balance.

---

# 13. Home state

```dart
class HomeState {
  final TrainerSummary trainer;
  final ProfileCompleteness completeness;
  final List<ActionItem> actions;
  final List<SessionSummary> todaySessions;
  final List<SessionSummary> upcomingSessions;
  final List<OpenSessionSummary> openSessions;
  final LeaveBalance leaveBalance;
  final int unreadNotifications;
}
```

API:

```http
GET /api/mobile/v1/home
```

Recommended response:

```json
{
  "trainer": {
    "id": "TR-1024",
    "name": "Rahul Sharma",
    "profile_state": "recommendation_ready"
  },
  "profile": {
    "score": 82
  },
  "action_items": [],
  "today_sessions": [],
  "upcoming_sessions": [],
  "open_sessions": [],
  "leave_balance": {
    "available": 6
  },
  "notifications": {
    "unread": 3
  }
}
```

These endpoint paths are an implementation proposal; the source architecture specifies the business model and workflows, not the final REST URL contract.

---

# 14. Action-required card

Reusable data model:

```dart
class ActionItem {
  final String id;
  final String type;
  final String title;
  final String subtitle;
  final DateTime? dueAt;
  final String deepLink;
  final ActionPriority priority;
}
```

Example:

```text
Assignment response
Response due in 18h
[ Review ]
```

The countdown must be based on the authoritative `response_due_at` returned by the backend, not calculated from an assumed 72-hour value in the mobile app.

The architecture defines different proposed SLAs for monthly schedule response, session response and emergency assignments.

---

# 15. Schedule

## Routes

```text
/schedule
/schedule/month
/schedule/week
/schedule/day
```

## Main views

```text
[ Month ] [ Week ] [ Day ]
```

## Screen tree

```text
ScheduleScreen
│
├── ScheduleHeader
│   ├── Previous
│   ├── Month / date
│   └── Next
│
├── ViewToggle
│
├── Calendar
│
└── SelectedDaySessions
    └── ScheduleItem[]
```

---

# 16. Schedule item types

```dart
sealed class CalendarItem {}

class DeliverySession extends CalendarItem {}

class TravelBlock extends CalendarItem {}

class LeaveBlock extends CalendarItem {}

class BlackoutBlock extends CalendarItem {}

class PendingAssignment extends CalendarItem {}

class OpenSession extends CalendarItem {}
```

This is important because travel is not just a visual warning. The source makes `TRAVEL_BLOCK` an actual occupied calendar object, while leave, blackout and travel are also availability constraints. 

---

# 17. Example schedule

```text
21 MON

09:00–13:00
RTG Operations
Mundra
CONFIRMED

13:00–14:00
Break

18:00–23:00
Travel
Mundra → Ahmedabad

──────────────

22 TUE

LEAVE
Personal Leave
```

Don't display travel as a normal training session.

Use:

```text
TRAVEL
```

with its own visual treatment.

---

# 18. Schedule data model

```dart
class ScheduleDay {
  final DateTime date;
  final List<CalendarItem> items;
}

class SchedulePeriod {
  final DateTime from;
  final DateTime to;
  final List<ScheduleDay> days;
}
```

API:

```http
GET /api/mobile/v1/schedule?from=2026-10-01&to=2026-10-31
```

The response must return normalized time-zone-aware timestamps.

---

# 19. Session entity

```dart
class Session {
  final String id;
  final String title;

  final DateTime startsAt;
  final DateTime endsAt;

  final String siteId;
  final String siteName;

  final String? room;
  final String trainingType;
  final String deliveryMode;
  final String? equipmentCode;

  final int requiredCompetencyLevel;

  final SessionUiStatus status;

  final Assignment? assignment;

  final TravelRequirement? travel;

  final AttendanceAvailability? attendance;
}
```

---

# 20. Session detail

## Route

```text
/session/:id
```

## Layout

```text
< Back

CONFIRMED

RTG Operations

10 Oct 2026
09:00 – 13:00

Mundra Training Centre
Simulator Room 02

TRAINING
Technical
Classroom
RTG

ASSIGNMENT
Primary Trainer
Rahul Sharma

TRAVEL
Ahmedabad → Mundra
Travel required

[ Attendance ]
```

For pending:

```text
AWAITING RESPONSE

Response due in
18h 42m

[ CONFIRM ]
[ DECLINE ]
```

---

# 21. Assignment model

```dart
enum AssignmentState {
  proposed,
  notified,
  confirmed,
  declined,
  released,
  cancelled,
  delivered,
}
```

The source defines assignment states around proposal, notification, confirmation, decline, release and delivery.

---

# 22. Assignment response

The architecture deliberately performs confirmation/decline at two levels:

```text
Schedule-level
       ↓
Session-level
```

The mobile UI should therefore distinguish:

```text
Monthly schedule response
```

from:

```text
Session confirmation
```

Do not build only one generic "accept schedule" mechanism.

---

# 23. Confirm action

Button:

```text
CONFIRM
```

Confirmation dialog:

```text
Confirm session?

RTG Operations
10 Oct · 09:00–13:00
Mundra

[ Cancel ]
[ Confirm ]
```

Repository:

```dart
abstract class SessionRepository {
  Future<Assignment> confirmAssignment(
    String assignmentId,
  );
}
```

Use case:

```dart
class ConfirmAssignment {
  final SessionRepository repository;

  ConfirmAssignment(this.repository);

  Future<Assignment> call(String id) {
    return repository.confirmAssignment(id);
  }
}
```

API:

```http
POST /api/mobile/v1/assignments/{id}/confirm
```

---

# 24. Decline action

The decline button must not immediately perform the mutation.

Flow:

```text
Decline
  ↓
Reason screen
  ↓
Optional nomination
  ↓
Review
  ↓
Submit
```

The source requires a decline reason and distinguishes the resulting operational ledger behavior.

---

# 25. Decline screen

```text
Decline session

Why are you declining?

○ Personal reason
○ Schedule conflict
○ Travel constraint
○ Leave
○ Emergency
○ Other

Additional details
[________________________]

Would you like to nominate
a replacement?

○ Yes
○ No

[ Continue ]
```

Validation:

```text
reason == null
    → error

reason == other && details.isEmpty
    → error
```

---

# 26. Nomination flow

```text
Decline
  ↓
Nominate replacement?
  ↓
Yes
  ↓
Suggested nominees
  ↓
Select nominee
  ↓
Optional note
  ↓
Submit nomination
```

The nominee must still be validated on the server because eligibility depends on competency, certification, overlap, leave, load and travel.

---

# 27. Open Sessions

Use the trainer-facing label:

# Open Sessions

Do not expose the internal word "auction" as the main feature label.

The source explicitly describes the feature as a projection of unassigned sessions into the eligible trainer's schedule.

## Route

```text
/open
```

## UI

```text
Open Sessions

12 available

[ All ] [ Nearby ] [ Dates ] [ Skills ]

RTG Operations
15 Oct · 09:00–13:00
Mundra

Required: RTG L3
Your level: L4 ✓

Classroom
RTG

[ View ]
```

---

# 28. Open Session detail

```text
RTG Operations

15 October 2026
09:00 – 13:00

Mundra Training Centre

REQUIREMENT
RTG — L3

YOUR COMPETENCY
RTG — L4 ✓

CERTIFICATION
Valid on session date ✓

DELIVERY
Classroom

TRAVEL
Ahmedabad → Mundra

[ I'M INTERESTED ]
```

---

# 29. Interest registration

Button:

```text
I'm interested
```

Before registration, the API should perform the eligibility check.

On success:

```text
✓ Interest registered

This is not a booking.

You will only be assigned if selected
by the rostering process, after which
you must confirm or decline the assignment.
```

The source explicitly states that registering interest does not block the calendar.

---

# 30. Interest entity

```dart
enum InterestState {
  active,
  withdrawn,
  lapsed,
  assigned,
}
```

```dart
class OpenSessionInterest {
  final String id;
  final String sessionId;
  final InterestState state;
  final DateTime registeredAt;
  final String? note;
}
```

API:

```http
POST   /api/mobile/v1/open-sessions/{id}/interest
DELETE /api/mobile/v1/open-sessions/{id}/interest
GET    /api/mobile/v1/open-sessions/interests
```

---

# 31. Open Session rules

The backend must enforce:

```text
Eligible sessions only
Interest does not reserve time
Clash warning
Maximum interests per configured period
Revalidation at actual assignment
Withdrawal does not count as rejection
Development opportunities remain separate
```

The source proposes a maximum of eight open interests per week and explicitly says withdrawal before assignment does not count as a rejection. It also describes one-level-short development opportunities as Secondary options whose decline does not count.

Because several policy values remain open items, the actual threshold should be delivered by configuration rather than hard-coded into Flutter.

---

# 32. Development Opportunities

Separate section:

```text
DEVELOPMENT OPPORTUNITIES

RTG Advanced Operations

Required
L4

Your level
L3

Opportunity
Secondary / Shadowing

[ View ]
```

This should never visually imply normal eligibility.

---

# 33. Profile

## Route

```text
/profile
```

The source defines nine enrichment steps:

```text
1 Identity confirmation
2 Contact & personal
3 Education
4 Work experience
5 CV
6 Competency self-declaration
7 Certifications
8 Availability & preferences
9 Review & submit
```



---

# 34. Profile screen

```text
My Profile

82 / 100
████████████████░░

Recommendation ready ✓

PROFILE SECTIONS

Identity
Confirmed ✓

Contact & Personal
Complete ✓

Education
Complete ✓

Work Experience
Complete ✓

CV
Uploaded ✓

Competencies
3 verified

Certifications
2 valid

Availability
Complete ✓

[ Review & Submit ]
```

---

# 35. Profile completeness

```dart
class ProfileCompleteness {
  final int score;

  final bool identityComplete;
  final bool contactComplete;
  final bool educationComplete;
  final bool experienceComplete;
  final bool certificationsComplete;
  final bool competencyComplete;
  final bool availabilityComplete;
  final bool cvComplete;
}
```

The architecture's 100-point model is:

```text
Identity                 10
Contact & languages      10
Education                10
Work experience          15
Certifications           15
Competency               25
Availability/preferences 10
CV                        5
                         ---
                         100
```

The source says 60 permits submission, while 75 plus at least one verified competency gives `RecommendationReady`.

---

# 36. Identity screen

System-owned values:

```text
Employee code
Full name
Date of joining
Engagement type
Home site
BU
Designation
```

UI:

```text
Identity

Employee code
TR-1024
🔒 Organisation managed

Name
Rahul Sharma
🔒 Organisation managed

Home site
Mundra
🔒 Organisation managed

Need to correct something?
[ Request correction ]
```

The trainer must not have a normal edit button for T0 fields.

---

# 37. Contact & personal

Trainer-maintained:

```text
Mobile
Email
Address
Emergency contact
Languages
```

Normal editing is allowed while unverified.

After a field has become verified, edits should create a change-request workflow rather than silently overwriting the verified data.

---

# 38. Education

```text
Education

Bachelor of Engineering
ABC Institute
2014

[ Edit ]

Diploma
XYZ College
2011

[ Add education ]
```

Fields:

```text
Qualification
Institution
Year
Specialisation
Document
```

---

# 39. Work experience

```text
Work Experience

Port Operations Ltd.
Trainer / Operations
2017–2021

Equipment:
RTG
RMG

Training delivered:
Technical
OJT

[ Edit ]

[ Add experience ]
```

The source states that work-experience data contributes to experience/TCI-related derived measures, while derived results themselves must remain system-owned.

---

# 40. CV upload

```text
Upload your CV

PDF or DOCX

[ Choose file ]
```

Processing:

```text
CV uploaded
      ↓
Parsing
      ↓
Education drafts
Experience drafts
Competency drafts
      ↓
Trainer reviews
      ↓
Save
```

The architecture explicitly treats CV parsing as an accelerator, not authority. Parsed competencies are draft, capped at L2, and cannot satisfy eligibility.

Therefore:

```text
cv_parsed
    ↓
draft
    ↓
trainer review
    ↓
assessment
    ↓
verified
```

Never:

```text
CV → verified competency
```

---

# 41. Competencies

## Screen

```text
My Competencies

VERIFIED

RTG Operations
L4
Classroom ✓
Simulator ✓
OJT ✓
TCI 82

Safety Operations
L3
Classroom ✓

PENDING

Simulator Operations
L3
Submitted 2 days ago

DRAFT

Crane Handling
L2
CV parsed

[ Add competency ]
```

The source competency object includes skill, L1–L5 level, training type, delivery mode, equipment, source, confidence, state, validity and evidence.

---

# 42. Competency model

```dart
enum CompetencyState {
  draft,
  submitted,
  verified,
  expired,
}
```

```dart
enum TrainingType {
  technical,
  foundation,
  both,
}
```

```dart
enum DeliveryMode {
  classroom,
  simulator,
  ojt,
  vilt,
}
```

```dart
class TrainerCompetency {
  final String skillId;
  final String skillName;

  final int level;

  final TrainingType trainingType;

  final Set<DeliveryMode> deliveryModes;

  final String? equipmentCode;

  final String source;

  final int confidence;

  final CompetencyState state;

  final DateTime? validFrom;
  final DateTime? validTo;

  final List<String> evidenceIds;

  final double? tci;
}
```

---

# 43. Competency declaration form

```text
Skill
[ RTG Operations ]

Self-rated level
L1 L2 L3 L4 L5

Training type
[x] Technical
[ ] Foundation

Delivery capability
[x] Classroom
[x] Simulator
[x] OJT
[ ] VILT

Equipment
[ RTG ]

Evidence
[ Upload evidence ]

[ Save draft ]
[ Submit for verification ]
```

---

# 44. Certifications

## Screen

```text
Certifications

VALID

RTG Certification
Expires 10 Feb 2027

Safety Certification
Expires 18 Jun 2027

EXPIRING

OJT Accreditation
Expires 14 Oct 2026

[ Update ]
```

Certification validity is a hard eligibility condition on the session date.

---

# 45. Certification form

```text
Certification type
Issuer
Certificate number
Issue date
Expiry date

Document
[ Upload ]

[ Save ]
```

The UI can warn:

```text
Expires in 23 days
```

but final session eligibility must always be evaluated by the backend.

---

# 46. Availability

```text
Availability & Preferences

Preferred slots
[x] Morning
[x] Afternoon
[ ] Evening

Preferred locations
[x] Mundra
[x] Kandla

Willing locations
[x] Gujarat
[x] Maharashtra

Travel
[ Yes ]

[ Save ]
```

Preferences are soft signals; they are not automatically equivalent to hard exclusions. The architecture explicitly describes preferred slots/locations as soft scheduling inputs.

---

# 47. Blackout dates

```text
Blackout dates

12 Oct
Personal commitment

18 Oct
Unavailable

[ Add blackout ]
```

A blackout should be shown as occupancy/unavailability.

---

# 48. Review & submit

```text
Profile Review

Identity                 ✓
Contact                  ✓
Education                ✓
Experience               ✓
CV                       ✓
Competencies             ✓
Certifications           ✓
Availability             ✓

Completeness
78 / 100

[ Submit for verification ]
```

Before submission:

```text
if score < configured_submission_threshold
    block submit

if missing_required_field
    show exact missing section
```

The mobile app should not hard-code the threshold because the source identifies the threshold as an item requiring confirmation.

---

# 49. Leave

## Route

```text
/leave
/leave/apply
/leave/:id
```

Home:

```text
Leave

Available
6 days

Pending
12 Oct – 14 Oct

Approved
22 Nov – 23 Nov

[ Apply leave ]
```

---

# 50. Leave form

```text
Leave type
[ Annual Leave ]

From
12 Oct

To
14 Oct

Reason
[________________]

[ Submit leave request ]
```

The source says pending leave must be treated conservatively as occupied, approved leave blocks the calendar, and an approved leave conflict with a confirmed session triggers backfill without recording a rejection against the trainer.

Therefore a leave approval must trigger a schedule refresh.

---

# 51. Travel

## Route

```text
/travel
/travel/:id
```

Example:

```text
TRAVEL

Ahmedabad
→
Mundra

09 Oct
18:00 – 23:00

Reason
Training assignment

Accommodation
Required

Status
Approved
```

For mobile, simply expose:

```text
Travel required
```

rather than showing internal engine scoring.

The source specifically makes travel blocks calendar-occupying objects and re-checks overlaps after travel is created.

---

# 52. Notifications

## Route

```text
/notifications
```

UI:

```text
Notifications

Today

Assignment
New session assigned
Response due in 8h

Open Sessions
3 new sessions match your profile

Certification
RTG certification expires in 14 days

Competency
RTG L4 verified ✓
```

The notification matrix in the source includes assignment, Open Sessions, pre-session reminders, interest lapsed, nomination status, certification expiry, profile incompleteness, competency verification, rejection thresholds, suspension and travel sanction.

---

# 53. Push notification payload

Recommended payload:

```json
{
  "notification_id": "N123",
  "type": "ASSIGNMENT",
  "entity_id": "A456",
  "route": "/session/4521"
}
```

Routing:

```text
FCM / APNs
      ↓
Push Handler
      ↓
Notification Parser
      ↓
Authentication check
      ↓
GoRouter
      ↓
Target screen
```

Examples:

```text
Assignment
→ /session/4521

Certification
→ /profile/certifications/33

Open session
→ /open/8891

Competency verified
→ /profile/competencies/22
```

---

# 54. Attendance

The source defines attendance as QR and geo-fence/session-level attendance.

## Entry

```text
Session Detail
      ↓
[ Attendance ]
```

Attendance screen:

```text
Attendance

RTG Operations
10 Oct
09:00 – 13:00

Mundra Training Centre

Location
Checking...

QR
Ready

[ Check in ]
```

---

# 55. Attendance state machine

```dart
enum AttendanceState {
  unavailable,
  ready,
  checkingLocation,
  locationVerified,
  scanningQr,
  checkedIn,
  inProgress,
  checkingOut,
  completed,
  failed,
}
```

---

# 56. Geo-fence flow

```text
Tap Check in
       ↓
Request location permission
       ↓
Location available?
       ↓
Validate geo-fence
       ↓
Inside allowed area?
       │
       ├── No → show distance + retry
       │
       └── Yes
             ↓
          QR scan
             ↓
          validate QR
             ↓
          server check-in
```

The mobile app must not assume that "inside geo-fence" alone is enough. The backend must validate:

```text
session
trainer
assignment
attendance window
location evidence
QR/session token
duplicate check-in
```

---

# 57. Permission UX

Don't show:

```text
Allow location?
```

without context.

Show:

```text
Location required

We use your location during session
attendance check-in to verify that
you are at the training location.

[ Continue ]
```

Then trigger the native permission prompt.

Same principle for camera:

```text
Camera required

We use the camera to scan the
session attendance QR code.

[ Continue ]
```

---

# 58. Attendance failure states

```text
Outside attendance area

You appear to be 380m from the
session location.

[ Retry ]
```

```text
QR expired

Ask the session coordinator for
the current attendance QR.

[ Scan again ]
```

```text
Session not open

Attendance is available from
09:00 to 09:30.
```

The exact attendance timing should be backend-configurable rather than embedded in Flutter.

---

# 59. History

## Route

```text
/history
```

Show completed sessions:

```text
History

October 2026

RTG Operations
10 Oct
Mundra
Delivered

Safety Operations
04 Oct
Kandla
Delivered

September 2026

...
```

Filter:

```text
Month
Site
Course
Status
```

Derived metrics such as sessions delivered, feedback, TCI and utilization are system-owned and should be read-only.

---

# 60. API architecture

Never:

```text
Screen → Dio
```

Use:

```text
Screen
 ↓
Controller / ViewModel
 ↓
Use Case
 ↓
Repository
 ↓
Remote Data Source
 ↓
API Client
 ↓
Backend
```

Example:

```text
SessionDetailScreen
 ↓
SessionController
 ↓
GetSession
 ↓
SessionRepository
 ↓
SessionRemoteDataSource
 ↓
Dio
```

---

# 61. API client

```dart
class ApiClient {
  final Dio dio;

  ApiClient(this.dio);

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? query,
  }) {
    return dio.get<T>(
      path,
      queryParameters: query,
    );
  }

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
  }) {
    return dio.post<T>(
      path,
      data: data,
    );
  }
}
```

---

# 62. Authentication interceptor

```dart
class AuthInterceptor extends Interceptor {
  final SecureStorageService storage;

  AuthInterceptor(this.storage);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await storage.readAccessToken();

    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401) {
      // refresh token
      // retry request
      // otherwise logout
    }

    handler.next(err);
  }
}
```

The refresh mechanism should be centralized. Individual screens should never contain token-refresh logic.

---

# 63. Secure storage

Store:

```text
access token
refresh token
device/session identifier
```

Do not store:

```text
password
CV contents
raw QR payloads
location history
```

in ordinary preferences.

---

# 64. Server truth vs local cache

## Safe cache

```text
Profile
Competencies
Certifications
Schedule
Travel
Leave
Recent notifications
```

## Server-authoritative actions

```text
Confirm assignment
Decline assignment
Nominate
Register interest
Attendance check-in
Attendance check-out
```

The app can cache display data, but it cannot locally decide that a trainer is eligible or successfully assigned.

---

# 65. Offline state

When offline:

```text
You're offline.

Showing your last synchronized
schedule.

Last updated 2:18 PM.
```

For critical actions:

```text
You're offline.

This action requires a live
connection to the rostering server.

[ Retry ]
```

Never show:

```text
✓ Confirmed
```

when the server has not accepted the action.

---

# 66. Idempotency

Critical mutations should support idempotency keys.

Example:

```http
POST /assignments/A456/confirm

Idempotency-Key: 24c5f...
```

This prevents duplicate confirmation if a mobile request is retried after a timeout.

Same principle for:

```text
Decline
Nomination
Interest
Attendance
Leave
```

---

# 67. Optimistic UI rules

Optimistic UI is acceptable for:

```text
notification read
local form draft
filter changes
tab selection
```

Do not use optimistic success semantics for:

```text
assignment confirmation
assignment decline
nomination
interest registration
attendance
```

Those require server confirmation.

---

# 68. Repository example

```dart
abstract class ScheduleRepository {
  Future<SchedulePeriod> getSchedule({
    required DateTime from,
    required DateTime to,
  });
}
```

Implementation:

```dart
class ScheduleRepositoryImpl implements ScheduleRepository {
  final ScheduleRemoteDataSource remote;

  ScheduleRepositoryImpl(this.remote);

  @override
  Future<SchedulePeriod> getSchedule({
    required DateTime from,
    required DateTime to,
  }) async {
    final dto = await remote.getSchedule(
      from: from,
      to: to,
    );

    return dto.toDomain();
  }
}
```

This keeps DTO details out of the UI.

---

# 69. Riverpod provider structure

```dart
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
      ),
    ),
  );
});
```

Repository:

```dart
final scheduleRepositoryProvider =
    Provider<ScheduleRepository>((ref) {
  return ScheduleRepositoryImpl(
    ScheduleRemoteDataSource(
      ref.read(apiClientProvider),
    ),
  );
});
```

Schedule state:

```dart
final scheduleProvider = AsyncNotifierProvider<
    ScheduleController,
    SchedulePeriod>(
  ScheduleController.new,
);
```

Riverpod is appropriate for centralized dependency injection and reactive async application state.

---

# 70. Screen state convention

Every screen should expose:

```text
Loading
Loaded
Empty
Error
Offline
```

For a mutation:

```text
Idle
Submitting
Success
Failure
```

This must be consistent throughout the app.

---

# 71. Form state convention

Every form should separate:

```text
Draft
Dirty
Valid
Submitting
Saved
Error
```

For example:

```dart
class DeclineFormState {
  final String? reason;
  final String? details;
  final bool nominateReplacement;

  final bool isDirty;
  final bool isSubmitting;
}
```

---

# 72. Validation

The mobile layer handles obvious validation:

```text
required fields
format
date order
file type
file size
```

The server handles authoritative validation:

```text
eligibility
certification
availability
leave
load
travel
duplicate action
state transition
authorization
```

This separation is mandatory for roster integrity.

---

# 73. Date/time handling

All backend timestamps should be ISO-8601 with timezone/offset.

Internally:

```dart
DateTime
```

The API should represent:

```text
starts_at
ends_at
response_due_at
valid_from
valid_to
```

The UI converts to the trainer's configured/display timezone.

Calendar calculations must never rely on formatted display strings.

---

# 74. Session overlap

The mobile app may show:

```text
Possible schedule clash
```

but it should not calculate eligibility independently.

The backend source rules include overlap against:

```text
Confirmed sessions
Notified assignments
Travel blocks
Leave
Blackout
Holiday
Load caps
Rest hours
Inter-session gap
```



---

# 75. Open Session response contract

Recommended:

```json
{
  "session_id": "S123",
  "eligibility": {
    "eligible": true,
    "development_opportunity": false,
    "reasons": []
  },
  "interest": {
    "can_register": true,
    "already_registered": false,
    "active_count": 3,
    "max_allowed": 8
  }
}
```

For an unavailable session:

```json
{
  "eligibility": {
    "eligible": false,
    "reasons": [
      {
        "code": "CERTIFICATION_EXPIRED",
        "message": "Your RTG certification is not valid on the session date."
      }
    ]
  }
}
```

Use the `code` for analytics and the `message` for the UI.

---

# 76. API error envelope

Standardize:

```json
{
  "error": {
    "code": "ASSIGNMENT_ALREADY_RESPONDED",
    "message": "This assignment has already been responded to.",
    "trace_id": "abc123",
    "retryable": false
  }
}
```

Flutter maps this to:

```dart
class AppFailure {
  final String code;
  final String message;
  final bool retryable;
  final String? traceId;
}
```

---

# 77. Important state-transition failures

Examples:

### Assignment already confirmed

```text
This assignment was already confirmed.

[ View session ]
```

### Assignment expired

```text
This response window has expired.

The scheduler has been notified.
```

### Session filled while trainer was viewing Open Sessions

```text
This session is no longer open.

It has already been assigned.

[ Browse Open Sessions ]
```

### Certification expired

```text
This session is no longer available to you
because the required certification is not
valid on the session date.
```

These are much better than generic:

```text
Something went wrong.
```

---

# 78. Notification refresh

After receiving a push:

```text
notification arrives
       ↓
invalidate relevant provider
       ↓
Home refresh
Schedule refresh if relevant
Unread count refresh
```

Example:

```dart
ref.invalidate(homeProvider);
ref.invalidate(notificationProvider);
```

Do not refresh the entire application after every notification.

---

# 79. Deep-link safety

A notification can arrive before the user is authenticated.

Flow:

```text
Push
 ↓
Store pending deep link
 ↓
Login
 ↓
MFA
 ↓
Home shell initialized
 ↓
Navigate to pending destination
```

A push must never bypass authorization.

---

# 80. Profile lifecycle UI

Display state clearly:

```text
PROFILE STATUS

Seeded
Complete profile to get started
```

```text
ENRICHING

Profile 62%
Continue setup
```

```text
SUBMITTED

Profile under verification
```

```text
VERIFIED

Your information has been verified.
```

```text
RECOMMENDATION READY ✓

You are ready to be considered
for matching sessions.
```

```text
SUSPENDED

Your roster availability is currently
restricted.

Contact support / review reason.
```

These map to the profile state machine in the source.

---

# 81. "Recommendation Ready" is not an editable field

Backend derives:

```text
RecommendationReady
```

Mobile displays:

```text
Recommendation Ready ✓
```

The trainer cannot toggle it.

Similarly:

```text
TCI
Utilisation
Sessions delivered
Rejection count
Trainer tier
```

remain read-only system-derived values.

---

# 82. More tab

Recommended structure:

```text
More

Notifications
My Interests
Leave
Travel
History
Settings
Help & Support
About
Logout
```

Settings:

```text
Notifications
Security
Biometric lock
Privacy
App information
```

---

# 83. My Interests

```text
My Interests

ACTIVE

RTG Operations
15 Oct · Mundra

Safety Training
18 Oct · Kandla

LAPSED

Crane Operations
Session filled

WITHDRAWN

Workshop Safety
```

This gives the trainer visibility into actions they have taken without implying that interest itself is a booking.

---

# 84. Accessibility requirements

Every interactive element must support:

```text
semantic label
sufficient touch size
screen reader
dynamic text
focus order
visible validation
```

Status must never rely only on color.

Use:

```text
✓ Confirmed
! At Risk
○ Open
⌛ Awaiting response
```

rather than color alone.

---

# 85. Security requirements

```text
TLS
Secure token storage
Token rotation
Refresh-token invalidation
Session timeout
Logout everywhere where supported
No secrets in logs
No PII in analytics events
No document contents in analytics
Certificate/document access authorization
Permission checks
Root/jailbreak policy if required by security team
```

The API gateway in the architecture is responsible for authentication, authorization, rate limiting and audit capture.

The mobile app therefore participates in security but does not replace backend authorization.

---

# 86. Analytics event model

Use:

```json
{
  "event": "assignment_confirmed",
  "entity_id": "A456",
  "screen": "session_detail",
  "timestamp": "2026-10-04T09:21:11+05:30"
}
```

Events:

```text
login_success
profile_step_started
profile_step_completed
profile_submitted

schedule_viewed
session_viewed
assignment_confirmed
assignment_declined
nomination_started
nomination_submitted

open_session_viewed
interest_registered
interest_withdrawn

leave_started
leave_submitted

cv_uploaded
competency_submitted
certification_uploaded

attendance_started
attendance_location_success
attendance_qr_success
attendance_checkin_success
attendance_failed
```

Never put sensitive free-text form contents into analytics.

---

# 87. Testing strategy

## Unit

Test:

```text
PCS mapping
status mapping
countdown
date formatting
validation
error mapping
deep-link parsing
```

## Widget

Test:

```text
Home
SessionCard
StatusBadge
SlaCountdown
DeclineForm
OpenSessionCard
ProfileProgress
```

## Repository

Test:

```text
DTO → entity
API errors
retry
cache
authorization handling
```

## Integration

Test:

```text
Login
→ Home

Home
→ Session
→ Confirm

Home
→ Session
→ Decline
→ Nominate

Home
→ Open
→ Interest

Home
→ Profile
→ Submit

Session
→ Attendance
→ Location
→ QR
→ Check-in
```

---

# 88. Critical acceptance tests

These should be release-blocking.

```text
1. An authenticated trainer cannot access another trainer's record.

2. An inactive trainer cannot perform roster actions.

3. A suspended trainer cannot confirm or interest sessions
   unless backend explicitly allows the action.

4. A pending assignment cannot be confirmed twice.

5. An expired assignment cannot be confirmed.

6. Decline requires a valid reason.

7. Nomination cannot bypass server eligibility.

8. Interest registration does not block calendar time.

9. A session that becomes filled after display cannot still
   be successfully registered as interest.

10. Certification validity is evaluated against session date.

11. Leave changes schedule occupancy after approval.

12. Travel blocks participate in overlap calculations.

13. Offline users cannot receive false confirmation success.

14. Attendance cannot be checked in against the wrong session.

15. QR + location validation occurs against server state.
```

---

# 89. Flutter feature implementation order

```text
PHASE 01
Project foundation
Theme
Routing
Dependency injection
Network
Secure storage

PHASE 02
Authentication
Activation
MFA
Session management

PHASE 03
Home
Schedule
Session detail

PHASE 04
Confirm
Decline
Nomination

PHASE 05
Open Sessions
Interest
My Interests

PHASE 06
Profile
PCS
Identity
Contact
Education
Experience
CV

PHASE 07
Competencies
Certifications
Availability

PHASE 08
Leave
Travel

PHASE 09
Notifications
Deep links

PHASE 10
Attendance
QR
Geo-fence

PHASE 11
Offline
Caching
Retry
Sync

PHASE 12
Analytics
Security hardening
Accessibility
Testing
UAT
```

The source's module roadmap places core identity/profile/competency/scheduling earlier, while engine/auction/notification and attendance follow, with CV parsing later.

---

# 90. React Native translation

The same architecture maps cleanly to React Native.

```text
src/
├── app/
│   ├── navigation/
│   ├── theme/
│   └── config/
│
├── core/
│   ├── api/
│   ├── auth/
│   ├── storage/
│   ├── notifications/
│   ├── permissions/
│   └── files/
│
├── shared/
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
    ├── leave/
    ├── travel/
    ├── attendance/
    └── notifications/
```

Equivalent stack:

```text
React Native
TypeScript
React Navigation
API client
State store
Secure storage
FCM/APNs
Camera
Location
File upload
```

React Native's current documentation describes TypeScript as the default for new projects and provides navigation guidance for stack/tab structures.

---

# 91. Flutter vs React Native code mapping

| Concern | Flutter | React Native |
|---|---|---|
| Screen | `Widget` | React component |
| State | Riverpod provider | Hook/store |
| Navigation | `go_router` | React Navigation |
| Model | Dart class | TypeScript type/interface |
| API | Dio | Axios/fetch |
| Secure storage | Flutter secure storage | Secure native storage |
| Camera | Flutter plugin | RN native package |
| Location | Flutter plugin | RN native package |
| Push | FCM/APNs package | FCM/APNs package |
| Local DB | SQLite/Drift-style | SQLite/MMKV-style |
| Widget test | `flutter_test` | Jest/RNTL |
| E2E | Flutter integration tooling | Detox/Maestro-style |

---

# 92. Recommended first production screens

The first fully coded flow should be:

```text
Splash
  ↓
Login
  ↓
MFA
  ↓
Home
  ↓
Schedule
  ↓
Session Detail
  ↓
Confirm
  ↓
Confirmation success
```

Then:

```text
Session Detail
  ↓
Decline
  ↓
Reason
  ↓
Nomination
  ↓
Submit
```

Then:

```text
Home
  ↓
Open Sessions
  ↓
Open Session Detail
  ↓
I'm Interested
  ↓
Registered
```

Then:

```text
Home
  ↓
Profile
  ↓
Complete profile
  ↓
Competency
  ↓
Certification
  ↓
Availability
  ↓
Submit
```

Then:

```text
Session
  ↓
Attendance
  ↓
Location
  ↓
QR
  ↓
Check-in
```

---

# 93. Most important engineering principle

The mobile application is:

```text
A powerful workflow client
```

not:

```text
A second rostering engine
```

Therefore:

```text
Flutter
  ↓
User intent
  ↓
Mobile API
  ↓
Authoritative business rules
  ↓
Result
  ↓
Flutter presentation
```

For example:

```text
Trainer taps "I'm interested"
           ↓
API
           ↓
hard eligibility validation
           ↓
competency
certification
overlap
leave
travel
load
readiness
           ↓
success/rejection
           ↓
Flutter updates state
```

The architecture explicitly requires the hard eligibility checks and revalidation at assignment time. 

---

# 94. Final production architecture

```text
                    ┌──────────────────────┐
                    │  TRAINER MOBILE APP  │
                    │       FLUTTER        │
                    └──────────┬───────────┘
                               │
                   ┌───────────┴───────────┐
                   │ Presentation          │
                   │ Home                  │
                   │ Schedule              │
                   │ Open Sessions         │
                   │ Profile               │
                   │ Session               │
                   │ Leave / Travel        │
                   │ Attendance            │
                   └───────────┬───────────┘
                               │
                          Controllers
                               │
                            Use Cases
                               │
                          Repositories
                               │
                         API / Cache
                               │
                         Mobile API
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
              Profile      Scheduling    Assignment
                 │             │             │
             Competency      Leave         Engine
                 │             │             │
            Certification   Travel       Open Sessions
                 │                           │
                 └─────────────┬─────────────┘
                               │
                          Notifications
                               │
                    FCM / APNs / WhatsApp
                               │
                         External systems
                        Digii / HRMS / etc.
```

The underlying source architecture describes the API/mobile integration layer, identity broker, session data, Redis/queue workers, PostgreSQL, object storage and external systems; this Flutter application should remain cleanly separated from those backend responsibilities.

---

# 95. Definition of Done

A mobile feature is complete only when all of these are true:

```text
✓ Screen implemented
✓ Domain model implemented
✓ API contract implemented
✓ Repository implemented
✓ State management implemented
✓ Loading state
✓ Empty state
✓ Error state
✓ Offline state where applicable
✓ Validation
✓ Server error mapping
✓ Success feedback
✓ Navigation
✓ Deep link where applicable
✓ Accessibility
✓ Analytics
✓ Security review
✓ Unit tests
✓ Widget tests
✓ Integration tests
✓ UAT acceptance
```

---

# 96. Final implementation priority

If the development team asks, "What do we code first?", the order is:

```text
1. App shell
2. Authentication
3. API infrastructure
4. Home
5. Schedule
6. Session detail
7. Confirm / Decline
8. Nomination
9. Open Sessions
10. Interest
11. Notifications
12. Profile
13. Competency
14. Certification
15. Availability
16. Leave
17. Travel
18. Attendance
19. Offline
20. Hardening
```

That produces a coherent trainer journey rather than a collection of disconnected screens.