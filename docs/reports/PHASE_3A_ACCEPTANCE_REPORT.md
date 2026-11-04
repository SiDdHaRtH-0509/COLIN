# COLIN — Phase 3A Acceptance & Engineering Report
## Owner Dashboard Refinement & COLIN-Mediated Booking Architecture

**Document Version:** 1.0.0  
**Date:** November 3, 2026  
**Engineering Leads:** Senior Full-Stack Engineer, SaaS Product Architect, UI/UX Designer, Security Engineer  
**Git Branch:** `feature/phase-3-owner-dashboard`  
**Build & Test Verdict:** 84/84 Tests Passed (100%), Zero TypeScript Errors, Clean Production Build

---

## 1. Executive Summary

Phase 3A represents a fundamental architectural evolution of the COLIN platform. It resolves two major operational imperatives:
1. **Host Experience Ergonomics:** Restores visual balance to the Owner Dashboard by eliminating massive dead whitespace in the lower-left section, stabilizes the Owner Portal sidebar layout with independent scrolling and canonical COLIN brand colors, and eliminates nested scroll containers on `<main>` in favor of natural window scrolling.
2. **Platform Intermediation & Privacy Architecture:** Formally replaces the legacy direct-contact enquiry system with the **COLIN Student Coordination System**. In accordance with COLIN's core trust model, **students and property owners never communicate directly**. All on-site visits are mediated by platform coordinators and verified student ambassadors. Personal contact vectors (phone, email, WhatsApp, socials) are strictly shielded across all host interfaces.
3. **12-Hour Decision System & Financial Mechanics:** Enforces a deterministic 12-hour decision window following on-site tour completion. If a student rejects a property within 12 hours of the physical visit, **55% (₹82.50) of the ₹150.00 slot fee is refunded**, while 45% (₹67.50) is retained to compensate the escorting ambassador. If accepted or if the 12-hour window lapses without a decision, the ₹150 fee is retained in full.

All 18 required automated test scenarios have been authored and verified under Vitest, bringing the total platform test suite to **84 tests passing across 6 test suites with 0 regressions**.

---

## 2. Owner Dashboard Layout Fixes (Before & After Structure)

### Identified Problem
In the Phase 3 baseline, the Owner Dashboard was severely unbalanced: the right column extended with multiple widgets (recent activity, notifications, certs, subscription), while the lower-left column terminated prematurely, leaving a massive empty white void beneath the top stats.

### Architectural Solution
The dashboard layout was refactored into a harmonized two-column grid (`lg:grid-cols-12`, with an 8-column main pane and a 4-column secondary pane), populated with rich, actionable, derived data modules:

```
+--------------------------------------------------------------------------------------------------+
| Top Stats HUD (8 Metric Cards: Total Props, Active, Available Beds, Occupancy %, Enquiries, etc)  |
+------------------------------------------------------+-------------------------------------------+
| LEFT / MAIN COLUMN (8 cols)                          | RIGHT / SECONDARY COLUMN (4 cols)         |
+------------------------------------------------------+-------------------------------------------+
| 1. Property Performance Overview (Revenue & Beds)    | 1. Student Enquiry & Visit Coordination   |
| 2. Property Management Summary (Direct CRUD Actions) | 2. Upcoming Visit Notifications           |
| 3. Room Inventory Breakdown (Single/Double/Occupancy)| 3. Recent Activity Real-Time Feed         |
| 4. Property Availability Matrix (Real-time vacancy)  | 4. COLIN Verification & Audit Status      |
| 5. Upcoming Visits (Mediated Inspection Schedule)   | 5. Account & Plan Monetisation Overview   |
| 6. Recent Property Updates (Live Log)                |                                           |
| 7. Listing Performance Analytics (Views & Enquiries) |                                           |
+------------------------------------------------------+-------------------------------------------+
```

### Visual & Technical Result
- Left column height is now dynamically balanced with the right column across standard viewports (`1280px` to `1920px+`).
- Zero cosmetic "filler widgets": every widget derives state directly from `PropertyContext` (`ownerProperties`, `rooms`, `visits`, `enquiries`).

---

## 3. Sidebar Redesign Implementation

