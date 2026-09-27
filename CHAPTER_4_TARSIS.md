CHAPTER IV

METHODOLOGY

4.1 Requirements Analysis and Requirements Documentation

This chapter presents the methodology used in the development of TARSIS, a web-based agricultural registration and service information system for the Municipal Agriculture Office of Tubigon, Bohol. The system was designed to support RSBSA-aligned beneficiary registration, profile validation, barangay coverage monitoring, digital identification, assistance tracking, insurance claim monitoring, public advisories, reports, and administrative management.

To illustrate the structure and operation of the project, the developers identified the major users of the system and documented the main use cases. The system involves visitors or public users, registrants, barangay technical staff, sector heads, the MAO administrator, and the super administrator. Each role has specific access depending on its responsibilities.

Use Case Diagram

Figure 4.1.1 User Diagram

Use Case Description

Use Case Name:
Login

ID: 1

Important Level:
High

Primary Actor:
Super Administrator

Use Case Type: Essential, Detail

Scenario: The super administrator wants to access the system.

Brief Description: This use case explains how the super administrator logs in to access the dashboard and administrative modules.

Trigger: The super administrator opens the login page.

Normal Flow of Events:
1. The super administrator enters a valid email or username and password.
2. The system authenticates the credentials.
3. The system verifies the Super Administrator role.
4. The system redirects the super administrator to the dashboard.
5. The system ends.

Sub Flows:
Role-based access: The system displays super administrator modules after successful login.

Alternative/Exceptional Flows:
If the credentials are invalid or the account is inactive, the system displays an error message and denies access.

Table 4.1.1 Login (Super Administrator)

Use Case Name:
Manage Users and Roles

ID: 2

Important Level:
High

Primary Actor:
Super Administrator

Use Case Type: Essential, Detail

Scenario: The super administrator wants to manage system users and their access privileges.

Brief Description: This use case explains how the super administrator creates, updates, activates, deactivates, archives, restores, resets passwords, grants roles, and assigns barangays to users.

Trigger: The super administrator selects the user management module.

Normal Flow of Events:
1. The super administrator logs in to the system.
2. The super administrator opens the user management page.
3. The system displays user accounts and user statistics.
4. The super administrator creates or selects a user account.
5. The super administrator updates the role, status, barangay assignment, or account details.
6. The system validates and saves the changes.
7. The system records the action in the audit logs.
8. The system ends.

Sub Flows:
Role granting: The super administrator approves or changes a user's requested role.

Alternative/Exceptional Flows:
If the account information is invalid or duplicated, the system displays validation errors and prevents saving until corrected.

Table 4.1.2 Manage Users and Roles

Use Case Name:
View Audit Logs

ID: 3

Important Level:
Medium

Primary Actor:
Super Administrator

Use Case Type: Essential, Detail

Scenario: The super administrator wants to monitor system activities and account actions.

Brief Description: This use case explains how the super administrator views and exports audit logs for accountability and monitoring.

Trigger: The super administrator selects the audit logs module.

Normal Flow of Events:
1. The super administrator logs in to the system.
2. The super administrator opens the audit logs page.
3. The system displays recorded user actions.
4. The super administrator searches or filters logs.
5. The system displays matching audit entries.
6. The super administrator exports logs when needed.
7. The system ends.

Sub Flows:
Audit filtering: Logs may be filtered by action, user, record type, or date.

Alternative/Exceptional Flows:
If no audit records match the filter, the system displays an empty result message.

Table 4.1.3 View Audit Logs

Use Case Name:
Logout

ID: 4

Important Level:
High

Primary Actor:
Super Administrator

Use Case Type: Essential, Detail

Scenario: The super administrator wants to end the session.

Brief Description: This use case explains how the super administrator securely logs out of the system.

Trigger: The super administrator selects the logout option.

Normal Flow of Events:
1. The super administrator clicks the logout button.
2. The system terminates the active session or token.
3. The system redirects the super administrator to the login page.
4. The system ends.

Sub Flows:
None.

Alternative/Exceptional Flows:
If logout fails, the system displays an error and prompts the super administrator to retry.

Table 4.1.4 Logout (Super Administrator)

Use Case Name:
Login

ID: 5

Important Level:
High

Primary Actor:
MAO Administrator

Use Case Type: Essential, Detail

Scenario: The MAO administrator wants to access the system.

Brief Description: This use case explains how the MAO administrator logs in to access MAO operational modules.

Trigger: The MAO administrator opens the login page.

Normal Flow of Events:
1. The MAO administrator enters a valid email or username and password.
2. The system authenticates the credentials.
3. The system verifies the MAO Administrator role.
4. The system redirects the MAO administrator to the dashboard.
5. The system ends.

Sub Flows:
Role-based access: The system displays MAO administrator modules after successful login.

Alternative/Exceptional Flows:
If credentials are invalid or the account is inactive, the system displays an error message and denies access.

Table 4.1.5 Login (MAO Administrator)

Use Case Name:
Manage Barangay Coverage

ID: 6

Important Level:
High

Primary Actor:
MAO Administrator

Use Case Type: Essential, Detail

Scenario: The MAO administrator wants to monitor and update barangay registration coverage.

