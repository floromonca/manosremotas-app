# ManosRemotas Product North Star

**Version:** 1.0  
**Status:** Product direction / strategic guide  
**Purpose:** Keep ManosRemotas aligned as it grows from a field service SaaS into a public trusted service network.

---

## 1. Vision

ManosRemotas is building the operating system and trusted service network for independent technicians and service companies with teams in the field.

ManosRemotas is not only a work order app. It is designed to become a platform with two connected sides:

1. **ManosRemotas App** — the SaaS operating system used by service companies to manage their daily operations.
2. **ManosRemotas Network** — the future public network / marketplace where customers can find trusted service providers.

Official direction:

> **ManosRemotas App organizes the operation. ManosRemotas Network creates trust and opportunities.**

---

## 2. Product Structure

### ManosRemotas App

The operational SaaS for companies, technicians, contractors, and field teams.

Future domain:

```txt
app.manosremotas.com
```

This is where companies manage:

- Control Center
- Work Orders
- Customers
- Team
- My Day
- Photo Evidence
- Invoices
- Payments
- Service Catalog
- Payroll
- Future Job Costing
- Future Reports

### ManosRemotas Network

The public website and future marketplace for customers looking for service providers.

Future domain:

```txt
www.manosremotas.com
```

This is where customers will be able to:

- Search for service providers
- Browse provider profiles
- Submit service requests
- Find providers by category and city
- Connect with companies using ManosRemotas

Strategic decision:

> In the future, **manosremotas.com will become a public network / marketplace** for connecting customers with trusted service providers who use ManosRemotas.

---

## 3. Initial Customer

ManosRemotas is built first for:

> **Independent technicians and service companies with up to 20 employees or field workers.**

Initial ideal customers include:

- Electricians
- HVAC services
- Handyman companies
- Renovation companies
- Construction and remodeling teams
- Property maintenance companies
- CCTV / network installers
- IT field service companies
- General maintenance providers

The first target is not large enterprise. The first target is the small or growing service business that needs operational control but does not want a complex enterprise system.

---

## 4. Core Product

The Core of ManosRemotas is field service operations.

Core includes:

- Control Center
- Work Orders
- Basic Work Order Items
- My Day
- Basic Customers
- Basic Team
- Basic Photo Evidence

### Core Principle

> Work Orders are the operational backbone.  
> My Day is the technician’s daily workspace.  
> Control Center is the owner/admin command center.  
> Customers and Team provide the basic structure needed to run the workflow.

### Core Workflow

```txt
Customer → Work Order → Technician Execution → Evidence → Invoice → Payment
```

Even if Billing becomes an add-on in the future, the full product vision remains connected to this operational flow.

---

## 5. Core Work Order Items vs Service Catalog

Basic Work Order items are part of the Core product.

Companies must be able to manually add work/services inside a Work Order, including:

- Description
- Quantity
- Unit / UOM
- Notes
- Basic item tracking

The advanced Service Catalog / Price Book is a future add-on.

### Service Catalog / Price Book Add-on

The advanced catalog may include:

- Reusable services
- Default units / UOM
- Default prices
- Taxable defaults
- Autocomplete in Work Orders
- CSV import
- Template download
- Duplicate/conflict validation
- Price book management

Product rule:

> Creating basic items inside a Work Order is Core.  
> Saving and managing a reusable service catalog is an advanced module.

---

## 6. Core Photo Evidence vs Advanced Photo Evidence

Basic Photo Evidence is part of the Core product.

Each Work Order includes up to three evidence photos:

- Before
- During
- After

This gives service companies a simple and professional way to document work without requiring an advanced module.

### Advanced Photo Evidence Add-on

Companies that need more evidence can use a future add-on.

Advanced Photo Evidence may include:

- More than 3 photos per Work Order
- Multiple photos per category
- Photo galleries
- Photo comments
- Detailed timestamps
- Customer-facing evidence reports
- Future customer signature
- Additional storage limits

Product rule:

> Basic evidence supports trust and operational documentation.  
> Advanced evidence creates future monetizable value.

---

## 7. Add-on Modules

ManosRemotas should grow as a modular SaaS.

Future add-ons may include:

### Billing / Invoicing

- Invoices
- PDF generation
- Email invoice delivery
- Configurable tax profiles
- Payments received
- Balance due
- Payment terms
- Invoice history

### Payroll

