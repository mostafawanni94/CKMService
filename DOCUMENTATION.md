# ProTotaalService - Complete Use Case Documentation

## Overview

This document provides comprehensive use case documentation for all three platforms:
- **Backend (Django REST Framework)**
- **Frontend (Next.js Dashboard)**
- **Flutter (Mobile App)**

---

# Part 1: BACKEND (Django REST API)

## App Structure
```
Backend/apps/
├── employees/      # User accounts & employee profiles
├── customers/      # Customer & supplier management
├── projects/       # Project management & assignments
├── worklogs/       # Work log submission & approval
├── invoices/       # Invoice generation & management
├── wallet/         # Employee wallet & advances
├── notifications/  # System notifications
├── certificates/   # Certificate management
└── core/           # Shared utilities
```

---

## 1. EMPLOYEES APP

### 1.1 Models

#### User Model
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| email | EmailField | Unique login identifier |
| role | CharField | admin/employee/finance/operations |
| is_staff | Boolean | Admin access flag |
| is_active | Boolean | Account active status |
| created_at | DateTime | Account creation time |

**Methods:**
- `is_admin()` → Returns True if user is admin
- `is_employee()` → Returns True if user is employee

#### EmployeeProfile Model
| Field | Type | Description |
|-------|------|-------------|
| user | ForeignKey | Link to User account |
| first_name | CharField | Employee first name |
| last_name | CharField | Employee last name |
| prefix_name | CharField | Name prefix (optional) |
| status | CharField | incomplete/pending/approved/rejected/suspended |
| gender | CharField | male/female/other/prefer_not_to_say |
| date_of_birth | DateField | Birth date |
| bsn | CharField | Dutch BSN number |
| nationality | CharField | Nationality |
| phone_number | CharField | Contact phone |
| address | CharField | Street address |
| postcode | CharField | Postal code |
| city | CharField | City |
| iban | CharField | Bank account |
| document_type | ForeignKey | ID document type |
| document_number | CharField | ID document number |
| document_expiry_date | DateField | ID expiry |
| hourly_rate | DecimalField | Current hourly rate |
| contract_phase | CharField | phase_a/phase_b/phase_c |
| agency | ForeignKey | Employment agency (optional) |
| can_add_allowances | Boolean | Permission to add allowances |

**Methods:**
- `full_name` → Returns formatted full name
- `submit_for_approval()` → Changes status to pending
- `approve(admin_user, ...)` → Approves profile, sets contract
- `reject(reason)` → Rejects profile with reason

### 1.2 API ViewSets

#### UserViewSet (Admin Only)
| Endpoint | Method | Action | Description |
|----------|--------|--------|-------------|
| `/employees/users/` | GET | list | List all users |
| `/employees/users/` | POST | create | Create new user account |
| `/employees/users/{id}/` | GET | retrieve | Get user details |
| `/employees/users/{id}/` | PUT/PATCH | update | Update user |
| `/employees/users/{id}/` | DELETE | destroy | Delete user |
| `/employees/users/{id}/share_credentials/` | POST | share_credentials | Share login via email/WhatsApp |
| `/employees/users/{id}/reset_password/` | POST | reset_password | Reset user password |

#### EmployeeProfileViewSet
| Endpoint | Method | Action | Permission | Description |
|----------|--------|--------|------------|-------------|
| `/employees/profiles/` | GET | list | Admin | List all employee profiles |
| `/employees/profiles/{id}/` | GET | retrieve | Admin/Self | Get profile details |
| `/employees/profiles/{id}/` | PUT/PATCH | update | Admin | Update profile |
| `/employees/profiles/my_profile/` | GET | my_profile | Authenticated | Get own profile |
| `/employees/profiles/complete_profile/` | PUT/PATCH | complete_profile | Authenticated | Complete profile on first login |
| `/employees/profiles/submit/` | POST | submit | Authenticated | Submit profile for approval |
| `/employees/profiles/{id}/approve/` | POST | approve | Admin | Approve employee profile |
| `/employees/profiles/{id}/reject/` | POST | reject | Admin | Reject with reason |
| `/employees/profiles/{id}/rate_history/` | GET | rate_history | Admin | Get hourly rate history |
| `/employees/profiles/{id}/contract_history/` | GET | contract_history | Admin | Get contract history |
| `/employees/profiles/{id}/upload_contract/` | POST | upload_contract | Admin | Upload contract document |
| `/employees/profiles/pending_approval/` | GET | pending_approval | Admin | List pending profiles |
| `/employees/profiles/{id}/my_assignments/` | GET | my_assignments | Authenticated | Get employee's project assignments |
| `/employees/profiles/{id}/my_wallet/` | GET | my_wallet | Authenticated | Get employee's wallet |

