# TARSIS System Documentation

Version: 1.0  
System name: TARSIS - Tubigon Agricultural Registry and Services Information System  
Office: Office of the Municipal Agriculture, Tubigon, Bohol  
Prepared for: System users, administrators, developers, evaluators, and maintainers

## 1. System Overview

TARSIS is a web-based agricultural registry and services information system for the Municipal Agriculture Office of Tubigon, Bohol. It centralizes beneficiary registration, RSBSA-aligned records, digital ID verification, barangay coverage monitoring, assistance tracking, PCIC insurance/calamity claim monitoring, announcements, notifications, reports, account administration, and audit monitoring.

The system supports public visitors, registered beneficiaries, barangay technical staff, MAO staff, sector heads, and the super administrator. Each user sees features based on role permissions.

Primary goals:

- Provide an online registry for farmers, fisherfolk, livestock raisers, poultry raisers, and agricultural workers.
- Support RSBSA-style registration and printable form generation.
- Allow MAO personnel to validate, approve, edit, deactivate, and archive registrant records.
- Provide a digital identification card and QR-backed registry profile.
- Track agricultural assistance applications and insurance/calamity claims.
- Publish announcements, advisories, bulletins, distribution schedules, pest/disease notices, and calamity updates.
- Monitor barangay registration coverage and schedules.
- Support role-based access control, audit trails, and administrative account management.

## 2. Technology Stack

Backend:

- Laravel application
- REST-style API routes under `routes/api.php`
- Eloquent models for users, registrants, barangays, announcements, assistance applications, insurance claims, notifications, audit logs, and geo-locations
- JWT-based authentication through `JwtService`
- File storage for profile photos, evidence photos, and announcement images

Frontend:

- React application under `resources/js`
- React Router for page routing
- Tailwind CSS utility classes and custom app CSS
- Vite build system
- Role-based layouts and navigation
- Client-side PDF/image generation for RSBSA bulk downloads using `html2canvas` and `jspdf`

Important public assets:

- TARSIS logo and municipal agriculture seal
- RSBSA form templates
- Public downloadable sample files and RSBSA PDF

## 3. Main User Roles

### Public Visitor

A public visitor is not logged in. They can view the landing page, about page, public announcements, announcement details, public service instructions, and sign up or log in.

Common actions:

- Read public announcements.
- View TARSIS information and services.
- Create a beneficiary account.
- Open public tracker instruction pages.

### Farmer/Fisherfolk/Beneficiary

This role is stored as `farmer`. It represents public beneficiary accounts, including farmers, fisherfolk, livestock raisers, and poultry raisers.

Common actions:

- Register or update an RSBSA-aligned profile.
- View linked profile and digital ID when available.
- Track personal assistance applications.
- Track personal insurance/calamity claims.
- View barangay schedules and public announcements.
- Update account profile and password.

### Barangay Technical Staff

This role is stored as `barangay_technical_staff`. It is scoped to one or more assigned barangays.

Common actions:

- View assigned barangay dashboard.
- View and manage registrants in assigned barangays.
- Edit registrant details within barangay scope.
- View barangay schedules and assigned barangay information.
- Access barangay map unless restricted by role logic.

### MAO Administrator

This role is stored as `mao_staff`.

Common actions:

- View system dashboard and reports.
- Manage barangay coverage.
- Approve, edit, deactivate, and archive registrants.
- Manage assistance and insurance tracking records.
- Manage notifications.
- Manage geo-mapping.
- View archived records.

### Sector Heads

Sector head roles:

- `crop_head`
- `fish_head`
- `livestock_head`
- `poultry_head`

Each sector head is scoped by sector:

- Crop Head maps to `farmer`.
- Fishery Head maps to `fisherfolk`.
- Livestock Head maps to `livestock`.
- Poultry Head maps to `poultry`.

Common actions:

- View sector-filtered dashboard data.
- Manage registrants for their sector.
- Manage sector announcements.
- Manage assistance and insurance records for their sector.
- Manage geo-mapping and reports.
- View archived records.

### Super Administrator

This role is stored as `super_admin`.

Common actions:

- Full administrative oversight.
- Manage users, roles, account status, barangay assignments, password resets, archived users, and permanent deletion.
- View and export audit logs.
- Manage registrants, reports, announcements, notifications, assistance, insurance, geo-mapping, and archives.

## 4. Role Permission Summary

