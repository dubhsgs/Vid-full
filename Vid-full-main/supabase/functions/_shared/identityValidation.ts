import isIdentityCard from 'npm:validator@13.15.26/lib/isIdentityCard.js';
import isPassportNumber from 'npm:validator@13.15.26/lib/isPassportNumber.js';

const PASSPORT_COUNTRY_CODES = new Set([
  'AM', 'AR', 'AT', 'AU', 'AZ', 'BE', 'BG', 'BR', 'BY', 'CA', 'CH', 'CN',
  'CY', 'CZ', 'DE', 'DK', 'DZ', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR',
  'HU', 'ID', 'IE', 'IN', 'IR', 'IS', 'IT', 'JM', 'JP', 'KR', 'KZ', 'LI',
  'LT', 'LU', 'LV', 'LY', 'MT', 'MX', 'MY', 'MZ', 'NL', 'NZ', 'PH', 'PK',
  'PL', 'PT', 'RO', 'RU', 'SE', 'SK', 'TH', 'TR', 'UA', 'US', 'ZA',
]);

const IDENTITY_CARD_LOCALE_BY_COUNTRY: Record<string, string> = {
  CN: 'zh-CN',
  ES: 'ES',
  FI: 'FI',
  HK: 'zh-HK',
  IL: 'he-IL',
  IN: 'IN',
  IR: 'IR',
  IT: 'IT',
  LK: 'LK',
  LY: 'ar-LY',
  NO: 'NO',
  PK: 'PK',
  PL: 'PL',
  TH: 'TH',
  TN: 'ar-TN',
  TW: 'zh-TW',
};

export function isSupportedIdentityDocumentType(
  countryCode: string,
  documentType: string
): boolean {
  if (documentType === 'passport') return PASSPORT_COUNTRY_CODES.has(countryCode);
  if (documentType === 'national_id') return Boolean(IDENTITY_CARD_LOCALE_BY_COUNTRY[countryCode]);
  return false;
}

export function isValidIdentityDocument(
  countryCode: string,
  documentType: string,
  documentNumber: string
): boolean {
  if (!isSupportedIdentityDocumentType(countryCode, documentType)) return false;

  if (documentType === 'passport') {
    return isPassportNumber(documentNumber, countryCode);
  }

  return isIdentityCard(
    documentNumber,
    IDENTITY_CARD_LOCALE_BY_COUNTRY[countryCode]
  );
}