### Scrolling & Layout Fixes
- **Sticky Desktop Navigation:** The desktop sidebar in `OwnerLayout.tsx` is fixed to the left viewport edge via `sticky top-16 h-[calc(100vh-4rem)] flex flex-col`.
- **Independent Nav Item Scrolling:** The navigation link cluster is wrapped in `flex-1 overflow-y-auto min-h-0 custom-scrollbar`, allowing sidebar items to scroll smoothly without affecting page content.
- **Natural Window Document Scrolling:** The main content wrapper `<main>` uses natural document scrolling without `overflow-hidden` traps or nested scroll containers.
- **Fixed Brand Header & Profile Footer:** The COLIN Host Portal logo remains permanently anchored at the top, and the owner profile/logout block remains pinned at the bottom.

### Distinct Menu Category Brand Colors
Each sidebar navigation category was assigned its dedicated, high-contrast, brand-aligned color accent conforming to the COLIN brand design system:

| Navigation Item | Accent Color Token | Hex Code | Icon & Active State Styling |
| :--- | :--- | :--- | :--- |
| **Dashboard** | Teal | `#16B8A6` | `text-teal-600 bg-teal-50/70 border-teal-500` |
| **Property Management** | Deep Navy | `#142B45` | `text-[#142B45] bg-[#142B45]/10 border-[#142B45]` |
| **Room Management** | Blue | `#2563EB` | `text-blue-600 bg-blue-50/70 border-blue-500` |
| **Student Management** | Warm Orange | `#F4B860` | `text-amber-600 bg-amber-50/70 border-amber-500` |
| **Visits & Bookings** | Teal | `#0D9488` | `text-teal-600 bg-teal-50/70 border-teal-500` |
| **COLIN Verification** | Emerald | `#10B981` | `text-emerald-600 bg-emerald-50/70 border-emerald-500` |
| **Growth & Promotions**| Orange | `#EA580C` | `text-orange-600 bg-orange-50/70 border-orange-500` |
| **Subscription** | Violet | `#8B5CF6` | `text-purple-600 bg-purple-50/70 border-purple-500` |
| **Analytics** | Indigo | `#6366F1` | `text-indigo-600 bg-indigo-50/70 border-indigo-500` |
| **Settings** | Slate | `#64748B` | `text-slate-600 bg-slate-100 border-slate-500` |

---

## 4. COLIN Student Coordination System Architecture

### Conceptual Paradigm
COLIN operates as a trusted intermediary between students and accommodation owners. Under this model, owners do not receive unfiltered student contact details, nor do students contact landlords directly.

### Data Model & Status Pipeline
All student visit requests follow 10 canonical statuses:

```mermaid
stateDiagram-v2
    [*] --> PENDING_COLIN_REVIEW: 1. Student reserves slot & pays ₹150 fee
    PENDING_COLIN_REVIEW --> AWAITING_OWNER_AVAILABILITY: Platform coordinator routes to Host
    AWAITING_OWNER_AVAILABILITY --> AWAITING_COLIN_CONFIRMATION: 2. Host submits availability
    AWAITING_COLIN_CONFIRMATION --> VISIT_CONFIRMED: 3. COLIN confirms slot & assigns Volunteer
    VISIT_CONFIRMED --> VISIT_COMPLETED_DECISION_PENDING: 4. Physical visit done; Volunteer certifies completion
    VISIT_COMPLETED_DECISION_PENDING --> STUDENT_ACCEPTED: 5a. Student accepts (within 12h)
    VISIT_COMPLETED_DECISION_PENDING --> STUDENT_REJECTED: 5b. Student rejects (within 12h)
    VISIT_COMPLETED_DECISION_PENDING --> DECISION_EXPIRED: 5c. 12-hour deadline lapses
    STUDENT_ACCEPTED --> [*]: ₹150 fee retained, room reserved
    STUDENT_REJECTED --> [*]: ₹82.50 refunded (55%), ₹67.50 retained
    DECISION_EXPIRED --> [*]: ₹150 fee forfeited, booking closed
```

### Information Visibility Matrix

| Field | Visible to Student? | Visible to Host / Owner? | Handled By |
| :--- | :---: | :---: | :--- |
| **Booking Reference** (`COLIN-VIS-2026-XXXX`) | Yes | Yes | Public platform reference |
| **Student Full Name** | Yes | Yes | Minimum identification |
| **Student Age** | Yes | Yes | Safety & PG policy check |
| **Student Phone / WhatsApp** | Yes (Own profile) | **STRICTLY SHIELDED (No)** | Security layer |
| **Student Personal Email** | Yes (Own profile) | **STRICTLY SHIELDED (No)** | Security layer |
| **Owner Personal Phone** | **STRICTLY SHIELDED (No)** | Yes (Own profile) | Security layer |
| **Owner Personal Email** | **STRICTLY SHIELDED (No)** | Yes (Own profile) | Security layer |
| **Assigned Student Ambassador** | Yes (Name, role, phone) | Yes (Name & role) | In-person visit guide |