Brief Description: This use case explains how the MAO administrator views barangay records, enrollment schedules, assigned personnel, registration targets, and underserved barangay status.

Trigger: The MAO administrator selects the barangay coverage module.

Normal Flow of Events:
1. The MAO administrator logs in to the system.
2. The MAO administrator opens the barangay coverage page.
3. The system displays the list of barangays.
4. The MAO administrator reviews enrollment status, schedule, assigned personnel, and registrant target.
5. The MAO administrator updates barangay coverage details.
6. The system validates and saves the updated information.
7. The system ends.

Sub Flows:
Export: The MAO administrator may export barangay coverage records.

Alternative/Exceptional Flows:
If required barangay fields are missing, the system displays a validation message.

Table 4.1.6 Manage Barangay Coverage

Use Case Name:
Manage Registrants

ID: 7

Important Level:
High

Primary Actor:
MAO Administrator

Use Case Type: Essential, Detail

Scenario: The MAO administrator wants to review and manage registrant records.

Brief Description: This use case explains how the MAO administrator views, searches, approves, deactivates, archives, restores, or updates registrant records.

Trigger: The MAO administrator selects the registration management module.

Normal Flow of Events:
1. The MAO administrator logs in to the system.
2. The MAO administrator opens the registration management page.
3. The system displays registrant records.
4. The MAO administrator searches, filters, or opens a registrant profile.
5. The MAO administrator approves, updates, deactivates, archives, or restores the record.
6. The system saves the changes and records the action.
7. The system ends.

Sub Flows:
Approval: The MAO administrator reviews registrant details and approves a valid record.

Alternative/Exceptional Flows:
If the selected registrant record is incomplete, the system displays a validation message.

Table 4.1.7 Manage Registrants

Use Case Name:
Review Duplicate Registrant Records

ID: 8

Important Level:
High

Primary Actor:
MAO Administrator

Use Case Type: Essential, Detail

Scenario: The MAO administrator wants to identify possible duplicate beneficiary records.

Brief Description: This use case explains how the MAO administrator reviews possible duplicate registrant records based on identifying information.

Trigger: The MAO administrator selects the duplicate records option from registration management.

Normal Flow of Events:
1. The MAO administrator opens the duplicate records page or filter.
2. The system analyzes registrant records.
3. The system displays possible duplicate entries.
4. The MAO administrator reviews the matching records.
5. The MAO administrator updates, archives, or retains records based on verification.
6. The system saves the action.
7. The system ends.

Sub Flows:
Record verification: The MAO administrator may open each registrant profile before deciding what action to perform.

Alternative/Exceptional Flows:
If no duplicate records are found, the system displays an empty result message.

Table 4.1.8 Review Duplicate Registrant Records

Use Case Name:
Manage Assistance Applications

ID: 9

Important Level:
High

Primary Actor:
MAO Administrator

Use Case Type: Essential, Detail

Scenario: The MAO administrator wants to manage agricultural assistance applications.

Brief Description: This use case explains how the MAO administrator records, reviews, approves, releases, archives, or restores assistance applications.

Trigger: The MAO administrator selects the assistance module.

Normal Flow of Events:
1. The MAO administrator opens the assistance page.
2. The system displays assistance application records.
3. The MAO administrator creates or opens an assistance application.
4. The MAO administrator updates the program name, assistance type, status, dates, remarks, or evidence.
5. The system saves the application record.
6. The system ends.

Sub Flows:
Status tracking: The system records pending, approved, released, or archived status updates.

Alternative/Exceptional Flows:
If the selected registrant does not exist or the fields are invalid, the system displays an error message.

Table 4.1.9 Manage Assistance Applications

Use Case Name:
Manage Insurance Claims

ID: 10

Important Level:
High

Primary Actor:
MAO Administrator

Use Case Type: Essential, Detail

Scenario: The MAO administrator wants to record and monitor insurance or calamity claims.

Brief Description: This use case explains how the MAO administrator manages claim information, calamity events, estimated losses, endorsement status, approval status, and release status.

Trigger: The MAO administrator selects the insurance module.

Normal Flow of Events:
1. The MAO administrator opens the insurance page.
2. The system displays claim records.
3. The MAO administrator creates or updates a claim.
4. The MAO administrator enters claim type, policy number, calamity event, incident date, estimated loss, and remarks.
5. The MAO administrator updates endorsement, approval, or release status.
6. The system saves the claim record.
7. The system ends.

Sub Flows:
Claim tracking: The system allows the MAO administrator to monitor claim progress from endorsement up to release.

Alternative/Exceptional Flows:
If data is incomplete, the system rejects the request and displays an error message.

Table 4.1.10 Manage Insurance Claims

Use Case Name:
Manage Notification Deliveries

ID: 11

Important Level:
Medium

Primary Actor:
MAO Administrator

Use Case Type: Essential, Detail

Scenario: The MAO administrator wants to monitor or resend notifications connected to announcements or advisories.

Brief Description: This use case explains how the MAO administrator views notification delivery records and resends failed or pending notifications.

Trigger: The MAO administrator selects the notifications module.

Normal Flow of Events:
1. The MAO administrator opens the notifications page.
2. The system displays notification delivery records.
3. The MAO administrator reviews the recipient, channel, message, status, and sent date.
4. The MAO administrator selects a notification or group of notifications to resend when needed.
5. The system processes the resend request.
6. The system updates the delivery status.
7. The system ends.