| Feature | Public | Beneficiary | Barangay Staff | MAO Admin | Sector Heads | Super Admin |
| --- | --- | --- | --- | --- | --- | --- |
| Public landing and announcements | Yes | Yes | Yes | Yes | Yes | Yes |
| Sign up and log in | Yes | Yes | Yes | Yes | Yes | Yes |
| Dashboard | No | Yes | Yes | Yes | Yes | Yes |
| My Profile / Digital ID | No | Yes | No | No | No | No |
| Registration form | Limited/public | Yes | Yes | Yes | Yes | Yes |
| Registration management | No | No | Assigned barangays | Yes | Sector-scoped | Yes |
| Approve registrants | No | No | No | Yes | Yes | Yes |
| Barangay coverage | No | View assigned | Assigned view | Yes | View | Yes |
| Assistance tracker | No | Own records | No | Yes | Sector-scoped | Yes |
| Insurance tracker | No | Own records | No | Yes | Sector-scoped | Yes |
| Notifications module | No | No | No | Yes | Yes | Yes |
| Announcement management | No | No | No | No | Yes | Yes |
| Reports | No | No | No | Yes | Yes | Yes |
| Audit logs | No | No | No | No | No | Yes |
| User management | No | No | No | No | No | Yes |

## 5. Public Website Flow

### Landing Page

The landing page introduces TARSIS and presents:

- Header navigation.
- Hero announcement carousel.
- About section.
- Team/office section.
- Announcement feed.
- Service tiles.
- Digital ID section.
- Call-to-action band.
- Footer.

Visitor flow:

1. Visitor opens `/`.
2. System displays TARSIS public information.
3. Visitor navigates to About, Services, Contact, Announcements, Login, or Sign Up.
4. Visitor may open an announcement or create an account.

### Public Announcements

Public users can open `/announcements` and `/announcements/:id`.

Announcement details may include:

- Title
- Type
- Body
- Image
- Publish and expiry dates
- Comment section
- Like/dislike feedback counts

### Public Tracker Instructions

Public instruction pages explain how users can track:

- Assistance applications
- Insurance/calamity claims

These pages guide users to log in and use the appropriate tracker.

## 6. Authentication and Account Access

### Sign Up

Path: `/signup`

Beneficiary sign-up collects:

- Full name
- Email address
- Mobile number
- Password
- Confirm password

Flow:

1. User opens the sign-up page.
2. User enters required details.
3. System validates email format, phone format, password length, and password confirmation.
4. System creates a beneficiary account with role `farmer`.
5. System signs in the new user and redirects them to registration or the intended page.

### Log In

Path: `/login`

Flow:

1. User enters email and password.
2. System validates credentials.
3. System checks account status.
4. If pending, rejected, or inactive, access is denied with a message.
5. If active, the system issues a JWT token and loads the user dashboard.
6. If the account has `must_change_password`, the system redirects to the password change page.

### Forgot Password

The login page includes a "Forgot password?" link below the password input. The current system does not implement automated email reset tokens. Password recovery is handled through MAO/support by email request and administrator reset.

### Forced Password Change

Path: `/change-password`

This is used after an administrator resets a password.

Flow:

1. User logs in with a temporary password.
2. System detects `must_change_password`.
3. User enters current temporary password, new password, and confirmation.
4. System updates the password and clears `must_change_password`.
5. User continues to dashboard.

### Logout

Flow:

1. User selects sign out.
2. System displays confirmation.
3. User confirms.
4. Local authentication state is cleared.
5. User is redirected to the landing page.

## 7. Dashboard

Path: `/dashboard`

Dashboard content changes by role.

### Beneficiary Dashboard

Shows:

- Greeting.
- My Registration card.
- Application Status card.
- Barangay Schedules card.

Common beneficiary flow:

1. Beneficiary logs in.
2. System displays dashboard shortcuts.
3. Beneficiary opens registration, assistance tracker, insurance tracker, or map.

### Barangay Staff Dashboard

Shows:

- Role greeting.
- Assigned registrants count.
- Approved count.
- Assigned barangay list.
- Links to registrants and schedules.

### MAO Admin, Sector Head, and Super Admin Dashboard

Shows:

- Greeting and module overview.
- Registrant totals.
- Assistance application totals.
- Insurance/calamity application totals.
- Monthly registrants chart.
- Upcoming events/barangay distributions.
- Barangay ranking list.
- Recent announcements.
- Announcement feedback.
- Recent system activity for Super Admin.

