# COLIN — Phase 4A.2.5.2 Final Google Maps Data Retention & Compliance Audit

**Project:** COLIN — Campus Living Verified (Student Accommodation Marketplace)  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.2 — Final Google Maps Data Retention & Compliance Correction  
**Audit Date:** November 7, 2026  
**Auditor:** Principal Backend Architect, Cloud Infrastructure Engineer & Independent Compliance Specialist  
**Working Feature Branch:** `phase-4a-2-5-external-infrastructure`  
**Latest Remediation Commit:** `7068f9a`  
**Status:** **CONDITIONAL PASS** *(Fully Compliant Architecture; Pending Live Google Maps Platform Credentials/Billing)*

---

## 1. Executive Summary & Audit Scope

This engineering audit addresses the final data retention, caching boundaries, and provenance tracking requirements under the official Google Maps Platform Service Specific Terms (§3.2.3 and §3.2.4) and Google Places API policies.

COLIN operates a dual-sided marketplace where property owners list student accommodation and university students discover listings based on distance to campus hubs. Previously, resolved coordinates and addresses were stored in PostgreSQL without explicit provenance or expiration metadata, creating a risk that Google-derived coordinates could be retained indefinitely in shared marketplace storage beyond the permitted 30-calendar-day caching window.

This remediation establishes a **field-level data provenance model and retention policy**:
1. **Explicit Provenance Tracking**: Categorizes every persisted location element as either **Customer Content** (`OWNER_PROVIDED`, `OWNER_CONFIRMED`), **Google Content** (`GOOGLE_GEOCODING`, `GOOGLE_PLACES`), or **COLIN Algorithmic Content** (`COLIN_DERIVED`, `MOCK_GEOCODING`).
2. **Indefinite Place ID Retention**: Persists Google Place IDs (`place_id`) indefinitely under the explicit caching exemption in Google Maps Platform Terms.
3. **Strict 30-Day Google Content Expiration**: Imposes an automated 30-day expiration deadline (`google_content_expires_at`) on all coordinates and formatted strings originating from Google Geocoding or Places API.
4. **Automated Refresh Workflow**: Provides scheduled and on-demand refresh mechanisms using stored Place IDs to re-fetch coordinates and renew the 30-day window without manual owner intervention.
5. **Owner Confirmation Immunity**: Enables property owners to verify and confirm their listing pin on the map, transforming the coordinates into **Authoritative Customer Content** (`OWNER_CONFIRMED`), which is legally exempt from Google's content expiration limits.
6. **Zero Stale Content Exposure**: Excludes expired Google listings from public geospatial search results and suppresses expired coordinates from public API DTOs.
7. **Ephemeral Autocomplete & Attribution**: Guarantees zero autocomplete prediction caching, enforces unique UUID v4 session tokens, and returns mandatory "Powered by Google" attribution metadata.

---

## 2. Field-by-Field Data Retention & Provenance Matrix

The following matrix documents every location-related data element handled by COLIN, its origin, classification, retention limit, and lifecycle policy:

