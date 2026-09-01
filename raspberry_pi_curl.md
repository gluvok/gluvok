# Raspberry Pi cURL API Reference Guide

This guide contains the exact `curl` commands and request/response specifications for integrating a Raspberry Pi (or Python script) with the Gluvok API.

---

## Table of Contents
1. [Overview & Requirements](#1-overview--requirements)
2. [Step 1: Device Authentication (Login)](#2-step-1-device-authentication-login)
3. [Step 2: Refresh Access Token](#3-step-2-refresh-access-token)
4. [Step 3: Upload Images (Storage API)](#4-step-3-upload-images-storage-api)
5. [Step 4: Create Device Entry](#5-step-4-create-device-entry)
6. [Alternative: Direct Base64 Image Payload](#6-alternative-direct-base64-image-payload)
7. [Error Handling & Status Codes](#7-error-handling--status-codes)

---

## 1. Overview & Requirements

- **Base URL**: `https://gluvok.vercel.app`
- **User Role**: The device account must have `role: "hardware"`. This ensures the login response returns Bearer JWT tokens (`access_token` and `refresh_token`) instead of browser cookies.
- **License Plate Validation**: `vehicle_number` must follow standard Indian registration format (e.g. `MH12AB1234`, `DL1CAB1234`, `22BH1234AA`).

---

## 2. Step 1: Device Authentication (Login)

Authenticate the device with its username and password to receive an `access_token` and a `refresh_token`.

### cURL Request
```bash
curl -X POST "https://gluvok.vercel.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "raspberry_pi_01",
    "password": "your_secure_device_password"
  }'
```

### Response (`200 OK`)
```json
{
  "success": true,
  "user": {
    "id": 5,
    "username": "raspberry_pi_01",
    "name": "Weighbridge Camera 1",
    "role": "hardware",
    "factory_id": 1
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

> **Note**: Save both `access_token` and `refresh_token`. The `access_token` is valid for 15 minutes (`900` seconds).

---

## 3. Step 2: Refresh Access Token

When the `access_token` expires or an API request returns `401 Unauthorized`, use the `refresh_token` to get a fresh pair of tokens without requiring username/password re-authentication.

### Option A: Via JSON Body (Recommended)
```bash
curl -X POST "https://gluvok.vercel.app/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

### Option B: Via Authorization Header
```bash
curl -X POST "https://gluvok.vercel.app/api/auth/refresh" \
  -H "Authorization: Bearer YOUR_REFRESH_TOKEN_HERE"
```

### Response (`200 OK`)
```json
{
  "success": true,
  "user": {
    "id": 5,
    "username": "raspberry_pi_01",
    "name": "Weighbridge Camera 1",
    "role": "hardware",
    "factory_id": 1
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9_NEW...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9_NEW...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

---

## 4. Step 3: Upload Images (Storage API)

Upload camera captures to Supabase Storage before creating the entry. The endpoint accepts `multipart/form-data`.

### Single Image Upload (`file`)
```bash
curl -X POST "https://gluvok.vercel.app/api/storage/upload" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -F "file=@/path/to/vehicle_capture.jpg;type=image/jpeg"
```

### Multiple Images Upload (`files`)
```bash
curl -X POST "https://gluvok.vercel.app/api/storage/upload" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -F "files=@/path/to/front_plate.jpg;type=image/jpeg" \
  -F "files=@/path/to/side_view.jpg;type=image/jpeg"
```

### Response (`201 Created`)
```json
{
  "data": {
    "urls": [
      "https://your-supabase-project.supabase.co/storage/v1/object/public/gluvok/f_1/weighments/abc12345-1725210000.jpg",
      "https://your-supabase-project.supabase.co/storage/v1/object/public/gluvok/f_1/weighments/def67890-1725210001.jpg"
    ]
  }
}
```

---

## 5. Step 4: Create Device Entry

Submit the vehicle entry with weight, center ID, detected/confirmed plate number, and uploaded image URLs.

### cURL Request
```bash
curl -X POST "https://gluvok.vercel.app/api/entries" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "detected_vehicle_number": "MH12AB1234",
    "vehicle_number": "MH12AB1234",
    "weight": 14250.5,
    "center_id": 1,
    "status": "pending",
    "images": [
      "https://your-supabase-project.supabase.co/storage/v1/object/public/gluvok/f_1/weighments/abc12345-1725210000.jpg",
      "https://your-supabase-project.supabase.co/storage/v1/object/public/gluvok/f_1/weighments/def67890-1725210001.jpg"
    ]
  }'
```

### Request Fields Specification

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `detected_vehicle_number` | String | **Yes** | Raw OCR/ANPR text recognized by the camera |
| `vehicle_number` | String | **Yes** | Validated Indian vehicle number (e.g. `MH12AB1234`) |
| `weight` | Number | **Yes** | Positive numeric weight (kg/tons) |
| `center_id` | Integer | **Yes** | Center / weighbridge ID |
| `status` | String | No | `"pending"`, `"approved"`, or `"rejected"` (Default: `"pending"`) |
| `images` | Array | No | Array of uploaded public image URLs or Base64 data URIs |

### Response (`201 Created`)
```json
{
  "data": {
    "id": 42,
    "detected_vehicle_number": "MH12AB1234",
    "vehicle_number": "MH12AB1234",
    "weight": 14250.5,
    "source": "device",
    "center_id": 1,
    "user_id": 5,
    "customer_id": null,
    "factory_id": 1,
    "status": "pending",
    "auto_approved": false,
    "images": [
      "https://your-supabase-project.supabase.co/storage/v1/object/public/gluvok/f_1/weighments/abc12345-1725210000.jpg",
      "https://your-supabase-project.supabase.co/storage/v1/object/public/gluvok/f_1/weighments/def67890-1725210001.jpg"
    ],
    "created_at": "2026-09-01T17:45:00.000Z",
    "updated_at": "2026-09-01T17:45:00.000Z"
  }
}
```

---

## 6. Alternative: Direct Base64 Image Payload

If you prefer not calling `/api/storage/upload` separately, you can send Base64 Data URI strings directly inside `images` in `POST /api/entries`. The server will automatically decode and upload them to storage.

### cURL Request (with Base64 Image)
```bash
curl -X POST "https://gluvok.vercel.app/api/entries" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "detected_vehicle_number": "MH12AB1234",
    "vehicle_number": "MH12AB1234",
    "weight": 14250.5,
    "center_id": 1,
    "status": "pending",
    "images": [
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/..."
    ]
  }'
```

---

## 7. Error Handling & Status Codes

| Status Code | Reason | What to do |
| :--- | :--- | :--- |
| `401 Unauthorized` | Access token expired or invalid credentials | Call `POST /api/auth/refresh`. If refresh also fails with 401, re-login via `POST /api/auth/login`. |
| `400 Bad Request` | Validation failure (e.g. invalid plate format, missing fields, non-positive weight) | Inspect `error` message in response JSON and fix payload formatting. |
| `403 Forbidden` | Center does not exist or does not belong to the user's factory | Verify `center_id` is assigned to your device's factory. |
| `500 Server Error` | Database or storage error | Retry after a short backoff period. |