#### AllowanceTypeViewSet (Admin Only)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/employees/allowance-types/` | GET | List all allowance types |
| `/employees/allowance-types/` | POST | Create new allowance type |
| `/employees/allowance-types/{id}/` | GET | Get allowance type |
| `/employees/allowance-types/{id}/` | PUT/PATCH | Update allowance type |
| `/employees/allowance-types/{id}/` | DELETE | Delete allowance type |

#### SurchargeTypeViewSet (Admin Only)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/employees/surcharge-types/` | GET | List all surcharge types |
| `/employees/surcharge-types/` | POST | Create surcharge type |
| `/employees/surcharge-types/{id}/` | PUT/PATCH | Update surcharge type |

#### AgencyViewSet (Admin Only)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/employees/agencies/` | GET | List employment agencies |
| `/employees/agencies/` | POST | Create new agency |
| `/employees/agencies/{id}/` | GET | Get agency details |
| `/employees/agencies/{id}/` | PUT/PATCH | Update agency |

#### ContractTypeViewSet (Admin Only)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/employees/contract-types/` | GET | List contract types |
| `/employees/contract-types/` | POST | Create contract type |

---

## 2. CUSTOMERS APP

### 2.1 Models

#### Customer Model
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| company_name | CharField | Company name |
| address | CharField | Street address |
| postcode | CharField | Postal code |
| city | CharField | City |
| country | CharField | Country |
| kvk_number | CharField | Chamber of Commerce number |
| vat_number | CharField | VAT number |
| vat_rate | DecimalField | VAT percentage (default 21) |
| payment_terms_days | IntegerField | Payment term in days |
| is_active | Boolean | Active status |
| logo | ImageField | Company logo |

#### Outfolder Model (Supervisors/Rayon Managers)
| Field | Type | Description |
|-------|------|-------------|
| customer | ForeignKey | Parent customer |
| first_name | CharField | First name |
| last_name | CharField | Last name |
| company_name | CharField | Company name (optional) |
| is_active | Boolean | Active status |

**Methods:**
- `full_name` → Returns formatted name

#### Service Model
| Field | Type | Description |
|-------|------|-------------|
| name | CharField | Service name |
| code | CharField | Service code |
| description | TextField | Service description |
| is_active | Boolean | Active status |
| required_certificates | M2M | Required certificate types |

### 2.2 API ViewSets

#### CustomerViewSet (Admin Only)
| Endpoint | Method | Action | Description |
|----------|--------|--------|-------------|
| `/customers/customers/` | GET | list | List all customers |
| `/customers/customers/` | POST | create | Create customer |
| `/customers/customers/{id}/` | GET | retrieve | Get customer details |
| `/customers/customers/{id}/` | PUT/PATCH | update | Update customer |
| `/customers/customers/{id}/add_contact/` | POST | add_contact | Add contact to customer |
| `/customers/customers/{id}/contract_history/` | GET | contract_history | Get contract history |
| `/customers/customers/{id}/upload_contract/` | POST | upload_contract | Upload contract document |
| `/customers/customers/{id}/service_rate_history/` | GET | service_rate_history | Get rate change history |
| `/customers/customers/{id}/update_service_rates/` | POST | update_service_rates | Update service rates |

#### ServiceViewSet (Admin Only)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/customers/services/` | GET | List services |
| `/customers/services/` | POST | Create service |
| `/customers/services/{id}/` | PUT/PATCH | Update service |

#### OutfolderViewSet (Admin Only)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/customers/outfolders/` | GET | List outfolders/supervisors |
| `/customers/outfolders/` | POST | Create outfolder |
| `/customers/outfolders/{id}/` | GET | Get outfolder details |
| `/customers/outfolders/{id}/add_contact/` | POST | Add contact to outfolder |

#### GratuityViewSet (Admin Only)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/customers/gratuities/` | GET | List gratuities |
| `/customers/gratuities/` | POST | Create gratuity |
| `/customers/gratuities/{id}/mark_paid/` | POST | Mark as paid to employee |

#### EmployeeCustomerViewSet (Authenticated - for Flutter)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/customers/worklog-customers/` | GET | List active customers for worklog |
| `/customers/worklog-customers/{id}/outfolders/` | GET | Get customer's supervisors |
| `/customers/worklog-customers/{id}/services/` | GET | Get customer's services |
| `/customers/worklog-customers/{id}/projects/` | GET | Get customer's projects |

---

## 3. PROJECTS APP

### 3.1 Models