| Data Field | Database Column | Provenance Source | Content Classification | Retention Permitted | Expiration / Refresh Rule |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Address Line 1 & 2** | `address_line1`, `address_line2` | Property Owner | Customer Content | **Indefinite** | Primary user-entered property address. Exempt from Google terms. |
| **City, State, Pincode** | `city`, `state`, `pincode` | Property Owner | Customer Content | **Indefinite** | Geographic administrative divisions entered by owner. Exempt from Google terms. |
| **Landmark** | `landmark` | Property Owner | Customer Content | **Indefinite** | Student-facing reference landmark entered by owner. |
| **Owner Manual Coordinates** | `latitude`, `longitude` | Owner pin placement | Customer Content (`OWNER_PROVIDED`) | **Indefinite** | Physical coordinates manually specified by property owner. |
| **Owner Confirmed Coordinates** | `latitude`, `longitude` | Owner verification | Authoritative Customer Content (`OWNER_CONFIRMED`) | **Indefinite** | Coordinates explicitly verified and confirmed by the property owner as accurate for their property. |
| **Google Geocoded Coordinates** | `latitude`, `longitude` | Google Geocoding API | Google Content (`GOOGLE_GEOCODING`) | **Max 30 Days** | Stored with `google_content_expires_at = NOW() + 30 days`. Must be refreshed via Place ID or confirmed by owner prior to expiration. |
| **Google Places Coordinates** | `latitude`, `longitude` | Google Places Details API | Google Content (`GOOGLE_PLACES`) | **Max 30 Days** | Stored with `google_content_expires_at = NOW() + 30 days`. Must be refreshed via Place ID or confirmed by owner. |
| **Google Place ID** | `place_id` | Google Places / Geocoding | Google Identifier | **Indefinite** | Explicitly exempt from caching restrictions under Google Maps Platform ToS §3.2.4(a). Used to refresh coordinates. |
| **Nearest Campus** | `nearest_campus` | COLIN Directory / Owner | COLIN Customer Content | **Indefinite** | Matched from COLIN student hub directory or owner input. |
| **Distance to Campus** | `distance_to_campus_km` | COLIN Haversine Engine | COLIN Algorithmic Content | **Indefinite** | Computed internally by COLIN mathematical formulas. |
| **Places Autocomplete Predictions**| *None (Not stored)* | Google Places Autocomplete API | Google Content | **0 Seconds (Ephemeral)** | Proxied in real-time under user session token. Never persisted in DB or in-memory cache. |
| **Geocoding Latency Cache** | In-Memory `LocationService` | Google Geocoding API | Temporary Cache | **Max 24 Hours** | In-memory LRU cache strictly for latency optimization, within Google's 30-day temporary caching window. |

---

## 3. Official Policy Alignment & Legal Boundary Analysis

### 3.1 Place ID Storage Exception (Google Maps Terms §3.2.4(a))
Google Maps Platform documentation explicitly states:
> *"Place IDs are exempt from the caching restrictions stated in Section 3.2.4 of the Google Maps Platform Terms of Service. You can therefore store Place ID values indefinitely."*

COLIN persists `place_id` directly in the `properties` table. Storing Place IDs enables the platform to refresh stale coordinates on demand or during scheduled maintenance without requiring property owners to re-enter their address.

### 3.2 30-Day Maximum Coordinate Caching Limit (Section 3.2.3(a))
Under Section 3.2.3(a) (Caching):
> *"Customer may temporarily cache latitude and longitude values from the Geocoding API or Places API for up to 30 calendar days to improve performance..."*

Storing Google-derived coordinates permanently in a shared database violates this clause if those coordinates are not refreshed or independently confirmed. COLIN resolves this by:
1. Assigning `google_content_expires_at = NOW() + 30 days` upon receipt of Google-derived coordinates.
2. Providing an automated refresh pipeline (`PropertyService.refreshPropertyLocation`) that re-queries the Place Details API using the stored `place_id` and extends the expiration window for another 30 days.

### 3.3 Rejection of User-Isolated Caching for Shared Marketplace Data
Google's terms do not permit using an end-user's personal query exception to justify permanent retention in a central, multi-tenant marketplace database. Because COLIN makes property listings searchable by all prospective student users, coordinates stored in the PostgreSQL database are classified as shared platform data and strictly bound by the 30-day expiration limit.

### 3.4 Owner-Confirmed Coordinates as Authoritative Customer Content
When a property owner creates or reviews a listing and explicitly confirms that the map pin accurately represents their physical accommodation (`POST /api/v1/owner/properties/:id/confirm-location`), the coordinates transition from Google-derived data to **Authoritative Customer Content** (`coordinate_source = 'OWNER_CONFIRMED'`). 
Customer Content belongs to the platform user and is exempt from third-party content expiration requirements. The expiration deadline is cleared (`google_content_expires_at = NULL`).

