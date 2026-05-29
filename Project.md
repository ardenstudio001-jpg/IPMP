# Inventory & Pricing Management Platform — Project Scope

## Project Overview

This project is a production-conscious internal business web application built to replace an organization's spreadsheet-driven inventory and pricing workflow.

The current organization uses multiple spreadsheets for:

* Inventory tracking
* Product costing
* Pricing calculations
* Approval workflow

The goal of this system is to centralize operations into a maintainable, scalable web platform.

This is NOT a generic ecommerce application.

This is an internal operational management platform.

---

# Core Business Problem

Current spreadsheet workflow causes:

* Data duplication
* Human calculation errors
* Formula instability
* No auditability
* Poor collaboration
* No role isolation
* Scaling difficulties

The application must preserve the existing operational workflow while digitizing it.

---

# Primary User Roles

The system currently uses a simplified RBAC approach.

Authorization strategy:

* Role Enum
* User.role
* NestJS Role Guards

No database-driven permissions system for MVP.

## Roles

### ADMIN

Responsibilities:

* Create users
* Manage access
* Approve products
* View all products
* View logs
* Modify pricing settings
* Review calculated outputs

Full system access.

---

### INVENTORY

Responsibilities:

* Create products
* Add SKU
* Enter quantity
* View approved prices
* Add old selling price

Restrictions:

Cannot:

* Approve products
* Manage users
* Edit pricing settings

---

### PROCUREMENT

Responsibilities:

* Enter costing information
* Add unit cost price
* View Product that they have added the unit price of
* Search inventory


Restrictions:

Cannot:

* Approve products
* Manage users

---

# Workflow Architecture

## Step 1 — Product Creation

Role:

INVENTORY

Input:

* Product Name
* Quantity
* Unit
* Old selling price
* SKU

Result:

Product status:

PENDING_COSTING

---

## Step 2 — Procurement Costing

Role:

PROCUREMENT

Input:


* Unit Cost Price

Backend performs automatic pricing calculations.

Result:

Status:

COSTING_COMPLETED

---

## Step 3 — Admin Approval

Role:

ADMIN

Input:

* Final Selling Price
* Printed Status

Result:

Product becomes:

APPROVED

---

# Pricing Formula Rules

totalCostPrice = Unit cost price x quantity

CP = Cost Price

Investment Fund:

IF = 6% × CP

Operation Profit:

OP = 35% × CP

Net Profit:

NP = 15% × OP

Payroll Fund:

Payroll = 81% × (OP − NP)

Other Costs:

Other = 19% × (OP − NP)

Gross Profit:

GP2 = IF + OP

Price Before Tax:

PBT = CP + GP2

Sales Tax 20%:

ST1 = PBT × 20%

Minimum Selling Price @20%:

Minimum20 = PBT + ST1

Sales Tax 4%:

ST2 = PBT × 4%

Minimum Selling Price @4%:

Minimum4 = PBT + ST2

Pricing formulas should be implemented inside backend services.

Pricing settings should be configurable through a PricingSetting table.

---

# Tech Stack

## Frontend

Framework:

Next.js

Language:

TypeScript

UI:

TailwindCSS
shadcn/ui

Tables:

AG Grid

Server State:

TanStack Query

URL State:

nuqs

Forms:

react-hook-form
zod

HTTP:

axios

---

## Backend

Framework:

NestJS

Language:

TypeScript

ORM:

Prisma

Database:

PostgreSQL

Authentication:

JWT Access Token
JWT Refresh Token

Password Hashing:

bcrypt

Authorization:

NestJS Role Guards

Validation:

class-validator
class-transformer

Security:

Helmet
Rate Limiting
CORS

---

# Database Design

## User Role Enum

```ts
enum Role {
  ADMIN
  INVENTORY
  PROCUREMENT
}
```

---

## Tables

### users

Stores:

* authentication
* identity
* authorization role

Fields:

* id
* email
* password
* firstName
* lastName
* role
* hashedRefreshToken
* isActive
* createdAt
* updatedAt

---

### products

Stores:

* product information
* costing data
* pricing outputs
* workflow status

Product lifecycle:

PENDING_COSTING
COSTING_COMPLETED
APPROVED
REJECTED

---

### pricing_settings

Stores configurable pricing percentages.

Fields:

* investmentFundRate
* operationProfitRate
* netProfitRateOfOP
* payrollRateOfOPMinusNP
* otherCostsRateOfOPMinusNP
* salesTaxRate20
* salesTaxRate4
* isActive

---

### audit_logs

Tracks operational changes.

Examples:

* Product created
* Pricing updated
* User deactivated
* Approval completed

Stores:

* userId
* action
* entityType
* entityId
* oldValue
* newValue
* createdAt

---

### notifications

Stores system notifications.

Examples:

* Product created
* Costing completed
* Product approved

---

# Backend Module Structure

src/

auth/
users/
products/
pricing/
audit/
notifications/
common/

---

# API Design Philosophy

RESTful API structure.

Examples:

POST /auth/login

POST /users

GET /products

PATCH /products/:id/costing

PATCH /products/:id/approve

---

# Coding Expectations

Follow:

* clean architecture principles
* modular NestJS structure
* DTO validation
* service/controller separation
* repository via Prisma service
* reusable frontend components
* strong TypeScript typing
* scalable folder organization

Avoid:

* overengineering
* unnecessary abstraction
* premature microservices
* database-driven permissions for MVP

---

# Development Principles

The project prioritizes:

* maintainability
* production readiness
* scalability
* clear separation of concerns
* MVP-first implementation

The architecture should remain simple enough for fast delivery while leaving room for future expansion.

Potential future expansion:

* dynamic permissions
* analytics
* notifications
* supplier management
* multi-warehouse
* reporting
* advanced pricing engine
* real-time updates

Use production-conscious patterns but avoid unnecessary enterprise complexity during MVP.