Sub Flows:
Bulk resend: The MAO administrator may resend multiple notification deliveries at once.

Alternative/Exceptional Flows:
If a notification provider fails, the system records the failure and displays the delivery status.

Table 4.1.11 Manage Notification Deliveries

Use Case Name:
Manage Geo-Mapping

ID: 12

Important Level:
High

Primary Actor:
MAO Administrator

Use Case Type: Essential, Detail

Scenario: The MAO administrator wants to view or upload geolocation information for agricultural areas.

Brief Description: This use case explains how the system manages map-based records connected to registrants, barangays, and uploaded GPX or CSV data.

Trigger: The MAO administrator selects the geo-mapping module.

Normal Flow of Events:
1. The MAO administrator opens the geo-mapping page.
2. The system displays existing map records.
3. The MAO administrator previews or uploads geolocation data.
4. The system validates the file or location details.
5. The system stores coordinates and related registrant information.
6. The map updates to show the plotted area or point.
7. The system ends.

Sub Flows:
Preview upload: The MAO administrator may preview file contents before final upload.

Alternative/Exceptional Flows:
If the uploaded file has an invalid format or missing coordinates, the system displays an error message.

Table 4.1.12 Manage Geo-Mapping

Use Case Name:
Generate Reports

ID: 13

Important Level:
High

Primary Actor:
MAO Administrator

Use Case Type: Essential, Detail

Scenario: The MAO administrator wants to view dashboard statistics and export reports.

Brief Description: This use case explains how the MAO administrator generates summaries for registrants, barangays, sectors, assistance, insurance, announcements, and other operational records.

Trigger: The MAO administrator selects the dashboard or reports module.

Normal Flow of Events:
1. The MAO administrator opens the dashboard or reports page.
2. The system retrieves current statistics and records.
3. The MAO administrator applies filters when needed.
4. The system displays charts, summary cards, and tables.
5. The MAO administrator exports a report when allowed.
6. The system ends.

Sub Flows:
Filtered reporting: The MAO administrator may filter data by sector, barangay, status, or date range.

Alternative/Exceptional Flows:
If there are no matching records, the system displays an empty result message.

Table 4.1.13 Generate Reports

Use Case Name:
Manage Archived Records

ID: 14

Important Level:
High

Primary Actor:
MAO Administrator

Use Case Type: Essential, Detail

Scenario: The MAO administrator wants to review, restore, or permanently delete archived records.

Brief Description: This use case explains how the MAO administrator manages archived registrants, assistance applications, and insurance claims.

Trigger: The MAO administrator selects an archived records module.

Normal Flow of Events:
1. The MAO administrator opens the archived records page.
2. The system displays archived records by selected type.
3. The MAO administrator reviews the archive reason and record details.
4. The MAO administrator restores or permanently deletes the selected record.
5. The system updates the archive records.
6. The system ends.

Sub Flows:
Restore record: The system returns the archived record to active records when restoration is confirmed.

Alternative/Exceptional Flows:
If the record no longer exists, the system displays an error message.

Table 4.1.14 Manage Archived Records

Use Case Name:
Logout

ID: 15

Important Level:
High

Primary Actor:
MAO Administrator

Use Case Type: Essential, Detail

Scenario: The MAO administrator wants to end the session.

Brief Description: This use case explains how the MAO administrator securely logs out of the system.

Trigger: The MAO administrator selects the logout option.

Normal Flow of Events:
1. The MAO administrator clicks the logout button.
2. The system terminates the active session or token.
3. The system redirects the MAO administrator to the login page.
4. The system ends.

Sub Flows:
None.

Alternative/Exceptional Flows:
If logout fails, the system displays an error and prompts the MAO administrator to retry.

Table 4.1.15 Logout (MAO Administrator)

Use Case Name:
Login

ID: 16

Important Level:
High

Primary Actor:
Sector Head

Use Case Type: Essential, Detail

Scenario: The sector head wants to access the system.

Brief Description: This use case explains how the sector head logs in to access sector-related modules.

Trigger: The sector head opens the login page.

Normal Flow of Events:
1. The sector head enters a valid email or username and password.
2. The system authenticates the credentials.
3. The system verifies the assigned sector head role.
4. The system redirects the sector head to the dashboard.
5. The system ends.

Sub Flows:
Sector role access: The system identifies whether the account is Crop Head, Fishery Head, Livestock Head, or Poultry Head.

Alternative/Exceptional Flows:
If credentials are invalid or the account is inactive, the system displays an error message and denies access.

Table 4.1.16 Login (Sector Head)

Use Case Name:
Manage Sector Announcements

ID: 17

Important Level:
High

Primary Actor:
Sector Head

Use Case Type: Essential, Detail

Scenario: The sector head wants to publish announcements or advisories for a specific agricultural sector.

Brief Description: This use case explains how a sector head creates, updates, publishes, and targets advisories for farmers, fisherfolk, livestock raisers, or poultry raisers.

Trigger: The sector head selects the announcement management module.

Normal Flow of Events:
1. The sector head logs in to the system.
2. The sector head opens the announcement management page.
3. The sector head creates an announcement title and body.
4. The sector head selects publishing details and target sector information.
5. The system saves and publishes the announcement.
6. The system ends.