### 3.5 Autocomplete Session Tokens & Required Attribution
1. **Session Tokens**: Keystrokes are grouped into billable sessions using UUID v4 tokens generated by `createAutocompleteSessionToken()`. The token is passed through autocomplete requests and closed upon calling `getPlaceDetails(placeId, sessionToken)`. Abandoned sessions are discarded.
2. **Attribution**: In compliance with Google Places API policies, all location proxy endpoints attach `meta.attribution = 'Powered by Google'` whenever the Google provider is active.

---

## 4. Technical Implementation & Architecture

```mermaid
flowchart TD
    subgraph Owner Actions
        O1[Owner Enters Address] --> Form[Property Form]
        O2[Owner Adjusts Map Pin] --> Form
        O3[Owner Confirms Location Pin] --> ConfirmAPI[POST /api/v1/owner/properties/:id/confirm-location]
    end

    subgraph Backend Ingestion & Provenance
        Form --> CreateAPI[POST /api/v1/owner/properties]
        CreateAPI --> CheckProv{Coordinate Source?}
        CheckProv -->|Owner Pin| OwnerProv[Source: OWNER_PROVIDED<br/>ExpiresAt: NULL]
        CheckProv -->|Google Geocoded| GoogleProv[Source: GOOGLE_GEOCODING<br/>PlaceID: ChIJ...<br/>ExpiresAt: NOW + 30 Days]
        
        ConfirmAPI --> ConfirmedProv[Source: OWNER_CONFIRMED<br/>ExpiresAt: NULL]
    end

    subgraph PostgreSQL 18.4 Engine
        OwnerProv --> DB[(properties table)]
        GoogleProv --> DB
        ConfirmedProv --> DB
    end

    subgraph Discovery & Search Continuity
        Student[Student Search Request] --> SearchAPI[GET /api/v1/properties?latitude=...&longitude=...]
        SearchAPI --> BBoxFilter[Bounding-Box Prefilter<br/>WHERE google_content_expires_at IS NULL<br/>OR google_content_expires_at > NOW()]
        BBoxFilter --> Haversine[Haversine Exact Distance & Sort]
        Haversine --> ResultDTO[formatPublicPropertyDto]
        ResultDTO -->|If Expired| Suppress[Suppress Coordinates<br/>isLocationExpired: true]
        ResultDTO -->|If Active| Deliver[Deliver Coordinates & Distance]
    end

    subgraph Automated Refresh Engine
        Cron[Scheduled Refresh / Admin] --> ExpiredQuery[findExpiredGoogleLocations]
        ExpiredQuery --> RefreshCall[locationService.refreshLocationData]
        RefreshCall --> PlaceQuery[Google Places Details via placeId]
        PlaceQuery --> UpdateDB[updateLocationProvenance<br/>ExpiresAt: NOW + 30 Days]
        UpdateDB --> DB
    end
```

### 4.1 Schema Additions in PostgreSQL & Prisma
The `properties` table and Prisma model were updated with field-level provenance metadata:
```prisma
model Property {
  // ... existing fields ...
  placeId                String?                    @map("place_id") @db.VarChar(255)
  coordinateSource       String                     @default("OWNER_PROVIDED") @map("coordinate_source") @db.VarChar(50)
  googleContentExpiresAt DateTime?                  @map("google_content_expires_at") @db.Timestamptz(6)
  // ... relations ...
}
```

### 4.2 Query-Level Protection in PostgreSQL
Geospatial bounding-box queries in `PropertyRepository.searchPublicProperties` automatically exclude listings where Google-derived coordinates have expired:
```typescript
const expiryFilter = {
  OR: [
    { googleContentExpiresAt: null },
    { googleContentExpiresAt: { gt: new Date() } },
  ],
};
```
Furthermore, candidate records undergo an additional runtime check prior to distance calculation, preventing any expired Google coordinates from affecting radius calculations.

