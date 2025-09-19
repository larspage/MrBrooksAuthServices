# Manual Testing Guide - MrBrooks Auth Service

## Overview
This document provides comprehensive manual testing procedures for the MrBrooks Auth Service. The service is a multi-tenant authentication and subscription management system built with Next.js, Supabase, and Stripe.

## Test Environment Setup

### Prerequisites
1. Ensure the development server is running: `npm run dev`
2. Verify Supabase connection is active
3. Have test user accounts ready (admin and regular users)
4. Browser developer tools open for monitoring network requests and console logs

### Test Data Requirements
- **Admin User**: An account with admin privileges
- **Regular User**: A standard user account without admin privileges
- **Test Applications**: Sample applications registered in the system
- **Test Membership Tiers**: Various tier levels for testing authorization

## Core Functionality Testing

### 1. Database Connection Testing

**Test Case 1.1: Database Connection Status**
- **Objective**: Verify Supabase database connectivity
- **Steps**:
  1. Navigate to the home page (`http://localhost:6010`)
  2. Observe the "Database Connection Status" section
- **Expected Results**:
  - ✅ Green checkmark with "Connected to Supabase successfully!" message
  - No error messages displayed
- **Failure Indicators**:
  - ❌ Red X with "Connection failed" message
  - Error details displayed in gray box

### 2. Authentication System Testing

**Test Case 2.1: User Registration (Sign Up)**
- **Objective**: Test new user account creation
- **Steps**:
  1. Click "Sign Up" button on home page
  2. Fill in registration form:
     - Email: `test@example.com`
     - Password: `TestPassword123!`
     - Full Name: `Test User`
  3. Submit form
- **Expected Results**:
  - Modal closes automatically
  - User is logged in and profile appears
  - User profile section shows user information
- **Edge Cases to Test**:
  - Invalid email format
  - Weak password
  - Duplicate email registration
  - Empty required fields

**Test Case 2.2: User Login (Sign In)**
- **Objective**: Test existing user authentication
- **Steps**:
  1. Click "Sign In" button on home page
  2. Enter valid credentials
  3. Submit form
- **Expected Results**:
  - Modal closes automatically
  - User profile section appears
  - Admin portal link appears (if admin user)
- **Edge Cases to Test**:
  - Invalid email/password combination
  - Non-existent user
  - Empty fields

**Test Case 2.3: User Logout**
- **Objective**: Test user session termination
- **Steps**:
  1. While logged in, locate logout functionality in UserProfile component
  2. Click logout button
- **Expected Results**:
  - User profile section disappears
  - Sign In/Sign Up buttons reappear
  - Admin portal link disappears

**Test Case 2.4: Session Persistence**
- **Objective**: Test session management across browser refreshes
- **Steps**:
  1. Log in as a user
  2. Refresh the browser page
  3. Navigate away and return to the site
- **Expected Results**:
  - User remains logged in after refresh
  - Profile information persists
  - Admin status maintained (if applicable)

### 3. Authorization and Role Management

**Test Case 3.1: Admin Access Control**
- **Objective**: Test admin-only functionality access
- **Steps**:
  1. Log in as admin user
  2. Verify "Admin Portal" button appears
  3. Click "Admin Portal" button
  4. Navigate to `/admin`
- **Expected Results**:
  - Admin portal loads successfully
  - Admin dashboard components are visible
  - No access denied messages

**Test Case 3.2: Non-Admin Access Restriction**
- **Objective**: Test access control for regular users
- **Steps**:
  1. Log in as regular (non-admin) user
  2. Verify "Setup Admin Access" button appears instead of "Admin Portal"
  3. Try to directly navigate to `/admin`
- **Expected Results**:
  - Redirected to `/admin-setup` page
  - Cannot access admin functionality
  - Appropriate messaging about admin access

**Test Case 3.3: Unauthenticated Access Control**
- **Objective**: Test middleware protection for protected routes
- **Steps**:
  1. Ensure you're logged out
  2. Try to directly navigate to `/admin`
  3. Try to navigate to `/admin-setup`
- **Expected Results**:
  - Redirected to home page with authentication message
  - Cannot access protected routes
  - Appropriate error messaging

### 4. Application Management (Admin Features)

**Test Case 4.1: Application Registration**
- **Objective**: Test new application creation
- **Prerequisites**: Must be logged in as admin
- **Steps**:
  1. Navigate to Admin Portal
  2. Access Application Registration Form
  3. Fill in application details:
     - Name: `Test Application`
     - Slug: `test-app` (auto-generated)
     - Description: `Test application for manual testing`
     - Status: `Development`
  4. Submit form
