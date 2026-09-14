# Raspberry Pi cURL API Reference Guide

This guide contains the exact `curl` commands and request/response specifications for integrating edge devices (Raspberry Pi weighbridge scales, IP cameras, ALPR units, or Python daemons) with the Gluvok API.

---

## Table of Contents

1. [Architecture & Header Authentication](#1-architecture--header-authentication)
2. [Step 1: Upload Images (Storage API)](#2-step-1-upload-images-storage-api)
3. [Step 2: Create Device Entry](#3-step-2-create-device-entry)
4. [Alternative: Direct Base64 Image Payload](#4-alternative-direct-base64-image-payload)
5. [Device Management & Deactivation](#5-device-management--deactivation)
6. [Error Handling & Status Codes](#6-error-handling--status-codes)

---

## 1. Architecture & Header Authentication

Gluvok uses a stateless, header-authenticated model for IoT edge devices. Edge devices **do not** require user login, JWT tokens, cookie jars, or refresh token loops.

Each request must include the device ID and secret raw key in custom headers:

| Header Name    | Description                                                 |
| :------------- | :---------------------------------------------------------- |
| `x-device-id`  | Integer primary key of the device from the `devices` table. |
| `x-device-key` | Raw secret pre-shared key (e.g. `hardware123`).             |

### Security & Heartbeat

- The server computes `SHA-256(x-device-key)` and performs constant-time equality comparison (`crypto.timingSafeEqual`) against the stored `hashed_key` in the `devices` table.
- Upon successful authentication, the server automatically updates the device's `last_seen_at = NOW()` heartbeat timestamp.
- If a device is deactivated (`deleted_at IS NOT NULL`), requests are immediately rejected with `403 Forbidden`.

---

## 2. Step 1: Upload Images (Storage API)

Upload camera captures to Supabase Storage before creating the entry. The endpoint accepts `multipart/form-data` and supports edge device headers.

### Single Image Upload (`file`)

```bash
curl -X POST "https://gluvok.vercel.app/api/storage/upload" \
  -H "x-device-id: 1" \
  -H "x-device-key: hardware123" \
  -F "file=@/path/to/vehicle_capture.jpg;type=image/jpeg"
```

### Multiple Images Upload (`files`)

```bash
curl -X POST "https://gluvok.vercel.app/api/storage/upload" \
  -H "x-device-id: 1" \
  -H "x-device-key: hardware123" \
  -F "files=@/path/to/front_plate.jpg;type=image/jpeg" \
  -F "files=@/path/to/side_view.jpg;type=image/jpeg"
```

### Response (`201 Created`)

```json
{
  "data": {
    "urls": [
      "https://your-supabase-project.supabase.co/storage/v1/object/public/gluvok/f_1/c_1/weighments/abc12345-1725210000.jpg",
      "https://your-supabase-project.supabase.co/storage/v1/object/public/gluvok/f_1/c_1/weighments/def67890-1725210001.jpg"
    ]
  }
}
```

---

## 3. Step 2: Create Device Entry

Submit the vehicle weighment event with weight, detected plate number, and uploaded image URLs. Collection center ID is automatically resolved from the device's assigned center (or can be passed optionally).

### cURL Request

```bash
curl -X POST "https://gluvok.vercel.app/api/entries" \
  -H "x-device-id: 1" \
  -H "x-device-key: hardware123" \
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
> - **Center Resolution & Point-in-Time Snapshot**: The server reads the device's assigned `center_id` from the database and records it as an immutable snapshot on `entries.center_id`. If the scale is moved in the future, past entries retain their original center.
> - **Auto-Approval**: If the collection center has `auto_approve: true` and a valid vehicle plate was detected, the entry is automatically marked `approved` with `auto_approved: true`.
> - **Operator Tracking (Approach A)**: For automated device entries, `user_id` is initially `null` and `device_id` is populated. If an operator later edits the plate or assigns a customer, `user_id` is updated to the operator's account.

### Request Fields Specification

| Field                     | Type    | Required | Description                                                           |
| :------------------------ | :------ | :------- | :-------------------------------------------------------------------- |
| `detected_vehicle_number` | String  | **Yes**  | Raw OCR/ANPR text recognized by the camera (or `"NO_PLATE_DETECTED"`) |
| `weight`                  | Number  | **Yes**  | Positive numeric weight (kg/tons)                                     |
| `center_id`               | Integer | No       | Optional. Defaults to the device's assigned `center_id` in database.  |
| `images`                  | Array   | No       | Array of uploaded image URLs or Base64 data URIs                      |

### Response (`201 Created`)

```json
{
  "data": {
    "id": 42,
    "detected_vehicle_number": "MH12AB1234",
    "vehicle_number": "MH12AB1234",
    "weight": 14250.5,
    "source": "device",
    "device_id": 1,
    "device_name": "Weighbridge Camera 1",
    "user_id": null,
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

You can pass Base64 Data URI strings directly inside the `images` array in `POST /api/entries`. The server decodes and persists them to object storage automatically:

```bash
curl -X POST "https://gluvok.vercel.app/api/entries" \
  -H "x-device-id: 1" \
  -H "x-device-key: hardware123" \
  -H "Content-Type: application/json" \
  -d '{
    "detected_vehicle_number": "MH12AB1234",
    "weight": 14250.5,
    "images": [
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/..."
    ]
  }'
```

---

## 5. Device Management & Deactivation

Edge devices are managed centrally in the database `devices` table with their assigned collection center:

```sql
-- Provision a new device bound to a center
INSERT INTO devices (name, hashed_key, center_id)
VALUES ('South Express Scale', encode(sha256('your_secure_device_key'::bytea), 'hex'), 1);

-- Move a device to another collection center (past entries remain linked to original center)
UPDATE devices SET center_id = 2 WHERE id = 1;

-- Deactivate a device immediately (DataGrip or SQL editor)
UPDATE devices SET deleted_at = NOW() WHERE id = 1;

-- Reactivate a device
UPDATE devices SET deleted_at = NULL WHERE id = 1;
```

---

## 6. Error Handling & Status Codes

| Status Code        | Reason                                                                     | Resolution                                                                         |
| :----------------- | :------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| `401 Unauthorized` | Missing `x-device-id` or `x-device-key` header                             | Ensure both authentication headers are supplied.                                   |
| `403 Forbidden`    | Invalid device key, device not found, or device deactivated (`deleted_at`) | Verify device ID and pre-shared key; confirm `deleted_at IS NULL` in the database. |
| `400 Bad Request`  | Validation error (e.g. invalid plate format, non-positive weight)          | Check error details in response JSON and fix payload formatting.                   |
| `500 Server Error` | Database or unexpected server exception                                    | Retry with exponential backoff.                                                    |
