# Academic Project Report: Database Entity-Relationship (ER) Model

## 1. Complete Entity-Relationship Diagram

The following Mermaid diagram details the entity relationships, cardinalities, primary keys (`PK`), and foreign keys (`FK`) governing the COLIN relational database:

```mermaid
erDiagram
    User ||--o| UserProfile : "has profile"
    User ||--o| StudentProfile : "specializes as"
    User ||--o| OwnerProfile : "specializes as"
    User ||--o{ UserSession : "establishes"

    StudentProfile ||--o{ BookingRequest : "initiates"
    StudentProfile ||--o{ StudentSavedProperty : "saves"
    StudentProfile ||--o{ StudentPreference : "defines"

    OwnerProfile ||--o{ Property : "owns and lists"
    OwnerProfile ||--o{ OwnerKycDocument : "submits"
    OwnerProfile ||--o{ OwnerBankAccount : "registers"
    OwnerProfile ||--o| OwnerSubscription : "maintains"

    Property ||--o{ PropertyPhoto : "contains (max 8)"
    Property ||--o{ PropertyAmenity : "provides"
    Property ||--o{ PropertyRule : "enforces"
    Property ||--o{ PropertyVerificationAudit : "audited via"
    Property ||--o{ Room : "configured into"
    Property ||--o{ BookingRequest : "receives"

    Room ||--o{ Bed : "contains"
    Bed ||--o{ BedReservation : "reserved in"

    BookingRequest ||--o| VisitCoordination : "coordinated via"
    BookingRequest ||--o| VisitDecision : "settled by"
    BookingRequest ||--o{ VisitReminder : "triggers"
    BookingRequest ||--o{ BookingStatusHistory : "tracked in"
    BookingRequest ||--o{ FinancialPayment : "paid via"
    BookingRequest ||--o{ LedgerTransaction : "generates"

    LedgerTransaction ||--|{ LedgerEntry : "contains entries"
    LedgerAccount ||--o{ LedgerEntry : "categorizes"

    User {
        string id PK
        string email UK
        string passwordHash
        string role
        string status
        datetime createdAt
    }

    StudentProfile {
        string id PK
        string userId FK
        string collegeName
        string course
        string batchYear
        string verificationStatus
    }

    OwnerProfile {
        string id PK
        string userId FK
        string businessName
        string panNumber
        string verificationStatus
        string tier
    }

    Property {
        string id PK
        string ownerId FK
        string title
        string addressLine1
        string city
        string state
        string pincode
        float latitude
        float longitude
        string propertyType
        string genderPolicy
        string verificationStatus
        decimal minRent
    }

    PropertyPhoto {
        string id PK
        string propertyId FK
        string photoCategory
        string s3Key
        string cdnUrl
        boolean isCover
        int sortOrder
    }

    Room {
        string id PK
        string propertyId FK
        string roomNumber
        string roomType
        decimal monthlyRent
        int totalBeds
    }

    Bed {
        string id PK
        string roomId FK
        string bedNumber
        string status
    }

    BookingRequest {
        string id PK
        string studentId FK
        string propertyId FK
        string roomId FK
        string status
        string paymentStatus
        datetime visitDate
        datetime visitCompletedAt
        datetime decisionDeadline
        string studentDecision
    }

    VisitDecision {
        string id PK
        string bookingId FK, UK
        string decision
        decimal refundAmount
        decimal retainedAmount
        datetime decidedAt
    }

    LedgerAccount {
        string id PK
        string accountNumber UK
        string name
        string category
        string accountType
        string currency
    }

    LedgerTransaction {
        string id PK
        string transactionNumber UK
        string transactionType
        string status
        string bookingId FK
        datetime postedAt
    }

    LedgerEntry {
        string id PK
        string transactionId FK
        string accountId FK
        string entryType
        decimal amount
    }
```

---

## 2. Cardinality Rules & Relational Invariants

| Relationship | Cardinality | Business Rule / Relational Constraint |
|---|---|---|
| `User` $\leftrightarrow$ `StudentProfile` | $1:0..1$ | A registered user account may optionally have a single student profile. |
| `User` $\leftrightarrow$ `OwnerProfile` | $1:0..1$ | A registered user account may optionally have a single owner profile. |
| `OwnerProfile` $\leftrightarrow$ `Property` | $1:N$ | An owner may list multiple properties, subject to subscription tier limits (e.g., standard tier maximum: 5). |
| `Property` $\leftrightarrow$ `PropertyPhoto` | $1:0..8$ | A property listing strictly enforces a ceiling of 8 photos across distinct architectural angles. |
| `Property` $\leftrightarrow$ `Room` | $1:N$ | A property consists of one or more rooms with specific room types (`SINGLE`, `DOUBLE`, etc.). |
| `Room` $\leftrightarrow$ `Bed` | $1:N$ | A room contains individual beds tracked for occupancy (`AVAILABLE`, `RESERVED`, `OCCUPIED`). |
| `StudentProfile` $\leftrightarrow$ `BookingRequest` | $1:N$ | A student can initiate multiple guided visit requests over time. |
| `Property` $\leftrightarrow$ `BookingRequest` | $1:N$ | A property receives booking requests from prospective student tenants. |
| `BookingRequest` $\leftrightarrow$ `VisitDecision` | $1:0..1$ | Each completed visit booking possesses at most one post-visit settlement decision. |
| `BookingRequest` $\leftrightarrow$ `LedgerTransaction` | $1:N$ | A visit booking spawns multiple balanced ledger transactions (Collection, Acceptance/Rejection Settlement). |
| `LedgerTransaction` $\leftrightarrow$ `LedgerEntry` | $1:2..N$ | A ledger transaction must contain at least 2 entries (one debit, one credit), with sum of debits equaling sum of credits. |
| `LedgerAccount` $\leftrightarrow$ `LedgerEntry` | $1:N$ | A chart-of-accounts entry categorizes multiple balanced entry lines across journal transactions. |
