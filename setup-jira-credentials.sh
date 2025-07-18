#!/bin/bash

echo "🔐 Setting up Jira API credentials..."
echo ""

# Check if credentials are provided as arguments
if [ $# -eq 2 ]; then
    JIRA_EMAIL="$1"
    JIRA_API_TOKEN="$2"
    echo "✅ Using provided credentials"
else
    # Prompt for credentials
    echo "📧 Enter your CVS Health email address:"
    read -r JIRA_EMAIL
    
    echo ""
    echo "🔑 Enter your Jira API token:"
    echo "   (Get it from: https://id.atlassian.com/manage-profile/security/api-tokens)"
    read -s JIRA_API_TOKEN
    echo ""
fi

# Validate inputs
if [ -z "$JIRA_EMAIL" ] || [ -z "$JIRA_API_TOKEN" ]; then
    echo "❌ Error: Email and API token are required"
    exit 1
fi

echo "🧪 Testing credentials..."

# Export credentials for this session
export JIRA_EMAIL="$JIRA_EMAIL"
export JIRA_API_TOKEN="$JIRA_API_TOKEN"

# Start the jira-proxy service with credentials
echo "🚀 Starting Jira proxy service..."
docker compose up jira-proxy -d

# Wait a moment for service to start
sleep 3

# Test the connection
echo "🔍 Testing Jira connection..."
HEALTH_CHECK=$(docker exec resource-planner-jira-proxy curl -s http://localhost:8080/health)

if echo "$HEALTH_CHECK" | grep -q '"hasCredentials":true'; then
    echo "✅ Credentials configured successfully!"
    
    # Test a simple Jira query
    echo "🎫 Testing Jira API access..."
    TEST_RESULT=$(docker exec resource-planner-jira-proxy curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"jql":"project = REF AND issuetype = Epic","limit":1}' \
        http://localhost:8080/jira/search)
    
    if echo "$TEST_RESULT" | grep -q '"total"'; then
        echo "🎉 Jira API test successful!"
        echo "📊 Found $(echo "$TEST_RESULT" | grep -o '"total":[0-9]*' | grep -o '[0-9]*') total epics in REF project"
        
        echo ""
        echo "🚀 Starting all services..."
        docker compose up -d
        
        echo ""
        echo "✅ Setup complete! Your app should now import all real epics from Jira."
        echo "   Frontend: http://localhost"
        echo "   Backend API: http://localhost:3001"
        echo "   Jira Proxy: http://localhost:8080"
        
    else
        echo "⚠️  Credentials configured but Jira API test failed"
        echo "   This might be due to permissions or network issues"
        echo "   Check the logs: docker logs resource-planner-jira-proxy"
    fi
else
    echo "❌ Failed to configure credentials"
    echo "   Check the logs: docker logs resource-planner-jira-proxy"
    exit 1
fi 