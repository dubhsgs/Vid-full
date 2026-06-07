import isIdentityCard from 'validator/lib/isIdentityCard';
import isPassportNumber from 'validator/lib/isPassportNumber';
import type { CreatorDocumentType } from './creatorIdentity';

type IdentityCardLocale =
  | 'ar-LY'
  | 'ar-TN'
  | 'ES'
  | 'FI'
  | 'he-IL'
  | 'IN'
  | 'IR'
  | 'IT'
  | 'LK'
  | 'NO'
  | 'PK'
  | 'PL'
  | 'TH'
  | 'zh-CN'
  | 'zh-HK'
  | 'zh-TW';

const PASSPORT_COUNTRY_CODES = [
  'AM', 'AR', 'AT', 'AU', 'AZ', 'BE', 'BG', 'BR', 'BY', 'CA', 'CH', 'CN',
  'CY', 'CZ', 'DE', 'DK', 'DZ', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR',
  'HU', 'ID', 'IE', 'IN', 'IR', 'IS', 'IT', 'JM', 'JP', 'KR', 'KZ', 'LI',
  'LT', 'LU', 'LV', 'LY', 'MT', 'MX', 'MY', 'MZ', 'NL', 'NZ', 'PH', 'PK',
  'PL', 'PT', 'RO', 'RU', 'SE', 'SK', 'TH', 'TR', 'UA', 'US', 'ZA',
] as const;

const IDENTITY_CARD_LOCALE_BY_COUNTRY: Partial<Record<string, IdentityCardLocale>> = {
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

const PASSPORT_COUNTRY_SET = new Set<string>(PASSPORT_COUNTRY_CODES);

export const SUPPORTED_IDENTITY_COUNTRY_CODES = Array.from(new Set([
  ...PASSPORT_COUNTRY_CODES,
  ...Object.keys(IDENTITY_CARD_LOCALE_BY_COUNTRY),
])).sort();

export function getSupportedDocumentTypes(countryCode: string): CreatorDocumentType[] {
  const types: CreatorDocumentType[] = [];
  if (IDENTITY_CARD_LOCALE_BY_COUNTRY[countryCode]) types.push('national_id');
  if (PASSPORT_COUNTRY_SET.has(countryCode)) types.push('passport');
  return types;
}

export function isValidIdentityDocument(
  countryCode: string,
  documentType: CreatorDocumentType,
  documentNumber: string
): boolean {
  const normalizedCountry = countryCode.trim().toUpperCase();
  const normalizedNumber = documentNumber.trim();
  if (!normalizedCountry || !normalizedNumber) return false;

  if (documentType === 'passport') {
    return PASSPORT_COUNTRY_SET.has(normalizedCountry)
      && isPassportNumber(normalizedNumber, normalizedCountry);
  }

  if (documentType === 'national_id') {
    const locale = IDENTITY_CARD_LOCALE_BY_COUNTRY[normalizedCountry];
    return Boolean(locale) && isIdentityCard(normalizedNumber, locale);
  }

  return false;
}