- Weekly schedules
- Hourly rates
- Shift-based worked hours
- Estimated pay
- Payroll review
- Payroll CSV export
- Future payroll periods

Payroll is not full legal payroll compliance.

### Service Catalog / Price Book

- Reusable services
- UOM defaults
- Pricing defaults
- CSV import
- Autocomplete
- Catalog management

### Advanced Photo Evidence

- More photos
- Evidence galleries
- Customer-facing reports
- Additional storage
- Future signatures

### Reports

- Operational reports
- Financial reports
- Payroll reports
- Future job costing reports

### Job Costing

- Work Order labor cost
- Cost by technician
- Profit/margin by job
- Cost by customer
- Future productivity analysis

### Marketplace Leads

- Public customer requests
- Provider lead inbox
- Convert lead to customer
- Convert lead to Work Order

---

## 8. Roles vs Features

Roles and modules are different concepts.

### Roles

Roles control what a user can do.

Examples:

- owner
- admin
- office_staff
- tech

### Features / Modules

Features control what a company has active or has paid for.

Examples:

- core_work_orders
- billing
- payroll
- service_catalog
- advanced_photo_evidence
- reports
- job_costing
- marketplace_leads

Example:

A company owner may have permission to manage Payroll, but if the company does not have the Payroll module enabled, they should not be able to use Payroll.

A technician should not access Payroll even if the company has Payroll enabled.

Future architecture may include:

```txt
company_features
subscription_entitlements
feature_key
enabled
company_id
```

Product rule:

> Roles control people.  
> Features control company modules.

---

## 9. Payroll Product Boundary

Payroll must remain separate from Team.

### Team

Team manages who belongs to the company:

- Name
- Email
- Role
- Status
- Basic member information
- Access management

### Payroll

Payroll manages how estimated pay is calculated:

- Hourly rate
- Weekly schedule
- Shift-based worked hours
- Estimated pay
- Payroll flags
- Payroll review

Current Payroll v1 direction:

- Owner/admin only
- Technicians do not see Payroll
- Technicians use My Day for Start Shift / End Shift
- My Day remains operational core
- Shifts remain core operational data
- member_pay_rates belongs to Payroll
- member_work_schedules belongs to Payroll

Payroll v1 should not include:

- Payroll taxes
- CPP/EI
- Deductions
- Vacation pay
- Legal paystubs
- T4 generation
- Direct deposit
- Full payroll compliance
- Work Order labor costing

Work Order labor costing belongs to future Job Costing.

Recommended routes:

```txt
/payroll
/payroll/members/[memberId]
```

---

## 10. Public Website and Marketplace Vision

The public website is not only a landing page. It is the future foundation of ManosRemotas Network.

### Website Role Now

At the beginning, `www.manosremotas.com` should:

- Explain what ManosRemotas is
- Sell the SaaS
- Build trust
- Allow visitors to request a demo
- Present the product clearly

### Website Role Later

In the future, `www.manosremotas.com` will become:

- A public service provider network
- A searchable marketplace
- A provider directory
- A lead generation channel
- A trust and reputation layer

Strategic separation:

```txt
www.manosremotas.com = public website / future marketplace
app.manosremotas.com = SaaS application
```

---

## 11. Marketplace First Flow

The marketplace should begin as a controlled lead flow, not automatic job creation.

Recommended first flow:

```txt
Customer visits manosremotas.com
↓
Customer searches for a service
↓
Customer selects category and location
↓
Customer submits a service request
↓
Provider receives a lead in ManosRemotas App
↓
Provider reviews and accepts/declines
↓
If accepted, provider converts the lead into Customer + Work Order
```

The marketplace should not automatically create a Work Order without provider review.

Future object:

```txt
service_requests / leads
```

Possible fields:

- id
- customer_name
- customer_email
- customer_phone
- service_category
- description
- city
- postal_code
- preferred_date
- assigned_company_id
- status
- created_at

Possible statuses:

- new
- sent_to_provider
- accepted
- declined
- converted_to_customer
- converted_to_work_order
- closed

Product rule:

> Public requests become Leads first.  
> Providers stay in control before creating Customers and Work Orders.

---

## 12. Trusted Provider Criteria

ManosRemotas Network must be careful with trust language.

Do not call a provider “certified” unless certification or license information has actually been verified.

### Phase 1 — Active Provider

A provider may appear publicly if they have:

- Active ManosRemotas account
- Active plan
- Public profile enabled
- Services defined
- Service area defined
- Agreement to receive leads

