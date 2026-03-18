# Week 2 Test Report: Authentication & Preferences Integration

**Report Date:** March 18, 2026  
**Project:** DressCode Mobile App  
**Focus:** Authentication Flow, Token Security (AsyncStorage → SecureStore), User Preferences  
**Backend:** NestJS + PostgreSQL with JWT Authentication  
**Mobile:** React Native + Expo with Secure Storage  

---

## Test Summary

| Test Case | Status | Date | Notes |
|-----------|--------|------|-------|
| 1. User Registration | ✅ PASS | 2026-03-18 | New user created, tokens returned, preferences initialized |
| 2. User Login (Valid Credentials) | ✅ PASS | 2026-03-18 | Tokens issued, AccessToken valid for 30 minutes |
| 3. User Login (Invalid Password) | ✅ PASS | 2026-03-18 | Returns 401 Unauthorized as expected |
| 4. Protected Endpoint without Token | ✅ PASS | 2026-03-18 | GET /users/me returns 401 Unauthorized |
| 5. Protected Endpoint with Token | ✅ PASS | 2026-03-18 | GET /users/me returns user email & preferences object |
| 6. Profile Update (Preferences Save) | ✅ PASS | 2026-03-18 | PATCH /users/me updates style, coldSensitivity, favoriteCats |
| 7. Preferences Persist After Update | ✅ PASS | 2026-03-18 | GET /users/me after PATCH reflects saved preferences |
| 8. SecureStore Token Encryption | ✅ PASS | 2026-03-18 | Tokens stored securely with expo-secure-store, auto-restore on app launch |

---

## Detailed Test Cases

### Test Case 1: User Registration  
**Endpoint:** `POST /auth/register`  
**Input:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123",
  "name": "New User"
}
```
**Expected Response:**
- Status: 201 Created (or 200 OK)
- Body contains: `{ user: { id, email, name }, accessToken, refreshToken }`
- Preferences initialized: `{ style: "CASUAL", coldSensitivity: 0, favoriteCats: null }`

**Result:** ✅ **PASS**  
**Date:** 2026-03-18  
**Details:** User successfully created with hashed password (argon2). Tokens generated. Default preferences applied.

---

### Test Case 2: User Login (Valid Credentials)  
**Endpoint:** `POST /auth/login`  
**Input:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123"
}
```
**Expected Response:**
- Status: 200 OK
- Body contains: `{ user: { id, email, name }, accessToken, refreshToken }`
- AccessToken JWT valid signature, expires in 30 minutes
- RefreshToken stored for token rotation

**Result:** ✅ **PASS**  
**Date:** 2026-03-18  
**Details:** Credentials validated against argon2 hash. Tokens issued correctly.

---

### Test Case 3: User Login (Invalid Password)  
**Endpoint:** `POST /auth/login`  
**Input:**
```json
{
  "email": "newuser@example.com",
  "password": "WrongPassword"
}
```
**Expected Response:**
- Status: 401 Unauthorized
- Error message: "Invalid credentials"

**Result:** ✅ **PASS**  
**Date:** 2026-03-18  
**Details:** Password validation failed. No tokens issued. Security gate working.

---

### Test Case 4: Protected Endpoint without Token  
**Endpoint:** `GET /users/me`  
**Headers:** None (no Authorization header)  
**Expected Response:**
- Status: 401 Unauthorized
- Error message: "Unauthorized"

**Result:** ✅ **PASS**  
**Date:** 2026-03-18  
**Details:** JWT Guard caught missing token. Access denied as expected.

---

### Test Case 5: Protected Endpoint with Valid Token  
**Endpoint:** `GET /users/me`  
**Headers:** `Authorization: Bearer <accessToken>`  
**Expected Response:**
- Status: 200 OK
- Body contains:
  ```json
  {
    "id": "user-uuid",
    "email": "newuser@example.com",
    "name": "New User",
    "preferences": {
      "style": "CASUAL",
      "coldSensitivity": 0,
      "favoriteCats": null
    }
  }
  ```

**Result:** ✅ **PASS**  
**Date:** 2026-03-18  
**Details:** Token validated. User data and preferences returned successfully.

---

### Test Case 6: Profile Update (Save Preferences)  
**Endpoint:** `PATCH /users/me`  
**Headers:** `Authorization: Bearer <accessToken>`  
**Input:**
```json
{
  "style": "FORMAL",
  "coldSensitivity": 2,
  "favoriteCats": ["Business", "Streetwear"]
}
```
**Expected Response:**
- Status: 200 OK
- Body reflects updated preferences:
  ```json
  {
    "id": "user-uuid",
    "email": "newuser@example.com",
    "preferences": {
      "style": "FORMAL",
      "coldSensitivity": 2,
      "favoriteCats": ["Business", "Streetwear"]
    }
  }
  ```

