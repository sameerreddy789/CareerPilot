# Firebase Security Rules Configuration

> **Important**: These rules must be configured in the Firebase Console to secure your application.

---

## Firestore Security Rules

Navigate to **Firestore Database → Rules** in Firebase Console and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Users collection - users can only read/write their own data
    match /users/{userId} {
      allow read, write: if isAuthenticated() && isOwner(userId);
      
      // Subcollections within user document
      match /{document=**} {
        allow read, write: if isAuthenticated() && isOwner(userId);
      }
    }
    
    // Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Firebase Authentication Settings

### 1. Enable Sign-in Methods
In **Authentication → Sign-in method**, enable:
- ✅ Email/Password
- ✅ Google OAuth

### 2. Authorized Domains
In **Authentication → Settings → Authorized domains**, add:
- `localhost` (for development)
- Your production domain (e.g., `nextstep-ai.vercel.app`)

### 3. Email Verification (Optional but Recommended)
```javascript
// In your signup flow (js/auth-modern.js)
import { sendEmailVerification } from "firebase/auth";

// After successful signup
await sendEmailVerification(user);
```

---

## Storage Rules (If Using Firebase Storage)

Navigate to **Storage → Rules** and paste:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can only upload to their own folder
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Limit file size to 10MB
    match /{allPaths=**} {
      allow write: if request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

---

## Security Best Practices

### ✅ DO:
- Keep Firebase Security Rules strict (deny by default)
- Validate data on both client and server (Rules)
- Use email verification for new users
- Monitor Firebase Console for suspicious activity
- Set up Firebase App Check for bot protection
- Enable Firebase Security Alerts

### ❌ DON'T:
- Allow public read/write access (`allow read, write: if true`)
- Store sensitive data in Firestore (use Cloud Functions + Secret Manager)
- Rely solely on client-side validation
- Expose admin SDKs in client code

---

## Testing Security Rules

Use Firebase Emulator Suite for local testing:

```bash
firebase init emulators
firebase emulators:start
```

Or test in Firebase Console:
**Firestore → Rules → Rules Playground**

---

## Monitoring & Alerts

### Enable Security Alerts
1. Go to **Project Settings → Integrations**
2. Enable **Security Alerts**
3. Configure email notifications

### Monitor Usage
- Check **Firebase Console → Usage and Billing**
- Set up budget alerts to prevent unexpected costs

---

## Additional Security Measures

### 1. App Check (Recommended for Production)
Protect against abusive traffic:
```bash
firebase init appcheck
```

### 2. reCAPTCHA for Auth
Add to auth pages to prevent bot signups

### 3. Rate Limiting
Implement in Firestore Security Rules:
```javascript
// Example: Limit writes to 5 per minute
allow write: if request.time > resource.data.lastWrite + duration.value(1, 'm')
              && resource.data.writeCount < 5;
```

---

**Last Updated**: 2026-02-02  
**Status**: Configuration required before production deployment
