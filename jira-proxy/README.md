# Jira Proxy Service

This service proxies requests from the resource planner backend to the CVS-HCD Jira instance at `cvs-hcd.atlassian.net`.

## Setup

1. **Get Jira API Token:**

   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Create an API token
   - Save it securely

2. **Configure Environment Variables:**
   Set these in your docker-compose.yml or .env file:

   ```
   JIRA_EMAIL=your-email@cvshealthplan.com
   JIRA_API_TOKEN=your-api-token-here
   ```

3. **Endpoints:**
   - `POST /jira/search` - Search for Jira issues using JQL
   - `GET /jira/issue/:issueKey` - Get a specific issue
   - `GET /health` - Health check

## Usage

The resource planner backend will automatically use this proxy when making Jira API calls.

The proxy accepts the same request format as the backend expects and translates it to proper Jira REST API calls.
