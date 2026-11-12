# COLIN — Recommended Screenshot Requirements for Final Academic Report

**Document ID:** COLIN-EVID-012  
**Target:** Academic B.Tech Capstone Project Documentation  
**Repository Branch:** `colin-prototype-completion`  

---

## 1. Overview

This document specifies the exact visual artifacts and recommended user interface screenshots required for the final B.Tech academic thesis and presentation defense of the COLIN platform.

The screenshots are organized into 5 functional categories covering the four application portals and security boundary enforcement.

---

## 2. Public Discovery Portal (`/`, `/properties`)

| Figure ID | Recommended Screenshot Title | Route / Trigger | Visual Evidence Elements to Capture |
|---|---|---|---|
| **FIG-PUB-01** | Landing Page & Verified Accommodation Banner | `/` | Hero section, branding logo, quick search bar, value proposition badges (50-point physical audit, 55% refund guarantee). |
| **FIG-PUB-02** | Multi-Facet Search & Filter Interface | `/explore` or `/properties` | Delhi University North Campus query, property type pills (Boys Hostel, Girls Hostel, Flat), price range sliders, and amenities check-grid. |
| **FIG-PUB-03** | Verified Property Listing Card Grid | `/properties?city=Delhi` | Responsive card layout, "COLIN Verified" badge, distance from campus (km), monthly rent, and cover photo display. |
| **FIG-PUB-04** | Property Details & 55% Refund Badge | `/properties/:id` | Full-width photo gallery, room occupancy options, house rules, masked owner contact details, and the mandatory "55% Refund Guarantee" badge. |
| **FIG-PUB-05** | Google Maps Platform Autocomplete | Search Bar Dropdown | Places autocomplete suggestions showing "Powered by Google" attribution badge (desktop and mobile viewports). |

---

## 3. Student Scholar Portal (`/student/*`, `/visits`)

| Figure ID | Recommended Screenshot Title | Route / Trigger | Visual Evidence Elements to Capture |
|---|---|---|---|
| **FIG-STU-01** | Student Dashboard & Profile Summary | `/student` | Personalized greeting ("Welcome back, Aarav Mehra"), quick navigation pills, active bookings counter, and verified student ID badge. |
| **FIG-STU-02** | Guided Visit Request Modal | Property Page $\to$ "Schedule Visit" | Time slot selection grid, coordinator escort explanation, and ₹150 visit fee summary breakdown. |
| **FIG-STU-03** | Simulated Payment Capture Dialog | Visit Request $\to$ "Proceed to Pay" | Synthetic payment modal, test payment disclaimer banner (`SIMULATED/TEST`), and "Confirm Slot Pass (₹150.00)" button. |
| **FIG-STU-04** | Active Visit Tracking & 12h Countdown Timer | `/visits` | Active booking card showing `DECISION_PENDING`, assigned coordinator snapshot, and live 12-hour decision deadline countdown clock. |
| **FIG-STU-05** | Student Decision Submission Modal | `/visits` $\to$ "Submit Decision" | Dual decision buttons ("Accept Accommodation" vs "Decline with 55% Refund"), refund calculation breakdown (₹82.50 refund to student wallet). |

---

## 4. Property Owner Portal (`/owner/*`)

| Figure ID | Recommended Screenshot Title | Route / Trigger | Visual Evidence Elements to Capture |
|---|---|---|---|
| **FIG-OWN-01** | Owner Operations Dashboard | `/owner` | Host portfolio metrics (Total Listings, Active Beds, Verification Status), subscription tier indicator (5 listing limit). |
| **FIG-OWN-02** | Property Creation Drawer & Form | `/owner/properties` $\to$ "Add New Property" | Multi-step property drawer: title, address, room types (Single/Double/Triple), and rent configuration inputs. |
| **FIG-OWN-03** | 8-Photo Evidence Upload Pipeline | Property Drawer $\to$ "Photos" | Upload zone enforcing 8-photo maximum, cover photo toggle, and WebP thumbnail previews. |
| **FIG-OWN-04** | Physical Verification Status & Audit Trail | `/owner/properties/:id/status` | Current status badge (`PENDING_VERIFICATION`), on-site inspection checklist progress, and coordinator remarks. |

---

## 5. Admin Control Centre (`/admin/*`)

| Figure ID | Recommended Screenshot Title | Route / Trigger | Visual Evidence Elements to Capture |
|---|---|---|---|
| **FIG-ADM-01** | Control Centre Secure Login | `/admin/login` | Dedicated administrative authentication interface with "Authenticate to Control Centre" button and CSRF indicator. |
| **FIG-ADM-02** | Property Verification Queue | `/admin/verification-queue` | Tabular list of pending properties, detailed inspection drawer showing uploaded photos, and "Approve Listing" / "Reject Listing" action buttons. |
| **FIG-ADM-03** | Field Visit Coordination & Dispatch | `/admin/visits` | Scheduled student visits, field concierge assignment dropdown, "Record Visit Completion" button, and manual "Process Expirations" trigger. |
| **FIG-ADM-04** | Financial Operations & IAS-1 Balanced Ledger | `/admin/finance` | Real-time general ledger summary cards: Total Debits, Total Credits, Zero-Sum Balance Indicator ($Debits - Credits = 0$), Platform Escrow Liability, and Retained Revenue. |

---

## 6. Security Boundaries & Guard Enforcement

| Figure ID | Recommended Screenshot Title | Route / Trigger | Visual Evidence Elements to Capture |
|---|---|---|---|
| **FIG-SEC-01** | Unauthenticated Admin Route Interception | Direct navigation to `/admin/dashboard` | Automatic interception and redirect to `/admin/login`. |
| **FIG-SEC-02** | Student Restricted from Owner Operations | Student navigating to `/owner` | Redirection or access denied banner preventing cross-role access. |
| **FIG-SEC-03** | Owner Restricted from Admin Coordination | Owner navigating to `/admin/visits` | Access restriction guard dialog enforcing strict role isolation. |
| **FIG-SEC-04** | 8-Photo Maximum Limit Rejection | Uploading 9th photo to listing | Modal dialog or toast alert: "Property already has maximum allowed 8 photos". |