#### Project Model
| Field | Type | Description |
|-------|------|-------------|
| name | CharField | Project name |
| customer | ForeignKey | Parent customer |
| outfolder | ForeignKey | Primary supervisor (deprecated) |
| supervisors | M2M | Multiple supervisors |
| location | CharField | Project location |
| address | CharField | Full address |
| city | CharField | City |
| status | CharField | draft/pending/active/on_hold/completed/cancelled |
| start_date | DateField | Project start date |
| end_date | DateField | Project end date (optional) |
| required_certificates | M2M | Required certificates for project |

**Status Choices:**
- `draft` - Not yet started
- `pending` - Awaiting approval
- `active` - Currently active
- `on_hold` - Temporarily paused
- `completed` - Finished
- `cancelled` - Cancelled

#### ProjectAssignment Model
| Field | Type | Description |
|-------|------|-------------|
| project | ForeignKey | Assigned project |
| employee | ForeignKey | Assigned employee |
| role | CharField | Employee's role on project |
| start_date | DateField | Assignment start |
| end_date | DateField | Assignment end (optional) |
| is_active | Boolean | Active assignment |

### 3.2 API ViewSets

#### ProjectViewSet (Admin Only)
| Endpoint | Method | Action | Description |
|----------|--------|--------|-------------|
| `/projects/projects/` | GET | list | List all projects |
| `/projects/projects/` | POST | create | Create project |
| `/projects/projects/{id}/` | GET | retrieve | Get project details |
| `/projects/projects/{id}/` | PUT/PATCH | update | Update project |
| `/projects/projects/{id}/eligible_employees/` | GET | eligible_employees | Get employees with required certificates |
| `/projects/projects/active/` | GET | active | List active projects only |

#### ProjectAssignmentViewSet
| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/projects/assignments/` | GET | Admin | List all assignments |
| `/projects/assignments/` | POST | Admin | Create assignment |
| `/projects/assignments/my/` | GET | Authenticated | Get own assignments (for Flutter) |

---

## 4. WORKLOGS APP

### 4.1 Models

#### WorkLog Model
| Field | Type | Description |
|-------|------|-------------|
| employee | ForeignKey | Employee who worked |
| project | ForeignKey | Project worked on |
| supervisor | ForeignKey | Supervisor (optional) |
| service | ForeignKey | Service type (optional) |
| work_date | DateField | Date of work |
| start_time | TimeField | Work start time |
| end_time | TimeField | Work end time |
| break_duration_minutes | IntegerField | Break duration |
| calculated_hours | DecimalField | Calculated work hours |
| billable_hours | DecimalField | Final billable hours |
| location_override | CharField | Manual location entry |
| status | CharField | draft/submitted/approved/rejected |
| notes | TextField | Work notes |
| rejection_reason | TextField | Reason if rejected |
| admin_notes | TextField | Internal admin notes |
| billing_week_year | IntegerField | Billing week year |
| billing_week_number | IntegerField | Billing week number |
| approved_by | ForeignKey | Admin who approved |
| approved_at | DateTime | Approval timestamp |

**Status Choices:**
- `draft` - Not yet submitted
- `submitted` - Awaiting approval
- `approved` - Approved by admin
- `rejected` - Rejected, needs edit

**Methods:**
- `submit()` → Changes status to submitted
- `approve(admin, adjusted_hours, admin_notes)` → Approves worklog
- `reject(reason)` → Rejects with reason

#### WorkLogAllowance Model
| Field | Type | Description |
|-------|------|-------------|
| work_log | ForeignKey | Parent worklog |
| allowance_type | ForeignKey | Standard allowance type |
| custom_allowance_name | CharField | Custom allowance name |
| hours | DecimalField | Hours for allowance |
| notes | TextField | Notes |

### 4.2 API ViewSets

#### WorkLogViewSet
| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/worklogs/` | GET | Admin/Self | List worklogs (admin all, employee own) |
| `/worklogs/` | POST | Authenticated | Create new worklog |
| `/worklogs/{id}/` | GET | Admin/Self | Get worklog details |
| `/worklogs/{id}/` | PUT/PATCH | Admin/Self | Update worklog |
| `/worklogs/{id}/submit/` | POST | Authenticated | Submit for approval |
| `/worklogs/{id}/approve/` | POST | Admin | Approve worklog |
| `/worklogs/{id}/reject/` | POST | Admin | Reject with reason |
| `/worklogs/{id}/add_photo/` | POST | Authenticated | Add photo to worklog |
| `/worklogs/pending/` | GET | Admin | List pending worklogs |

**Request/Response Examples:**

