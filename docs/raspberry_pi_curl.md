# Raspberry Pi cURL API Reference Guide

This guide contains the exact `curl` commands and request/response specifications for integrating edge devices (Raspberry Pi weighbridge scales, IP cameras, ALPR units, or Python daemons) with the Gluvok API.

---

## Table of Contents

1. [Authentication Architecture](#1-authentication-architecture)
   - [Option A: Session Token Auth (Recommended)](#option-a-session-token-auth-recommended)
   - [Option B: Direct Device Header Auth](#option-b-direct-device-header-auth)
2. [Step 1: Upload Images (Storage API)](#2-step-1-upload-images-storage-api)
3. [Step 2: Create Device Entry](#3-step-2-create-device-entry)
4. [Alternative: Direct Base64 Image Payload](#4-alternative-direct-base64-image-payload)
5. [Device Management & Deactivation](#5-device-management--deactivation)
6. [Error Handling & Status Codes](#6-error-handling--status-codes)

---

## 1. Authentication Architecture

Edge hardware devices (Raspberry Pi scales and camera units) are provisioned directly in the database as accounts in the `users` table with `role = 'hardware'` and an assigned `center_id`. Hardware accounts are filtered out from the human user management UI.

Gluvok supports two authentication methods for edge devices (both completely cookie-free):

### Option A: Session Token Auth (Recommended)

The device logs in once using its username and password (or pre-shared key) to receive a database-backed session token, then passes that token as a `Bearer` token in the `Authorization` header.

#### 1. Device Login

```bash
curl -X POST "https://gluvok.vercel.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "device_center_1",
    "password": "hardware_password_123"
  }'
```

Response (`200 OK`):

```json
{
  "success": true,
  "user": {
    "id": 10,
    "username": "device_center_1",
    "role": "hardware",
    "center_id": 1,
    "factory_id": 1
  },
  "token": "4f18d6a8b7924c13a52efc193248e3a2b7193dc5872a441e8c56d7829aef0123",
  "session_id": 42
}
```

The device stores the returned `token` in local memory or an environment file.

#### 2. Authenticated API Calls

```bash
curl -X POST "https://gluvok.vercel.app/api/entries" \
  -H "Authorization: Bearer 4f18d6a8b7924c13a52efc193248e3a2b7193dc5872a441e8c56d7829aef0123" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

### Option B: Direct Device Header Auth

Alternatively, edge devices can supply their user ID and key per-request using custom headers:

| Header Name    | Description                                                  |
| :------------- | :----------------------------------------------------------- |
| `x-device-id`  | Integer ID of the hardware user record in the `users` table. |
| `x-device-key` | Raw secret key matching the hardware user's password hash.   |

The server validates the credentials against the `users` table and updates `updated_at` as a heartbeat.

---

## 2. Step 1: Upload Images (Storage API)

Upload camera captures to Supabase Storage before creating the entry. The endpoint accepts `multipart/form-data`.

### With Bearer Token (Recommended)

```bash
curl -X POST "https://gluvok.vercel.app/api/storage/upload" \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/vehicle_capture.jpg;type=image/jpeg"
```

### With Device Headers

```bash
curl -X POST "https://gluvok.vercel.app/api/storage/upload" \
  -H "x-device-id: 10" \
  -H "x-device-key: hardware_password_123" \
  -F "file=@/path/to/vehicle_capture.jpg;type=image/jpeg"
```

### Response (`201 Created`)

```json
{
  "data": {
    "urls": [
      "https://your-supabase-project.supabase.co/storage/v1/object/public/gluvok/f_1/c_1/weighments/abc12345-1725210000.jpg"
    ]
  }
}
```

---

## 3. Step 2: Create Device Entry

Submit the vehicle weighment event with weight, detected plate number, and uploaded image URLs. Collection center ID is automatically resolved from the device's assigned center.

### cURL Request

```bash
curl -X POST "https://gluvok.vercel.app/api/entries" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "detected_vehicle_number": "MH12AB1234",
    "weight": 14250.5,
    "images": [
      "https://your-supabase-project.supabase.co/storage/v1/object/public/gluvok/f_1/c_1/weighments/abc12345-1725210000.jpg"
    ]
  }'
```

> [!NOTE]
>
> - **Audit Trail (`created_by` & `approved_by`)**: The scale's hardware user ID is automatically set as `created_by`. If the center has `auto_approve: true` and a valid plate was detected, `approved_by` is also populated with the hardware user ID and status is set to `approved`.
> - **Source Derivation**: `source: "device"` is derived automatically on the server from the creator's `role = 'hardware'`, eliminating tampering.
> - **Center Resolution**: The server reads the hardware user's assigned `center_id` and records it as an immutable snapshot on `entries.center_id`.

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
    "created_by_name": "device_center_1",
    "approved_by_name": "device_center_1",
    "center_id": 1,
    "customer_id": null,
    "factory_id": 1,
    "status": "approved",
    "auto_approved": true,
    "images": [
      "https://your-supabase-project.supabase.co/storage/v1/object/public/gluvok/f_1/c_1/weighments/abc12345-1725210000.jpg"
    ],
    "created_at": "2026-09-01T17:45:00.000Z",
    "updated_at": "2026-09-01T17:45:00.000Z"
  }
}
```

---

## 4. Alternative: Direct Base64 Image Payload

You can pass Base64 Data URI strings directly inside the `images` array in `POST /api/entries`:

```bash
curl -X POST "https://gluvok.vercel.app/api/entries" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "detected_vehicle_number": "MH12AB1234",
    "weight": 14250.5,
    "images": [
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/..."
    ]
  }'
```

---

## 5. Device Management & Deactivation

Edge devices are managed directly in the database `users` table:

```sql
-- Provision a new hardware device account bound to Center 1
INSERT INTO users (factory_id, username, password_hash, role, center_id)
VALUES (1, 'device_center_1', encode(sha256('hardware_password_123'::bytea), 'hex'), 'hardware', 1);

-- Move a device to another collection center
UPDATE users SET center_id = 2 WHERE id = 10 AND role = 'hardware';

-- Deactivate a device immediately (revokes all active sessions instantly)
UPDATE users SET deleted_at = NOW() WHERE id = 10;
DELETE FROM sessions WHERE user_id = 10;

-- Reactivate a device
UPDATE users SET deleted_at = NULL WHERE id = 10;
```

---

## 6. Error Handling & Status Codes

| Status Code        | Reason                                                             | Resolution                                                                         |
| :----------------- | :----------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| `401 Unauthorized` | Missing or expired session token, or missing credentials           | Re-authenticate via `POST /api/auth/login` to obtain a new session token.          |
| `403 Forbidden`    | Invalid credentials, hardware account disabled, or revoked session | Verify credentials and ensure `deleted_at IS NULL` on the user record in database. |
| `400 Bad Request`  | Validation error (e.g. invalid plate format, non-positive weight)  | Check error details in response JSON and fix payload formatting.                   |
| `500 Server Error` | Database or unexpected server exception                            | Retry with exponential backoff.                                                    |
