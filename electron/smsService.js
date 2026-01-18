
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

    // 2. Mock Implementation (Default)
    // If no valid API key is provided in config, just log it.
    if (!config.apiKey || config.apiKey === '********************') {
        console.log("==========================================");
        console.log("             MOCK SMS SENT                ");
        console.log("==========================================");
        console.log(`To:      ${to}`);
        console.log(`Message: ${message}`);
        console.log(`Time:    ${new Date().toLocaleString()}`);
        console.log("==========================================");
        return { success: true, status: 'mock_sent' };
    }

    // 3. Real Implementation (Future)
    // try {
    //     const response = await fetch(config.apiUrl, {
    //         method: 'POST',
    //         headers: { 'Authorization': `Bearer ${config.apiKey}` },
    //         body: JSON.stringify({ to, message, sender: config.senderId })
    //     });
    //     return await response.json();
    // } catch (e) {
    //     return { success: false, error: e.message };
    // }

    // Fallback for now if key exists but no real code
    console.log(`[SMS SERVICE] Real API call simulated for key: ${config.apiKey.substring(0, 5)}...`);
    return { success: true, status: 'simulated_sent' };
}

export default { sendSMS };