Upcoming events logic:

- Events are shown when `publish_at` or `expires_at` overlaps the next 7 days.
- Example: an event dated October 12 starts showing on October 5.

## 8. Registration Module

Paths:

- `/registration`
- `/admin/registrations`
- `/profile/:registryNumber`
- `/rsbsa-preview/:id`
- `/rsbsa-preview/:id/mao-id`

### Registration Form

The registration form is RSBSA-aligned and collects:

- Enrollment type
- Reference ID for updates
- Date administered
- Personal details
- Birth details
- Contact details
- Address and barangay
- Household information
- Civil status and spouse information
- Education
- Religion
- PWD, 4Ps, indigenous group, government ID, association membership
- Emergency contact
- Main livelihood
- Farming, farmworker, fishing, or agri-youth activities
- Income information
- Parcel information
- Commodity information
- Photo

Draft behavior:

- The form saves a draft in browser local storage.
- Users can resume incomplete registration data on the same browser.

Beneficiary flow:

1. Beneficiary logs in or signs up.
2. Beneficiary opens `/registration`.
3. System pre-fills known account name, email, and phone where possible.
4. If a linked registrant exists, the system can load the linked record.
5. Beneficiary fills required RSBSA fields and uploads a photo.
6. System submits the registration.
7. User is redirected to an RSBSA preview page.

Staff flow:

1. Staff opens Registration.
2. Barangay-scoped users are limited to assigned barangays.
3. Staff can encode new registration or update records.
4. MAO/sector/super admin can review and approve pending registrations.

### Registration Management

Path: `/admin/registrations`

Main capabilities:

- Search by registry number, name, or phone.
- Filter by sector.
- Filter by status.
- Filter by barangay.
- View registrant profile.
- Edit registrant details.
- Approve pending registrants.
- Deactivate registrants.
- Archive registrants with reason.
- Detect duplicate records.
- Download RSBSA forms by date range.

Registrant statuses:

- `pending`
- `approved`
- `deactivated`

Approval flow:

1. Authorized staff opens Registration Management.
2. Staff searches or filters pending records.
3. Staff opens action menu and selects Approve.
4. System marks record approved and stores approval information.
5. Record becomes available for services and tracking.

Archive flow:

1. Authorized staff selects Archive.
2. System asks for reason: Duplicate Record, Requested by Registrant, Inactive, Transferred, Deceased, Incorrect Registration, or Other.
3. System stores previous status, archive metadata, and moves the record to archive.
4. User is redirected to archived registrants.

Duplicate detection flow:

1. Authorized staff selects Duplicates.
2. System groups possible duplicate registrants.
3. Staff reviews matching records.
4. Staff may open profile, edit, or archive duplicates.

### RSBSA Preview and Digital ID

The system can render:

- RSBSA preview forms.
- Printable/downloadable RSBSA form output.
- TARSIS digital ID and MAO ID view.

The digital ID is linked to an active registry record and can include a QR code for verification.

## 9. Barangay Coverage and Map

Paths:

- `/admin/barangays`
- `/map`

Barangay coverage stores and displays:

- Barangay name.
- Registration coverage and target.
- Enrollment status.
- Operating hours or schedule.
- Assigned personnel.
- Coordinates or mapping information.

Barangay staff see assigned barangay schedules. MAO staff and Super Admin can manage barangay coverage details. The barangay map is available for roles that are allowed to view mapped barangay information.

Typical flow:

1. Staff opens Barangays.
2. System displays barangay coverage records.
3. Staff reviews status, assigned personnel, and target details.
4. Authorized users update schedules or coverage information.

## 10. Geo-Mapping Module

Path: `/admin/geo-mapping`

Geo-mapping supports location upload and preview for agricultural plots or beneficiary locations.

Supported sample files are provided under public downloads:

- Sample GPX file.
- Sample CSV file.

General flow:

1. Authorized staff opens Geo Mapping.
2. Staff uploads GPX, CSV, or compatible file.
3. System previews records.
4. Staff matches location data to registrants or plot owners.
5. System stores geo-location records for mapping and monitoring.

## 11. Assistance Module

Path: `/assistance`

The assistance module tracks agricultural assistance applications and distribution progress.

Important fields:

- Beneficiary/registrant
- Assistance type
- Program/sector
- Description
- Supporting photo evidence
- Status
- Applied date
- Approved date
- Released date
- Remarks

Assistance statuses:

- `application_submitted`
- `received_by_mao`
- `forwarded_to_mswdo`
- `under_review`
- `approved`
- `rejected`
- `released`

Staff flow:

1. Authorized staff opens Assistance.
2. Staff searches approved registrants by registry number or name.
3. Staff encodes an assistance record.
4. Staff uploads required supporting photo.
5. Staff sets the current status.
6. As the application moves forward, staff updates the status and dates.
7. Staff may archive the record with reason when needed.

Beneficiary flow:

1. Beneficiary opens Assistance Tracker.
2. System finds the beneficiary's linked registrant profile.
3. System displays assistance records and status timeline.

## 12. Insurance and Calamity Module

Path: `/insurance`

The insurance module tracks PCIC-related claims, endorsements, approvals, and releases.

Important fields:

- Beneficiary/registrant
- Claim type
- Policy number
- Calamity/event
- Incident date
- Estimated loss
- Endorsement status
- Approval status
- Release status
- Remarks

Claim types:

- `farmer`
- `fisherfolk`
- `poultry`
- `livestock`
- `personal`

Endorsement statuses:

- `claim_submitted`
- `documents_verified`
- `forwarded_to_pcic`

Approval statuses:

- `under_processing`
- `approved`
- `rejected`

Release statuses:

- `pending`
- `released`

Staff flow:

1. Authorized staff opens Insurance and Calamity.
2. Staff searches approved registrants.
3. Staff encodes claim details.
4. Staff updates endorsement, approval, and release status as the claim progresses.
5. Staff archives records when needed.

Beneficiary flow:

1. Beneficiary opens Insurance Tracker.
2. System displays linked insurance/calamity claims.
3. Beneficiary reviews status timeline and details.

## 13. Announcements Module

Paths:

- `/admin/announcements`
- `/announcements`
- `/announcements/:id`
- `/advisories`
- `/advisories/:id`

Announcement types:

- `bulletin`
- `advisory`
- `distribution_schedule`
- `assistance_update`
- `insurance_update`
- `pest`
- `disease`
- `calamity`
- `compliance_requirements`
- `other_purpose`

Announcement fields:

- Type
- Publication date
- Expiry date
- Title
- Body
- Image/photo
- Push notification flag
- Facebook publishing flag
- Target sectors
- Target barangays
- Optional target registrant

Creation flow:

1. Sector head or Super Admin opens Announcement Management.
2. User selects Create Announcement.
3. User chooses type, publication date, title, body, image, expiry date, and target audience.
4. User may enable push notification or Facebook publishing.
5. System saves announcement.
6. Announcement appears publicly or to targeted users according to visibility rules.

Targeting rules:

- Empty target sectors means general/all sectors.
- Empty target barangays means general/all barangays.
- Sector heads are mapped to their sector for visibility and dashboard scope.
- Beneficiary visibility can be filtered by linked registrant sector and barangay.

Public interaction:

- Public users can view announcement details.
- Comments and reactions may be stored through announcement comment endpoints.

Upcoming events:

- Dashboard upcoming events use announcements whose dates overlap the next 7 days.
- Relevant types include distribution schedules, calamities, bulletins, advisories, pest notices, and disease notices.

## 14. Notifications

Path: `/notifications`

Notifications support system communication and delivery tracking. The app includes notification delivery records and resend operations for authorized users.

Main capabilities:

- View notification delivery records.
- Filter by date range.
- Create notifications.
- Target messages to registrants where applicable.
- Resend a notification.
- Resend in bulk.

Top-right notification bell:

- Displays notification items.
- Tracks read/unread state in browser local storage.
- Supports mark all read.

## 15. Reports

Path: `/admin/reports`

The report dashboard collects operational metrics:

- Monthly registrants.
- Total registrants.
- Approved registrants.
- Assistance applications.
- Pending assistance.
- Released assistance.
- Calamity/insurance applications.
- Pending insurance.
- Released insurance.
- Archived registrants.
- Archived assistance applications.
- Archived insurance applications.
- Registrants by sector.
- Barangay ranking.
- Seasonal production summary.

Export support:

- Report export can generate downloadable files, including CSV-like output.
- Supported dataset options include regular registrants and archived records.
- Super Admin has broader report access.