---

## 5. Privacy Enforcement Audit

A strict code-level audit was conducted across all owner-facing views:
1. **`OwnerEnquiriesPage.tsx`:** Removed all student phone numbers and contact buttons. Replaced with `v.bookingReference`, `v.studentAge`, and the `Zero Direct Contact Policy` banner.
2. **`OwnerVisitsPage.tsx`:** Removed `{visit.studentPhone}`. Replaced with assigned COLIN ambassador details and platform booking reference.
3. **`VisitSlotModal.tsx`:** Student booking confirmation dialog shields owner direct phone/email and presents `Verified COLIN Ambassador` as the meeting escort.
4. **Automated Vitest Verification:** Test Case 3 (`Owner cannot access student contact information`) executes DOM queries asserting that phone numbers and email addresses are absent from the rendered DOM.

---

## 6. 4-Step Mediated Visit Workflow Implementation

### Step 1: Student Request & Pre-Payment
- Student selects a preferred inspection slot via `VisitSlotModal.tsx`.
- System creates a record with `status: 'PENDING_COLIN_REVIEW'`, generates a reference code (e.g., `COLIN-VIS-2026-0001`), and records `feePaid: 150.00`.
- Owner cannot yet schedule or accept this directly until platform coordinator review.

### Step 2: Owner Availability Proposal
- Owner accesses `OwnerEnquiriesPage.tsx` or `OwnerDashboardPage.tsx`.
- Owner opens the **Submit Host Availability** dialog.
- Owner can confirm requested slot, propose alternative time slot, add host notes, or decline.
- Action transitions status to `AWAITING_COLIN_CONFIRMATION`.

### Step 3: Platform Confirmation & Ambassador Assignment
- Platform coordinator pairs the request with a verified COLIN student ambassador (e.g., Kunal Singhania, SRCC Campus Lead).
- Action transitions status to `VISIT_CONFIRMED`.
- Ambassador details (name, badge, contact) are injected into the digital pass.

### Step 4: Physical Visit Execution & Volunteer Certification
- The ambassador physically escorts the student to the property.
- **Strict Role Authorization:** Only a verified ambassador or coordinator can mark the visit completed (`markVisitCompletedByVolunteer`).
- Attempting to mark completed as an `owner` or `student` is blocked with an authorization exception.
- Marking complete stamps `visitCompletedAt` and computes `decisionDeadline = visitCompletedAt + 12 hours`.

---

## 7. 12-Hour Decision System Architecture & Timer Implementation

### Mathematical & Temporal Precision
The 12-hour decision window is defined in `src/constants/booking.ts`:
- `DECISION_WINDOW_HOURS = 12`
- `DECISION_WINDOW_MS = 12 * 60 * 60 * 1000` (43,200,000 ms)

### Deterministic Persistence & Anti-Tamper
- `decisionDeadline` is calculated deterministically as `new Date(new Date(visitCompletedAt).getTime() + DECISION_WINDOW_MS).toISOString()`.
- Unmounting, refreshing, or switching browsers does not reset or alter the remaining time. Remaining duration is calculated on every frame from the persisted completion timestamp:
  $$\Delta t = \text{Date.now}() - \text{deadlineMs}$$
- Re-renders occur smoothly every 1,000 ms via an interval hook in `StudentVisitsPage.tsx` and `OwnerEnquiriesPage.tsx`.

### Student UI/UX Presentation
- Prominent gradient hero card displayed at the top of `StudentVisitsPage.tsx` with animated pulse indicator.
- Live ticking countdown HUD: `HHh MMm SSs remaining` along with a dynamic visual percentage bar (`% of window remaining`).
- Two action buttons:
  - **Accept Accommodation:** Confirms reservation, marks status `STUDENT_ACCEPTED`, retains full ₹150 fee.
  - **Reject Accommodation:** Opens rejection modal with reason selector, marks status `STUDENT_REJECTED`, initiates ₹82.50 refund.

---

