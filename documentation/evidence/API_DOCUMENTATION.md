# COLIN — RESTful API Documentation & Route Specifications

**Document ID:** COLIN-EVID-005  
**Target:** Academic B.Tech Capstone Project Documentation  
**Repository Branch:** `colin-prototype-completion`  
**API Prefix:** `/api/v1`  
**Router Source Files:** [src/server/api/v1/routes/](file:///C:/Users/clsid/COLIN/src/server/api/v1/routes/)  

---

## 1. API Architecture & Standards

All endpoints adhere to REST conventions:
- **Base URI:** `http://localhost:3001/api/v1`
- **Request Format:** JSON (`Content-Type: application/json`) or Multipart Form Data (`multipart/form-data` for file uploads).
- **Standard Success Response Envelope:**
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": {
      "requestId": "9a38f36c-9c71-4be6-8e54-47f98dcb7125",
      "timestamp": "2026-11-12T18:35:00.000Z"
    }
  }
  ```
- **Standard Error Response Envelope:**
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid request payload format.",
      "details": [ ... ]
    },
    "meta": {
      "requestId": "9a38f36c-9c71-4be6-8e54-47f98dcb7125",
      "timestamp": "2026-11-12T18:35:00.000Z"
    }
  }
  ```

---

## 2. Authentication & Session Endpoints (`/api/v1/auth`)

### 2.1 Register User
- **Route:** `POST /api/v1/auth/register`
- **Auth Required:** No (Public)
- **Request Body:**
  ```json
  {
    "email": "student@campus.edu",
    "password": "SecurePassword123!",
    "role": "STUDENT",
    "firstName": "Aarav",
    "lastName": "Mehra",
    "phone": "+919876543210"
  }
  ```
- **Response:** `201 Created` with created user ID and session context.

