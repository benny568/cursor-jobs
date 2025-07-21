const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Jira configuration
const JIRA_BASE_URL = 'https://cvs-hcd.atlassian.net';
const JIRA_API_VERSION = '3'; // Use REST API v3

// Authentication - You'll need to set these environment variables
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('❌ Missing Jira credentials. Please set JIRA_EMAIL and JIRA_API_TOKEN environment variables.');
  console.log('📋 To get an API token:');
  console.log('   1. Go to https://id.atlassian.com/manage-profile/security/api-tokens');
  console.log('   2. Create API token');
  console.log('   3. Set JIRA_EMAIL=your-email@example.com');
  console.log('   4. Set JIRA_API_TOKEN=your-token-here');
}

// Create basic auth header
const authHeader = 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    jiraBaseUrl: JIRA_BASE_URL,
    hasCredentials: !!(JIRA_EMAIL && JIRA_API_TOKEN)
  });
});

// Jira search endpoint
app.post('/jira/search', async (req, res) => {
  try {
    const { jql, fields, limit = 50, expand = '' } = req.body;
    
    console.log(`🔍 Proxying Jira search request:`);
    console.log(`   JQL: ${jql}`);
    console.log(`   Fields: ${fields}`);
    console.log(`   Limit: ${limit}`);
    
    if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
      return res.status(500).json({
        error: 'Jira credentials not configured',
        message: 'Missing JIRA_EMAIL or JIRA_API_TOKEN environment variables'
      });
    }

    // Build Jira API URL
    const params = new URLSearchParams({
      jql,
      maxResults: limit.toString(),
      fields: fields || 'key,summary,description,status,created,updated,assignee,reporter,labels,customfield_10016',
      expand: expand || ''
    });

    const jiraUrl = `${JIRA_BASE_URL}/rest/api/${JIRA_API_VERSION}/search?${params}`;
    console.log(`📡 Making request to: ${jiraUrl}`);

    // Make request to Jira
    const jiraResponse = await fetch(jiraUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!jiraResponse.ok) {
      const errorText = await jiraResponse.text();
      console.error(`❌ Jira API error: ${jiraResponse.status} ${jiraResponse.statusText}`);
      console.error(`   Error details: ${errorText}`);
      
      return res.status(jiraResponse.status).json({
        error: 'Jira API request failed',
        status: jiraResponse.status,
        statusText: jiraResponse.statusText,
        details: errorText
      });
    }

    const jiraData = await jiraResponse.json();
    console.log(`✅ Successfully retrieved ${jiraData.issues?.length || 0} issues from Jira`);
    
    res.json(jiraData);

  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.status(500).json({
      error: 'Proxy request failed',
      details: error.message
    });
  }
});

// Get single issue endpoint
app.get('/jira/issue/:issueKey', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const { fields, expand } = req.query;
    
    console.log(`🎫 Proxying single issue request: ${issueKey}`);
    
    if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
      return res.status(500).json({
        error: 'Jira credentials not configured',
        message: 'Missing JIRA_EMAIL or JIRA_API_TOKEN environment variables'
      });
    }

    // Build URL parameters
    const params = new URLSearchParams();
    if (fields) params.append('fields', fields);
    if (expand) params.append('expand', expand);

    const jiraUrl = `${JIRA_BASE_URL}/rest/api/${JIRA_API_VERSION}/issue/${issueKey}${params.toString() ? '?' + params.toString() : ''}`;
    console.log(`📡 Making request to: ${jiraUrl}`);

    // Make request to Jira
    const jiraResponse = await fetch(jiraUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!jiraResponse.ok) {
      const errorText = await jiraResponse.text();
      console.error(`❌ Jira API error: ${jiraResponse.status} ${jiraResponse.statusText}`);
      return res.status(jiraResponse.status).json({
        error: 'Jira API request failed',
        status: jiraResponse.status,
        statusText: jiraResponse.statusText,
        details: errorText
      });
    }

    const jiraData = await jiraResponse.json();
    console.log(`✅ Successfully retrieved issue ${issueKey} from Jira`);
    
    res.json(jiraData);

  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.status(500).json({
      error: 'Proxy request failed',
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Jira proxy server running on port ${PORT}`);
  console.log(`📡 Proxying requests to: ${JIRA_BASE_URL}`);
  console.log(`🔐 Authentication configured: ${!!(JIRA_EMAIL && JIRA_API_TOKEN)}`);
  
  if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
    console.log('\n⚠️  WARNING: Jira credentials not configured!');
    console.log('   Set JIRA_EMAIL and JIRA_API_TOKEN environment variables');
  }
}); 