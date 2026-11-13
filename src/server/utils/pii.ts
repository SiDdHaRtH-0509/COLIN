/**
 * COLIN PII Masking and Data Sanitization Utilities
 * Phase 6G: Administrative Security & DPDP Act Compliance
 * 
 * Provides standard, irreversible data masking for Personally Identifiable Information (PII)
 * displayed in administrative dashboards and operational queues.
 */

export class PiiUtils {
  /**
   * Masks an email address: e.g. "rahul.verma@colin.edu" -> "r****a@colin.edu"
   */
  public static maskEmail(email: string | null | undefined): string {
    if (!email || typeof email !== 'string') return '';
    const parts = email.split('@');
    if (parts.length !== 2) return '****';

    const [user, domain] = parts;
    if (user.length <= 2) {
      return `${user[0] || '*'}****@${domain}`;
    }

    const firstChar = user[0];
    const lastChar = user[user.length - 1];
    return `${firstChar}${'*'.repeat(Math.max(4, user.length - 2))}${lastChar}@${domain}`;
  }

  /**
   * Masks a phone number: e.g. "+91 9876543210" -> "+91 ******3210"
   */
  public static maskPhone(phone: string | null | undefined): string {
    if (!phone || typeof phone !== 'string') return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '******';

    const lastFour = digits.slice(-4);
    const prefix = phone.startsWith('+91') ? '+91 ' : '';
    return `${prefix}******${lastFour}`;
  }

  /**
   * Masks an Indian Aadhaar number: "1234 5678 9012" -> "XXXX-XXXX-9012"
   */
  public static maskAadhaar(aadhaar: string | null | undefined): string {
    if (!aadhaar || typeof aadhaar !== 'string') return '';
    const clean = aadhaar.replace(/\D/g, '');
    if (clean.length < 4) return 'XXXX-XXXX-XXXX';
    const lastFour = clean.slice(-4);
    return `XXXX-XXXX-${lastFour}`;
  }

  /**
   * Masks an Indian PAN number: "ABCDE1234F" -> "XXXXX1234X"
   */
  public static maskPan(pan: string | null | undefined): string {
    if (!pan || typeof pan !== 'string') return '';
    const clean = pan.trim().toUpperCase();
    if (clean.length !== 10) return 'XXXXXXXXXX';
    return `XXXXX${clean.substring(5, 9)}X`;
  }
}