## 8. Automated Reminder Notification Schedule Verification

The platform implements an automated reminder scheduler matching the 7 required milestones:

| Milestone Index | Trigger Point | Elapsed Offset | Messaging Strategy | Deduplication Key |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Immediately on completion | `0 ms` | "Your visit is complete. Please make your decision within 12 hours." | `immediately` |
| **2** | 3 hours post-visit | `10,800,000 ms` | "Reminder: Your accommodation decision is still pending." | `3h` |
| **3** | 6 hours post-visit (Halfway)| `21,600,000 ms` | "Half of your decision window has passed." | `6h` |
| **4** | 9 hours post-visit (3h left)| `32,400,000 ms` | "Important: Only 3 hours remain." | `9h` |
| **5** | 11 hours post-visit (1h left)| `39,600,000 ms` | "Final reminder: You have 1 hour remaining." | `11h` |
| **6** | 11 hours 45 mins (15m left)| `42,300,000 ms` | "Urgent: Accept or reject now to remain eligible for the 55% refund." | `11h45m` |
| **7** | 12 hours (Window expired) | `43,200,000 ms` | "Decision expired. Your booking fee is non-refundable." | `12h_expired` |

### Deduplication Guarantee
`checkAndExpireDecisions` in `PropertyContext.tsx` inspects `v.notificationsSent`. A notification is only appended if `!currentNotifications.some(n => n.milestone === milestone.id)`. Tested and verified in Test Case 17.

---

## 9. Financial Mechanics & Refund Calculation Verification

All financial calculations strictly align with the Phase 2 central policy constants:

$$\text{Slot Fee Paid} = ₹150.00$$

### Decision 1: Student Rejects within 12 Hours
$$\text{Refund Amount} = 55\% \times ₹150.00 = ₹82.50$$
$$\text{Retained Ambassador Allowance} = 45\% \times ₹150.00 = ₹67.50$$
- Result: ₹82.50 is immediately credited back (simulated payment gateway reversal).
- Record: `refundStatus = 'PROCESSED_SIMULATED'`, `refundCalculated = 82.50`.

### Decision 2: Student Accepts Property
$$\text{Refund Amount} = ₹0.00$$
$$\text{Retained Platform Fee} = ₹150.00$$
- Result: ₹150.00 is retained to cover coordination, verification, and platform overhead.
- Record: `refundStatus = 'RETAINED_ACCEPTED'`, `refundCalculated = 0`.

### Decision 3: 12-Hour Window Expires
$$\text{Refund Amount} = ₹0.00$$
$$\text{Forfeited Slot Fee} = ₹150.00$$
- Result: Zero refund permitted. Fee is fully forfeited.
- Record: `refundStatus = 'FORFEITED_FULL'`, `refundCalculated = 0`.

---

## 10. Cross-Portal State Synchronization Verification

State changes propagate bidirectionally between the Owner and Student portals:
1. **Unified Storage Keys:** Both `PropertyContext` and `StudentContext` read and write to `colin_student_visits`.
2. **Cross-Tab Storage Listener:** Both contexts attach `window.addEventListener('storage', handleStorageChange)`, instantly synchronizing visit records if modified across browser tabs or windows.
3. **Synchronous Evaluation:** State update functions calculate return values deterministically before queuing state dispatches, preventing race conditions.
4. **Cross-Portal Consistency Test:** Verified in Test Case 15 (`Owner and student dashboards show consistent booking status`).

---

## 11. Security Audit Findings

| Component / Vector | Vulnerability / Threat | Mitigation Implemented | Status |
| :--- | :--- | :--- | :---: |
| **Student PII Leakage** | Owner viewing student personal phone/email | Sanitized all owner views; replaced with booking ref + age | **PASSED** |
| **Owner Contact Disclosure** | Student bypassing platform to contact host | Shielded owner phone/email in modal passes | **PASSED** |
| **Unauthorized Tour Certification** | Host or student spoofing physical tour completion | Strict role authorization check (`volunteer`/`coordinator` only) | **PASSED** |
| **Duplicate Decision Submission** | Student accepting and then attempting to reject | Atomic status guard rejects subsequent calls | **PASSED** |
| **Timer Manipulation** | Client refreshing or clearing clock | Deterministic calculation from server/context timestamp | **PASSED** |
| **Retroactive Refund Claim** | Rejecting after 12 hours | Expiration checker immediately locks status to `DECISION_EXPIRED` | **PASSED** |

