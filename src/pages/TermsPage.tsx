import { FileCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TermsPage() {
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
            <FileCheck className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold">用户服务协议</h1>
        </div>

        <p className="text-slate-400 text-sm mb-10">最后更新日期：2026年4月13日</p>

        <div className="space-y-10 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. 协议接受</h2>
            <p>
              欢迎使用 V-ID 平台（以下简称"本平台"）。在使用本平台任何服务之前，请仔细阅读本用户服务协议（以下简称"本协议"）。当您勾选同意框、点击"生成证件"或以其他方式使用本平台服务时，即表示您已阅读、理解并同意受本协议全部条款约束。如您不同意本协议，请停止使用本平台。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. 服务说明</h2>
            <p className="mb-3">
              V-ID 是一个面向数字创作者的数字资产存档与身份证明技术平台。本平台提供的核心服务包括：
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>对用户上传的图像生成 SHA-256 数字指纹；</li>
              <li>生成包含数字指纹、时间戳及创作者信息的 V-ID 证件；</li>
              <li>提供基于证件编号的公开验证查询功能；</li>
              <li>提供额度购买服务以支持批量证件生成。</li>
            </ul>
            <p className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-sm">
              <strong>重要声明：</strong>V-ID 证件是一种技术层面的"数字存在证明"，记录特定内容在特定时间点的哈希值。本平台不提供任何法律意义上的版权认定、知识产权登记或所有权证明服务。证件的存在不等同于拥有相关内容的著作权或其他法律权利。涉及知识产权保护的法律事务，请咨询专业律师或通过国家版权局等官方渠道办理。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. 用户资格与账户</h2>
            <p className="mb-3">
              本平台无需注册账户即可使用基础功能。我们通过浏览器指纹技术识别您的设备以管理使用额度。您理解并同意：
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>本平台使用浏览器指纹作为您的设备标识，用于额度管理和订单关联；</li>
              <li>更换设备、浏览器或清除浏览器数据可能导致额度无法识别；</li>
              <li>您应妥善保管订单号等支付凭证以便核查；</li>
              <li>您须年满 14 周岁方可使用本平台服务。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. 用户内容与上传规范</h2>
            <p className="mb-3">
              您在使用本平台过程中上传的所有内容（包括图像、名称等），须满足以下要求：
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>您须拥有所上传内容的合法使用权或已获得授权；</li>
              <li>上传内容不得侵犯任何第三方的知识产权、肖像权、隐私权或其他合法权益；</li>
              <li>不得上传任何违法、淫秽、诽谤、骚扰性或有害内容；</li>
              <li>不得将本平台用于任何违反中华人民共和国法律法规的活动。</li>
            </ul>
            <p className="mt-4">
              对于因您上传内容违反上述规范而产生的任何投诉、索赔或法律责任，由您自行承担全部责任，本平台不承担任何连带责任。本平台保留对违规内容进行删除处理的权利。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. 付费服务与退款政策</h2>

            <h3 className="text-base font-semibold text-slate-200 mb-2">5.1 虚拟商品说明</h3>
            <p className="mb-4">
              本平台销售的额度包属于<strong className="text-white">虚拟商品</strong>，购买即时生效并与您的设备指纹绑定。
            </p>

            <h3 className="text-base font-semibold text-slate-200 mb-2">5.2 退款政策</h3>
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm mb-4">
              <strong>请注意：</strong>鉴于虚拟商品的特殊性质，<strong>额度包一经购买且系统已完成发放，概不退款</strong>。请在付款前确认所购规格及数量。
            </div>
            <p>
              仅在以下情形下，您可申请退款：
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2 mt-2">
              <li>付款成功后系统出现故障导致额度未发放，且经核实属于平台技术问题；</li>
              <li>重复扣款（同一笔订单被扣款两次以上）。</li>
            </ul>
            <p className="mt-3">退款申请须在支付完成后 7 日内通过官方渠道提交，并提供完整的支付凭证。</p>

            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-6">5.3 定价与税费</h3>
            <p>
              本平台页面展示的价格均为人民币含税价格。本平台保留不定期调整服务价格的权利，价格调整不影响已完成的订单。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. 知识产权声明</h2>
            <p className="mb-4">
              本平台提供的服务、系统代码、界面设计及相关文档的知识产权归本平台所有，受中华人民共和国著作权法及相关法律保护。
            </p>
            <p className="mb-4 p-4 bg-slate-800/60 border border-slate-700 rounded-lg text-slate-300 text-sm">
              <strong className="text-white">版权归属免责声明：</strong>V-ID 证件仅证明特定数字内容在特定时间的哈希值存在于本平台的记录中。本平台<strong className="text-white">不对任何内容的版权归属作出任何保证或认定</strong>，证件的颁发不构成本平台对相关内容著作权归属的背书。任何将 V-ID 证件用于版权主张的行为，其法律效力由相关司法机构独立判定，与本平台无关。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. 免责条款</h2>
            <p className="mb-3">在法律允许的最大范围内，本平台对以下情形不承担责任：</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>因不可抗力（自然灾害、网络故障、政府行为等）导致服务中断或数据丢失；</li>
              <li>因用户设备更换、浏览器升级或清除数据导致指纹变化，进而无法识别已购额度；</li>
              <li>因用户上传违规内容而引发的法律纠纷及损失；</li>
              <li>任何第三方对 V-ID 证件效力的否认；</li>
              <li>超出平台服务范围的任何版权或法律诉求的失败。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. 服务变更与终止</h2>
            <p>
              本平台保留随时修改、暂停或终止全部或部分服务的权利，恕不另行通知（法律要求除外）。若本平台终止运营，我们将提前公告并尽力通知用户。用户未使用的有效额度不予退款，但本平台将提供合理的过渡期以供使用。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. 协议修改</h2>
            <p>
              本平台可能不定期修改本协议。修改后的协议将在本页面更新，并更新顶部"最后更新日期"。您在协议修改后继续使用本平台服务，即视为接受修改后的协议。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. 适用法律与争议解决</h2>
            <p>
              本协议的订立、效力、解释、履行及争议解决均适用中华人民共和国法律。如因本协议引发任何争议，双方应首先协商解决；协商不成的，任何一方均可向本平台运营者所在地有管辖权的人民法院提起诉讼。
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
