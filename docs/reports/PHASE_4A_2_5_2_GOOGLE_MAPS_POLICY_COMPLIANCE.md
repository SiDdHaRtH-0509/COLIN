# COLIN — Phase 4A.2.5.2 Google Maps Platform Policy Compliance Report
## Caching, Data Retention, Session Tokens, and Attribution Audit

**Project:** COLIN — Campus Living Verified (Student Accommodation Marketplace)  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.2 — Google Maps & Geolocation Infrastructure (Remediation B)  
**Execution Date:** November 7, 2026  
**Auditor:** Principal Backend Engineer, Google Maps Platform Compliance Engineer, Application Security Engineer  
**Feature Branch:** `phase-4a-2-5-external-infrastructure`  

---

## 1. Executive Summary

This compliance audit evaluates COLIN's geolocation architecture against the official **Google Maps Platform Terms of Service** (specifically Section 3.2.3 "Restrictions Against Data Export or In-App Caching", Section 3.2.4 "Specific Terms for Google Maps Content", and Places API Policies).

COLIN's location services must strictly adhere to Google's data retention, caching limitations, session-token usage, and attribution guidelines. This report details the applicable rules, identifies areas where the initial implementation required refinement, documents the corrective actions taken, and outlines the compliant caching and session architecture.

---

## 2. Applicable Google Maps Platform Policies & Legal Baseline

### 2.1 Section 3.2.3(a) — General Restriction on Pre-fetching and Caching
Under Section 3.2.3(a) of the Google Maps Platform Terms of Service:
* **General Rule**: Customers may **not** pre-fetch, cache, index, or store any Content outside of the Service, except under the explicit limited exceptions granted in the agreement.
* **Limited Latency Exception**: A developer may temporarily store limited amounts of Content solely to improve the performance of their application due to network latency, provided that:
  1. The storage is **temporary** (strictly no longer than **30 consecutive calendar days**).
  2. The storage is secure and does not allow unauthorized access or distribution.
  3. The storage is not used to create a substitute product or avoid billable requests.

### 2.2 Category-by-Category Data Retention Rules

| Content Category | Permitted Retention | Policy Reference | COLIN Implementation |
| :--- | :--- | :--- | :--- |
| **Place IDs** | **Indefinite (Permanent)** | Section 3.2.4(a) (Place ID Exemption) | Stored permanently on property listing records in PostgreSQL to reference places. |
| **Coordinates (Lat/Lng)** | **Permanent on Listings** | Section 3.2.3(a) & 3.2.4(a) | Stored as `Decimal(10, 7)` in `properties` table to locate accommodations. |
| **Formatted Addresses** | **Permanent on Listings** | Section 3.2.3(a) | Stored as `address_line1`, `city`, `state`, `pincode` in `properties` table. |
| **Geocoding API Responses** | **Up to 30 Calendar Days** | Section 3.2.3(a) (Latency Exception) | Cached in-memory with a strict **24-hour TTL** (1 day $\ll$ 30 days). |
| **Reverse Geocoding** | **Up to 30 Calendar Days** | Section 3.2.3(a) (Latency Exception) | Cached in-memory with a strict **24-hour TTL**. |
| **Autocomplete Predictions** | **Ephemeral (No Cross-Session Caching)** | Places API Terms & Section 3.2.3(a) | **Zero caching**. Passed directly within active user session. |
| **Full Place Details** | **Ephemeral** | Places API Terms & Section 3.2.3(a) | Not cached in-memory. Only resolved lat/lng and placeId are persisted to the listing. |

---

## 3. Audit Findings & Remediations Applied

### 3.1 Initial Implementation Findings
1. **Autocomplete Cache Violation**:
   - *Finding*: The initial version of `LocationService` maintained an in-memory `autocompleteCache` with a 10-minute TTL keyed by query string.
   - *Policy Violation*: Google Maps Platform terms strictly forbid caching autocomplete predictions across user sessions or building an offline suggestion index. Keystrokes are meant to be live autocomplete events tied to a single user interaction cycle.
   - *Remediation Applied*: Removed `autocompleteCache` completely from `LocationService`. Autocomplete requests now execute live or mock-passthrough without cross-session retention.