Sub Flows:
Targeted advisory: The sector head may target an announcement to a sector, barangay, or specific registrant.

Alternative/Exceptional Flows:
If required fields are missing, the system displays an error message.

Table 4.1.17 Manage Sector Announcements

Use Case Name:
Review Sector Registrants

ID: 18

Important Level:
High

Primary Actor:
Sector Head

Use Case Type: Essential, Detail

Scenario: The sector head wants to review registrants under the assigned agricultural sector.

Brief Description: This use case explains how the sector head views, verifies, approves, or monitors records within the assigned sector.

Trigger: The sector head selects the registration management module.

Normal Flow of Events:
1. The sector head logs in to the system.
2. The sector head opens registration management.
3. The system displays records related to the sector head's assigned sector.
4. The sector head reviews a registrant profile.
5. The sector head approves, updates, or monitors the record as allowed.
6. The system saves the changes.
7. The system ends.

Sub Flows:
Sector filtering: The system limits or filters records based on the sector head's role.

Alternative/Exceptional Flows:
If a record is outside the sector head's scope, the system restricts access.

Table 4.1.18 Review Sector Registrants

Use Case Name:
Logout

ID: 19

Important Level:
High

Primary Actor:
Sector Head

Use Case Type: Essential, Detail

Scenario: The sector head wants to end the session.

Brief Description: This use case explains how the sector head securely logs out of the system.

Trigger: The sector head selects the logout option.

Normal Flow of Events:
1. The sector head clicks the logout button.
2. The system terminates the active session or token.
3. The system redirects the sector head to the login page.
4. The system ends.

Sub Flows:
None.

Alternative/Exceptional Flows:
If logout fails, the system displays an error and prompts the sector head to retry.

Table 4.1.19 Logout (Sector Head)

Use Case Name:
Login

ID: 20

Important Level:
High

Primary Actor:
Barangay Technical Staff

Use Case Type: Essential, Detail

Scenario: The barangay technical staff wants to access the system.

Brief Description: This use case explains how barangay technical staff log in to access barangay-scoped records.

Trigger: The barangay technical staff opens the login page.

Normal Flow of Events:
1. The barangay technical staff enters a valid email or username and password.
2. The system authenticates the credentials.
3. The system verifies the Barangay Technical Staff role.
4. The system redirects the barangay technical staff to the dashboard.
5. The system ends.

Sub Flows:
Barangay access: The system applies assigned barangay access after login.

Alternative/Exceptional Flows:
If credentials are invalid or the account is inactive, the system displays an error message and denies access.

Table 4.1.20 Login (Barangay Technical Staff)

Use Case Name:
Monitor Assigned Barangay Registrants

ID: 21

Important Level:
High

Primary Actor:
Barangay Technical Staff

Use Case Type: Essential, Detail

Scenario: The barangay technical staff wants to monitor registrants within an assigned barangay.

Brief Description: This use case explains how barangay technical staff view, verify, and monitor registration records under assigned barangay access.

Trigger: The barangay technical staff selects the registration management module.

Normal Flow of Events:
1. The barangay technical staff logs in to the system.
2. The barangay technical staff opens registration management.
3. The system displays registrants within the assigned barangay scope.
4. The barangay technical staff reviews registrant information.
5. The barangay technical staff updates or verifies allowed information.
6. The system saves the changes.
7. The system ends.

Sub Flows:
Barangay scope: The system filters records based on assigned barangay access.

Alternative/Exceptional Flows:
If the staff attempts to access a record outside the assigned barangay, the system restricts access.

Table 4.1.21 Monitor Assigned Barangay Registrants

Use Case Name:
Logout

ID: 22

Important Level:
High

Primary Actor:
Barangay Technical Staff

Use Case Type: Essential, Detail

Scenario: The barangay technical staff wants to end the session.

Brief Description: This use case explains how barangay technical staff securely log out of the system.

Trigger: The barangay technical staff selects the logout option.

Normal Flow of Events:
1. The barangay technical staff clicks the logout button.
2. The system terminates the active session or token.
3. The system redirects the barangay technical staff to the login page.
4. The system ends.

Sub Flows:
None.

Alternative/Exceptional Flows:
If logout fails, the system displays an error and prompts the barangay technical staff to retry.

Table 4.1.22 Logout (Barangay Technical Staff)

Use Case Name:
Register Account

ID: 23

Important Level:
High

Primary Actor:
Visitor / Public User

Use Case Type: Essential, Detail

Scenario: A visitor wants to create an account in TARSIS.

Brief Description: This use case explains how a visitor creates an account to access the system and submit agricultural information.

Trigger: The visitor selects the sign-up option.

Normal Flow of Events:
1. The visitor opens the TARSIS sign-up page.
2. The visitor enters the required personal and account information.
3. The system validates the submitted details.
4. The system creates the user account.
5. The system confirms successful registration.
6. The system ends.

Sub Flows:
Account validation: The system checks required fields, email, phone number, and password requirements.

Alternative/Exceptional Flows:
If required fields are missing or invalid, the system displays validation errors and prompts the visitor to correct the form.

Table 4.1.23 Register Account