Create WorkLog:
```json
POST /worklogs/
{
    "project": "uuid",
    "supervisor": "uuid",
    "service": "uuid",
    "work_date": "2024-12-27",
    "start_time": "08:00",
    "end_time": "17:00",
    "break_duration_minutes": 30,
    "location_override": "Amsterdam",
    "notes": "Work notes",
    "allowances": [
        {
            "allowance_type": 1,
            "hours": 2,
            "notes": "Night shift"
        }
    ]
}
```

Approve WorkLog:
```json
POST /worklogs/{id}/approve/
{
    "adjusted_hours": 8.5,
    "admin_notes": "Adjusted break time"
}
```

Reject WorkLog:
```json
POST /worklogs/{id}/reject/
{
    "reason": "Missing project details"
}
```

---

## 5. INVOICES APP

### 5.1 Models

#### Invoice Model
| Field | Type | Description |
|-------|------|-------------|
| invoice_number | CharField | Unique invoice number |
| customer | ForeignKey | Billed customer |
| week_year | IntegerField | Billing week year |
| week_number | IntegerField | Billing week number |
| week_start_date | DateField | Week start (Monday 06:00) |
| week_end_date | DateField | Week end (Sunday 06:00) |
| status | CharField | draft/sent/paid/overdue/cancelled |
| subtotal | DecimalField | Subtotal before VAT |
| vat_rate | DecimalField | VAT percentage |
| vat_amount | DecimalField | Calculated VAT |
| total | DecimalField | Total including VAT |
| issue_date | DateField | Invoice issue date |
| due_date | DateField | Payment due date |
| paid_date | DateField | Actual payment date |
| amount_paid | DecimalField | Amount paid |

**Methods:**
- `calculate_totals()` → Recalculate all totals

#### InvoiceLine Model
| Field | Type | Description |
|-------|------|-------------|
| invoice | ForeignKey | Parent invoice |
| project | ForeignKey | Project worked on |
| employee | ForeignKey | Employee who worked |
| description | CharField | Line description |
| quantity_hours | DecimalField | Hours worked |
| hourly_rate | DecimalField | Rate per hour |
| total | DecimalField | Line total |

#### CostType Model
| Field | Type | Description |
|-------|------|-------------|
| name | CharField | Cost type name |
| code | CharField | Cost code |
| default_price | DecimalField | Default unit price |

### 5.2 API ViewSets

#### InvoiceViewSet (Admin Only)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/invoices/invoices/` | GET | List all invoices |
| `/invoices/invoices/{id}/` | GET | Get invoice details |
| `/invoices/invoices/generate/` | POST | Generate weekly invoice |
| `/invoices/invoices/{id}/finalize/` | POST | Mark as sent |
| `/invoices/invoices/{id}/mark_paid/` | POST | Mark as paid |

**Generate Invoice:**
```json
POST /invoices/invoices/generate/
{
    "customer_id": "uuid",
    "week_year": 2024,
    "week_number": 52
}
```

#### CostTypeViewSet (Admin Only)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/invoices/cost-types/` | GET | List cost types |
| `/invoices/cost-types/` | POST | Create cost type |

#### ProjectRateViewSet (Admin Only)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/invoices/project-rates/` | GET | List project rates |
| `/invoices/project-rates/` | POST | Create rate |

---

## 6. WALLET APP

### 6.1 Models

#### Wallet Model
| Field | Type | Description |
|-------|------|-------------|
| employee | OneToOne | Owner employee |
| balance | DecimalField | Current balance |
| total_earnings | DecimalField | Lifetime earnings |
| total_advances | DecimalField | Total advances taken |
| available_advance | DecimalField | Available for advance |

#### WalletTransaction Model
| Field | Type | Description |
|-------|------|-------------|
| wallet | ForeignKey | Parent wallet |
| transaction_type | CharField | earning/advance/repayment/bonus/deduction/etc |
| amount | DecimalField | Transaction amount |
| description | CharField | Description |
| reference_type | CharField | Source type (worklog, invoice, etc) |
| reference_id | UUIDField | Source ID |
| status | CharField | pending/completed/failed |

#### AdvanceRequest Model
| Field | Type | Description |
|-------|------|-------------|
| employee | ForeignKey | Requesting employee |
| amount | DecimalField | Requested amount |
| reason | TextField | Request reason |
| status | CharField | pending/approved/rejected |
| processed_by | ForeignKey | Admin who processed |
| processed_at | DateTime | Processing timestamp |
| rejection_reason | TextField | Reason if rejected |

### 6.2 API ViewSets