---

## 12. Automated Test Results (18/18 Mandatory Test Cases)

Test Suite: `src/test/phase3a_booking.test.tsx`  
Runner: Vitest v2.1.9 with `@testing-library/react`

| # | Test Scenario | Specification Covered | Result |
| :---: | :--- | :--- | :---: |
| **1** | Student creates booking request with `PENDING_COLIN_REVIEW` | Generates unique ref, stamps ₹150 fee | **PASSED** |
| **2** | Owner receives booking request in coordination pipeline | Appears in Owner Enquiry pipeline with metadata | **PASSED** |
| **3** | Owner cannot access student contact information | Phone, email, WhatsApp shielded from DOM | **PASSED** |
| **4** | Owner submits available time to COLIN | Transitions status to `AWAITING_COLIN_CONFIRMATION` | **PASSED** |
| **5** | COLIN confirms visit & assigns volunteer | Status becomes `VISIT_CONFIRMED`, guide assigned | **PASSED** |
| **6** | Volunteer marks visit completed | Transitions to `VISIT_COMPLETED_DECISION_PENDING` | **PASSED** |
| **7** | 12-hour countdown starts correctly | `deadlineMs - completedMs` equals exactly 43,200,000 ms | **PASSED** |
| **8** | Student accepts within 12 hours | Transitions to `STUDENT_ACCEPTED`, fee retained | **PASSED** |
| **9** | Student rejects within 12 hours | Transitions to `STUDENT_REJECTED`, reason saved | **PASSED** |
| **10**| Rejection calculates ₹82.50 refund (55%) | Exact mathematical calculation verified | **PASSED** |
| **11**| Expired decision calculates ₹150 non-refundable | `refundCalculated = 0`, `status = DECISION_EXPIRED` | **PASSED** |
| **12**| Page refresh does not reset the timer | Deterministic time derived from completion timestamp | **PASSED** |
| **13**| Duplicate decisions are rejected | Second decision returns `success: false` | **PASSED** |
| **14**| Unauthorized users cannot mark completed | Owner & student attempts rejected with 403 error | **PASSED** |
| **15**| Owner & student dashboards show consistent status| Cross-portal reference & status match | **PASSED** |
| **16**| Notifications generated at correct intervals | Milestones (0h, 3h, 6h, 9h, 11h, 11h45m) validated | **PASSED** |
| **17**| Duplicate notifications are prevented | Repeated cron cycles generate zero duplicate alerts | **PASSED** |
| **18**| Phase 2 booking functionality does not regress | Phase 2 refund logic and models preserved | **PASSED** |

### Complete Repository Test Summary
- `src/test/auth.test.tsx`: **5/5 PASSED**
- `src/test/navigation.test.tsx`: **4/4 PASSED**
- `src/test/properties.test.tsx`: **3/3 PASSED**
- `src/test/owner.test.tsx`: **19/19 PASSED**
- `src/test/student.test.tsx`: **35/35 PASSED**
- `src/test/phase3a_booking.test.tsx`: **18/18 PASSED**
- **TOTAL: 84 / 84 TESTS PASSED (100% SUCCESS RATE)**

---

## 13. Files Modified and Created

### Files Modified
1. `src/constants/booking.ts`: Added Phase 3A decision constants (`DECISION_WINDOW_HOURS`, `DECISION_WINDOW_MS`, `DECISION_REMINDER_SCHEDULE`).
2. `src/types/index.ts`: Added `MediatedBookingStatus`, `DecisionNotification`, `OwnerAvailabilityProposal`, and extended `VisitBooking`.
3. `src/context/PropertyContext.tsx`: Added mediated visit workflows, role authorization, 12h decision handler, automated reminder scheduler, and storage listeners.
4. `src/context/StudentContext.tsx`: Added `submitStudentDecision`, storage sync listener, and deterministic refund handlers.
5. `src/components/owner/OwnerLayout.tsx`: Redesigned desktop sidebar with sticky positioning, independent navigation scrolling, and brand-aligned category colors.
6. `src/pages/owner/OwnerDashboardPage.tsx`: Redesigned layout into a balanced 7-module left pane and 5-module right pane, eliminating dead lower-left whitespace.
7. `src/pages/owner/OwnerEnquiriesPage.tsx`: Completely replaced direct enquiry system with COLIN Student Coordination System; shielded student contact details.
8. `src/pages/owner/OwnerVisitsPage.tsx`: Integrated mediated statuses, booking references, and volunteer escort information.
9. `src/pages/student/StudentVisitsPage.tsx`: Implemented 12-Hour Decision Hero Card, ticking countdown HUD, and refund confirmation modals.
10. `src/pages/student/StudentDashboardPage.tsx`: Added pending decision action banner linking to the 12-hour decision screen.
11. `src/components/property/VisitSlotModal.tsx`: Updated slot booking generation with booking references and mediated status initialization.
12. `src/data/mockData.ts`: Enriched default visit records with booking references and ambassador metadata.