## 16. Archive Modules

Paths:

- `/admin/archived/registrants`
- `/admin/archived/assistance`
- `/admin/archived/insurance`

Archived records retain:

- Previous status.
- Archive date.
- Archived by.
- Archive reason.
- Related record payload or core fields.

Common archive flow:

1. Staff archives a record with a reason.
2. System removes it from the active module view.
3. System displays it in the appropriate archived module.
4. Authorized users may restore or permanently delete where supported.

## 17. User Management

Path: `/admin/users`

Accessible to Super Admin only.

Capabilities:

- View users.
- Search by name, email, or phone.
- Filter by role and status.
- View user profile.
- Create staff/admin accounts.
- Edit account details.
- Assign roles.
- Assign one or more barangays.
- Activate or deactivate accounts.
- Reset passwords.
- Archive users.
- Restore archived users.
- Permanently delete users.
- Export visible users to CSV.

Create user flow:

1. Super Admin opens User Management.
2. Selects Create User.
3. Enters personal information, username, temporary password, role, status, and barangay assignment.
4. System validates and creates user.
5. User can log in with provided credentials.

Password reset flow:

1. Super Admin opens a user action menu.
2. Selects Reset Password.
3. Enters temporary password.
4. System updates password and marks `must_change_password`.
5. User logs in and is forced to set a new password.

Archive user flow:

1. Super Admin selects Archive.
2. Selects reason: Inactive Employee, Transferred, Duplicate Account, Resigned, or Other.
3. System moves user to archived users.

## 18. Audit Logs

Path: `/admin/audit-logs`

Accessible to Super Admin only.

Audit logs track important system actions such as:

- Login.
- Profile updates.
- Password changes.
- User actions.
- Registration actions.
- Other auditable records.

Typical flow:

1. Super Admin opens Audit Logs.
2. System displays recorded actions.
3. Super Admin searches or filters by action, user, record type, or date.
4. Super Admin exports logs if needed.

## 19. Account Profile and Settings

Paths:

- `/account/profile`
- `/settings`

Account profile:

- Displays account details.
- Shows linked registry profile when available.
- Allows avatar upload.
- Allows profile update.

Settings:

- Change password.
- View notification preferences.
- View privacy/support details.
- Review account/security information.

Change password flow:

1. User opens Settings.
2. Enters current password, new password, and confirmation.
3. System validates current password and confirmation.
4. System updates password and stores password changed timestamp.

## 20. Data Model Summary

### User

Stores:

- Name, email, username, phone
- Password
- Role and requested role
- Status
- Barangay assignment
- Permissions
- Avatar path
- Office/department
- Password metadata
- Archive metadata

### Registrant

Stores:

- Registry number
- Sector and status
- Personal identity information
- Contact details
- Photo
- Barangay and address
- Ownership/farm/fishery/livestock/poultry details
- Expected production
- RSBSA payload
- Approval, deactivation, and archive metadata

### Barangay

Stores barangay-level coverage, schedule, location, assigned personnel, registration targets, and related registrants.

### Announcement

Stores:

- Type, title, body
- Image
- Publish and expiry dates
- Target sectors and barangays
- Target registrant
- Push/Facebook options
- Creator

### Assistance Application

Stores:

- Registrant
- Assistance type and program
- Description and evidence photo
- Status dates
- Archive metadata
- Encoder and remarks

### Insurance Claim

Stores:

- Registrant
- Claim type and policy details
- Calamity/event details
- Loss estimate
- Endorsement, approval, and release statuses
- Archive metadata
- Encoder and remarks

### Audit Log

Stores system action history linked to user and auditable records.

## 21. Primary API Areas

Public endpoints include:

- Login and register
- Public registrant preview/profile
- Barangays
- Public announcements
- Announcement comments and reactions

Authenticated endpoints include:

- Current user profile and activity
- Avatar/profile/password update
- Dashboard/report data
- Barangay coverage
- Registrants and registration actions
- Geo-location upload and preview
- Assistance applications
- Insurance claims
- Notifications
- Audit logs
- User management
- Archive restore/delete operations

## 22. Common End-to-End Workflows

### New Beneficiary Registration

1. Visitor signs up.
2. User opens Registration.
3. User fills RSBSA-aligned form and uploads photo.
4. System creates a pending registrant record.
5. MAO or authorized sector head reviews record.
6. Authorized user approves record.
7. Beneficiary can view profile, digital ID, and trackers.