#### WalletViewSet
| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/wallet/wallets/` | GET | Admin/Self | List wallets |
| `/wallet/wallets/{id}/` | GET | Admin/Self | Get wallet details |
| `/wallet/wallets/my_wallet/` | GET | Authenticated | Get own wallet |
| `/wallet/wallets/{id}/transactions/` | GET | Admin/Self | Get transactions |
| `/wallet/wallets/{id}/adjust/` | POST | Admin | Manual adjustment |

**Adjust Wallet:**
```json
POST /wallet/wallets/{id}/adjust/
{
    "adjustment_type": "bonus",
    "amount": 100.00,
    "description": "Performance bonus",
    "notes": "Q4 2024"
}
```

#### AdvanceRequestViewSet
| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/wallet/advances/` | GET | Admin/Self | List advance requests |
| `/wallet/advances/` | POST | Authenticated | Create request |
| `/wallet/advances/{id}/approve/` | POST | Admin | Approve advance |
| `/wallet/advances/{id}/reject/` | POST | Admin | Reject advance |
| `/wallet/advances/pending/` | GET | Admin | List pending requests |

---

## 7. NOTIFICATIONS APP

### 7.1 Models

#### Notification Model
| Field | Type | Description |
|-------|------|-------------|
| recipient | ForeignKey | Target user |
| notification_type | CharField | Type of notification |
| priority | CharField | low/normal/high/urgent |
| title | CharField | Notification title |
| message | TextField | Notification body |
| reference_type | CharField | Source type |
| reference_id | UUIDField | Source ID |
| action_url | CharField | URL for action button |
| is_read | Boolean | Read status |
| read_at | DateTime | When read |

**Notification Types:**
- `credentials_created` - Login credentials created
- `profile_submitted` - Profile submitted for approval
- `profile_approved` - Profile approved
- `profile_rejected` - Profile rejected
- `project_assigned` - Assigned to project
- `worklog_submitted` - Work log submitted
- `worklog_approved` - Work log approved
- `worklog_rejected` - Work log rejected
- `advance_approved` - Advance approved
- `advance_rejected` - Advance rejected
- `invoice_generated` - Invoice generated

---

## 8. CERTIFICATES APP

### 8.1 Models

#### CertificateType Model
| Field | Type | Description |
|-------|------|-------------|
| name | CharField | Certificate type name |
| code | CharField | Short code |
| description | TextField | Description |
| validity_months | IntegerField | How long it's valid |
| is_active | Boolean | Active status |

#### EmployeeCertificate Model
| Field | Type | Description |
|-------|------|-------------|
| employee | ForeignKey | Certificate owner |
| certificate_type | ForeignKey | Type of certificate |
| certificate_number | CharField | Certificate number |
| issue_date | DateField | Issue date |
| expiry_date | DateField | Expiry date |
| document | FileField | Certificate document |
| status | CharField | pending/verified/rejected/expired |

---

# Part 2: FRONTEND (Next.js Dashboard)

## Page Structure
```
Frontend/src/app/
├── login/           # Admin login
├── logout/          # Logout handler
├── dashboard/
│   ├── page.tsx          # Main dashboard
│   ├── employees/        # Employee management
│   ├── customers/        # Customer management
│   ├── projects/         # Project management
│   ├── worklogs/         # Work log management
│   ├── invoices/         # Invoice management
│   ├── wallet/           # Wallet overview
│   ├── agencies/         # Agency management
│   ├── certificates/     # Certificate management
│   ├── gratuities/       # Gratuity management
│   ├── notifications/    # Notification center
│   ├── services/         # Service management
│   ├── settings/         # System settings
│   └── reports/          # Reports & analytics
```

## Dashboard Pages

### 1. Main Dashboard (`/dashboard`)
**Functions:**
- `loadDashboardData()` - Load statistics
- `loadPendingItems()` - Load pending approvals

**Features:**
- Pending employees count
- Pending work logs count
- Pending advances count
- Quick action buttons
- Recent activity feed

### 2. Employees Page (`/dashboard/employees`)
**Functions:**
- `loadEmployees()` - Fetch employee list
- `loadPendingEmployees()` - Fetch pending approvals
- `handleApprove(id, data)` - Approve employee
- `handleReject(id, reason)` - Reject employee
- `handleCreateUser(data)` - Create new user account

**Features:**
- Employee list with search/filter
- Pending approvals tab
- Employee detail modal
- Approve/reject actions

### 3. Employee Detail Page (`/dashboard/employees/[id]`)
**Functions:**
- `loadEmployee()` - Load employee data
- `loadContractHistory()` - Load contract versions
- `loadRateHistory()` - Load rate changes
- `handleUpdate(data)` - Update employee
- `handleUploadContract(file, data)` - Upload contract

