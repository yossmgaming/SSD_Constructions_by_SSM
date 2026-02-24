/**
 * SSD Constructions Security & Identity Utilities
 * Implements Personnel Identification (PID) and Secure Token logic.
 */

/**
 * Generates a structured Personnel ID (PID)
 * Format: SSD-W-[YEAR]-[RANDOM] (e.g., SSD-W-2026-X9Y2)
 */
export function generatePID() {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SSD-W-${year}-${random}`;
}

/**
 * Generates a structured Client ID (PID)
 * Format: SSD-C-[YEAR]-[RANDOM] (e.g., SSD-C-2026-A1B2)
 */
export function generateClientPID() {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SSD-C-${year}-${random}`;
}

/**
 * Generates a high-entropy secure token for invitations
 * Uses window.crypto for cryptographic strength
 */
export function generateSecureToken(length = 12) {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars (I, 1, O, 0)
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    let token = '';
    for (let i = 0; i < length; i++) {
        token += charset[array[i] % charset.length];
        if (i > 0 && (i + 1) % 4 === 0 && i < length - 1) token += '-';
    }
    return `SSD-${token}`;
}

/**
 * Hashes a token using SHA-256 for database storage
 * Returns a hex string
 */
export async function hashToken(token) {
    const msgUint8 = new TextEncoder().encode(token.trim().toUpperCase());
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
