import { createClient } from '@supabase/supabase-js';
import { getClientId } from './fingerprint';

const DEV_MODE_KEY = 'v-id-dev-mode';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function isDevelopmentMode(): boolean {
  const isDevServer = import.meta.env.DEV;
  const devModeEnabled = localStorage.getItem(DEV_MODE_KEY) === 'true';
  return isDevServer || devModeEnabled;
}

export function toggleDevMode(): boolean {
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

  try {
    const clientId = await getClientId();
    const { data, error } = await supabase.functions.invoke('quota-check', {
      body: { client_id: clientId }
    });

    if (error) {
      console.error('Error fetching quota:', error);
      return 0;
    }

    return data?.remaining_credits || 0;
  } catch (error) {
    console.error('Unexpected error fetching quota:', error);
    return 0;
  }
}

export async function useFreeCertificate(): Promise<boolean> {
  if (isDevelopmentMode()) {
    return true;
  }

  try {
    const clientId = await getClientId();
    const { data, error } = await supabase.functions.invoke('quota-use', {
      body: { client_id: clientId }
    });

    if (error) {
      console.error('Error using certificate:', error);
      return false;
    }

    return data?.success || false;
  } catch (error) {
    console.error('Unexpected error using certificate:', error);
    return false;
  }
}

export async function canGenerateCertificate(): Promise<boolean> {
  if (isDevelopmentMode()) {
    return true;
  }
  const remaining = await getRemainingFreeCertificates();
  return remaining > 0;
}

export async function getClientQuotaInfo(): Promise<{
  remaining_credits: number;
  total_used: number;
  client_id: string;
}> {
  const clientId = await getClientId();

  try {
    const { data, error } = await supabase.functions.invoke('quota-check', {
      body: { client_id: clientId }
    });

    if (error) {
      console.error('Error fetching quota info:', error);
      return { remaining_credits: 0, total_used: 0, client_id: clientId };
    }

    return {
      remaining_credits: data?.remaining_credits || 0,
      total_used: data?.total_used || 0,
      client_id: clientId
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { remaining_credits: 0, total_used: 0, client_id: clientId };
  }
}

export async function getUserOrders(): Promise<any[]> {
  try {
    const clientId = await getClientId();
    const { data, error } = await supabase
      .from('alipay_orders')
      .select('*')
      .eq('client_id', clientId)
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

if (typeof window !== 'undefined') {
  (window as any).V_ID_DEV = {
    toggleDevMode,
    isDevelopmentMode,
    getClientId,
    getQuotaInfo: getClientQuotaInfo,
    info: () => {
      console.log('=== V-ID 开发者工具 ===');
      console.log('使用方法:');
      console.log('  V_ID_DEV.toggleDevMode() - 切换开发者模式（无限制生成）');
      console.log('  V_ID_DEV.isDevelopmentMode() - 检查当前是否为开发模式');
      console.log('  V_ID_DEV.getClientId() - 获取当前浏览器指纹');
      console.log('  V_ID_DEV.getQuotaInfo() - 获取配额信息');
      console.log('当前状态:');
      console.log(`  开发者模式: ${isDevelopmentMode() ? '✓ 已启用' : '✗ 未启用'}`);
    }
  };
}
