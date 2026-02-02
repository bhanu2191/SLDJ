
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
    // 1. Validate and Trim API Key
    const apiKey = (config.apiKey || '').trim();
    if (!apiKey) {
        return { success: false, error: "Invalid API Key" };
    }

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    // Helper to find balance recursively
    const findBalanceInObject = (obj, depth = 0) => {
        if (!obj || typeof obj !== 'object' || depth > 3) return null;

        const targetKeys = ['remaining_unit', 'sms_balance', 'balance', 'unit', 'remaining', 'credits', 'units', 'count', 'amount', 'wallet'];

        // 1. Check direct keys first
        for (const key of Object.keys(obj)) {
            const lowerKey = key.toLowerCase();
            if (targetKeys.some(k => lowerKey.includes(k))) {
                const val = obj[key];
                // Try to extract number
                if (typeof val === 'number') return val;
                if (typeof val === 'string') {
                    const match = val.match(/(\d+(\.\d+)?)/);
                    if (match) return match[0];
                }
            }
        }

        // 2. Recursive search
        for (const key of Object.keys(obj)) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                const found = findBalanceInObject(obj[key], depth + 1);
                if (found !== null) return found;
            }
        }
        return null;
    };

    try {
        // Strategy 1: DIRECT /balance endpoint (Priority as requested)
        console.log("[SMS SERVICE] Checking Balance via /balance (Primary)...");
        const responseBal = await fetch('https://app.text.lk/api/v3/balance', { method: 'GET', headers });
        const textBal = await responseBal.text();
        console.log("[SMS SERVICE] /balance Response:", textBal);

        try {
            const jsonBal = JSON.parse(textBal);
            if (jsonBal.status === 'success') {
                const bal = findBalanceInObject(jsonBal.data) || findBalanceInObject(jsonBal);
                if (bal !== null) return { success: true, balance: bal };

                // Fallback: Check if data itself is a primitive value (Number or String)
                const raw = jsonBal.data;
                if (raw !== undefined && raw !== null) {
                    if (typeof raw === 'number') return { success: true, balance: raw };
                    if (typeof raw === 'string') {
                        const match = raw.match(/(\d+(\.\d+)?)/);
                        if (match) return { success: true, balance: match[0] };
                    }
                }
            }
        } catch (e) { /* Ignore */ }

        // Strategy 2: /me (Profile) Fallback
        console.log("[SMS SERVICE] Checking Balance via /me (Fallback)...");
        const responseMe = await fetch('https://app.text.lk/api/v3/me', { method: 'GET', headers });
        const textMe = await responseMe.text();
        console.log("[SMS SERVICE] /me Response:", textMe);

        try {
            const jsonMe = JSON.parse(textMe);
            if (jsonMe.status === 'success') {
                const bal = findBalanceInObject(jsonMe.data) || findBalanceInObject(jsonMe);
                if (bal !== null) return { success: true, balance: bal };
            }
        } catch (e) { /* Ignore JSON error */ }

        // Strategy 3: HTTP API Fallback (Query Param)
        console.log("[SMS SERVICE] Checking Balance via Query Param...");
        const responseQuery = await fetch(`https://app.text.lk/api/v3/balance?api_token=${apiKey}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        const textQuery = await responseQuery.text();
        try {
            const jsonQuery = JSON.parse(textQuery);
            if (jsonQuery.status === 'success') {
                const bal = findBalanceInObject(jsonQuery.data) || findBalanceInObject(jsonQuery);
                if (bal !== null) return { success: true, balance: bal };
            }
        } catch (e) { /* Ignore */ }

        return { success: false, error: "No balance found in API" };

    } catch (e) {
        console.error("[SMS SERVICE] Balance Fetch Error:", e);
        return { success: false, error: e.message };
    }
}

export default { sendSMS, getBalance };