Use Case Name:
View Public Information and Announcements

ID: 24

Important Level:
Medium

Primary Actor:
Visitor / Public User

Use Case Type: Essential, Detail

Scenario: A visitor wants to view general information and public announcements.

Brief Description: This use case explains how a visitor accesses the landing page, about page, public service information, and public announcements.

Trigger: The visitor opens the TARSIS website.

Normal Flow of Events:
1. The visitor opens the TARSIS website.
2. The system displays the landing page.
3. The visitor views TARSIS information, services, announcements, and contact details.
4. The visitor opens a public announcement when needed.
5. The system displays the announcement details.
6. The system ends.

Sub Flows:
Public announcements: The visitor may open published advisories and announcement details.

Alternative/Exceptional Flows:
If public data cannot be loaded, the system displays an unavailable message.

Table 4.1.24 View Public Information and Announcements

Use Case Name:
Submit RSBSA Registration

ID: 25

Important Level:
High

Primary Actor:
Registrant

Use Case Type: Essential, Detail

Scenario: A registrant wants to submit agricultural profile information.

Brief Description: This use case explains how a registrant submits personal, household, address, and agricultural activity information for RSBSA-aligned registration.

Trigger: The registrant selects the registration module.

Normal Flow of Events:
1. The registrant opens the registration form.
2. The registrant enters personal and household information.
3. The registrant provides address and barangay information.
4. The registrant selects sector and agricultural activity details.
5. The registrant uploads or provides supporting information if required.
6. The system validates and stores the registration record.
7. The system assigns or records a registry number.
8. The system ends.

Sub Flows:
RSBSA preview: The registrant may view the printable RSBSA preview of the submitted record.

Alternative/Exceptional Flows:
If required fields are incomplete or the system detects duplicate information, the system displays warnings or validation messages.

Table 4.1.25 Submit RSBSA Registration

Use Case Name:
Login

ID: 26

Important Level:
High

Primary Actor:
Registrant

Use Case Type: Essential, Detail

Scenario: A registrant wants to access the system.

Brief Description: This use case explains how a registrant logs in to access profile, tracking, and registration-related features.

Trigger: The registrant opens the login page.

Normal Flow of Events:
1. The registrant enters a valid email or username and password.
2. The system authenticates the credentials.
3. The system verifies the Registrant role.
4. The system redirects the registrant to the dashboard or profile page.
5. The system ends.

Sub Flows:
Role-based access: The system displays only registrant-accessible modules.

Alternative/Exceptional Flows:
If credentials are invalid or the account is inactive, the system displays an error message and denies access.

Table 4.1.26 Login (Registrant)

Use Case Name:
View Profile and Tracking Information

ID: 27

Important Level:
High

Primary Actor:
Registrant

Use Case Type: Essential, Detail

Scenario: A registrant wants to view profile, assistance, or insurance tracking information.

Brief Description: This use case explains how a registered beneficiary views personal registration status and related tracking details.

Trigger: The registrant opens the profile or tracker module.

Normal Flow of Events:
1. The registrant logs in to the system.
2. The registrant opens My Profile or the tracking module.
3. The system retrieves the registrant record.
4. The system displays profile details, registration status, and related tracking information.
5. The system ends.

Sub Flows:
Public tracker: The registrant may view tracker instructions and search using available registry information.

Alternative/Exceptional Flows:
If no matching profile is found, the system displays an unavailable record message.

Table 4.1.27 View Profile and Tracking Information

Use Case Name:
Generate Digital ID

ID: 28

Important Level:
High

Primary Actor:
Registrant

Use Case Type: Essential, Detail

Scenario: A registrant wants to view a digital identification card.

Brief Description: This use case explains how the system displays a digital ID with registrant information and QR-based verification.

Trigger: The registrant opens the digital ID or MAO ID preview.

Normal Flow of Events:
1. The registrant opens the digital ID page.
2. The system retrieves the registrant profile.
3. The system generates or displays the ID information and QR code.
4. The registrant views or prints the digital ID.
5. The system ends.

Sub Flows:
QR verification: The QR code links to the public profile or verification record.

Alternative/Exceptional Flows:
If the registry number or profile cannot be found, the system displays an unavailable record message.

Table 4.1.28 Generate Digital ID

Use Case Name:
Manage Account Profile and Settings

ID: 29

Important Level:
Medium

Primary Actor:
Registrant

Use Case Type: Essential, Detail

Scenario: A registrant wants to update personal account settings.

Brief Description: This use case explains how a registrant updates profile information, avatar, password, and account preferences.

Trigger: The registrant selects account profile or settings.

Normal Flow of Events:
1. The registrant opens the account profile or settings page.
2. The system displays current account details.
3. The registrant updates allowed profile information.
4. The registrant submits the changes.
5. The system validates and saves the updates.
6. The system ends.

Sub Flows:
Password update: The registrant enters the current password and new password before saving.

Alternative/Exceptional Flows:
If the current password is invalid or required fields are missing, the system displays an error message.

Table 4.1.29 Manage Account Profile and Settings

Use Case Name:
Logout

ID: 30

Important Level:
High

Primary Actor:
Registrant

Use Case Type: Essential, Detail

Scenario: A registrant wants to end the session.

Brief Description: This use case explains how a registrant securely logs out of the system.

