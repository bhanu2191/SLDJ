
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
    if (config.apiKey && config.apiKey !== '********************') {

        // Detect Unicode (Sinhala/Tamil)
        // Basic check: if contains characters outside GSM 7-bit range
        // For simplicity, we check if any character code is > 127
        const isUnicode = /[^\x00-\x7F]/.test(message);
        const type = isUnicode ? 'unicode' : 'plain';

        console.log(`[SMS SERVICE] Sending via Text.lk. Type: ${type}, Recipient: ${to}`);

        try {
            // Text.lk V3 API Endpoint
            const endpoint = 'https://app.text.lk/api/v3/sms/send';

            const payload = {
                recipient: to,
                sender_id: config.senderId || 'SLDJ', // Default sender ID if missing
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
    if (!config.apiKey || config.apiKey === '********************') {
        return { success: false, error: "Invalid API Key" };
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
        // Expected response: { status: "success", balance: 1250, ... }

        if (data.status === 'success' || data.balance !== undefined) {
            return { success: true, balance: data.balance || data.data?.balance || "Unknown" };
        } else {
            return { success: false, error: data.message || "Failed to fetch balance" };
        }

    } catch (e) {
        console.error("[SMS SERVICE] Balance Check Error:", e);
        return { success: false, error: e.message };
    }
}

export default { sendSMS, getBalance };