### Assistance Release

1. Beneficiary becomes approved registrant.
2. Staff opens Assistance.
3. Staff selects registrant.
4. Staff encodes application and evidence.
5. Staff updates status from submitted to received, forwarded, under review, approved/rejected, and released.
6. Beneficiary checks progress in Assistance Tracker.

### PCIC Claim Monitoring

1. Approved registrant reports a calamity/insurance concern.
2. Staff opens Insurance.
3. Staff encodes claim type, calamity/event, incident date, and loss estimate.
4. Staff updates endorsement status and approval status.
5. Staff marks release when completed.
6. Beneficiary views progress in Insurance Tracker.

### Announcement Publishing

1. Sector head or Super Admin creates announcement.
2. User selects type, schedule, targets, and image.
3. System stores announcement.
4. Announcement appears in public listing or targeted user views.
5. Dashboard upcoming events shows it if the date is within the next 7 days.

### Account Recovery

1. User selects Forgot password on login page.
2. User emails MAO support.
3. Super Admin verifies identity externally.
4. Super Admin resets password from User Management.
5. User logs in using temporary password.
6. System forces user to create a new password.

## 23. Security and Access Control

Security features:

- JWT authentication for protected API routes.
- Role-based middleware on backend routes.
- Frontend navigation hidden or shown by role permissions.
- Password hashing.
- Account status checks during login.
- Forced password change after reset.
- Audit logging for important actions.
- Barangay scoping for barangay technical staff.
- Sector scoping for sector heads.

Important access rules:

- Super Admin is the only role that manages users and audit logs.
- Barangay staff can only operate within assigned barangays.
- Sector heads are scoped to their sector for dashboard/report relevance.
- Beneficiaries only see their linked records and public/targeted announcements.

## 24. Operational Notes

### Local Development

Typical local development commands:

```bash
composer install
npm install
php artisan migrate --seed
php artisan serve
npm run dev
```

Build command:

```bash
npm run build
```

### File Storage

When using uploaded images or documents, ensure Laravel public storage is linked:

```bash
php artisan storage:link
```

### Seed Accounts

The database seeder creates sample accounts and data. Default seed passwords should be changed before real deployment.

### Password Reset Policy

The current implementation uses administrator reset, not automated reset tokens. Any official deployment should define a clear office procedure for verifying reset requests.

### Data Quality

Before approving registrants, staff should check:

- Duplicate names or phone numbers.
- Correct barangay.
- Correct sector.
- Valid contact details.
- Complete RSBSA-required fields.
- Clear uploaded photo.

### Backup Recommendation

Back up:

- Database.
- Storage uploads.
- `.env` configuration.
- Generated/downloaded report files if retained outside the system.

## 25. Maintenance Checklist

Daily or weekly:

- Review pending registrations.
- Review assistance and insurance pending statuses.
- Check upcoming distribution announcements.
- Confirm barangay schedules.
- Review failed or pending notification deliveries.

Monthly:

- Export reports.
- Review archived records.
- Review inactive accounts.
- Check audit logs.
- Back up database and storage.

Before deployment:

- Set production `.env`.
- Configure database.
- Configure mail/Facebook integrations if used.
- Run migrations.
- Link storage.
- Build frontend assets.
- Change seed/default passwords.
- Verify role access for each user type.

## 26. Known Current Behavior

- Forgot password uses an email support link and administrator reset process.
- Upcoming dashboard events show a 7-day window.
- Notification bell contains local read/unread state.
- Registration drafts are stored in browser local storage.
- RSBSA bulk downloads are generated client-side from rendered forms.
- Facebook publishing is represented by form fields and status display; production integration depends on configured services.

## 27. Glossary

- TARSIS: Tubigon Agricultural Registry and Services Information System.
- MAO: Municipal Agriculture Office.
- RSBSA: Registry System for Basic Sectors in Agriculture.
- PCIC: Philippine Crop Insurance Corporation.
- Registrant: A beneficiary record stored in the municipal agriculture registry.
- Beneficiary: A farmer, fisherfolk, livestock raiser, poultry raiser, or agricultural worker using the public account features.
- Sector Head: Staff role responsible for a specific agricultural sector.
- Barangay Scope: Access limited to one or more assigned barangays.
- Archive: A soft-removal process that keeps record history and reason.
