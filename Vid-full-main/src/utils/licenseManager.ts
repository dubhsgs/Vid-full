import { getClientId } from './fingerprint';
import { supabase } from './supabase';

export { supabase };

const DEV_MODE_KEY = 'v-id-dev-mode';
const GENERATION_READY_KEY = 'v-id-generation-ready-at';
const GENERATION_READY_TTL_MS = 5 * 60 * 1000;
const ACTIVATION_CODE_STORAGE_KEY = 'v-id-activation-code';
const DEV_MODE_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_MODE === 'true';

export interface OrderStatusInfo {
  out_trade_no: string;
  status: 'pending' | 'paid' | 'cancelled';
  pack_size: number;
  amount: number;
  paid_at: string | null;
}

export interface ActivationCodeInfo {
  code: string;
  pack_size: number;
  total_uses: number;
  remaining_uses: number;
  status: 'active' | 'exhausted' | 'revoked';
}

export interface GenerationAccessState {
  can_generate: boolean;
  free_remaining: number;
  activation_code: ActivationCodeInfo | null;
}

export interface GenerationAccessResult {
  success: boolean;
  source: 'free' | 'activation' | 'none' | 'dev';
  free_remaining: number;
  activation_code: ActivationCodeInfo | null;
  error?: string;
}

interface UserOrderRecord {
  [key: string]: unknown;
}

interface VIdDevTools {
  toggleDevMode: () => boolean;
  isDevelopmentMode: () => boolean;
  getClientId: () => Promise<string>;
  getQuotaInfo: typeof getClientQuotaInfo;
  getActivationCodeInfo: typeof getActivationCodeInfo;
  clearSavedActivationCode: typeof clearSavedActivationCode;
  info: () => void;
}

declare global {
  interface Window {
    V_ID_DEV?: VIdDevTools;
  }
}

interface ActivationCodeStatusResponse {
  found?: boolean;
  usable?: boolean;
  code?: string;
  pack_size?: number;
  total_uses?: number;
  remaining_uses?: number;
  status?: ActivationCodeInfo['status'];
}

function mapActivationCodeInfo(data: ActivationCodeStatusResponse | null | undefined): ActivationCodeInfo | null {
  if (!data?.code || !data.pack_size || !data.total_uses || data.remaining_uses === undefined || !data.status) {
    return null;
  }

  return {
    code: data.code,
    pack_size: data.pack_size,
    total_uses: data.total_uses,
    remaining_uses: data.remaining_uses,
    status: data.status,
  };
}

export function normalizeActivationCode(rawCode: string): string {
  const trimmed = rawCode.trim().toUpperCase();
  const compact = trimmed.replace(/[^A-Z0-9]/g, '');

  if (compact.startsWith('VAID') && compact.length === 16) {
    return `VAID-${compact.slice(4, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}`;
  }

  return trimmed;
}

export function saveActivationCode(rawCode: string): string {
  const normalizedCode = normalizeActivationCode(rawCode);
  if (normalizedCode) {
    localStorage.setItem(ACTIVATION_CODE_STORAGE_KEY, normalizedCode);
  }
  return normalizedCode;
}

export function getSavedActivationCode(): string {
  const rawValue = localStorage.getItem(ACTIVATION_CODE_STORAGE_KEY) || '';
  return rawValue ? normalizeActivationCode(rawValue) : '';
}

export function clearSavedActivationCode(): void {
  localStorage.removeItem(ACTIVATION_CODE_STORAGE_KEY);
}

export function isDevelopmentMode(): boolean {
  if (!DEV_MODE_ENABLED) {
    return false;
  }

  return localStorage.getItem(DEV_MODE_KEY) === 'true';
}

export function toggleDevMode(): boolean {
  if (!DEV_MODE_ENABLED) {
    console.warn('开发者模式仅在本地开发环境可用');
    return false;
  }

  const currentMode = localStorage.getItem(DEV_MODE_KEY) === 'true';
  const newMode = !currentMode;
  localStorage.setItem(DEV_MODE_KEY, String(newMode));
  console.log(`开发者模式 ${newMode ? '已启用' : '已禁用'} - 无限制生成证书`);
  return newMode;
}

export async function getRemainingFreeCertificates(): Promise<number> {
  if (isDevelopmentMode()) {
    return 999;
  }

  const quotaInfo = await getClientQuotaInfo();
  return quotaInfo.remaining_credits;
}

export async function consumeFreeCertificate(): Promise<boolean> {
  // Credit consumption is now atomic inside v-id-register/register_v_id.
  return isDevelopmentMode();
}

export async function getClientQuotaInfo(): Promise<{
  remaining_credits: number;
  total_used: number;
  client_id: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('quota-check', {
      body: {},
    });

    if (error) {
      console.error('Error fetching quota info:', error);
      return { remaining_credits: 0, total_used: 0, client_id: '' };
    }

    return {
      remaining_credits: data?.remaining_credits || 0,
      total_used: data?.total_used || 0,
      client_id: data?.client_id || '',
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { remaining_credits: 0, total_used: 0, client_id: '' };
  }
}

