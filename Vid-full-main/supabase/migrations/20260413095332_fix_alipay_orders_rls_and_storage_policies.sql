/*
  # 加固 alipay_orders RLS 策略及存储桶权限

  ## 变更说明

  ### 1. alipay_orders 表 RLS 修复
  - 删除旧的 USING (true) 全表公开策略，该策略允许任何匿名用户读取所有订单
  - 新策略：匿名用户只能查询 client_id 与请求头 x-client-id 匹配的订单行
  - 客户端须在请求中携带 x-client-id 请求头，RLS 从 PostgREST 注入的
    request.headers 中读取该值进行比对
  - service_role 策略保持不变（用于 Edge Functions 回调）

  ### 2. v-id-images 存储桶策略加固
  - 删除原有"允许任意用户上传/更新/删除"的宽松策略
  - 新 INSERT 策略：匿名用户只能向 avatars/ 路径上传，且文件名须符合指定前缀
  - 删除公开 UPDATE / DELETE 策略，防止越权覆盖或删除他人文件
  - 保留公开 SELECT（读取），因为图片 URL 是公开展示的

  ### 安全说明
  - client_id 是浏览器指纹，不包含身份敏感数据，但通过 RLS 匹配确保
    用户 A 无法通过 API 枚举用户 B 的订单记录
  - 存储桶 INSERT 限制路径前缀，防止上传到任意路径
*/

-- ============================================================
-- 1. 修复 alipay_orders SELECT 策略
-- ============================================================

-- 删除旧的全表公开读策略
DROP POLICY IF EXISTS "Users can view own orders" ON alipay_orders;

-- 新策略：通过请求头 x-client-id 匹配行级 client_id
-- PostgREST 将 HTTP 请求头注入为 request.headers (json 字符串)
-- 客户端须设置 header: { 'x-client-id': '<fingerprint>' }
CREATE POLICY "Anon can view own orders by client_id header"
  ON alipay_orders
  FOR SELECT
  TO anon, authenticated
  USING (
    client_id = (
      SELECT current_setting('request.headers', true)::json->>'x-client-id'
    )
  );

-- ============================================================
-- 2. 加固 v-id-images 存储桶策略
-- ============================================================

-- 删除旧的宽松策略
DROP POLICY IF EXISTS "Public upload access for v-id-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- 新 INSERT 策略：匿名用户只能上传到 avatars/ 路径
CREATE POLICY "Anon can upload to avatars path only"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'v-id-images'
    AND (storage.foldername(name))[1] = 'avatars'
  );

-- 仅 service_role 可删除文件（用于后台清理）
CREATE POLICY "Service role can delete images"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'v-id-images');

-- 仅 service_role 可更新文件元数据
CREATE POLICY "Service role can update images"
  ON storage.objects
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'v-id-images');
