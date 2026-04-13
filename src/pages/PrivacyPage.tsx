import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#171717] text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold">隐私政策</h1>
        </div>

        <p className="text-slate-400 text-sm mb-10">最后更新日期：2026年4月13日</p>

        <div className="space-y-10 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. 概述</h2>
            <p>
              V-ID 平台（以下简称"本平台"）高度重视用户隐私。本隐私政策说明我们如何收集、使用及保护您在使用本平台服务过程中产生的信息。请在使用本平台前仔细阅读本政策。使用本平台即表示您已知悉并同意本政策内容。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. 我们收集的信息</h2>

            <h3 className="text-base font-semibold text-slate-200 mb-2">2.1 浏览器指纹</h3>
            <p className="mb-4">
              本平台使用 FingerprintJS 技术自动生成您设备的浏览器指纹。该指纹是一串基于您设备硬件特征、浏览器配置等信息派生出的匿名标识符，<strong className="text-white">不包含任何可直接识别您个人身份的信息</strong>。
            </p>
            <p className="mb-4">
              我们收集浏览器指纹的唯一目的是：
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 ml-2">
              <li>识别您的设备以关联您的免费使用额度；</li>
              <li>在您完成付款后，将已购买的次数包正确发放至您的设备账户；</li>
              <li>防止滥用免费额度。</li>
            </ul>
            <p className="mt-4">
              浏览器指纹存储于我们的数据库中，用于额度管理，不会用于任何广告定向、用户画像或第三方数据共享。
            </p>

            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-6">2.2 用户上传的图像</h3>
            <p className="mb-4">
              当您上传头像或数字资产图片用于生成 V-ID 证件时，该图片将被上传并存储于我们的服务器（Supabase 对象存储）。我们收集图像的目的是：
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 ml-2">
              <li>将图像嵌入生成的 V-ID 证件中；</li>
              <li>计算图像的 SHA-256 哈希值作为数字指纹，写入证件并用于后续验证。</li>
            </ul>
            <p className="mt-4">
              <strong className="text-white">请注意：</strong>请勿上传包含敏感个人信息、他人隐私或侵犯版权的图像。您对所上传图像的合法性承担全部责任。
            </p>

            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-6">2.3 角色与创作者名称</h3>
            <p>
              您填写的角色名称与创作者名称将被写入证件，并存储于我们的数据库中，用于生成证件内容及公开验证页面展示。请勿填写任何真实的个人敏感信息。
            </p>

            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-6">2.4 支付信息</h3>
            <p>
              当您通过支付宝进行付款时，我们会记录订单号、交易金额、支付状态及支付时间。<strong className="text-white">我们不存储任何银行卡号、支付宝账户名或密码等支付凭证信息。</strong>支付流程由支付宝平台负责处理，受其独立隐私政策约束。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. 信息的使用方式</h2>
            <p className="mb-3">我们仅将收集的信息用于以下目的：</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>生成并颁发 V-ID 数字存在证明证件；</li>
              <li>管理用户免费及付费额度；</li>
              <li>处理支付并核实到账情况；</li>
              <li>提供公开证件验证服务；</li>
              <li>维护系统安全、防止滥用。</li>
            </ul>
            <p className="mt-4">
              我们不会将您的信息出售、租借或以任何形式提供给任何第三方，法律要求的情形除外。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. 数据存储与安全</h2>
            <p className="mb-3">
              所有数据存储于 Supabase 提供的云数据库和对象存储服务中，物理服务器位于境外（具体区域以 Supabase 服务协议为准）。我们采取以下措施保护您的数据：
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>数据库启用行级安全策略（RLS），限制未授权访问；</li>
              <li>支付回调接口强制执行支付宝签名验证；</li>
              <li>传输过程采用 HTTPS 加密。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. 数据保留</h2>
            <p>
              您的浏览器指纹及额度记录将在最后一次活跃后保留不超过 12 个月。证件记录因涉及不可篡改的数字存在证明功能，将被长期保存。如需删除您的数据，请通过页面底部联系方式与我们取得联系。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Cookie 与本地存储</h2>
            <p>
              本平台使用浏览器本地存储（localStorage）暂存您的上传图像预览、角色名称等表单信息，以提升用户体验。这些数据仅保存在您的设备本地，刷新或关闭页面后不会自动清除，您可随时通过浏览器设置手动清除。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. 未成年人保护</h2>
            <p>
              本平台不面向 14 周岁以下未成年人提供服务。我们不会故意收集未成年人的个人信息。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. 政策变更</h2>
            <p>
              我们可能不定期更新本隐私政策。更新后将在本页面发布最新版本，并更新顶部"最后更新日期"。重大变更将通过页面公告方式通知用户。继续使用本平台即视为接受更新后的政策。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. 联系我们</h2>
            <p>
              如您对本隐私政策有任何疑问或需要行使数据权利，请通过本平台官方渠道联系我们。我们将在合理时间内予以回复。
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-600 text-sm">
          <p>© 2026 V-ID 平台. 保留所有权利。</p>
        </div>
      </div>
    </div>
  );
}