2. **Place Details Object Cache**:
   - *Finding*: `LocationService` cached full `PlaceDetails` response objects for 24 hours.
   - *Policy Violation*: Places API prohibits caching rich place details (phone numbers, ratings, operating hours, full metadata) beyond temporary latency needs.
   - *Remediation Applied*: Removed `placeDetailsCache`. When an owner selects a place from autocomplete, only the `place_id`, `name`, `formatted_address`, and `coordinates` required for the listing are extracted and persisted to PostgreSQL.
3. **Geocoding Latency Cache (Compliant)**:
   - *Finding*: Forward and reverse geocoding responses are cached for 24 hours in `geocodeCache` and `reverseGeocodeCache`.
   - *Policy Status*: **COMPLIANT**. Google permits temporary caching up to 30 calendar days to mitigate network latency. 24 hours represents a conservative 3.3% of the allowable limit.

---

## 4. Places API Session Token Architecture

To minimize API consumption costs and comply with Places API billing requirements, COLIN implements Google's recommended **Session Token** pattern:

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student / Owner
    participant Client as Frontend Input Component
    participant Backend as COLIN /api/v1/location
    participant Google as Google Places API (New)

    Student->>Client: Clicks search & types first letter
    Note over Client: Client generates sessionToken = UUID v4
    Client->>Backend: GET /autocomplete?query=Hau&sessionToken=UUID
    Backend->>Google: Autocomplete Query (sessionToken=UUID)
    Google-->>Backend: Predictions list
    Backend-->>Client: Predictions list

    Student->>Client: Types additional letters "Hauz Khas"
    Client->>Backend: GET /autocomplete?query=Hauz+Khas&sessionToken=UUID
    Backend->>Google: Autocomplete Query (same sessionToken=UUID)
    Google-->>Backend: Predictions list
    Backend-->>Client: Predictions list

    Student->>Client: Clicks "IIT Delhi, Hauz Khas"
    Client->>Backend: GET /places/ChIJ...&sessionToken=UUID
    Backend->>Google: Place Details (same sessionToken=UUID)
    Google-->>Backend: Place Details & Coordinates
    Note over Google: Session concludes; billed as 1 Autocomplete Session
    Note over Client: Discards sessionToken
    Backend-->>Client: Coordinates & Address
```

* **Session Token Generation**: Created client-side via `crypto.randomUUID()` when the user focuses and starts typing.
* **Token Reuse**: Passed across debounced keystrokes within that single selection workflow.
* **Termination**: Sent with the final Place Details request, ending the session. Subsequent interactions generate a new session token.

---

## 5. Attribution & Brand Display Requirements

Google Maps Platform requires that any display of Google Places or Geocoding data that is not superimposed directly onto an interactive Google Map must display proper attribution:
1. **Autocomplete Dropdowns**: Must display the official "Powered by Google" badge at the footer of the dropdown results if powered by live Google APIs.
2. **Interactive Maps**: Maps rendered with Maps JavaScript API automatically display the Google watermark and terms link; these must not be hidden with CSS (`visibility: hidden`, `display: none`, or zero opacity).
3. **Mock Mode Exemption**: When operating in development/testing with `GEOLOCATION_PROVIDER="mock"`, no Google attribution is displayed since no Google data is accessed.

---

## 6. Compliance Sign-Off

| Compliance Area | Policy Requirement | Verification |
| :--- | :--- | :---: |
| **Geocoding Retention** | $\le 30$ days for latency | **PASS** (24h in-memory TTL) |
| **Place ID Retention** | Allowed indefinitely | **PASS** (Stored in PostgreSQL) |
| **Autocomplete Caching** | Prohibited across sessions | **PASS** (Cache removed; ephemeral) |
| **Place Details Caching** | Prohibited for full objects | **PASS** (Cache removed) |
| **Session Tokens** | 1 token per autocomplete flow | **PASS** (UUID lifecycle enforced) |
| **Attribution** | "Powered by Google" displayed | **PASS** (Documented & integrated) |
| **Secret Protection** | Key never in responses or logs | **PASS** (Redaction filters active) |

**Conclusion:** COLIN's geolocation and caching architecture is fully compliant with the Google Maps Platform Terms of Service and API-specific usage policies.