- **Expected Results**:
  - Application created successfully
  - API keys generated automatically
  - Application appears in applications list
  - Success message displayed

**Test Case 4.2: Application Slug Validation**
- **Objective**: Test slug generation and validation
- **Steps**:
  1. Enter application name with special characters: `My Awesome App!`
  2. Observe auto-generated slug
  3. Try to manually edit slug with invalid characters
- **Expected Results**:
  - Slug auto-generates as `my-awesome-app`
  - Invalid characters are rejected in manual slug editing
  - Validation errors shown for invalid slugs

**Test Case 4.3: Duplicate Application Prevention**
- **Objective**: Test duplicate slug prevention
- **Steps**:
  1. Create an application with slug `test-app`
  2. Try to create another application with the same slug
- **Expected Results**:
  - Error message: "An application with this slug already exists"
  - Form submission prevented
  - User prompted to choose different slug

### 5. API Endpoint Testing

**Test Case 5.1: Applications API (GET)**
- **Objective**: Test applications listing API
- **Prerequisites**: Admin authentication required
- **Steps**:
  1. Open browser developer tools
  2. Navigate to admin applications page
  3. Monitor network requests to `/api/applications`
- **Expected Results**:
  - HTTP 200 response
  - JSON response with applications array
  - All application fields present

**Test Case 5.2: Applications API (POST)**
- **Objective**: Test application creation API
- **Steps**:
  1. Use application registration form
  2. Monitor network request to `/api/applications`
  3. Check request payload and response
- **Expected Results**:
  - HTTP 201 response for successful creation
  - Created application returned in response
  - API keys included in response

**Test Case 5.3: Auth Verification API**
- **Objective**: Test authentication verification endpoint
- **Steps**:
  1. Use browser developer tools or API testing tool
  2. Send POST request to `/api/auth/verify`
  3. Test with various payloads:
     ```json
     {
       "application_id": "valid-app-id",
       "user_token": "valid-token",
       "required_tier_level": 1
     }
     ```
- **Expected Results**:
  - Appropriate HTTP status codes (200, 401, 404)
  - Correct authorization status in response
  - User and membership information when authorized

**Test Case 5.4: Health Check API**
- **Objective**: Test service health endpoint
- **Steps**:
  1. Send GET request to `/api/auth/verify`
- **Expected Results**:
  - HTTP 200 response
  - Service status information
  - Version and timestamp included

### 6. User Interface Testing

**Test Case 6.1: Responsive Design**
- **Objective**: Test UI across different screen sizes
- **Steps**:
  1. Test on desktop (1920x1080)
  2. Test on tablet (768x1024)
  3. Test on mobile (375x667)
  4. Use browser developer tools to simulate different devices
- **Expected Results**:
  - Layout adapts appropriately to screen size
  - All functionality remains accessible
  - Text remains readable
  - Buttons remain clickable

**Test Case 6.2: Modal Functionality**
- **Objective**: Test authentication modal behavior
- **Steps**:
  1. Open sign-in modal
  2. Switch between login and signup modes
  3. Close modal using X button
  4. Close modal by clicking outside
- **Expected Results**:
  - Modal opens and closes smoothly
  - Mode switching works correctly
  - All close methods function properly
  - Form state resets appropriately

**Test Case 6.3: Form Validation**
- **Objective**: Test client-side form validation
- **Steps**:
  1. Test authentication forms with invalid data
  2. Test application registration with invalid data
  3. Submit forms with empty required fields
- **Expected Results**:
  - Validation errors displayed clearly
  - Form submission prevented for invalid data
  - Error messages are user-friendly
  - Fields highlighted appropriately

### 7. Error Handling Testing

**Test Case 7.1: Network Error Handling**
- **Objective**: Test behavior during network issues
- **Steps**:
  1. Disconnect from internet
  2. Try to perform various actions
  3. Reconnect and retry
- **Expected Results**:
  - Appropriate error messages displayed
  - No application crashes
  - Graceful recovery when connection restored

**Test Case 7.2: Server Error Handling**
- **Objective**: Test handling of server-side errors
- **Steps**:
  1. Monitor for 500 errors in network tab
  2. Test with invalid API requests
  3. Test with malformed data
- **Expected Results**:
  - User-friendly error messages
  - No sensitive information exposed
  - Application remains functional

### 8. Security Testing

**Test Case 8.1: XSS Prevention**
- **Objective**: Test cross-site scripting protection
- **Steps**:
  1. Try to input script tags in form fields
  2. Test with various XSS payloads
- **Expected Results**:
  - Script tags are escaped or rejected
  - No script execution occurs
  - Data is properly sanitized