Trigger: The registrant selects the logout option.

Normal Flow of Events:
1. The registrant clicks the logout button.
2. The system terminates the active session or token.
3. The system redirects the registrant to the login page.
4. The system ends.

Sub Flows:
None.

Alternative/Exceptional Flows:
If logout fails, the system displays an error and prompts the registrant to retry.

Table 4.1.30 Logout (Registrant)
4.2 Design of Software, Systems, Product, and Processes

The developers prepared the software design to serve as the blueprint of the TARSIS system. The design covers the user interface, workflow, database structure, and role-based access control. TARSIS follows a web-based architecture where users access the system through a browser, while application logic, authentication, database records, and reports are handled by a centralized server.

The system is composed of a React-based frontend, a Laravel backend, API routes, role middleware, and a relational database. Visitors can access the landing page, announcements, public registration, public profile viewing, and tracker instructions. Registered users can access dashboards and modules based on their role. Administrative users can manage registrations, assistance, insurance, barangay coverage, geo-mapping, reports, announcements, users, archives, and audit logs.

The use case diagram and entity relationship diagram are prepared in the companion diagram source file named TARSIS_USE_CASE_AND_ERD.md.

Output and User-Interface Design

Figure 4.2.1 Landing Page Interface

Figure 4.2.2 Sign-up Interface

Figure 4.2.3 Login Interface

Figure 4.2.4 Dashboard Interface

Figure 4.2.5 RSBSA Registration Form Interface

Figure 4.2.6 RSBSA Preview Interface

Figure 4.2.7 Digital ID / MAO ID Interface

Figure 4.2.8 Registrant Profile Interface

Figure 4.2.9 Registration Management Interface

Figure 4.2.10 Barangay Coverage Interface

Figure 4.2.11 Geo-Mapping Interface

Figure 4.2.12 Assistance Application Interface

Figure 4.2.13 Insurance Claim Interface

Figure 4.2.14 Announcements and Advisories Interface

Figure 4.2.15 Notifications Interface

Figure 4.2.16 Reports Interface

Figure 4.2.17 User Management Interface

Figure 4.2.18 Archived Records Interface

Figure 4.2.19 Audit Logs Interface

4.3 Entity Relationship Diagram

The Entity Relationship Diagram of TARSIS represents the connection between the system's main database tables. The users table stores account and role information. The barangays table stores location and coverage records. The registrants table stores beneficiary registration data and is linked to barangays and approving users. Assistance applications and insurance claims are linked to registrants. Announcements are linked to their creator and may be connected to notification deliveries and comments. Geo-location records are linked to registrants and store mapped barangay information. Audit logs are linked to users and record system actions.

Figure 4.3.1 Entity Relationship Diagram

4.4 Data Dictionary

To better understand the data stored in the database, the data dictionary provides information about the important fields contained in each major table of the TARSIS system.

Users Table

Field Name | Data Type | Length | Description
--- | --- | --- | ---
id | bigint | 20 | Primary key ID of the user
name | varchar | 255 | Full name of the user
username | varchar | 255 | Username used for account identification
middle_name | varchar | 255 | Middle name of the user
email | varchar | 255 | User email address
password | varchar | 255 | Hashed account password
phone | varchar | 255 | User contact number
office_department | varchar | 255 | Office or department assignment
avatar_path | varchar | 255 | Stored path of user avatar
role | varchar | 255 | User role such as super admin, MAO staff, sector head, barangay staff, or farmer
requested_role | varchar | 255 | Role requested by the user during account approval
status | varchar | 255 | Account status
permissions | json | - | Optional user permissions
barangay_id | bigint | 20 | Foreign key connected to barangays table
last_login_at | timestamp | - | Last login date and time
archived_at | timestamp | - | Date and time the user was archived
archived_by | bigint | 20 | User ID of the account that archived the user
archive_reason | varchar | 255 | Reason for archiving the user account
archive_reason_details | text | - | Additional details about the archive reason
created_by | bigint | 20 | User ID of the account that created the user
password_changed_at | timestamp | - | Date and time the password was last changed
two_factor_enabled | boolean | - | Indicates if two-factor authentication is enabled
created_at | timestamp | - | Record creation timestamp
updated_at | timestamp | - | Last record update timestamp

Figure 4.4.1 Database Table of Users

Barangays Table

Field Name | Data Type | Length | Description
--- | --- | --- | ---
id | bigint | 20 | Primary key ID of the barangay
name | varchar | 255 | Name of the barangay
latitude | decimal | 10,7 | Barangay latitude coordinate
longitude | decimal | 10,7 | Barangay longitude coordinate
enrollment_schedule | date | - | Scheduled enrollment date
enrollment_status | varchar | 255 | Enrollment status of the barangay
assigned_technical_personnel | varchar | 255 | Assigned technical personnel
mao_office_details | text | - | MAO-related office details
registrant_target | integer | - | Target number of registrants
is_underserved | boolean | - | Indicates if the barangay is underserved
created_at | timestamp | - | Record creation timestamp
updated_at | timestamp | - | Last record update timestamp

Figure 4.4.2 Database Table of Barangays

Registrants Table

