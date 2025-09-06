# Multi-Factor Authentication (MFA) Documentation

## Overview

The MFA system provides an additional security layer through email-based verification codes. When enabled, users must verify their identity using a 6-digit code sent to their email during login.

Reference: https://docs.emnify.com/how-tos/multi-factor-authentication

https://www.codingforentrepreneurs.com/blog/sending-email-in-django-from-gmail

## Authentication Flow

### 1. MFA Enablement (Settings)
- User navigates to settings and enables MFA
- Backend generates a verification token and stores it in the database
- Backend sends the verification code to the user's email

### 2. Login with MFA
- User enters their login credentials
- If MFA is enabled, system prompts for verification code
- User enters the 6-digit MFA code received via email
- Backend verifies the code against the stored token
- If valid, authentication is completed and JWT tokens are issued

### 3. MFA Disablement (Settings)
- User disables MFA in settings
- Backend removes the stored verification token from database

## API Endpoints

### Resend Verification Code
**Endpoint:** `POST /api/users/mfa/resend-code`
**Authentication:** None required
**Rate Limiting:** Applied per username

**Request Body:**
```json
{
  "username": "string"  // Required: User's username
}
```

**Response Codes:**
- `200 OK`: Code sent successfully
```json
{
  "msg": "Verification code sent to user email"
}
```

- `404 Not Found`: User not found
```json
{
  "detail": "User with that email not found"
}
```

- `500 Internal Server Error`: Email sending failed
```json
{
  "detail": "Failed to send verification code"
}
```

### Verify MFA Code
**Endpoint:** `POST /api/users/mfa/verify-mfa`
**Authentication:** None required

**Request Body:**
```json
{
  "username": "string",  // Required: User's username
  "token": "string"      // Required: 6-digit verification code
}
```

**Response Codes:**
- `200 OK`: Authentication successful
```json
{
  "access_token": "string",     // JWT access token
  "refresh_token": "string",    // JWT refresh token
  "user": {
    "id": "number",
    "username": "string",
    "email": "string",
    "profile": {
      "display_name": "string",
      "profile_picture": "string|null"
    }
  }
}
```

- `400 Bad Request`: Invalid token format or no verification code sent
```json
{
  "detail": "Invalid code format. Please enter a 6-digit code."
}
// OR
{
  "detail": "No verification code has been sent"
}
```

- `401 Unauthorized`: Invalid verification code
```json
{
  "detail": "Invalid verification code"
}
```

- `404 Not Found`: User not found
```json
{
  "detail": "User not found"
}
```

- `408 Request Timeout`: Code expired (10 minutes)
```json
{
  "detail": "Expired session: authentication request timed out"
}
```

## Implementation Details

### Backend Implementation (`server/users/router/endpoints/mfa.py`)

**Key Constants:**
- `TOKEN_LENGTH = 6`: Verification code length
- `TOKEN_EXPIRY = 10`: Code expiry time in minutes

**Core Functions:**
- `generate_verification_code()`: Creates random 6-digit code
- `handle_mfa_code(user)`: Generates and emails verification code
- `verify_mfa_code()`: Validates submitted code and issues tokens

**Database Fields (User model):**
- `mfa_token`: Stores current verification code
- `mfa_token_date`: Timestamp when code was generated

### Frontend Integration

**MFA Login Flow:**
1. User submits login credentials
2. If MFA required, show verification code input form
3. User enters 6-digit code from email
4. Submit code via `/api/users/mfa/verify-mfa`
5. On success, store JWT tokens and redirect to dashboard
6. On failure, show error message with resend option

**Resend Code Flow:**
1. User clicks "Resend Code" button
2. Submit request to `/api/users/mfa/resend-code`
3. Show success/error message
4. Update UI to indicate new code sent

**Error Handling:**
- Invalid format: Show input validation error
- Expired code: Show timeout message with resend option
- Invalid code: Show error with retry counter
- Network errors: Show connection error with retry option

## Email Configuration

### Gmail SMTP Setup

1. **Create App Password:**
   - Visit: https://myaccount.google.com/apppasswords
   - Generate application-specific password

2. **Django Settings Configuration:**
```python
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_USE_SSL = False
EMAIL_HOST_USER = "peacemakers9999@gmail.com"
EMAIL_HOST_PASSWORD = "app_password_here"  # Use app password, not regular password
DEFAULT_FROM_EMAIL = "peacemakers9999@gmail.com"
```

### Email Template
**Subject:** "Your Verification Code"
**Body:** 
```
Your verification code is: {6_digit_code}
This code will expire in 10 minutes.
```

## Security Considerations

- **Rate Limiting:** Implement per-user rate limiting for code generation
- **Code Expiry:** Codes expire after 10 minutes
- **Single Use:** Each code can only be used once
- **Secure Storage:** Codes are stored in database with timestamp
- **Input Validation:** Only 6-digit numeric codes accepted
- **CSRF Protection:** All endpoints use CSRF tokens

## Frontend UI States

### MFA Setup (Settings Page)
- Toggle switch for enabling/disabling MFA
- Success message when enabled/disabled
- Loading state during API calls

### MFA Login Form
- Username/password fields (if not already submitted)
- 6-digit verification code input field
- "Resend Code" button
- Submit button with loading state
- Error message display area
- Timer showing code expiry countdown

### Expected User Experience
1. User attempts login with MFA enabled
2. System shows "Check your email for verification code" message
3. User receives email within 30 seconds
4. User enters 6-digit code
5. System validates and logs user in
6. On error, clear error message provides guidance

## Troubleshooting

**Common Issues:**
- Email not received: Check spam folder, verify email address
- Code expired: Generate new code via resend button
- Invalid format: Ensure 6 digits, numbers only
- Network timeout: Retry request with proper error handling

**Testing:**
- Test with valid/invalid codes
- Test code expiry (wait 10+ minutes)
- Test resend functionality
- Test email delivery in different environments
