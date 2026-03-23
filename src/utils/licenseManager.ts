import { createClient } from '@supabase/supabase-js';

const FREE_CERTIFICATES_KEY = 'v-id-free-certificates';
const LICENSE_KEY = 'v-id-license';
const LICENSE_PACK_SIZE_KEY = 'v-id-license-pack-size';
const DEV_MODE_KEY = 'v-id-dev-mode';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// 检测是否为开发环境
export function isDevelopmentMode(): boolean {
  // 自动检测开发环境（Vite 开发服务器）
  const isDevServer = import.meta.env.DEV;

  // 手动启用的开发者模式
  const devModeEnabled = localStorage.getItem(DEV_MODE_KEY) === 'true';

  return isDevServer || devModeEnabled;
}

// 启用/禁用开发者模式
export function toggleDevMode(): boolean {
  const currentMode = localStorage.getItem(DEV_MODE_KEY) === 'true';
  const newMode = !currentMode;
  localStorage.setItem(DEV_MODE_KEY, String(newMode));
  console.log(`开发者模式 ${newMode ? '已启用' : '已禁用'} - 无限制生成证书`);
  return newMode;
}

// 重置免费次数（用于测试）
export function resetFreeCertificates(): void {
  localStorage.setItem(FREE_CERTIFICATES_KEY, '3');
  console.log('免费次数已重置为 3');
}

export function getRemainingFreeCertificates(): number {
  // 开发模式下显示无限
  if (isDevelopmentMode()) {
    return 999;
  }
  const stored = localStorage.getItem(FREE_CERTIFICATES_KEY);
  return stored ? parseInt(stored, 10) : 3;
}

export function useFreeCertificate(): boolean {
  // 开发模式下不消耗次数
  if (isDevelopmentMode()) {
    return true;
  }
  const remaining = getRemainingFreeCertificates();
  if (remaining > 0) {
    localStorage.setItem(FREE_CERTIFICATES_KEY, String(remaining - 1));
    return true;
  }
  return false;
}

export function hasValidLicense(): boolean {
  // 开发模式下视为有有效许可证
  if (isDevelopmentMode()) {
    return true;
  }
  const license = localStorage.getItem(LICENSE_KEY);
  return !!license;
}

export async function validateAndActivateLicense(key: string): Promise<{ success: boolean; packSize?: number; message?: string }> {
  try {
    const { data: order, error } = await supabase
      .from('afdian_orders')
      .select('license_key, pack_size, status')
      .eq('license_key', key)
      .eq('status', 'paid')
      .maybeSingle();

    if (error) {
      console.error('License validation error:', error);
      return { success: false, message: '验证失败，请稍后重试' };
    }

    if (!order) {
      return { success: false, message: '无效的激活码' };
    }

    localStorage.setItem(LICENSE_KEY, key);
    localStorage.setItem(LICENSE_PACK_SIZE_KEY, String(order.pack_size));

    const currentRemaining = getRemainingFreeCertificates();
    const newRemaining = currentRemaining + order.pack_size;
    localStorage.setItem(FREE_CERTIFICATES_KEY, String(newRemaining));

    return { success: true, packSize: order.pack_size };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, message: '网络错误，请检查连接' };
  }
}

export function setLicense(key: string): void {
  localStorage.setItem(LICENSE_KEY, key);
}

export function canGenerateCertificate(): boolean {
  return hasValidLicense() || getRemainingFreeCertificates() > 0;
}

// 在浏览器控制台中暴露开发者工具
if (typeof window !== 'undefined') {
  (window as any).V_ID_DEV = {
    toggleDevMode,
    resetFreeCertificates,
    isDevelopmentMode,
    info: () => {
      console.log('=== V-ID 开发者工具 ===');
      console.log('使用方法:');
      console.log('  V_ID_DEV.toggleDevMode() - 切换开发者模式（无限制生成）');
      console.log('  V_ID_DEV.resetFreeCertificates() - 重置免费次数为 3');
      console.log('  V_ID_DEV.isDevelopmentMode() - 检查当前是否为开发模式');
      console.log('当前状态:');
      console.log(`  开发者模式: ${isDevelopmentMode() ? '✓ 已启用' : '✗ 未启用'}`);
      console.log(`  剩余免费次数: ${getRemainingFreeCertificates()}`);
    }
  };
}
