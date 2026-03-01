import { useAdminSetting } from './use-admin-settings';

/**
 * Hook to check if PII masking is enabled globally.
 * When enabled, contact details should be masked for leads in the 'new_lead' pipeline stage.
 */
export function usePiiMasking() {
  const { data: setting, isLoading } = useAdminSetting('pii_masking_enabled');

  const isEnabled = setting?.value?.enabled === true;

  return {
    isPiiMaskingEnabled: isEnabled,
    isLoading,
  };
}

/** Mask a name part to first initial + asterisks, e.g. "Michael" → "M****" */
export function maskName(name: string | null | undefined): string {
  if (!name || name.trim().length === 0) return '****';
  return name[0].toUpperCase() + '****';
}

/** Mask an email, e.g. "john@example.com" → "j***@e***.com" */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '****@****.***';
  const [local, domain] = email.split('@');
  if (!domain) return '****@****.***';
  const domainParts = domain.split('.');
  const maskedLocal = local[0] + '***';
  const maskedDomain = domainParts[0][0] + '***.' + (domainParts.slice(1).join('.') || '***');
  return `${maskedLocal}@${maskedDomain}`;
}

/** Mask a phone number, e.g. "(555) 123-4567" → "(***) ***-4567" */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '(***) ***-****';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 4) {
    return '(***) ***-' + digits.slice(-4);
  }
  return '(***) ***-****';
}

/** Mask an address, showing only state */
export function maskAddress(address: string | null | undefined, state: string | null | undefined): string {
  if (!state) return '****';
  return `****, ${state}`;
}