**Tab Structure:**
- Profile - Basic info, personal details
- Contract - Contract info, document uploads
- Documents - ID, certificates
- Financial - Bank details, rates
- Assignments - Project assignments
- Wallet - Wallet transactions

### 4. Customers Page (`/dashboard/customers`)
**Functions:**
- `loadCustomers()` - Fetch customer list
- `handleCreateCustomer(data)` - Create customer
- `handleDeleteCustomer(id)` - Delete customer

**Features:**
- Customer list with search
- Create customer modal
- Customer card with actions

### 5. Customer Detail Page (`/dashboard/customers/[id]`)
**Functions:**
- `loadCustomer()` - Load customer data
- `loadOutfolders()` - Load supervisors
- `loadServiceRates()` - Load rates
- `handleUpdate(data)` - Update customer
- `handleUpdateRates(rates)` - Update service rates
- `handleAddOutfolder(data)` - Add supervisor

**Tab Structure:**
- Overview - Basic info, contacts
- Supervisors - Outfolder management
- Rates - Service rate configuration
- Surcharges - Surcharge configuration
- Contracts - Contract history
- Projects - Customer's projects

### 6. Projects Page (`/dashboard/projects`)
**Functions:**
- `loadProjects()` - Fetch project list
- `handleCreateProject(data)` - Create project
- `handleUpdateStatus(id, status)` - Update status

**Features:**
- Project list with filters
- Status badges
- Quick actions

### 7. Project Detail Page (`/dashboard/projects/[id]`)
**Functions:**
- `loadProject()` - Load project data
- `loadAssignments()` - Load employee assignments
- `loadEligibleEmployees()` - Load employees with required certificates
- `handleUpdate(data)` - Update project
- `handleAssign(employeeId)` - Assign employee
- `handleUnassign(assignmentId)` - Remove assignment

**Features:**
- Project info editing
- Supervisor selection
- Certificate requirements
- Employee assignments

### 8. Work Logs Page (`/dashboard/worklogs`)
**Functions:**
- `loadWorkLogs()` - Fetch all work logs
- `loadPendingLogs()` - Fetch pending approval
- `loadProjects()` - Fetch projects for dropdown
- `loadAllowanceTypes()` - Fetch allowance types
- `loadEmployees()` - Fetch employees for dropdown
- `loadCustomerData(projectId)` - Fetch supervisors/services
- `handleApprove(id)` - Approve work log
- `handleReject(id, reason)` - Reject work log
- `handleSubmit()` - Create new work log
- `addAllowance()` - Add allowance entry
- `removeAllowance(index)` - Remove allowance

**Features:**
- Pending/All tabs
- Filter by status
- Search by employee/project
- Create work log modal (admin)
- Approve/reject actions
- Allowance management

### 9. Invoices Page (`/dashboard/invoices`)
**Functions:**
- `loadInvoices()` - Fetch invoices
- `loadInvoiceDetail(id)` - Fetch invoice detail
- `loadFilterData()` - Load customers/employees
- `loadSupervisors(customerId)` - Load supervisors
- `exportPDF()` - Generate PDF

**Features:**
- Invoice list with filters
- Status filter (all/pending/paid/overdue)
- Advanced filters (customer, supervisor, week range)
- Invoice detail modal
- PDF export

**Advanced Filter State:**
- `selectedCustomer` - Filter by customer
- `selectedSupervisor` - Filter by supervisor
- `selectedEmployees` - Filter by employees
- `weekStart` - From week
- `weekEnd` - To week

### 10. Wallet Page (`/dashboard/wallet`)
**Functions:**
- `loadWallets()` - Fetch all wallets
- `loadTransactions(walletId)` - Fetch transactions
- `handleAdjust(walletId, data)` - Manual adjustment

**Features:**
- Wallet list
- Balance overview
- Transaction history
- Adjustment modal

### 11. Agencies Page (`/dashboard/agencies`)
**Functions:**
- `loadAgencies()` - Fetch agencies
- `handleCreate(data)` - Create agency
- `handleUpdate(id, data)` - Update agency

**Features:**
- Agency list
- Agency detail with rates
- Surcharge configuration

### 12. Gratuities Page (`/dashboard/gratuities`)
**Functions:**
- `loadGratuities()` - Fetch gratuities
- `handleMarkPaid(id)` - Mark as paid

**Features:**
- Gratuity list
- Filter by status
- Mark paid action

---

# Part 3: FLUTTER (Mobile App)