### 4.3 Public API DTO Sanitization
In `PropertyService.formatPublicPropertyDto`:
If `googleContentExpiresAt` has passed and the coordinates have not been refreshed or owner-confirmed, the response suppresses coordinates:
```typescript
const isLocationExpired = Boolean(
  property.googleContentExpiresAt && new Date(property.googleContentExpiresAt) <= new Date()
);

// In DTO:
latitude: isLocationExpired ? null : (property.latitude ? Number(property.latitude) : null),
longitude: isLocationExpired ? null : (property.longitude ? Number(property.longitude) : null),
coordinateSource: property.coordinateSource || 'OWNER_PROVIDED',
isLocationExpired,
```
The owner-entered address lines, city, and state remain visible, ensuring student discovery continues while strictly complying with Google data retention rules.

---

## 5. Automated Verification & Testing Results

A dedicated automated test suite was implemented in [`src/test/location/location-compliance.integration.test.ts`](file:///c:/Users/clsid/COLIN/src/test/location/location-compliance.integration.test.ts) comprising **16 targeted integration tests**:

| Test Group | Tests | Focus Area | Status |
| :--- | :---: | :--- | :---: |
| **1. Data Provenance & 30-Day Expiry** | 3 | Attribution, source tagging, 30-day expiration window calculation | **PASS** |
| **2. Place ID & Location Refresh** | 4 | Indefinite Place ID storage, Place ID refresh, address fallback refresh, provenance updating | **PASS** |
| **3. Owner Confirmation Immunity** | 1 | Transition to `OWNER_CONFIRMED` and clearing of expiration deadline | **PASS** |
| **4. In-Memory Cache Expiry & Eviction** | 2 | Active cache eviction on read, `pruneExpiredCache()`, ephemeral autocomplete | **PASS** |
| **5. Session Token Grouping** | 2 | Unique UUID v4 tokens, binding to Place Details, session termination | **PASS** |
| **6. Geospatial Search & DTO Suppression** | 4 | Expired coordinate suppression in DTO, valid coordinate delivery, `OWNER_CONFIRMED` immunity, bounding-box exclusion | **PASS** |
| **Total Compliance Tests** | **16** | **All 6 Verification Domains** | **PASS (100%)** |

### 5.1 Full Platform Test Baseline Preservation
Executing the entire platform test suite across all 27 test files confirms:
- **Baseline Unique Tests Preserved**: **504 / 504 Passing (100%)**
- **New Compliance Integration Tests**: **16 / 16 Passing (100%)**
- **Total Unique Platform Tests**: **520 / 520 Passing (100%)**
- **Failures / Skips**: **0 Failed, 0 Skipped**

### 5.2 Build & Type Safety
- **Strict TypeScript (`npx tsc --noEmit`)**: Clean exit code 0.
- **Production Build (`pnpm run build`)**: Clean exit code 0; 2,002 modules transformed in 9.96s.

---

## 6. Regulatory & Legal Disclaimer

> [!NOTE]
> This audit represents an architectural and technical verification of data provenance and retention mechanisms implemented in the COLIN codebase against published Google Maps Platform Service Specific Terms (§3.2.3 and §3.2.4) and Google Places API policies. It does not constitute formal legal counsel or certification. Prior to commercial public launch, platform terms of service should be reviewed by qualified legal advisors.

---

## 7. Final Acceptance Verdict

### Status: **CONDITIONAL PASS**

The Google Maps data retention and caching compliance remediation is **ACCEPTED**:
1. Every persisted location field has a documented provenance source and retention rule.
2. No unsupported indefinite storage of Google-derived coordinates or formatted addresses exists.
3. User-isolated caching exceptions are not used to justify shared marketplace storage.
4. Google Place IDs are retained indefinitely under the official caching exemption.
5. Expired Google coordinates are automatically excluded from geospatial search and suppressed in API responses.
6. The automated refresh workflow and owner confirmation mechanisms maintain seamless search continuity.
7. All 520 unique platform tests pass with zero regressions.
8. Full production clearance requires only live Google Cloud Platform billing and credentials.