Badge:

```txt
Active Provider
```

### Phase 2 — Profile Verified

Basic business profile verification may include:

- Verified email
- Verified phone
- Reviewed business name
- Reviewed service area
- Reviewed service categories

Badge:

```txt
Profile Verified
```

This does not mean professional license verification.

### Phase 3 — License Info Provided

For regulated services, the provider may submit license information.

Data may include:

- License number
- License type
- Jurisdiction
- Expiration date
- Supporting document or source

Badge:

```txt
License Info Provided
```

This means the provider supplied license information. It does not mean ManosRemotas verified it.

### Phase 4 — License Verified

Only use this if ManosRemotas actually verifies license information.

Verification data should include:

- License number
- Jurisdiction
- Verification source
- Verified at
- Verified by
- Expiration date
- Status

Badge:

```txt
License Verified
```

### Phase 5 — Top Rated Provider

Reputation-based provider status may include:

- Average rating
- Minimum number of reviews
- Completed jobs
- Response rate
- Complaint history

Badge:

```txt
Top Rated
```

Avoid early dependence on 5-star reviews because new providers will not have enough reviews at the beginning.

---

## 13. What ManosRemotas Can Promise

ManosRemotas can promise:

- Better operational organization
- Work Order management
- Technician workflow support
- Basic evidence capture
- Professional invoice generation
- Configurable tax settings
- Payment tracking
- Shift-based payroll preparation
- Future lead opportunities for active providers
- A structured way for customers to find service providers

Safe wording:

> ManosRemotas helps service companies operate more professionally and gives customers a better way to find active service providers in their area.

---

## 14. What ManosRemotas Must Not Promise

ManosRemotas must not promise:

- Guaranteed quality of work
- Guaranteed provider certification
- Guaranteed legal licensing for every provider
- Guaranteed customer satisfaction
- Automatic tax compliance
- Full payroll legal compliance
- Protected payments or escrow unless implemented
- Verified reviews before review verification exists
- That ManosRemotas is responsible for provider work quality

Recommended marketplace disclaimer:

> ManosRemotas provides a platform to connect customers with independent service providers. Providers are independent businesses and are responsible for their own licenses, insurance, permits, estimates, warranties, work quality, and compliance with applicable laws. Customers should confirm licensing, insurance, scope of work, pricing, and warranties directly with the provider before hiring.

---

## 15. Decision Rules

Before building any new feature, ask:

1. Does this belong to the public website or the app?
2. Does this belong to Core or an add-on?
3. Does this strengthen Work Orders, My Day, or Control Center?
4. Does this keep Payroll separate from Team?
5. Does this avoid mixing Payroll v1 with Job Costing?
6. Does this support the future ManosRemotas Network without forcing us to build it now?
7. Does this avoid legal, tax, payroll, or marketplace promises we cannot support?
8. Can this module be turned off later without breaking Core?
9. Can it be tested locally without affecting real customers?
10. Does this make the product simpler for the initial customer?

If the answer is unclear, pause and document the decision before building.

---

## 16. Current Focus

Current focus should remain:

- Core SaaS stability
- Work Orders
- My Day
- Control Center
- Invoices
- Basic Photo Evidence
- Service Catalog already built, but future modularization should be planned
- Payroll separation
- Public landing page
- Website/app separation

Do not open the full marketplace yet.

---

## 17. Future Phases

### Phase 1 — Strong SaaS Foundation

- Solid Work Orders
- My Day
- Control Center
- Customers
- Team
- Basic Photo Evidence
- Invoices
- Payroll separated
- Landing page

### Phase 2 — Modular SaaS

- Feature entitlements
- Billing add-on
- Payroll add-on
- Service Catalog add-on
- Advanced Photo Evidence add-on
- Reports add-on

### Phase 3 — Public Provider Profiles

- Public company profiles
- Service categories
- Service areas
- Provider contact/request action
- SEO-friendly pages

### Phase 4 — Marketplace Leads

- Service request flow
- Lead inbox in app
- Provider accepts/declines
- Convert lead to Customer + Work Order

### Phase 5 — Trusted Service Network

- Verified providers
- Reviews
- Ratings
- Featured providers
- Lead marketplace
- Reputation system

---

## 18. Product Mantra

> Build the operating system first.  
> Build the network on top of trust.  
> Keep modules separate.  
> Do not promise what the product cannot prove.  
> Grow the platform without breaking the core.