## Feature Structure
```
FlutterProTotaalService/lib/
├── main.dart              # App entry point
├── core/                  # Core utilities
│   ├── network/           # API client
│   ├── widgets/           # Shared widgets
│   └── storage/           # Local storage
├── features/
│   ├── auth/              # Authentication
│   ├── home/              # Home screen
│   ├── profile/           # Employee profile
│   ├── worklogs/          # Work log management
│   ├── invoices/          # Invoice/earnings view
│   ├── wallet/            # Wallet & advances
│   ├── assignments/       # Project assignments
│   └── notifications/     # Notifications
```

## Features

### 1. Auth Feature (`features/auth/`)

#### LoginScreen
**Functions:**
- `_login()` - Authenticate user
- `_validateForm()` - Validate email/password
- `_saveToken()` - Store JWT token

**API Calls:**
- `POST /auth/token/` → Get access/refresh tokens

#### AuthService
**Methods:**
- `login(email, password)` → Returns tokens
- `logout()` → Clear tokens
- `refreshToken()` → Refresh access token
- `isLoggedIn()` → Check login status

### 2. Home Feature (`features/home/`)

#### HomeScreen
**Functions:**
- `_loadDashboardData()` - Load summary data
- `_navigateToSection(section)` - Navigate to feature

**Displayed Data:**
- Employee name & status
- Pending work log count
- Current balance
- Unread notifications

### 3. Profile Feature (`features/profile/`)

#### ProfileScreen
**Functions:**
- `_loadProfile()` - Fetch employee profile
- `_updateProfile(data)` - Update profile
- `_submitProfile()` - Submit for approval
- `_uploadDocument(type, file)` - Upload document

**Sections:**
- Personal info
- Contact info
- ID documents
- Bank details

#### ProfileService
**Methods:**
- `getMyProfile()` → Employee profile
- `updateProfile(data)` → Updated profile
- `submitProfile()` → Submit status
- `uploadDocument(type, file)` → Upload status

### 4. WorkLogs Feature (`features/worklogs/`)

#### LogWorkScreen
**State:**
- `_selectedCustomerId` - Selected customer
- `_selectedSupervisorId` - Selected supervisor
- `_selectedProjectId` - Selected project
- `_selectedServiceId` - Selected service
- `_selectedDate` - Work date
- `_startTime` - Start time
- `_endTime` - End time
- `_breakDuration` - Break in minutes
- `_locationController` - Location text
- `_notesController` - Notes text
- `_allowanceEntries` - List of allowances
- `_canAddAllowances` - Permission flag

**Functions:**
- `_loadInitialData()` - Load customers, allowance types, permissions
- `_onCustomerSelected(customerId)` - Load supervisors/projects/services
- `_onProjectSelected(projectId)` - Auto-fill location
- `_selectDate()` - Show date picker
- `_selectTime(isStart)` - Show time picker
- `_addAllowance()` - Add allowance entry
- `_removeAllowance(index)` - Remove allowance
- `_submitWorkLog()` - Submit work log
- `_calculateHours()` - Calculate worked hours

**API Calls:**
- `GET /customers/worklog-customers/` → Customer list
- `GET /customers/worklog-customers/{id}/outfolders/` → Supervisors
- `GET /customers/worklog-customers/{id}/services/` → Services
- `GET /customers/worklog-customers/{id}/projects/` → Projects
- `GET /employees/me/` → Employee permissions
- `GET /employees/allowance-types/` → Allowance types
- `POST /worklogs/` → Create work log

#### WorkLogsScreen (History)
**State:**
- `_tabController` - Tab controller (All/Approved/Pending/Rejected)
- `_startDate` - Filter start date
- `_endDate` - Filter end date

**Functions:**
- `_onTabChanged()` - Filter by status
- `_showDateRangePicker()` - Select date range
- `_showWorkLogDetails(log)` - Show detail sheet
- `_buildEarningsSummary()` - Show earnings card
- `_buildDateFilterChip()` - Show selected date range

**API Calls:**
- `GET /worklogs/` → Work log list with filters

#### WorkLogModel
**Fields:**
- `id` - Work log ID
- `projectName` - Project name
- `customerName` - Customer name
- `supervisorName` - Supervisor name
- `serviceName` - Service name
- `location` - Work location
- `workDate` - Date of work
- `startTime` - Start time
- `endTime` - End time
- `calculatedHours` - Calculated hours
- `billableHours` - Billable hours
- `estimatedEarnings` - Estimated earnings
- `status` - draft/submitted/approved/rejected
- `notes` - Notes
- `rejectionReason` - Rejection reason

**Computed:**
- `isDone` → status == 'approved'
- `isPending` → status == 'submitted'
- `needsEdit` → status == 'rejected'
- `isDraft` → status == 'draft'
- `statusLabel` → Human readable status