Field Name | Data Type | Length | Description
--- | --- | --- | ---
id | bigint | 20 | Primary key ID of the registrant
registry_number | varchar | 255 | Unique registry number of the registrant
sector | varchar | 255 | Agricultural sector of the registrant
status | varchar | 255 | Registration status
first_name | varchar | 255 | First name of the registrant
middle_name | varchar | 255 | Middle name of the registrant
last_name | varchar | 255 | Last name of the registrant
suffix | varchar | 255 | Name suffix
birthday | date | - | Date of birth
sex | varchar | 255 | Sex of the registrant
civil_status | varchar | 255 | Civil status
phone | varchar | 255 | Contact number
email | varchar | 255 | Email address
photo_path | varchar | 255 | Stored path of registrant photo
address | text | - | Complete address
barangay_id | bigint | 20 | Foreign key connected to barangays table
ownership_type | varchar | 255 | Farm, boat, livestock, or production ownership type
farm_area | decimal | 10,2 | Farm area size
farm_location | varchar | 255 | Farm location
boat_name | varchar | 255 | Boat name for fisherfolk records
livestock_type | varchar | 255 | Livestock type
poultry_type | varchar | 255 | Poultry type
expected_production | json | - | Expected production details
rsbsa_payload | json | - | RSBSA-aligned form data
approved_at | timestamp | - | Approval date and time
approved_by | bigint | 20 | User ID of approving staff
deactivated_at | timestamp | - | Deactivation date and time
archived_at | timestamp | - | Archive date and time
archived_by | bigint | 20 | User ID of the account that archived the registrant
archive_reason | varchar | 255 | Reason for archiving the registrant
previous_status | varchar | 255 | Status of the registrant before archiving
deleted_at | timestamp | - | Soft delete timestamp
created_at | timestamp | - | Record creation timestamp
updated_at | timestamp | - | Last record update timestamp

Figure 4.4.3 Database Table of Registrants

Assistance Applications Table

Field Name | Data Type | Length | Description
--- | --- | --- | ---
id | bigint | 20 | Primary key ID of the assistance application
registrant_id | bigint | 20 | Foreign key connected to registrants table
assistance_type | varchar | 255 | Type of assistance requested or provided
program_name | varchar | 255 | Name of the program
description | text | - | Description of the assistance
status | varchar | 255 | Application status
applied_at | date | - | Application date
approved_at | date | - | Approval date
released_at | date | - | Release date
encoded_by | bigint | 20 | User ID of staff who encoded the record
remarks | text | - | Additional remarks
evidence_path | varchar | 255 | Stored path of evidence file
archived_at | timestamp | - | Archive date and time
archive_reason | varchar | 255 | Reason for archiving the assistance application
backup_payload | json | - | Backup data of the archived application
archived_by | bigint | 20 | User ID of the account that archived the application
previous_status | varchar | 255 | Status of the application before archiving
created_at | timestamp | - | Record creation timestamp
updated_at | timestamp | - | Last record update timestamp

Figure 4.4.4 Database Table of Assistance Applications

Insurance Claims Table

Field Name | Data Type | Length | Description
--- | --- | --- | ---
id | bigint | 20 | Primary key ID of the insurance claim
registrant_id | bigint | 20 | Foreign key connected to registrants table
claim_type | varchar | 255 | Type of insurance or calamity claim
policy_number | varchar | 255 | Insurance policy number
calamity_event | varchar | 255 | Related calamity event
incident_date | date | - | Date of incident
estimated_loss | decimal | 12,2 | Estimated loss amount
endorsement_status | varchar | 255 | Endorsement status
approval_status | varchar | 255 | Approval status
release_status | varchar | 255 | Release status
encoded_by | bigint | 20 | User ID of staff who encoded the record
remarks | text | - | Additional remarks
archived_at | timestamp | - | Archive date and time
archived_by | bigint | 20 | User ID of the account that archived the claim
archive_reason | varchar | 255 | Reason for archiving the insurance claim
previous_status | varchar | 255 | Status of the claim before archiving
created_at | timestamp | - | Record creation timestamp
updated_at | timestamp | - | Last record update timestamp

Figure 4.4.5 Database Table of Insurance Claims

Announcements Table

Field Name | Data Type | Length | Description
--- | --- | --- | ---
id | bigint | 20 | Primary key ID of the announcement
type | varchar | 255 | Announcement type
title | varchar | 255 | Announcement title
body | text | - | Announcement content
image_path | varchar | 255 | Stored path of announcement image
publish_at | datetime | - | Publish date and time
expires_at | datetime | - | Expiration date and time
target_sectors | json | - | Target agricultural sectors
target_barangays | json | - | Target barangays
target_registrant_id | bigint | 20 | Specific target registrant, if applicable
send_sms | boolean | - | Indicates if SMS sending is enabled
send_push | boolean | - | Indicates if push notification is enabled
publish_to_facebook | boolean | - | Indicates if Facebook publishing is enabled
facebook_post_id | varchar | 255 | Facebook post reference ID
created_by | bigint | 20 | User ID of creator
created_at | timestamp | - | Record creation timestamp
updated_at | timestamp | - | Last record update timestamp

Figure 4.4.6 Database Table of Announcements

Notification Deliveries Table

