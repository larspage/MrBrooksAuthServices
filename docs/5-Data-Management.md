# 5. Data Management

## Core Data Entities and Relationships

The data model is designed for efficiency, security, and scalability, leveraging Supabase's PostgreSQL capabilities. Below are the key entities with their schemas, expanded with additional fields and relationships for completeness.

### Applications
```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  api_keys JSONB,
  configuration JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'inactive', 'development') DEFAULT 'development'
);
```
- **Relationships**: One-to-many with membership_tiers and user_memberships.
- **Additional Details**: The configuration JSONB can store app-specific settings like custom domains or integration hooks.

### Users
Leverages Supabase's built-in auth.users table, extended with:
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
- **Relationships**: One-to-many with user_memberships.
- **Additional Details**: Metadata can include preferences, notification settings, or custom user data.

### Membership Tiers
```sql
CREATE TABLE membership_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  features JSONB,
  tier_level INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
- **Relationships**: One-to-many with pricing_plans and user_memberships.
- **Additional Details**: Features JSONB lists entitlements like 'storage_limit' or 'api_calls'.

### Pricing Plans
```sql
CREATE TABLE pricing_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_tier_id UUID REFERENCES membership_tiers(id) ON DELETE CASCADE,
  billing_period ENUM('monthly', 'yearly') NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_price_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
- **Relationships**: One-to-many with user_memberships.
- **Additional Details**: Include fields for promotional pricing or discounts.

### User Memberships
```sql
CREATE TABLE user_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  membership_tier_id UUID REFERENCES membership_tiers(id) ON DELETE SET NULL,
  pricing_plan_id UUID REFERENCES pricing_plans(id) ON DELETE SET NULL,
  stripe_subscription_id TEXT,
  status ENUM('active', 'inactive', 'past_due', 'canceled') DEFAULT 'inactive',
  started_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
- **Relationships**: Links users to applications and tiers.
- **Additional Details**: Add renewal_date for billing cycles.

### Membership Bundles
```sql
CREATE TABLE membership_bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  application_ids UUID[] NOT NULL,
  monthly_price_cents INTEGER,
  yearly_price_cents INTEGER,
  stripe_monthly_price_id TEXT,
  stripe_yearly_price_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
- **Relationships**: Can be linked to user_memberships for bundle subscriptions.
- **Additional Details**: Support dynamic bundles with rules for inclusion.

## Data Processing Requirements
- **Real-time Sync**: Use Supabase Realtime to propagate membership changes instantly to applications.
- **Audit Logging**: Log all changes to critical tables using triggers and a dedicated audit table.
- **Data Backup**: Implement daily automated backups with point-in-time recovery via Supabase tools.
- **Data Migration**: Provide scripts for schema changes and data transfer between environments.
- **Additional Details**: Include data validation rules and error handling for processing. Ensure GDPR-compliant data handling with consent tracking.

## Row Level Security Policies
```sql
-- Applications can only access their own data
CREATE POLICY "Applications own data" ON user_memberships
  FOR ALL
  USING (application_id = current_setting('app.current_application_id')::UUID);

-- Users can only see their own memberships
CREATE POLICY "Users own memberships" ON user_memberships
  FOR SELECT
  USING (user_id = auth.uid());

-- Admin full access
CREATE POLICY "Admin access" ON ALL
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
```
- **Additional Details**: Add policies for read-only access and tenant-specific views. Test policies thoroughly for edge cases.

This section provides a detailed data foundation, ensuring secure and efficient management.

## Modular Development Breakdown
Modular tasks for data management, designed for parallel AI implementation with progress tracking.

### Entity Schema Tasks
- [x] Create applications table with indexes on slug and status.
- [x] Implement user_profiles table with foreign key constraints.
- [x] Define membership_tiers table and features JSONB structure.
- [x] Set up pricing_plans table with unique constraints on tier and period.
- [x] Build user_memberships table with status triggers.
- [x] Create membership_bundles table with array indexing.

### Data Processing Tasks
- [ ] Implement real-time listeners for membership changes.
- [ ] Set up audit logging triggers on key tables.
- [ ] Configure automated backup schedules.
- [ ] Develop migration scripts for schema updates.

### RLS Policy Tasks
- [x] Implement application data isolation policy.
- [x] Add user-specific membership view policy.
- [x] Create admin override policy for all tables.
- [ ] Test RLS policies with sample data scenarios.

### Additional Data Tasks
- [ ] Add validation functions for data integrity.
- [ ] Implement data export/import utilities.
- [ ] Set up indexing for performance-critical queries.
- [ ] Document entity relationships with ER diagrams.

Update checklist as needed.