### Files Created
1. `src/test/phase3a_booking.test.tsx`: Comprehensive Vitest test suite covering all 18 mandatory test scenarios.
2. `PHASE_3A_ACCEPTANCE_REPORT.md`: This comprehensive acceptance and engineering report.

---

## 14. Explicit Implementation Status Table

| # | Requested Feature / Capability | Implementation Classification | Verification Details |
| :---: | :--- | :--- | :--- |
| **1** | Fix lower-left blank dashboard section | **Fully Implemented** | Redesigned into 7 left-column modules & 5 right-column modules |
| **2** | Stable, independently scrollable sidebar | **Fully Implemented** | `sticky top-16`, internal `overflow-y-auto`, natural document `<main>` |
| **3** | Distinct brand menu category colors | **Fully Implemented** | Teal, Deep Navy, Blue, Warm Orange, Emerald, Orange, Violet, Indigo, Slate |
| **4** | Replace direct enquiry with COLIN mediation | **Fully Implemented** | Zero direct communication; coordinator-mediated pipeline |
| **5** | Zero contact disclosure (PII shield) | **Fully Implemented** | Zero student phone/email to owners; zero owner phone/email to students |
| **6** | 4-step mediated visit workflow | **Fully Implemented** | Request $\to$ Owner Availability $\to$ COLIN Confirm $\to$ Volunteer Complete |
| **7** | Volunteer-only completion authorization | **Fully Implemented** | Only `volunteer` / `coordinator` roles can trigger 12h decision timer |
| **8** | 12-hour student decision system | **Fully Implemented** | Strict 12h deadline calculated from completion timestamp |
| **9** | 55% refund on rejection (₹82.50) | **Fully Implemented** | Exact ₹82.50 refund calculated and credited |
| **10**| 100% fee retention on accept (₹150.00) | **Fully Implemented** | ₹150 retained, ₹0 refunded, room reservation confirmed |
| **11**| Full fee forfeiture on expiry (₹150.00) | **Fully Implemented** | Non-refundable after 12h; status set to `DECISION_EXPIRED` |
| **12**| Deterministic timer across refreshes | **Fully Implemented** | Calculated from timestamp in state/storage; no timer reset on reload |
| **13**| Prevention of duplicate decisions | **Fully Implemented** | Rejects second attempt; atomic status check |
| **14**| Automated 7-interval reminder scheduler| **Fully Implemented** | Immediate, 3h, 6h, 9h, 11h, 11h45m, 12h evaluated with dedup |
| **15**| Cross-portal real-time synchronization | **Fully Implemented** | Synchronized state across `PropertyContext` & `StudentContext` |
| **16**| Production build without errors | **Fully Implemented** | `tsc && vite build` built in 5.51s with zero errors |
| **17**| Automated 18-case test suite | **Fully Implemented** | 18/18 tests passing in `phase3a_booking.test.tsx` |
| **18**| Phase 2 regression prevention | **Fully Implemented** | All 66 legacy tests passing without regressions |

---

## 15. Recommended Next Steps

1. **SMS / WhatsApp Gateway Webhook Integration:**
   - In production, bind the `DecisionNotification` milestones to WhatsApp Business Cloud API / Twilio SMS webhooks so reminders ping the student's actual device at 3h, 6h, 9h, 11h, and 11h45m.
2. **Ambassador Mobile Companion PWA:**
   - Package a lightweight PWA view specifically for campus student ambassadors (e.g. `/volunteer/visits/:id`) featuring QR code scan confirmation and on-site checklist verification.
3. **Escrow & Automated Refund Disbursement:**
   - Connect the simulated ₹82.50 refund reversal to Razorpay Route / Cashfree Split Settlement webhooks to automate instantaneous UPI account credits upon rejection.
