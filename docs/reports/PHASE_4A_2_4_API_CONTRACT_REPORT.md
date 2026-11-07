# COLIN — Phase 4A.2.4 REST API Contract Specification Report

**Phase:** Phase 4A.2.4 — Core Marketplace Domain & Business API Implementation  
**Project:** COLIN — Campus Living Verified  
**Runtime:** Node.js 20+ / Express 4.19 / TypeScript  
**Standard:** RESTful JSON / RFC-7807 Error Envelope  
**Status:** COMPLETE & VERIFIED  

---

## 1. Overview & Global Standards

All Phase 4A.2.4 APIs adhere to consistent standards:
- Base path: `/api/v1`
- Content negotiation: `application/json` (or `multipart/form-data` for binary uploads)
- Standard Response Envelope:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": { "timestamp": "ISO-8601", "requestId": "uuid" }
  }
  ```
- Error Response Envelope (RFC-7807 compatible):
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_FAILED | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT",
      "message": "Human-readable description",
      "details": [ ... ]
    }
  }
  ```

---

## 2. API Endpoints Catalog

### 2.1 Student Domain (`/api/v1/students`)
| Endpoint | Method | Auth Required | Description |
|:---|:---:|:---:|:---|
| `/profile` | `GET` | Bearer (Student) | Get student profile, preferences, and completion percentage. |
| `/profile` | `PUT` | Bearer (Student) | Update academic details and housing preferences. |

### 2.2 Owner Domain (`/api/v1/owners`)
| Endpoint | Method | Auth Required | Description |
|:---|:---:|:---:|:---|
| `/profile` | `GET` | Bearer (Owner) | Get owner profile and KYC verification flags. |
| `/profile` | `PUT` | Bearer (Owner) | Update owner business and banking details. |
| `/dashboard` | `GET` | Bearer (Owner) | Get real-time property, room, and bed metrics. |

### 2.3 Owner Property Domain (`/api/v1/owner/properties`)
| Endpoint | Method | Auth Required | Description |
|:---|:---:|:---:|:---|
| `/` | `GET` | Bearer (Owner) | List all properties owned by the authenticated user. |
| `/` | `POST` | Bearer (Owner) | Create a new property with rooms, amenities, and rules. |
| `/:propertyId` | `GET` | Bearer (Owner) | Get complete details for an owned property. |
| `/:propertyId` | `PUT` | Bearer (Owner) | Update property details and capacity. |
| `/:propertyId` | `DELETE` | Bearer (Owner) | Delete or deactivate a property listing. |
| `/:propertyId/photos` | `GET` | Bearer (Owner) | List photos for an owned property. |
| `/:propertyId/photos` | `POST` | Bearer (Owner) | Upload / add a photo (max 8 enforced). |
| `/:propertyId/photos/reorder` | `PUT` | Bearer (Owner) | Reorder photos atomically. |
| `/:propertyId/photos/:photoId` | `DELETE` | Bearer (Owner) | Delete a photo. |

### 2.4 Public Property Discovery (`/api/v1/properties`)
| Endpoint | Method | Auth Required | Description |
|:---|:---:|:---:|:---|
| `/` | `GET` | None (Public) | Search verified properties with filters, sorting, pagination. |
| `/:slug` | `GET` | None (Public) | Get verified property details by URL slug (owner contact masked). |
| `/filters/meta` | `GET` | None (Public) | Get filter dropdown options (cities, property types, price range). |

### 2.5 Admin Property Moderation (`/api/v1/admin/properties`)
| Endpoint | Method | Auth Required | Description |
|:---|:---:|:---:|:---|
| `/pending` | `GET` | Bearer (Admin) | List unverified properties awaiting review. |
| `/:propertyId/inspection` | `GET` | Bearer (Admin) | Retrieve full inspection dossier for property moderation. |
| `/:propertyId/approve` | `POST` | Bearer (Admin) | Approve property for public marketplace. |
| `/:propertyId/reject` | `POST` | Bearer (Admin) | Reject property with mandatory reason. |
| `/:propertyId/suspend` | `POST` | Bearer (Admin) | Suspend active listing with mandatory reason. |
| `/:propertyId/restore` | `POST` | Bearer (Admin) | Restore suspended listing to verified status. |

---

## 3. Status Codes Mapping

- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created (property, photo).
- `400 Bad Request`: Malformed syntax or invalid image magic bytes.
- `401 Unauthorized`: Missing or invalid JWT access token.
- `403 Forbidden`: Insufficient role or attempt to access another user's resource (IDOR).
- `404 Not Found`: Target resource does not exist.
- `409 Conflict`: Unique constraint violation (duplicate slug or active hold).
- `422 Unprocessable Entity`: Zod schema validation failed or business rule violation (e.g., >8 photos).
- `500 Internal Server Error`: Unhandled server exception.

---

## 4. Verification Verdict

All endpoint routes, schemas, headers, status codes, and payload formats have been verified through 25 live integration tests and 15 adversarial tests.

**Verdict: FULL PASS**