export async function getActivationCodeInfo(rawCode?: string): Promise<ActivationCodeInfo | null> {
  const activationCode = normalizeActivationCode(rawCode ?? getSavedActivationCode());

  if (!activationCode) {
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke('license-key-status', {
      body: { code: activationCode },
    });

    if (error) {
      console.error('Error fetching activation code info:', error);
      return null;
    }

    if (!data?.found) {
      return null;
    }

    return mapActivationCodeInfo(data);
  } catch (error) {
    console.error('Unexpected error fetching activation code info:', error);
    return null;
  }
}

export async function getGenerationAccessState(rawCode?: string): Promise<GenerationAccessState> {
  if (isDevelopmentMode()) {
    return {
      can_generate: true,
      free_remaining: 999,
      activation_code: null,
    };
  }

  const quotaInfo = await getClientQuotaInfo();

  if (quotaInfo.remaining_credits > 0) {
    return {
      can_generate: true,
      free_remaining: quotaInfo.remaining_credits,
      activation_code: null,
    };
  }

  const activationCodeInfo = await getActivationCodeInfo(rawCode);
  const activationUsable = !!activationCodeInfo && activationCodeInfo.status === 'active' && activationCodeInfo.remaining_uses > 0;

  return {
    can_generate: activationUsable,
    free_remaining: quotaInfo.remaining_credits,
    activation_code: activationCodeInfo,
  };
}

export async function consumeActivationCode(rawCode?: string): Promise<{
  success: boolean;
  activation_code: ActivationCodeInfo | null;
  error?: string;
}> {
  const activationCode = normalizeActivationCode(rawCode ?? getSavedActivationCode());

  if (!activationCode) {
    return {
      success: false,
      activation_code: null,
      error: 'ACTIVATION_CODE_REQUIRED',
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('license-key-use', {
      body: { code: activationCode },
    });

    if (error) {
      console.error('Error consuming activation code:', error);
      return {
        success: false,
        activation_code: null,
        error: 'ACTIVATION_CODE_REQUEST_FAILED',
      };
    }

    if (!data?.success) {
      return {
        success: false,
        activation_code: null,
        error: data?.error || 'ACTIVATION_CODE_UNAVAILABLE',
      };
    }

    clearSavedActivationCode();

    return {
      success: true,
      activation_code: null,
    };
  } catch (error) {
    console.error('Unexpected error consuming activation code:', error);
    return {
      success: false,
      activation_code: null,
      error: 'ACTIVATION_CODE_REQUEST_FAILED',
    };
  }
}

export async function consumeGenerationAccess(rawCode?: string): Promise<GenerationAccessResult> {
  if (isDevelopmentMode()) {
    return {
      success: true,
      source: 'dev',
      free_remaining: 999,
      activation_code: null,
    };
  }

  const quotaInfo = await getClientQuotaInfo();

  if (quotaInfo.remaining_credits > 0) {
    return {
      success: true,
      source: 'free',
      free_remaining: quotaInfo.remaining_credits,
      activation_code: null,
    };
  }

  const activationResult = await consumeActivationCode(rawCode);

  return {
    success: activationResult.success,
    source: activationResult.success ? 'activation' : 'none',
    free_remaining: quotaInfo.remaining_credits,
    activation_code: activationResult.activation_code,
    error: activationResult.error,
  };
}

export async function getUserOrders(): Promise<UserOrderRecord[]> {
  try {
    const { data, error } = await supabase
      .from('alipay_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching orders:', error);
    return [];
  }
}

export function markGenerationReady(): void {
  sessionStorage.setItem(GENERATION_READY_KEY, String(Date.now()));
}

export function consumeGenerationReady(): boolean {
  const rawValue = sessionStorage.getItem(GENERATION_READY_KEY);
  sessionStorage.removeItem(GENERATION_READY_KEY);

  if (!rawValue) {
    return false;
  }

  const timestamp = Number(rawValue);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= GENERATION_READY_TTL_MS;
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.V_ID_DEV = {
    toggleDevMode,
    isDevelopmentMode,
    getClientId,
    getQuotaInfo: getClientQuotaInfo,
    getActivationCodeInfo,
    clearSavedActivationCode,
    info: () => {
      console.log('=== VAID 开发者工具 ===');
      console.log('使用方法:');
      console.log('  V_ID_DEV.toggleDevMode() - 切换开发者模式（无限制生成）');
      console.log('  V_ID_DEV.isDevelopmentMode() - 检查当前是否为开发模式');
      console.log('  V_ID_DEV.getClientId() - 获取当前浏览器指纹');
      console.log('  V_ID_DEV.getQuotaInfo() - 获取免费额度信息');
      console.log('  V_ID_DEV.getActivationCodeInfo(code) - 查询激活码状态');
      console.log('当前状态:');
      console.log(`  开发者模式: ${isDevelopmentMode() ? '✓ 已启用' : '✗ 未启用'}`);
      console.log(`  已保存激活码: ${getSavedActivationCode() || '无'}`);
    },
  };
}