Field Name | Data Type | Length | Description
--- | --- | --- | ---
id | bigint | 20 | Primary key ID of the notification delivery
announcement_id | bigint | 20 | Foreign key connected to announcements table
registrant_id | bigint | 20 | Foreign key connected to registrants table
user_id | bigint | 20 | Foreign key connected to users table
channel | varchar | 255 | Notification channel
recipient | varchar | 255 | Recipient contact information
status | varchar | 255 | Delivery status
message | text | - | Notification message
provider_response | json | - | Response from notification provider
sent_at | timestamp | - | Date and time the notification was sent
created_at | timestamp | - | Record creation timestamp
updated_at | timestamp | - | Last record update timestamp

Figure 4.4.7 Database Table of Notification Deliveries

Geo Locations Table

Field Name | Data Type | Length | Description
--- | --- | --- | ---
id | bigint | 20 | Primary key ID of the geolocation record
farmer_id | bigint | 20 | Foreign key connected to registrants table
plot_name | varchar | 255 | Name of the farm plot or mapped area
uploaded_by | bigint | 20 | User ID of the staff who uploaded the record
source_file | varchar | 255 | Uploaded file source
point_type | varchar | 255 | Type of map point, such as waypoint
sequence_order | integer | - | Order of points in the uploaded map data
barangay | varchar | 255 | Barangay name connected to the location
latitude | decimal | 10,7 | Latitude coordinate
longitude | decimal | 10,7 | Longitude coordinate
elevation | decimal | 10,2 | Elevation value, if available
date_recorded | timestamp | - | Date and time the point was recorded
date_uploaded | timestamp | - | Date and time the point was uploaded
metadata | json | - | Additional uploaded map metadata
created_at | timestamp | - | Record creation timestamp
updated_at | timestamp | - | Last record update timestamp

Figure 4.4.8 Database Table of Geo Locations

Announcement Comments Table

Field Name | Data Type | Length | Description
--- | --- | --- | ---
id | bigint | 20 | Primary key ID of the comment
announcement_id | bigint | 20 | Foreign key connected to announcements table
parent_id | bigint | 20 | Parent comment ID for replies
author_name | varchar | 80 | Name of the comment author
body | text | - | Comment content
likes_count | integer | - | Number of likes on the comment
dislikes_count | integer | - | Number of dislikes on the comment
created_at | timestamp | - | Record creation timestamp
updated_at | timestamp | - | Last record update timestamp

Figure 4.4.9 Database Table of Announcement Comments

Audit Logs Table

Field Name | Data Type | Length | Description
--- | --- | --- | ---
id | bigint | 20 | Primary key ID of the audit log
user_id | bigint | 20 | Foreign key connected to users table
action | varchar | 255 | Action performed by the user
auditable_type | varchar | 255 | Type of record affected
auditable_id | bigint | 20 | ID of affected record
old_values | json | - | Previous values before the action
new_values | json | - | New values after the action
ip_address | varchar | 45 | IP address of the user
user_agent | text | - | Browser or device information
created_at | timestamp | - | Record creation timestamp
updated_at | timestamp | - | Last record update timestamp

Figure 4.4.10 Database Table of Audit Logs



4.6 Implementation Plan

The implementation plan for TARSIS includes system preparation, database setup, role configuration, module checking, user orientation, deployment, and monitoring. These steps ensure that the system is ready for use by the Municipal Agriculture Office, sector heads, barangay technical staff, and registrants.

Table 4.6.1 Implementation Plan

Phase | Activity | Responsible Person | Expected Output
--- | --- | --- | ---
Preparation | Configure application environment and dependencies | Developers | Working TARSIS environment
Database Setup | Run migrations and prepare system tables | Developers / Super Administrator | Ready database structure
Account Setup | Create and assign user roles for administrators and staff | Super Administrator | Authorized user accounts
Module Checking | Test registration, assistance, insurance, reports, and other modules | Developers / MAO Administrator | Verified system modules
User Orientation | Guide staff and registrants on system use | Developers / MAO Administrator | Users familiar with workflow
Deployment | Make the system available for actual use | Developers / MAO Administrator | Operational TARSIS system
Monitoring | Review feedback, logs, errors, and data quality | Developers / Super Administrator | Maintained system

4.7 Implementation Issues and Challenges

Possible challenges in implementing TARSIS include incomplete data, duplicate records, user adjustment, internet connection problems, incorrect role assignment, data security risks, and the transition from manual records to a digital system. These issues can be managed through validation, staff review, user orientation, role-based access control, audit logs, and gradual data migration.

Table 4.7.1 Implementation Issues and Challenges

Issue / Challenge | Possible Effect | Proposed Solution
--- | --- | ---
Incomplete registrant data | Delayed approval or inaccurate records | Use validation rules and staff review
Duplicate registration records | Conflicting beneficiary information | Use duplicate checking and manual verification
Limited user familiarity | Slow adoption of the system | Conduct orientation and provide assistance
Unstable internet connection | Difficulty accessing online modules | Provide assisted registration during office or barangay schedules
Incorrect role assignment | Wrong module access | Let the super administrator manage roles and permissions
Data privacy and security risks | Possible exposure of sensitive information | Use authentication, role restrictions, and audit logs
Manual-to-digital transition | Encoding delays and inconsistent records | Apply gradual migration, data cleaning, and record verification