#### InvoiceViewModel
**State:**
- `_workLogs` - All work logs
- `_invoices` - All invoices
- `_isLoading` - Loading state
- `_error` - Error message
- `_workLogFilter` - Current filter
- `_dateFilter` - Date filter

**Getters:**
- `filteredWorkLogs` → Filtered by status
- `totalApprovedEarnings` → Sum of approved earnings
- `totalPendingEarnings` → Sum of pending earnings
- `pendingCount` → Count of pending
- `totalApprovedHours` → Sum of approved hours

**Methods:**
- `loadWorkLogs()` → Fetch work logs with filters
- `loadInvoices()` → Fetch invoices
- `setWorkLogFilter(filter)` → Set status filter
- `setDateFilter(filter, start, end)` → Set date filter
- `submitWorkLog(id)` → Submit for approval
- `updateWorkLog(id, data)` → Update rejected log

### 5. Invoices Feature (`features/invoices/`)

#### InvoiceService
**Methods:**
- `getMyWorkLogs(filters)` → Work log list
- `getMyInvoices(filters)` → Invoice list
- `getPendingEarnings()` → Earning preview
- `submitWorkLog(id)` → Submit work log
- `updateWorkLog(id, data)` → Update work log

#### EmployeeInvoiceModel
**Fields:**
- `id` - Invoice ID
- `invoiceNumber` - Invoice number
- `weekYear` - Week year
- `weekNumber` - Week number
- `weekStartDate` - Week start
- `weekEndDate` - Week end
- `totalHours` - Total hours
- `hourlyRate` - Hourly rate
- `grossEarnings` - Gross earnings
- `deductions` - Deductions
- `netEarnings` - Net earnings
- `status` - Invoice status
- `lines` - Invoice lines

### 6. Wallet Feature (`features/wallet/`)

#### WalletScreen
**Functions:**
- `_loadWallet()` - Load wallet & transactions
- `_loadPendingAdvances()` - Load pending requests
- `_requestAdvance()` - Create advance request

**API Calls:**
- `GET /wallet/wallets/my_wallet/` → Wallet data
- `GET /wallet/advances/` → Advance requests
- `POST /wallet/advances/` → Create request

#### WalletModel
**Fields:**
- `balance` - Current balance
- `totalEarnings` - Lifetime earnings
- `totalAdvances` - Total advances
- `availableAdvance` - Available for advance
- `transactions` - Recent transactions

### 7. Notifications Feature (`features/notifications/`)

#### NotificationScreen
**Functions:**
- `_loadNotifications()` - Fetch notifications
- `_markAsRead(id)` - Mark notification read
- `_markAllRead()` - Mark all read
- `_handleAction(notification)` - Navigate to related

**API Calls:**
- `GET /notifications/` → Notification list
- `POST /notifications/{id}/read/` → Mark as read

---

# Appendix: Use Case Diagrams

## UC-001: Employee Registration Flow
```
1. Admin creates User account
2. Employee receives credentials (email/WhatsApp)
3. Employee logs in to Flutter app
4. Employee completes profile (personal info, documents)
5. Employee submits profile for approval
6. Admin receives notification
7. Admin reviews profile
8. Admin approves/rejects profile
9. Employee receives notification of result
```

## UC-002: Work Log Submission Flow
```
1. Employee opens Flutter app
2. Employee navigates to "Log Work"
3. Employee selects Customer
4. System loads Supervisors, Projects, Services
5. Employee selects Project
6. System auto-fills Location
7. Employee enters Date, Time, Break
8. Employee optionally adds Allowances
9. Employee submits work log
10. Admin receives notification
11. Admin reviews work log in Dashboard
12. Admin approves/rejects
13. Employee receives notification
14. If approved, earnings added to wallet
```

## UC-003: Invoice Generation Flow
```
1. Admin opens Dashboard → Invoices
2. Admin clicks "Generate Invoice"
3. Admin selects Customer
4. Admin selects Week
5. System aggregates approved work logs
6. System creates invoice with lines
7. Admin reviews invoice
8. Admin can edit/add costs
9. Admin finalizes invoice
10. Invoice status changes to "Sent"
11. Admin marks as paid when received
```

## UC-004: Advance Request Flow
```
1. Employee opens Flutter app
2. Employee navigates to Wallet
3. Employee requests advance
4. System validates against available limit
5. Request created with "pending" status
6. Admin receives notification
7. Admin reviews request in Dashboard
8. Admin approves/rejects
9. If approved, negative transaction created
10. Employee wallet balance updated
11. Employee receives notification
```

---

# End of Documentation

This documentation covers the complete ProTotaalService system including all models, API endpoints, frontend pages, and Flutter features.
