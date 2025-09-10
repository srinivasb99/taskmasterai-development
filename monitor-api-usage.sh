#!/bin/bash

# API Usage Monitoring Script
# Helps track Gemini API usage and detect suspicious patterns

echo "📊 TaskMaster API Usage Monitor"
echo "==============================="

# Function to get logs from Firebase
get_logs() {
    local hours=${1:-1}
    echo "📋 Fetching logs from last $hours hour(s)..."
    
    firebase functions:log --project deepworkai-c3419 | \
    head -1000 | \
    grep -E "(API REQUEST|REASONING MODEL USAGE|SECURITY ALERT|USAGE ALERT)" | \
    tail -100
}

# Function to analyze model usage
analyze_usage() {
    echo ""
    echo "🔍 Analyzing recent API usage patterns..."
    echo ""
    
    # Get logs and analyze
    firebase functions:log --project deepworkai-c3419 | \
    head -1000 | \
    grep "API REQUEST" | \
    jq -r '.model' 2>/dev/null | \
    sort | uniq -c | sort -nr || echo "⚠️ jq not installed - showing raw logs instead"
    
    echo ""
    echo "🧠 Reasoning model usage:"
    firebase functions:log --project deepworkai-c3419 | \
    head -500 | \
    grep "REASONING MODEL USAGE" | \
    tail -10
}

# Function to check for security alerts
check_security() {
    echo ""
    echo "🚨 Security Alerts (last 24 hours):"
    
    firebase functions:log --project deepworkai-c3419 | \
    head -2000 | \
    grep -E "(SECURITY ALERT|USAGE ALERT)" | \
    tail -20
    
    if [ $? -ne 0 ]; then
        echo "✅ No security alerts found"
    fi
}

# Function to emergency disable reasoning
emergency_disable() {
    echo ""
    echo "🚨 EMERGENCY: Disabling reasoning mode..."
    echo "⚠️  This will prevent all premium users from using the reasoning model"
    
    read -p "Are you sure? This affects all users. (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # You would call this from your admin console
        echo "Call emergencyDisableReasoning function from Firebase console"
        echo "Or use Firebase CLI: firebase functions:shell"
    else
        echo "❌ Emergency disable cancelled"
    fi
}

# Main menu
while true; do
    echo ""
    echo "Select an option:"
    echo "1) View recent logs"
    echo "2) Analyze model usage"
    echo "3) Check security alerts"
    echo "4) Emergency disable reasoning"
    echo "5) Real-time monitoring (5 min intervals)"
    echo "6) Exit"
    echo ""
    read -p "Choose (1-6): " choice
    
    case $choice in
        1)
            get_logs
            ;;
        2)
            analyze_usage
            ;;
        3)
            check_security
            ;;
        4)
            emergency_disable
            ;;
        5)
            echo "🔄 Starting real-time monitoring (Ctrl+C to stop)..."
            while true; do
                echo ""
                echo "🕐 $(date): Checking for new alerts..."
                check_security
                echo "⏱️  Next check in 5 minutes..."
                sleep 300
            done
            ;;
        6)
            echo "👋 Monitoring stopped"
            exit 0
            ;;
        *)
            echo "❌ Invalid option"
            ;;
    esac
done
