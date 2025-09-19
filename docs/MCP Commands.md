# MCP Servers and Tools Summary

Since context7 is not connected, here's a comprehensive markdown summary of all MCP servers and their available tools currently installed in your system:

## Connected MCP Servers

### 1. GitHub (`@modelcontextprotocol/server-github`)
**Purpose:** GitHub repository operations and management

**Available Tools:**
- `create_or_update_file` - Create or update a single file in a GitHub repository
- `search_repositories` - Search for GitHub repositories
- `create_repository` - Create a new GitHub repository in your account
- `get_file_contents` - Get the contents of a file or directory from a GitHub repository
- `push_files` - Push multiple files to a GitHub repository in a single commit
- `create_issue` - Create a new issue in a GitHub repository
- `create_pull_request` - Create a new pull request in a GitHub repository
- `fork_repository` - Fork a GitHub repository to your account or specified organization
- `create_branch` - Create a new branch in a GitHub repository
- `list_commits` - Get list of commits of a branch in a GitHub repository
- `list_issues` - List issues in a GitHub repository with filtering options
- `update_issue` - Update an existing issue in a GitHub repository
- `add_issue_comment` - Add a comment to an existing issue
- `search_code` - Search for code across GitHub repositories
- `search_issues` - Search for issues and pull requests across GitHub repositories
- `search_users` - Search for users on GitHub
- `get_issue` - Get details of a specific issue in a GitHub repository
- `get_pull_request` - Get details of a specific pull request
- `list_pull_requests` - List and filter repository pull requests
- `create_pull_request_review` - Create a review on a pull request
- `merge_pull_request` - Merge a pull request
- `get_pull_request_files` - Get the list of files changed in a pull request
- `get_pull_request_status` - Get the combined status of all status checks for a pull request
- `update_pull_request_branch` - Update a pull request branch with the latest changes from the base branch
- `get_pull_request_comments` - Get the review comments on a pull request
- `get_pull_request_reviews` - Get the reviews on a pull request

### 2. Memory (`@modelcontextprotocol/server-memory`)
**Purpose:** Knowledge graph storage and retrieval

**Available Tools:**
- `create_entities` - Create multiple new entities in the knowledge graph
- `create_relations` - Create multiple new relations between entities in the knowledge graph
- `add_observations` - Add new observations to existing entities in the knowledge graph
- `delete_entities` - Delete multiple entities and their associated relations from the knowledge graph
- `delete_observations` - Delete specific observations from entities in the knowledge graph
- `delete_relations` - Delete multiple relations from the knowledge graph
- `read_graph` - Read the entire knowledge graph
- `search_nodes` - Search for nodes in the knowledge graph based on a query
- `open_nodes` - Open specific nodes in the knowledge graph by their names

### 3. MCP-Node (`mcp-node`)
**Purpose:** Node.js operations and npm management

**Available Tools:**
- `list-node-versions` - Get available Node.js versions installed via NVM
- `select-node-version` - Select a specific Node.js version to use for subsequent script executions
- `get-node-version` - Get the version of Node.js the scripts will be executed with
- `run-node-script` - Execute a Node.js script file locally
- `run-node-eval` - Execute JavaScript code directly with Node.js eval
- `run-npm-script` - Execute an npm script from package.json
- `run-npm-install` - Execute npm install to install all dependencies or a specific package
- `start-node-server` - Start a Node.js server that continues running in the background
- `list-servers` - List all running Node.js servers started via MCP
- `stop-server` - Stop a running Node.js server
- `get-server-logs` - Get the last N lines of logs from a running server

**Available Resources:**
- `npm-scripts://{directory}` - Access npm scripts from package.json files

### 4. Supabase (`@supabase/mcp-server-supabase`)
**Purpose:** Supabase database operations and management

**Available Tools:**
- `search_docs` - Search the Supabase documentation using GraphQL
- `list_tables` - Lists all tables in one or more schemas
- `list_extensions` - Lists all extensions in the database
- `list_migrations` - Lists all migrations in the database
- `apply_migration` - Applies a migration to the database (DDL operations)
- `execute_sql` - Executes raw SQL in the Postgres database
- `get_logs` - Gets logs for a Supabase project by service type
- `get_advisors` - Gets advisory notices for security vulnerabilities or performance improvements
- `get_project_url` - Gets the API URL for a project
- `get_anon_key` - Gets the anonymous API key for a project
- `generate_typescript_types` - Generates TypeScript types for a project
- `list_edge_functions` - Lists all Edge Functions in a Supabase project
- `get_edge_function` - Retrieves file contents for an Edge Function
- `deploy_edge_function` - Deploys an Edge Function to a Supabase project
- `create_branch` - Creates a development branch on a Supabase project
- `list_branches` - Lists all development branches of a Supabase project
- `delete_branch` - Deletes a development branch
- `merge_branch` - Merges migrations and edge functions from a development branch to production
- `reset_branch` - Resets migrations of a development branch
- `rebase_branch` - Rebases a development branch on production

## Configured but Not Currently Connected

### 5. PostgreSQL (`@modelcontextprotocol/server-postgres`)
**Purpose:** Direct PostgreSQL database operations
**Status:** Configured but requires `MCP_POSTGRES_URL` environment variable

### 6. MongoDB (`@modelcontextprotocol/server-mongodb`)
**Purpose:** MongoDB database operations
**Status:** Configured but requires `MCP_MONGODB_URI` environment variable

### 7. Filesystem (`@modelcontextprotocol/server-filesystem`)
**Purpose:** File system operations
**Status:** Configured but requires `MCP_DEFAULT_PROJECT_DIR` environment variable

### 8. Shell (`@modelcontextprotocol/server-shell`)
**Purpose:** Shell command execution
**Status:** Configured via npm package

### 9. Puppeteer (`puppeteer-mcp`)
**Purpose:** Browser automation
**Status:** Configured with headless mode enabled

### 10. D3 Server
**Purpose:** D3.js visualization
**Status:** Configured but requires `MCP_D3_SERVER_PATH` environment variable

### 11. React MCP Server
**Purpose:** React component operations
**Status:** Configured but requires `MCP_REACT_SERVER_PATH` environment variable

### 12. Context7
**Purpose:** Remote context service
**Status:** Configured as remote server but currently not connected
**URL:** https://mcp.context7.com/mcp

## Summary
- **Total Configured Servers:** 12
- **Currently Connected:** 4 (GitHub, Memory, MCP-Node, Supabase)
- **Requires Configuration:** 8 servers need environment variables or connection setup