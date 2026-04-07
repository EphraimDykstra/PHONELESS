

# Phone-Away Snack Coupon App

## Overview
Two-role web app: **Students** register with their physical ID barcode, and **Event Staff** scan barcodes to check if a student's phone is 500+ feet from the event location. If so, a printable coupon is generated.

## Pages & Flow

### 1. Home / Role Selection
- Two big buttons: "I'm a Student" and "I'm Event Staff"
- Staff enters a shared access code (e.g. "SNACK2026") to proceed

### 2. Student Registration & Dashboard
- **Registration form**: Enter name + scan/type their physical student ID barcode number
- After registering, student sees their dashboard with:
  - Status indicator (active/inactive)
  - **Location sharing toggle** — when enabled, the app continuously shares their GPS coordinates (requires browser tab to be open)
  - History of earned coupons

### 3. Event Staff Scanner
- Camera-based barcode scanner (using `html5-qrcode` library) to scan student ID barcodes
- After scanning:
  - Looks up the student in the database
  - Checks if the student's phone has reported a location
  - Calculates distance between the **event location** (set by staff) and the student's last-known phone location
  - If **500+ feet away** → shows "✅ Phone Away!" and generates a printable coupon
  - If **closer than 500 feet** → shows "❌ Phone is nearby, no coupon"
  - If **location unavailable** → shows "⚠️ Student's app isn't sharing location"

### 4. Coupon Display & Print
- When approved, displays a styled coupon with:
  - Student name, date/time, unique coupon code
  - "Complimentary Snack" messaging
- **Print button** triggers `window.print()` with a print-optimized layout for thermal/receipt printers
- Coupon is marked as used in the database to prevent duplicates

## Backend (Lovable Cloud)
- **students** table: id, name, barcode_id, created_at
- **student_locations** table: id, student_id, latitude, longitude, updated_at (updated in real-time while app is open)
- **coupons** table: id, student_id, coupon_code, created_at, redeemed (boolean)
- **event_locations** table: id, name, latitude, longitude (staff sets the event's GPS coordinates)

## Key Technical Details
- Barcode scanning via `html5-qrcode` library (camera-based)
- Browser Geolocation API for student location tracking (polls every 30 seconds while app is open)
- Haversine formula to calculate distance between two GPS points
- Print-optimized CSS for coupon output
- Simple role selection (no passwords for students, access code for staff)

