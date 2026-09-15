# Raspberry Pi cURL API Reference Guide

This guide contains the exact `curl` commands and request/response specifications for integrating edge devices (Raspberry Pi weighbridge scales, IP cameras, ALPR units, or Python daemons) with the Gluvok API.

---

## Table of Contents

1. [Authentication Architecture](#1-authentication-architecture)
   - [Option A: HTTP Basic Auth (Recommended)](#option-a-http-basic-auth-recommended)
   - [Option B: Form-Data Credentials](#option-b-form-data-credentials)
   - [Option C: Session Bearer Token](#option-c-session-bearer-token)
2. [1-Step Atomic Entry Creation & Image Upload](#2-1-step-atomic-entry-creation--image-upload)
3. [Device Management & Provisioning](#3-device-management--provisioning)
4. [Error Handling & Status Codes](#4-error-handling--status-codes)

---

## 1. Authentication Architecture

Edge hardware devices (Raspberry Pi scales and camera units) are provisioned directly in the database as accounts in the `users` table with `role = 'hardware'` and an assigned `center_id`. Hardware accounts are filtered out from human user management.

Edge devices authenticate directly using their assigned **`username` and `password`**.

### Option A: HTTP Basic Auth (Recommended)

Supply username and password via standard HTTP Basic Authentication. cURL handles this natively with the `-u` flag:

```bash
curl -X POST "https://gluvok.vercel.app/api/entries" \
  -u "device_center_1:hardware_password_123" \
  -F "detected_vehicle_number=MH12AB1234" \
  -F "weight=14250.5" \
  -F "file=@/path/to/vehicle_capture.jpg"
```

### Option B: Form-Data Credentials

Include `username` and `password` directly as form-data fields alongside entry metadata and files:

```bash
curl -X POST "https://gluvok.vercel.app/api/entries" \
  -F "username=device_center_1" \
  -F "password=hardware_password_123" \
  -F "detected_vehicle_number=MH12AB1234" \
  -F "weight=14250.5" \
  -F "file=@/path/to/vehicle_capture.jpg"
```

### Option C: Session Bearer Token

The device logs in once via `POST /api/auth/login` to obtain a session token, then provides it in the `Authorization` header:

```bash
# 1. Login
curl -X POST "https://gluvok.vercel.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "device_center_1", "password": "hardware_password_123"}'

# Response: { "token": "4f18d6a8b7924c13...", "user": { ... } }

# 2. Make authenticated API call
curl -X POST "https://gluvok.vercel.app/api/entries" \
  -H "Authorization: Bearer <token>" \
  -F "detected_vehicle_number=MH12AB1234" \
  -F "weight=14250.5" \
  -F "file=@/path/to/vehicle_capture.jpg"
```

---

## 2. 1-Step Atomic Entry Creation & Image Upload

`POST /api/entries` accepts `multipart/form-data`. The server validates the payload, uploads the attached image file to Supabase Storage, and inserts the entry with the generated public link in a single atomic transaction (with automatic compensating rollback if database insertion fails).

### Request Specification

- **Method**: `POST`
- **Path**: `/api/entries`
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `detected_vehicle_number` (string, required): Plate detected by camera (e.g. `MH12AB1234`), or `NO_PLATE_DETECTED`.
  - `weight` (number, required): Positive weighbridge scale measurement (e.g. `14250.5`).
  - `center_id` (integer, optional): Collection center ID. Defaults automatically to the hardware device's assigned `center_id`.
  - `file` or `files` (binary file, optional): JPEG/PNG/WebP camera snapshot.

### Example cURL Command

```bash
curl -X POST "https://gluvok.vercel.app/api/entries" \
  -u "device_center_1:hardware_password_123" \
  -F "detected_vehicle_number=MH12AB1234" \
  -F "weight=14250.5" \
  -F "file=@/path/to/vehicle_capture.jpg;type=image/jpeg"
```

### Response (`201 Created`)

```json
{
  "data": {
    "id": 42,
    "detected_vehicle_number": "MH12AB1234",
    "vehicle_number": "MH12AB1234",
    "weight": 14250.5,
    "source": "device",
    "created_by": 10,
    "approved_by": 10,
    "center_id": 1,
    "customer_id": null,
    "factory_id": 1,
    "status": "approved",
    "auto_approved": true,
    "images": [
      "https://your-supabase-project.supabase.co/storage/v1/object/public/gluvok/f_1/weighments/abc12345-1725210000.jpg"
    ],
    "created_at": "2026-09-15T09:45:00.000Z",
    "updated_at": "2026-09-15T09:45:00.000Z"
  }
}
```

> [!NOTE]
>
> - **Audit Trail (`created_by` & `approved_by`)**: The scale's hardware user ID is automatically assigned as `created_by`. If the center has `auto_approve: true` and a valid plate was detected, `approved_by` is set to the device and status is set to `approved`.
> - **Source Derivation**: `source: "device"` is derived automatically on the server from the creator's `role = 'hardware'`.
> - **Center Resolution**: If omitted, `center_id` is resolved automatically from the device's provisioned collection center.

---

## 3. Device Management & Provisioning

Edge devices are managed directly in the database `users` table:

```sql
-- Provision a new hardware device account bound to Center 1
INSERT INTO users (factory_id, username, password_hash, role, center_id)
VALUES (1, 'device_center_1', encode(sha256('hardware_password_123'::bytea), 'hex'), 'hardware', 1);

-- Move a device to another collection center
UPDATE users SET center_id = 2 WHERE username = 'device_center_1' AND role = 'hardware';

-- Deactivate a device immediately
UPDATE users SET deleted_at = NOW() WHERE username = 'device_center_1';
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = 'device_center_1');

-- Reactivate a device
UPDATE users SET deleted_at = NULL WHERE username = 'device_center_1';
```

---

## 4. Error Handling & Status Codes

| Status Code             | Reason                                                         | Resolution                                                                        |
| :---------------------- | :------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| `401 Unauthorized`      | Missing credentials or invalid session token                   | Provide valid HTTP Basic Auth or login via `POST /api/auth/login`.                |
| `403 Forbidden`         | Invalid username or password, or device is deactivated         | Verify credentials and check that `deleted_at IS NULL` on the device user record. |
| `415 Unsupported Media` | Request content-type is not `multipart/form-data`              | Send payload as `multipart/form-data` using `curl -F`.                            |
| `400 Bad Request`       | Validation failure (invalid plate format, non-positive weight) | Fix payload formatting per error response.                                        |
| `500 Server Error`      | Database or unexpected server error                            | Retry with exponential backoff.                                                   |
