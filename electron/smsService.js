
/**
 * SMS Service Module
 * Handles sending SMS messages via external API (Mock/Production)
 */

// Placeholder for real API interaction
async function sendSMS(to, message, config = {}) {
    console.log(`[SMS SERVICE] Prepare to send to ${to}`);

    // 1. Validation
    if (!to || !message) {
        console.error("[SMS SERVICE] Error: Missing 'to' or 'message'");
        return { success: false, error: "Missing parameters" };
    }

    // 2. Text.lk Implementation
    // Check if provider is Text.lk (case-insensitive)
    const provider = (config.provider || '').toLowerCase();

    // Check if we have valid credentials
    if (config.apiKey) {

        // Detect Unicode (Sinhala/Tamil)
        // Basic check: if contains characters outside GSM 7-bit range
        // For simplicity, we check if any character code is > 127
        const isUnicode = /[^\x00-\x7F]/.test(message);
        const type = isUnicode ? 'unicode' : 'plain';

        console.log(`[SMS SERVICE] Sending via Text.lk. Type: ${type}, Recipient: ${to}`);

        try {
            // Text.lk V3 API Endpoint (Corrected)
            const endpoint = 'https://app.text.lk/api/v3/sms/send';

            const payload = {
                recipient: to,
                sender_id: config.senderId || 'Notify', // Fallback to 'Notify' which is often a default
                type: type,
                message: message
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            console.log("[SMS SERVICE] API Response:", data);

            if (data.status === 'success' || data.code === 200 || data.message === 'success') {
                // Adjust success check based on actual API response structure
                // Text.lk usually returns { status: "success", data: ... }
                return { success: true, apiResponse: data };
            } else {
                return { success: false, error: data.message || "Unknown API Error", apiResponse: data };
            }

        } catch (e) {
            console.error("[SMS SERVICE] Fetch Error:", e);
            return { success: false, error: e.message };
        }
    }

    // 3. Mock Implementation (Fallback)
    console.log("==========================================");
    console.log("             MOCK SMS SENT                ");
    console.log("==========================================");
    console.log(`To:      ${to}`);
    console.log(`Message: ${message}`);
    console.log(`Types:   ${/[^\x00-\x7F]/.test(message) ? 'UNICODE (Sinhala)' : 'PLAIN'}`);
    console.log(`Time:    ${new Date().toLocaleString()}`);
    console.log("==========================================");
    return { success: true, status: 'mock_sent' };

}

// Get current balance
async function getBalance(config = {}) {
    if (!config.apiKey) {
        return { success: false, error: "API Key not configured" };
    }

    try {
        const endpoint = 'https://app.text.lk/api/v3/balance';
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Accept': 'application/json'
            }
        });

        const data = await response.json();
        /*
           Success Response:
           {
             "status": "success",
             "data": "1250 sms unit with all details" // It seems to be a string based on user screenshot?
             // Or sometimes { "status": "success", "data": { "balance": 1250, ... } }
             // User screenshot says: "Returns: Returns a contact object..." but example shows nested data.
             // Actually, the user screenshot shows "data": "sms unit with all details" which is vague.
             // But usually text.lk returns: { status: "success", data: { balance: 100 } } OR just data string?
             // Let's assume standard "data.balance" or safe access.
             // Wait, user provided Screenshot 2 showing "Returns a contact object..." which is wrong for balance endpoint.
             // But the example response shows: { "status": "success", "data": "sms unit with all details" }.
             // This implies 'data' might be the balance string itself? Or an object.
             // Let's make it robust.
        */

        console.log("[SMS SERVICE] Balance Response:", data);

        if (data.status === 'success') {
            let balance = "Unknown";

            // Check for direct value (string or number) in data.data
            if (data.data !== undefined && (typeof data.data === 'string' || typeof data.data === 'number')) {
                balance = data.data;
            }
            // Check for nested object with 'remaining_balance' (Common Text.lk V3 format)
            else if (typeof data.data === 'object' && data.data && data.data.remaining_balance !== undefined) {
                balance = data.data.remaining_balance;
            }
            // Check for nested object with 'balance' (Alternative format)
            else if (typeof data.data === 'object' && data.data && data.data.balance !== undefined) {
                balance = data.data.balance;
            }
            // Check for direct balance property
            else if (data.balance !== undefined) {
                balance = data.balance;
            }
            // Fallback: Show structure for debugging if still unknown
            else {
                balance = `Debug: ${JSON.stringify(data).substring(0, 20)}...`;
            }

            return { success: true, balance: balance };
        } else {
            return { success: false, error: data.message || "Failed to fetch balance" };
        }

    } catch (e) {
        console.error("[SMS SERVICE] Balance Check Error:", e);
        return { success: false, error: e.message };
    }
}

export default { sendSMS, getBalance };