### 2.2 Login User
- **Route:** `POST /api/v1/auth/login`
- **Auth Required:** No (Public)
- **Request Body:**
  ```json
  {
    "email": "student@campus.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Response:** `200 OK` returning `accessToken` (JWT) and setting HTTP-only `refreshToken` cookie.

### 2.3 Get Current Authenticated Context
- **Route:** `GET /api/v1/auth/me`
- **Auth Required:** Yes (`Bearer <token>`)
- **Response:** `200 OK` with user role, verified profile, and permissions.

---

## 3. Public Property Discovery (`/api/v1/properties`)

### 3.1 Search Accommodations
- **Route:** `GET /api/v1/properties`
- **Auth Required:** No (Public)
- **Query Parameters:**
  - `city` (string, e.g. `Delhi`)
  - `propertyType` (enum: `BOYS_HOSTEL`, `GIRLS_HOSTEL`, `CO_ED_HOSTEL`, `STUDENT_FLAT`)
  - `minPrice` / `maxPrice` (number)
  - `limit` (number, default `20`)
  - `page` (number, default `1`)
- **Response:** `200 OK` with verified property cards, amenities, and price ranges. Unverified listings are omitted.

### 3.2 Property Details
- **Route:** `GET /api/v1/properties/:idOrSlug`
- **Auth Required:** No (Public)
- **Behavior:** Returns gallery images, room inventory, safety checklist, and 55% refund guarantee badge. Host direct phone numbers are masked.

---

## 4. Property Owner Operations (`/api/v1/owner/properties`)

### 4.1 Create Property Listing
- **Route:** `POST /api/v1/owner/properties`
- **Auth Required:** Yes (`requireRole([OWNER])`)
- **Request Body:**
  ```json
  {
    "name": "Hudson Green Student Residency",
    "propertyType": "BOYS_HOSTEL",
    "genderPolicy": "BOYS_ONLY",
    "addressLine1": "14/2 Hudson Lane, GTB Nagar",
    "city": "Delhi",
    "pincode": "110009"
  }
  ```
- **Response:** `201 Created` with listing in `DRAFT` status.

### 4.2 Upload Property Photo
- **Route:** `POST /api/v1/owner/properties/:propertyId/photos`
- **Auth Required:** Yes (`requireRole([OWNER])`)
- **Format:** `multipart/form-data` (Field: `photo`)
- **Constraint:** Strictly rejects upload if property already has 8 photos.

### 4.3 Submit for Verification
- **Route:** `POST /api/v1/owner/properties/:propertyId/submit`
- **Auth Required:** Yes (`requireRole([OWNER])`)
- **Constraint:** Requires at least 1 cover photo and complete room configuration. Transitions property to `PENDING_VERIFICATION`.

---

## 5. Student Booking & Guided Visits (`/api/v1/bookings`)

### 5.1 Request Guided Visit
- **Route:** `POST /api/v1/bookings`
- **Auth Required:** Yes (`requireRole([STUDENT])`)
- **Request Body:**
  ```json
  {
    "propertyId": "a5830d31-14df-4521-aa5e-11f65b4dff52",
    "bedId": "bed-uuid-optional"
  }
  ```
- **Response:** `201 Created` with booking in `PAYMENT_PENDING` (Fee: ₹150.00).

### 5.2 Process Simulated Visit Pass Payment
- **Route:** `POST /api/v1/bookings/:bookingId/pay`
- **Auth Required:** Yes (`requireRole([STUDENT])`)
- **Request Body:**
  ```json
  {
    "idempotencyKey": "idemp-pay-1731427200000",
    "simulateFailure": false
  }
  ```
- **Response:** `200 OK` transitioning booking to `FEE_PAID`. Posts balanced ₹150.00 double-entry transaction to escrow.

### 5.3 Submit Student Decision (12h Window)
- **Route:** `POST /api/v1/bookings/:bookingId/decision`
- **Auth Required:** Yes (`requireRole([STUDENT])`)
- **Constraint:** Rejected if `decision_deadline` has passed or state is not `DECISION_PENDING`.
- **Request Body (Accept):**
  ```json
  {
    "decision": "ACCEPTED"
  }
  ```
- **Request Body (Reject with Refund):**
  ```json
  {
    "decision": "REJECTED",
    "rejectionReason": "Room dimensions smaller than expected."
  }
  ```
- **Response:** `200 OK` updating status to `ACCEPTED` or `REJECTED_REFUND_DUE` with balanced ledger settlement.

---

## 6. Admin Control Centre Operations (`/api/v1/admin/*`)

### 6.1 Schedule Visit Slot
- **Route:** `POST /api/v1/admin/bookings/:bookingId/schedule`
- **Auth Required:** Yes (`requireAdmin()`)
- **Request Body:**
  ```json
  {
    "scheduledStartTime": "2026-11-15T10:00:00.000Z",
    "scheduledEndTime": "2026-11-15T11:00:00.000Z",
    "volunteerId": "volunteer-uuid-optional"
  }
  ```
- **Response:** `200 OK` updating booking to `VISIT_SCHEDULED`.

### 6.2 Record Visit Completion
- **Route:** `POST /api/v1/admin/bookings/:bookingId/complete-visit`
- **Auth Required:** Yes (`requireAdmin()`)
- **Behavior:** Records `visit_completed_at = CLOCK_TIMESTAMP()`, calculates `decision_deadline = visit_completed_at + 12 hours`, and transitions booking to `DECISION_PENDING`.

### 6.3 Process Overdue Expirations (Operational Trigger)
- **Route:** `POST /api/v1/admin/bookings/process-expirations`
- **Auth Required:** Yes (`requireAdmin()`)
- **Behavior:** Manual invocation of the expiry sweep to forfeit overdue bookings.

### 6.4 Financial Operations Dashboard Summary
- **Route:** `GET /api/v1/admin/bookings/finance-summary`
- **Auth Required:** Yes (`requireAdmin()`)
- **Response:** `200 OK` with balance totals:
  ```json
  {
    "totalDebits": "1500.00",
    "totalCredits": "1500.00",
    "isBalanced": true,
    "escrowLiability": "450.00",
    "retainedRevenue": "825.00",
    "refundsPayable": "225.00"
  }
  ```
