# 支付宝支付系统配置指南

## 系统架构概述

本系统已完成从爱发电到支付宝的全面升级，实现了：

1. **浏览器指纹识别** - 使用 FingerprintJS 为每个用户生成唯一的 ClientID
2. **数据库计数系统** - 所有配额数据存储在 Supabase 数据库中
3. **支付宝官方支付** - 集成支付宝网页支付接口
4. **自动化充值闭环** - 支付成功后自动增加用户配额

## 数据库表结构

### user_quotas 表
记录每个用户的配额信息：
- `client_id` - 浏览器指纹唯一标识
- `remaining_credits` - 剩余可用次数（初始 3 次）
- `total_used` - 累计已使用次数
- `created_at`, `updated_at` - 时间戳

### alipay_orders 表
记录所有支付订单：
- `out_trade_no` - 商户订单号
- `trade_no` - 支付宝交易号
- `client_id` - 关联的客户端指纹
- `pack_size` - 购买的次数包（10/50/100）
- `amount` - 支付金额
- `status` - 订单状态（pending/paid/cancelled）
- `paid_at` - 支付完成时间

## Edge Functions

已部署的云函数：

1. **quota-check** - 查询用户配额，首次访问自动创建 3 次免费额度
2. **quota-use** - 扣减配额，生成证书前调用
3. **alipay-create-order** - 创建支付订单，生成支付宝支付链接
4. **alipay-notify** - 处理支付宝异步通知，自动充值配额

## 环境变量配置

需要在 Supabase 项目中配置以下环境变量（Secrets）：

```bash
ALIPAY_APP_ID=2021006140690444
ALIPAY_PRIVATE_KEY=<你的应用私钥>
ALIPAY_PUBLIC_KEY=<支付宝公钥>
```

### 获取支付宝密钥步骤：

1. **登录支付宝开放平台**
   - 访问：https://open.alipay.com/
   - 使用支付宝账号登录

2. **进入控制台 → 开发者中心**
   - 找到你的应用（AppID: 2021006140690444）
   - 或创建新的网页应用

3. **配置应用信息**
   - 接口加密方式：选择 **RSA2(SHA256)**
   - 应用网关：`https://<你的项目>.supabase.co/functions/v1/alipay-notify`
   - 授权回调地址：`https://vaid.top/payment-success`

4. **生成密钥对**
   - 下载支付宝官方密钥生成工具
   - 生成 RSA2 密钥对（2048位）
   - 上传**应用公钥**到支付宝后台
   - 获取**支付宝公钥**

5. **配置 Supabase Secrets**
   ```bash
   # 在 Supabase Dashboard → Edge Functions → Secrets 中添加：

   ALIPAY_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
   你的应用私钥内容（完整的 PEM 格式）
   -----END PRIVATE KEY-----

   ALIPAY_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
   支付宝公钥内容（完整的 PEM 格式）
   -----END PUBLIC KEY-----
   ```

## 前端集成

### 配额查询
```typescript
import { getRemainingFreeCertificates } from './utils/licenseManager';

const remaining = await getRemainingFreeCertificates();
console.log(`剩余次数: ${remaining}`);
```

### 使用配额
```typescript
import { useFreeCertificate } from './utils/licenseManager';

const success = await useFreeCertificate();
if (success) {
  // 生成证书
} else {
  // 显示支付弹窗
}
```

### 发起支付
```typescript
import { supabase } from './utils/licenseManager';
import { getClientId } from './utils/fingerprint';

const clientId = await getClientId();
const { data } = await supabase.functions.invoke('alipay-create-order', {
  body: {
    client_id: clientId,
    pack_size: 50,  // 10, 50, 或 100
    return_url: window.location.origin + '/payment-success'
  }
});

if (data?.payment_url) {
  window.location.href = data.payment_url;
}
```

## 支付流程

1. **用户点击购买** → 调用 `alipay-create-order`
2. **创建订单** → 在数据库中记录订单（status: pending）
3. **跳转支付宝** → 用户完成支付
4. **异步通知** → 支付宝调用 `alipay-notify`
5. **验证签名** → 确认通知真实性
6. **更新订单** → status: paid，记录 trade_no
7. **充值配额** → 在 user_quotas 表中增加次数
8. **返回应用** → 用户返回 return_url，前端刷新配额

## 套餐定价

- **10次套餐**: ¥9.9
- **50次套餐**: ¥39.9（推荐）
- **100次套餐**: ¥69.9

## 开发者工具

在浏览器控制台中可用：

```javascript
// 查看开发者工具
V_ID_DEV.info()

// 切换开发模式（无限次数）
V_ID_DEV.toggleDevMode()

// 获取当前客户端 ID
await V_ID_DEV.getClientId()

// 查询配额信息
await V_ID_DEV.getQuotaInfo()
```

## 测试模式

支付宝沙箱环境测试：

1. 访问：https://open.alipay.com/develop/sandbox/app
2. 获取沙箱应用 AppID 和密钥
3. 修改 `alipay-create-order/index.ts` 中的网关地址：
   ```typescript
   const paymentUrl = `https://openapi-sandbox.dl.alipaydev.com/gateway.do?${queryString}`;
   ```
4. 使用沙箱买家账号测试支付

## 安全说明

1. **签名验证** - 所有支付宝通知都会验证 RSA2 签名
2. **幂等性处理** - 防止重复充值
3. **RLS 策略** - 数据库层面的访问控制
4. **Service Role** - 配额操作使用服务端密钥

## 故障排查

### 支付后配额未增加
1. 检查 Edge Function 日志（Supabase Dashboard → Edge Functions → Logs）
2. 确认 `alipay-notify` 是否收到通知
3. 检查签名验证是否通过
4. 查询 `alipay_orders` 表确认订单状态

### 无法创建订单
1. 检查 `ALIPAY_APP_ID` 是否正确
2. 确认私钥格式是否完整
3. 查看浏览器 Network 面板的错误信息

### 支付宝回调失败
1. 确认应用网关地址配置正确
2. 检查公钥是否上传到支付宝后台
3. 验证 Supabase URL 是否可公网访问

## 部署清单

- [x] 数据库表创建（user_quotas, alipay_orders）
- [x] Edge Functions 部署
- [x] 前端代码更新
- [x] FingerprintJS 集成
- [ ] 配置支付宝应用信息
- [ ] 上传应用公钥到支付宝
- [ ] 配置 Supabase Secrets
- [ ] 测试完整支付流程

## 后续优化建议

1. 添加订单查询页面，让用户查看历史订单
2. 实现退款功能
3. 添加优惠券/折扣码系统
4. 集成微信支付作为备选
5. 实现会员订阅制
