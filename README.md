# MrBrooksAuthService

A standalone, multi-tenant authentication and subscription management service designed to provide centralized user authentication, authorization, and membership management for a suite of SaaS applications under Mr Brooks LLC.

## Project Description

MrBrooksAuthService leverages Supabase for robust authentication and database management, integrates seamlessly with Stripe for payment processing, and includes a comprehensive admin portal for managing applications, membership tiers, and pricing across multiple products. The system is built to support AI-driven development, ensuring modular components that can be developed in parallel by AI agents.

## Key Features

- **Centralized Authentication**: Reduce redundancy across applications
- **Multi-tenant Architecture**: Handle multiple applications securely
- **Enhanced Redirect Validation**: Detailed error logging with configuration instructions
- **Comprehensive Membership Data**: All auth responses include membership information with pricing
- **Subscription Management**: Flexible tiers and bundling options
- **Admin Tools**: Easy configuration and oversight
- **AI-Friendly Development**: Modular, parallel-development ready

## Recent Enhancements

### Enhanced Authentication Features (January 2025)
The Auth Service has been significantly enhanced with improved redirect validation and comprehensive membership data in all authentication responses:

- **Smart Redirect Validation**: When invalid redirect URLs are used, the system now logs detailed error information to the [`audit_logs`](src/types/database.ts:225) table with specific SQL commands to fix the configuration
- **Rich Membership Responses**: All authentication endpoints ([`/api/auth/initiate`](src/app/api/auth/initiate/route.ts), [`/api/auth/complete`](src/app/api/auth/complete/route.ts), [`/api/auth/verify`](src/app/api/auth/verify/route.ts)) now return comprehensive user membership data including:
  - Application details and membership tiers
  - Expiration dates and renewal information
  - Pricing data (monthly/yearly costs)
  - Membership status and features

📖 **Documentation**: See [Enhanced Auth Service Features](docs/enhanced-auth-service-features.md) for detailed implementation guide and [Architecture Decision Record](docs/decisions/2025-01-19-enhanced-auth-service-with-membership-data.md) for technical decisions.

## Problem Statement

Managing authentication, authorization, and subscription billing across multiple SaaS applications introduces significant complexity, security risks, and development overhead. This service addresses these issues by providing a unified platform that streamlines integration, enhances security, and simplifies administration.

## Technology Stack

- **Frontend**: Next.js with TypeScript
- **Backend**: Supabase (PostgreSQL with built-in authentication)
- **Payments**: Stripe integration
- **Infrastructure**: DigitalOcean
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account (for payments)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd MrBrooksAuthServices
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

4. Configure your environment variables with Supabase and Stripe credentials

5. Run the development server
```bash
npm run dev
```

## Project Structure

```
src/
├── auth/           # Authentication components
├── database/       # Schema and migrations  
├── admin/          # Admin portal
├── payments/       # Stripe integration
├── sdk/           # SDK development
└── shared/        # Common utilities
```

## Development Progress

Track development progress using the checkbox system in the documentation files:
- [Project Overview](docs/1-Project-Overview.md)
- [Core Functionality](docs/3-Core-Functionality.md)
- [Data Management](docs/5-Data-Management.md)
- [Security Requirements](docs/6-Security-Requirements.md)

## Primary Stakeholders

- **Primary**: Mr Brooks LLC (sole employee/owner)
- **Secondary**: End users of the various SaaS applications
- **Tertiary**: AI development systems

## License

MIT License - see LICENSE file for details

## Contributing

This project is designed for AI-assisted development. Each task is modular and documented in the `/docs` folder with clear specifications and checkboxes for progress tracking.