**Test Case 8.2: Authentication Token Security**
- **Objective**: Test token handling security
- **Steps**:
  1. Check browser storage for tokens
  2. Monitor network requests for token exposure
  3. Test token expiration handling
- **Expected Results**:
  - Tokens stored securely
  - No tokens exposed in URLs
  - Proper token refresh handling

### 9. Performance Testing

**Test Case 9.1: Page Load Performance**
- **Objective**: Test application loading speed
- **Steps**:
  1. Use browser developer tools Performance tab
  2. Record page load times
  3. Check for performance bottlenecks
- **Expected Results**:
  - Initial page load under 3 seconds
  - No blocking resources
  - Efficient resource loading

**Test Case 9.2: API Response Times**
- **Objective**: Test API endpoint performance
- **Steps**:
  1. Monitor API response times in network tab
  2. Test with various data loads
- **Expected Results**:
  - API responses under 1 second
  - Consistent performance across requests

## Test Execution Checklist

### Pre-Testing Setup
- [ ] Development server running (`npm run dev`)
- [ ] Database connection verified
- [ ] Test accounts prepared
- [ ] Browser developer tools open

### Core Authentication Flow
- [ ] User registration works correctly
- [ ] User login functions properly
- [ ] User logout clears session
- [ ] Session persistence across refreshes
- [ ] Password validation enforced

### Authorization Testing
- [ ] Admin users can access admin portal
- [ ] Regular users redirected to admin setup
- [ ] Unauthenticated users blocked from protected routes
- [ ] Middleware protection functioning

### Application Management
- [ ] Application creation works
- [ ] Slug generation and validation
- [ ] Duplicate prevention
- [ ] API key generation

### API Functionality
- [ ] All API endpoints respond correctly
- [ ] Proper HTTP status codes returned
- [ ] Authentication required where appropriate
- [ ] Error responses are appropriate

### User Interface
- [ ] Responsive design works across devices
- [ ] Modals function correctly
- [ ] Form validation works
- [ ] Error messages are clear

### Security & Performance
- [ ] No XSS vulnerabilities
- [ ] Tokens handled securely
- [ ] Page load times acceptable
- [ ] API response times reasonable

## Bug Reporting Template

When issues are found during manual testing, use this template:

```
**Bug Title**: [Brief description]

**Severity**: [Critical/High/Medium/Low]

**Environment**: 
- Browser: [Chrome/Firefox/Safari/Edge + version]
- OS: [Windows/Mac/Linux]
- Screen Resolution: [if UI related]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: [What should happen]

**Actual Result**: [What actually happened]

**Screenshots/Console Errors**: [If applicable]

**Additional Notes**: [Any other relevant information]
```

## Test Coverage Areas

This manual testing guide covers:
- ✅ Authentication and authorization flows
- ✅ Database connectivity and operations
- ✅ API endpoint functionality
- ✅ User interface interactions
- ✅ Form validation and error handling
- ✅ Security considerations
- ✅ Performance characteristics
- ✅ Responsive design
- ✅ Admin functionality
- ✅ Application management

## Common Issues and Solutions

### Issue: 403 Forbidden Error on User Profiles
**Symptoms**: After signing up and confirming email, user gets 403 error when trying to access profile data.

**Solution**: The database needs a trigger to automatically create user profiles. Apply this SQL in Supabase:

```sql
-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, metadata)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Issue: "is_admin" Function Not Found
**Symptoms**: Database errors mentioning missing RPC functions.

**Solution**: Apply the database migrations:
1. Run `npm run db:migrate`
2. Or manually apply the SQL files in `supabase/migrations/` via Supabase dashboard

### Issue: Admin Features Not Accessible
**Symptoms**: User can't access admin portal even after login.

**Solution**: Set user as admin in database:
```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'),
  '{role}',
  '"admin"'
)
WHERE email = 'your-admin-email@example.com';
```

## Notes for Testers

1. **Test Data**: Always use test data, never production data
2. **Browser Compatibility**: Test across multiple browsers
3. **Documentation**: Document any issues found immediately
4. **Edge Cases**: Pay special attention to edge cases and error conditions
5. **User Experience**: Consider the overall user experience, not just functionality
6. **Security**: Be vigilant about potential security issues
7. **Performance**: Note any performance issues or slow responses
8. **Database Setup**: Ensure database schema is properly applied before testing

## Integration with Automated Testing

This manual testing guide complements the automated test suite. Areas that are difficult to automate (like visual design, user experience, and complex user flows) should receive extra attention during manual testing.

Manual testing should be performed:
- Before major releases
- After significant feature additions
- When automated tests indicate potential issues
- During user acceptance testing
- When investigating user-reported bugs