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

        <p className="text-slate-400 text-sm mb-10">生效日期：2026年3月31日</p>

        <div className="space-y-10 text-slate-300 leading-relaxed">
          <section>
            <p>
              VAID（以下简称“我们”）非常重视您的隐私与个人信息保护。请您在使用本服务前阅读并理解本隐私政策。您使用本服务，即表示您同意我们按照本隐私政策处理您的相关信息。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. 我们收集的信息</h2>
            <p className="mb-4">为向您提供服务，我们可能收集以下信息：</p>

            <h3 className="text-base font-semibold text-slate-200 mb-2">1.1 您主动提供的信息</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>您上传的图片或文件；</li>
              <li>您填写的角色名称、创作者名称或其他展示信息；</li>
              <li>您提交的订单信息；</li>
              <li>您主动联系我们时提供的反馈或咨询内容。</li>
            </ul>

            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-6">1.2 服务自动生成或收集的信息</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>与服务结果相关的验证信息、记录信息、订单信息及使用记录；</li>
              <li>为实现访问控制、安全保障和服务管理所需的设备环境信息、识别信息或本地状态信息；</li>
              <li>访问日志、错误日志、IP 地址、浏览器类型、设备类型、访问时间及请求记录。</li>
            </ul>

            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-6">1.3 支付相关信息</h3>
            <p className="mb-3">如您使用付费服务，我们可能收集或处理：</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>订单号；</li>
              <li>支付状态；</li>
              <li>套餐信息；</li>
              <li>支付时间；</li>
              <li>与订单关联的必要识别信息。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. 我们如何使用信息</h2>
            <p className="mb-3">我们收集和使用上述信息，主要用于以下目的：</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>为您生成数字证书、验证信息及相关服务结果；</li>
              <li>为您提供验证、下载和展示服务；</li>
              <li>完成支付、订单管理与购买次数管理；</li>
              <li>防止欺诈、滥用和恶意访问；</li>
              <li>处理投诉、纠纷和安全事件；</li>
              <li>优化产品性能、故障排查与服务维护；</li>
              <li>满足适用法律法规和监管要求。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. 图片与相关内容处理</h2>
            <p>
              您上传的图片可能会被用于生成数字证书展示内容、预览内容、验证信息及相关辅助材料。
            </p>
            <p className="mt-4">
              我们会遵循最小必要原则处理您的信息，并尽量仅在实现服务所必需的范围内保存相关内容。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. 设备环境与识别信息</h2>
            <p>
              为实现服务管理、访问控制、安全保障和防止滥用，我们可能使用设备环境信息、浏览器本地状态信息或类似识别技术。
            </p>
            <p className="mt-4">您理解并同意：</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2 mt-2">
              <li>该类信息仅用于服务管理和安全控制；</li>
              <li>该类信息不会用于与本服务无关的广告投放或跨服务画像；</li>
              <li>如您清除浏览器数据、更换设备或更换浏览器，相关识别结果可能发生变化。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. 信息存储</h2>
            <p>
              我们会在实现服务所必需的期限内存储您的信息，除非法律法规另有要求或您提出删除请求。
            </p>
            <p className="mt-4">不同信息的保存期限可能不同，例如：</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2 mt-2">
              <li>订单与支付记录：按法律、财务和风控需要保存；</li>
              <li>数字证书与验证记录：按服务展示与验证需要保存；</li>
              <li>日志信息：按安全审计和故障排查需要保存；</li>
              <li>临时文件：在服务完成后按规则清理。</li>
            </ul>
            <p className="mt-4">
              当保存期限届满后，我们会删除或匿名化处理相关信息，除非法律法规要求继续保存。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. 信息共享</h2>
            <p className="mb-3">我们不会向无关第三方出售您的个人信息。</p>
            <p className="mb-3">为实现服务，我们可能将必要信息提供给以下类型的第三方或合作方：</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>支付服务提供方；</li>
              <li>云基础设施与技术服务提供方；</li>
              <li>数据处理与存储服务提供方；</li>
              <li>依法有权要求披露信息的政府部门、司法机关或监管机构。</li>
            </ul>
            <p className="mt-4">
              上述第三方仅在实现服务所必需的范围内处理信息，并应遵守相应安全与保密义务。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. 跨境传输</h2>
            <p>
              如本服务使用境外部署的云服务、数据库或其他基础设施，您的部分信息可能存在跨境存储或跨境处理的情形。
            </p>
            <p className="mt-4">
              如涉及法律要求的跨境传输，我们将按照适用法律法规进行告知、评估并采取相应保护措施。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. 信息安全</h2>
            <p className="mb-3">我们会采取合理的技术与管理措施保护您的信息安全，包括但不限于：</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>传输加密；</li>
              <li>访问控制；</li>
              <li>权限隔离；</li>
              <li>必要的安全校验措施；</li>
              <li>存储权限管理；</li>
              <li>日志审计；</li>
              <li>最小权限原则。</li>
            </ul>
            <p className="mt-4">
              但请您理解，任何系统都无法做到绝对安全。如发生可能影响您个人信息安全的事件，我们将按照法律法规要求及时通知您并采取补救措施。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. 您的权利</h2>
            <p className="mb-3">按照适用法律法规，您可能享有以下权利：</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>查询您的个人信息；</li>
              <li>更正您的个人信息；</li>
              <li>删除您的个人信息；</li>
              <li>撤回同意；</li>
              <li>获取个人信息副本或导出；</li>
              <li>注销或删除相关服务记录。</li>
            </ul>
            <p className="mt-4">
              如您希望行使上述权利，请通过网站页面公布的“联系我们”方式与我们联系。我们将在合理期限内处理您的请求，但法律法规另有规定或技术上无法立即完成的除外。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. 未成年人保护</h2>
            <p>
              本服务不面向未满 14 周岁的儿童。如果您是未成年人，请在监护人指导下使用本服务，并确保已取得监护人同意。
            </p>
            <p className="mt-4">
              如果我们发现未经授权收集了未成年人个人信息，我们将依法采取删除、匿名化或其他必要措施。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Cookie 与类似技术</h2>
            <p>
              为提升使用体验、记住您的偏好、维护访问状态或进行安全控制，我们可能使用 Cookie、本地存储或类似技术。
            </p>
            <p className="mt-4">
              您可以通过浏览器设置管理 Cookie，但关闭某些功能后，部分服务可能无法正常使用。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">12. 第三方服务</h2>
            <p>
              本服务可能集成第三方支付、云基础设施、数据处理与存储等第三方服务。第三方服务提供方会按照其自身隐私政策处理信息。建议您同时阅读相关第三方服务的隐私政策。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">13. 政策更新</h2>
            <p>
              我们可能根据法律法规变化、业务调整或服务升级更新本隐私政策。
            </p>
            <p className="mt-4">
              如本隐私政策发生重大变更，我们将通过页面公告、站内提示或其他适当方式通知您。继续使用本服务，即表示您同意更新后的隐私政策。
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-600 text-sm">
          <p>运营方：VAID Company</p>
          <p className="mt-2">网站名称：VAID</p>
        </div>
      </div>
    </div>
  );
}