**Result:** ✅ **PASS**  
**Date:** 2026-03-18  
**Details:** Preferences persisted to database. Response confirms save.

---

### Test Case 7: Preferences Persist After Update  
**Endpoint:** `GET /users/me`  
**Headers:** `Authorization: Bearer <accessToken>`  
**Expected Response:**
- Status: 200 OK
- Preferences match previously saved values:
  ```json
  {
    "preferences": {
      "style": "FORMAL",
      "coldSensitivity": 2,
      "favoriteCats": ["Business", "Streetwear"]
    }
  }
  ```

**Result:** ✅ **PASS**  
**Date:** 2026-03-18  
**Details:** Database persistence verified. Preferences correctly stored and retrieved.

---

### Test Case 8: SecureStore Token Encryption  
**Scenario:** Mobile app - Token Storage & Auto-Restore  
**Steps:**
1. User registers via LoginScreen
2. App calls `POST /auth/register`
3. Receives tokens
4. Calls `storage.saveTokens({ accessToken, refreshToken })`
5. Restart mobile app
6. AuthContext calls `storage.getTokens()` in useEffect
7. App auto-restores session without re-login

**Expected Behavior:**
- Tokens stored encrypted in device secure storage (expo-secure-store)
- AsyncStorage replaced with SecureStore for production-grade security
- Tokens survive app restart
- User remains logged in across sessions

**Result:** ✅ **PASS**  
**Date:** 2026-03-18  
**Details:**
- Migration from AsyncStorage to expo-secure-store completed
- secure-store.setItemAsync() / getItemAsync() used for encryption
- AuthContext restore logic verified
- Tokens persist with native encryption layer
- TypeScript compilation: ✅ Zero errors

---

## Implementation Details

### Backend Changes
- **Framework:** NestJS with Passport JWT strategy
- **Password Hashing:** argon2 (salt rounds: 10)
- **Tokens:** JWT (access: 30m, refresh: 7d)
- **Database:** Prisma ORM + PostgreSQL
- **Error Handling:** Global HttpExceptionFilter

### Mobile Changes (Week 2)
- **Storage Migration:** AsyncStorage (MVP) → expo-secure-store (production)
- **Auth Context:** Manages user state, tokens, and session restoration
- **Navigation Guard:** Conditional rendering (auth screens vs app screens)
- **UI Polish:** Fixed autofill styling, keyboard UX on iOS

### Security Improvements
| Aspect | Before | After |
|--------|--------|-------|
| Token Storage | AsyncStorage (plain text) | expo-secure-store (encrypted) |
| Password Hash | Plaintext verification | argon2 with salt |
| Protected Routes | Manual bearer injection | Global guard + JWT validation |
| Session Restore | Manual auth check | Automatic restoration on app launch |

---

## Test Environment

- **Date:** March 18, 2026
- **Backend:** NestJS running on localhost:3000
- **Mobile:** Expo Go / TestFlight
- **Database:** PostgreSQL (local dev)
- **Devices Tested:** 
  - iPhone 15 Pro (iOS 18.x)
  - iPhone Simulator

---

## Blockers & Resolutions

### Issue 1: ProfileScreen Crash on Button Press
- **Status:** 🔴 RESOLVED
- **Root Cause:** Invalid Picker.Item usage from react-native
- **Solution:** Replaced Picker with custom button-grid native implementation
- **Tested:** ✅ Verified on device

### Issue 2: Password Autofill Yellow Highlight
- **Status:** 🔴 RESOLVED
- **Root Cause:** iOS AutoFill system-level behavior
- **Solution:** Applied `textContentType="none"` + `keyboardAppearance="dark"`
- **Note:** Some yellow highlight persists but is acceptable UX (user can disable in Settings)

### Issue 3: AsyncStorage → SecureStore Migration
- **Status:** 🟢 COMPLETE
- **Target:** Production-grade token storage
- **Changes:** Updated storage.ts, installed expo-secure-store, verified compilation
- **Testing:** Smoke tests passed, tokens persist and restore correctly

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | Denys | 2026-03-18 | ✅ Approved |
| Feature | Week 2: Auth + Profile + Preferences | 2026-03-18 | ✅ Complete |

**Commit SHA:** `1939838` (main), `674318c` (UI polish)  
**Branch:** `origin/main`

---

## Recommendation for Week 3

1. **Optional SecureStore Enhancements:**
   - Implement token refresh rotation on background
   - Add biometric unlock for tokens (Face ID / Touch ID)

2. **Testing Infrastructure:**
   - Add E2E tests with EarlGrey (iOS) or Detox
   - Create Postman collection for API regression testing

3. **User Feedback:**
   - Gather feedback on password autofill UX
   - Consider passkey implementation if needed

---

**Report Generated:** 2026-03-18  
**Next Review:** Post-merge acceptance testing
