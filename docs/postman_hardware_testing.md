# Hardware API Testing Guide (cURL & Postman Import)

This guide provides exact `curl` commands to test the hardware authentication flow and post weighbridge entries by mocking an edge IoT device (e.g., Raspberry Pi weighbridge scale with an ALPR camera).

> [!TIP]
> **How to use these in Postman**:
>
> 1. In Postman, click **Import** in the top-left corner (or press `Cmd + O` / `Ctrl + O`).
> 2. Paste any of the `curl` commands below into the input box.
> 3. Postman automatically configures the HTTP method, URL, headers, authentication, and multipart form-data body for you.

---

## 1. Test Credentials & Prerequisites

Make sure the local server is running and seeded with default data:

```bash
pnpm run dev
```

Default credentials provisioned by `pnpm seed` / `pnpm seed:test`:

| Role         | Username | Password      | Purpose                                |
| :----------- | :------- | :------------ | :------------------------------------- |
| **Hardware** | `pi1`    | `hardware123` | Edge Weighbridge Scale 1 (Device Mock) |
| **Hardware** | `pi2`    | `hardware123` | Edge Weighbridge Scale 2 (Device Mock) |
| **Admin**    | `admin1` | `admin123`    | Factory Administrator (Verification)   |

Default Collection Center ID: `1`

---

## 2. Flow 1: Device Authentication / Login Flow

Authenticates the edge hardware device and returns a database-backed session token.

### 2.1 cURL Request

```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "pi1",
    "password": "hardware123"
  }'
```

### 2.2 Expected Response (`200 OK`)

```json
{
  "success": true,
  "user": {
    "id": 10,
    "username": "pi1",
    "name": "Raspberry Pi Scale 1",
    "role": "hardware",
    "factory_id": 1,
    "factory_name": "Default Factory"
  },
  "token": "4f18d6a8b7924c13...",
  "session_id": 4
}
```

---

## 3. Flow 2: Posting an Entry (Mocking Hardware)

Edge hardware scales and cameras post weighment entries directly using **HTTP Basic Auth** (`-u "username:password"`):

```bash
curl -X POST "http://localhost:3000/api/entries" \
  -u "pi1:hardware123" \
  -F "center_id=1" \
  -F "detected_vehicle_number=MH12AB1234" \
  -F "weight=18540.5"
```

With an attached camera image file:

```bash
curl -X POST "http://localhost:3000/api/entries" \
  -u "pi1:hardware123" \
  -F "center_id=1" \
  -F "detected_vehicle_number=MH12AB1234" \
  -F "weight=18540.5" \
  -F "file=@/path/to/vehicle.jpg;type=image/jpeg"
```

---

### 3.1 Expected Response (`201 Created`)

```json
{
  "data": {
    "id": 42,
    "detected_vehicle_number": "MH12AB1234",
    "vehicle_number": "MH12AB1234",
    "weight": 18540.5,
    "center_id": 1,
    "customer_id": null,
    "factory_id": 1,
    "created_by": 10,
    "approved_by": 10,
    "status": "approved",
    "auto_approved": true,
    "images": [],
    "source": "device",
    "created_at": "2026-09-16T15:30:00.000Z",
    "updated_at": "2026-09-16T15:30:00.000Z"
  }
}
```

> [!NOTE]
>
> - `source: "device"` is automatically inferred by the backend because the creator user has `role = 'hardware'`.
> - If the target center has `auto_approve: true` and a valid plate was detected, `status` becomes `"approved"` and `auto_approved` is set to `true`.

---

## 4. Flow 3: Fallback Variant — "NO_PLATE_DETECTED"

When the camera's OCR algorithm cannot read the plate, the hardware sends `NO_PLATE_DETECTED`. The system accepts the entry but forces it to `status = 'pending'` for human review.

```bash
curl -X POST "http://localhost:3000/api/entries" \
  -u "pi1:hardware123" \
  -F "center_id=1" \
  -F "detected_vehicle_number=NO_PLATE_DETECTED" \
  -F "weight=12400"
```

### Expected Response (`201 Created`)

```json
{
  "data": {
    "id": 43,
    "detected_vehicle_number": "NO_PLATE_DETECTED",
    "vehicle_number": "NO_PLATE_DETECTED",
    "weight": 12400,
    "center_id": 1,
    "status": "pending",
    "auto_approved": false,
    "source": "device"
  }
}
```

---

## 5. Flow 4: Verifying Ingested Entries (Admin Flow)

> [!NOTE]
> Accounts with `role = 'hardware'` are restricted to `entries:create = true` only. To inspect or list entries via API, query with an administrative account.

### Step 1: Admin Login

```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin1",
    "password": "admin123"
  }'
```

### Step 2: Query Device Ingested Entries

```bash
curl -X GET "http://localhost:3000/api/entries?source=device" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

### Step 3: Query a Specific Entry by ID

```bash
curl -X GET "http://localhost:3000/api/entries/42" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

---

## 6. Flow 5: Negative & Validation Test Cases

Test server guardrails by running these commands:

### 6.1 Invalid Device Password (`403 Forbidden`)

```bash
curl -i -X POST "http://localhost:3000/api/entries" \
  -u "pi1:wrongpassword" \
  -F "center_id=1" \
  -F "detected_vehicle_number=MH12AB1234" \
  -F "weight=18540.5"
```

_Expected_: `HTTP 403 Forbidden` with `{"error": "Invalid device credentials"}`

---

### 6.2 Wrong Media Type / Raw JSON (`415 Unsupported Media Type`)

```bash
curl -i -X POST "http://localhost:3000/api/entries" \
  -u "pi1:hardware123" \
  -H "Content-Type: application/json" \
  -d '{
    "center_id": 1,
    "detected_vehicle_number": "MH12AB1234",
    "weight": 18540.5
  }'
```

_Expected_: `HTTP 415 Unsupported Media Type` with `{"error": "POST /api/entries requires multipart/form-data"}`

---

### 6.3 Invalid Indian Vehicle Plate (`400 Bad Request`)

```bash
curl -i -X POST "http://localhost:3000/api/entries" \
  -u "pi1:hardware123" \
  -F "center_id=1" \
  -F "detected_vehicle_number=INVALID_PLATE" \
  -F "weight=18540.5"
```

_Expected_: `HTTP 400 Bad Request` with `{"error": "Invalid Indian vehicle registration plate format"}`

---

### 6.4 Non-Positive Weight (`400 Bad Request`)

```bash
curl -i -X POST "http://localhost:3000/api/entries" \
  -u "pi1:hardware123" \
  -F "center_id=1" \
  -F "detected_vehicle_number=MH12AB1234" \
  -F "weight=-50"
```

_Expected_: `HTTP 400 Bad Request` with `{"error": "Weight must be greater than 0"}`

---

### 6.5 Missing Center ID (`400 Bad Request`)

```bash
curl -i -X POST "http://localhost:3000/api/entries" \
  -u "pi1:hardware123" \
  -F "detected_vehicle_number=MH12AB1234" \
  -F "weight=18540.5"
```

_Expected_: `HTTP 400 Bad Request` with `{"error": "Selected collection center not found or deactivated"}`
