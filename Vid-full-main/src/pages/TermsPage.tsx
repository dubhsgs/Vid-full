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
          <h1 className="text-3xl font-bold">用户协议</h1>
        </div>

        <p className="text-slate-400 text-sm mb-10">生效日期：2026年3月31日</p>

        <div className="space-y-10 text-slate-300 leading-relaxed">
          <section>
            <p className="mb-4">
              欢迎使用 VAID（以下简称“本服务”）。本服务由 <span className="text-white">VAID Company</span> 运营并提供。
            </p>
            <p>
              在访问、注册、使用本服务或购买本服务相关付费内容前，请您仔细阅读并充分理解本协议的全部内容。您一旦访问或使用本服务，即视为您已阅读、理解并同意接受本协议全部条款的约束。如您不同意本协议任何内容，请立即停止访问或使用本服务。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. 服务性质</h2>
            <p>
              VAID 是一项用于数字内容展示、记录辅助、验证辅助及相关服务支持的在线服务，主要用于帮助用户生成数字证书、展示相关信息、提供验证结果及辅助证明材料。
            </p>
            <p className="mt-4">
              本服务仅提供技术性与信息展示性支持，不构成法律意义上的版权登记、权属确认、公证、司法认证、行政审批或任何政府机关、司法机关、仲裁机构、登记机构的官方背书或保证。
            </p>
            <p className="mt-4">
              本服务生成、展示或提供的数字证书、验证信息及相关材料，仅可作为用户进行说明、展示或辅助举证的参考材料，不当然等同于任何法定权利证明文件，也不当然产生对权属、原创性、合法性或真实性的最终认定效力。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. 用户承诺</h2>
            <p className="mb-3">您在使用本服务时承诺并保证：</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>您对上传、提交、生成、展示或以其他方式使用的内容享有合法权利，或已获得合法、充分、有效的授权；</li>
              <li>您上传或使用的内容不侵犯任何第三方的著作权、商标权、专利权、肖像权、名誉权、隐私权、个人信息权益或其他合法权益；</li>
              <li>您不会利用本服务上传、发布、传播、存储或展示任何违法违规、侵权、虚假、欺诈、侮辱诽谤、淫秽色情、暴力恐怖、歧视骚扰、危害未成年人身心健康或其他不适宜内容；</li>
              <li>您不会利用本服务从事任何违反法律法规、社会公序良俗或侵犯他人合法权益的行为；</li>
              <li>您不会通过任何方式干扰、破坏、攻击、逆向利用或不当使用本服务及其相关系统、页面、接口、流程或规则。</li>
            </ul>
            <p className="mt-4">
              如因您的上传内容、使用行为或其他与您相关的原因引发任何争议、投诉、举报、索赔、行政处罚、司法程序或其他法律责任，均由您自行承担；因此给 VAID 或任何第三方造成损失的，您应依法承担赔偿责任。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. 服务内容</h2>
            <p className="mb-3">本服务可能向您提供以下内容或功能：</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>上传图片并生成 VAID 数字证书及相关展示内容；</li>
              <li>生成与内容对应的验证信息、查询结果及辅助展示页面；</li>
              <li>提供在线验证、记录展示及相关辅助材料下载；</li>
              <li>提供订单管理、购买次数管理、激活码发放与使用支持；</li>
              <li>提供与上述服务相关的页面展示、技术支持与客户服务。</li>
            </ul>
            <p className="mt-4">
              本服务有权根据业务发展、运营安排、用户体验优化、技术升级、合规要求或其他合理需要，对服务内容、功能模块、页面设计、交付形式、使用规则、计费方式或服务流程进行调整、中断、限制、变更、升级或下线，但将尽合理努力保持主要服务的持续可用。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. 数字证书与验证信息</h2>
            <p className="mb-3">您理解并同意：</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>本服务生成的数字证书主要用于内容展示、记录说明及辅助证明；</li>
              <li>本服务展示的验证信息、查询结果、辅助材料或相关页面，仅用于帮助用户说明相关内容的生成、展示或记录情况；</li>
              <li>本服务提供的在线验证页、链接、二维码、查询结果或下载内容，仅属于辅助校验和辅助说明工具，不当然构成对相关内容权属、真实性、原创性、合法性或有效性的最终证明；</li>
              <li>本服务不保证任何第三方机构、平台、法院、仲裁机构、行政机关或其他主体必然认可、采信或接受本服务生成或展示的任何材料。</li>
            </ul>
            <p className="mt-4">
              您应自行妥善保存与使用本服务相关的原始文件、订单信息、数字证书、验证信息、下载文件及其他必要材料。如因您未妥善保存导致后续无法验证、无法展示、无法举证或权益受损，相关后果由您自行承担。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. 支付与退款</h2>
            <p className="mb-3">如本服务提供付费功能，您应在购买前仔细确认套餐内容、价格、使用规则及适用范围。</p>
            <p className="mb-3">您同意：</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>支付成功后，系统将根据订单向您发放相应权益或激活码；</li>
              <li>激活码一经发放且可正常使用，不支持退款；</li>
              <li>如支付成功但未收到激活码，您可通过网站页面公布的“联系我们”方式联系客服处理；</li>
              <li>如因本服务系统原因导致您未收到激活码或激活码无法正常使用，经客服核实后，本服务将为您补发；</li>
              <li>已消费的部分视为已实际使用，仅就未消费部分进行补发或其他合理处理；</li>
              <li>因用户填写错误、保管不善、转交他人、泄露激活码或其他非因本服务原因造成的损失，由用户自行承担；</li>
              <li>如因支付渠道、网络故障、第三方平台异常或其他非本服务可合理控制的原因导致支付延迟、状态不同步或短时异常，本服务将在合理范围内协助核查处理，但不对超出合理控制范围的部分承担责任。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. 访问控制</h2>
            <p className="mb-3">
              本服务可能基于订单信息、激活码、访问凭证、设备环境、缓存信息或其他必要方式进行服务校验、权益识别、次数管理及安全控制。
            </p>
            <p className="mb-3">您理解并同意：</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>前述信息仅用于实现服务交付、订单关联、使用管理、安全保障及体验优化；</li>
              <li>上述识别信息不当然等同于对用户真实身份的认证；</li>
              <li>您应妥善保管与订单、激活码或其他访问凭证相关的信息；</li>
              <li>因您自行泄露、转让、共享、遗失或保管不善而造成的任何损失，由您自行承担。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. 第三方服务</h2>
            <p>
              本服务可能依赖第三方支付、云存储、数据库、网络服务、基础设施服务或其他第三方服务支持。
            </p>
            <p className="mt-4">
              因第三方服务的故障、延迟、中断、限制、调整、升级、政策变化或其他非 VAID 可合理控制的原因，导致本服务部分或全部功能受到影响的，在法律允许范围内，VAID 对超出合理控制范围的后果不承担责任，但会尽合理努力协助处理或恢复。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. 知识产权</h2>
            <p className="mb-4">
              除用户依法享有权利的上传内容外，本服务中的商标、标识、名称、界面设计、页面布局、文案、图片、程序代码、结构安排、数据整理、服务规则及其他相关内容的知识产权，均归 VAID 或相关权利人所有。
            </p>
            <p>
              未经 VAID 或相关权利人事先书面许可，任何人不得以任何方式对本服务相关内容进行复制、传播、修改、改编、汇编、翻译、出租、出售、反向工程、反向编译、反汇编或其他不当使用。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. 免责声明</h2>
            <p className="mb-3">
              在法律允许的最大范围内，本服务按“现状”和“可提供”状态向您提供。VAID 不对以下事项作出任何明示或默示保证：
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>本服务将完全无错误、无中断、无延迟、无漏洞或永久可用；</li>
              <li>本服务生成或展示的内容一定会被任何第三方采信；</li>
              <li>本服务提供的数字证书、验证信息或辅助材料可以替代法定程序；</li>
              <li>用户上传内容当然具有原创性、合法性、完整性、真实性或可确权性；</li>
              <li>用户通过本服务获得的结果一定符合其特定用途或预期。</li>
            </ul>
            <p className="mt-4">
              因不可抗力、系统维护、网络故障、黑客攻击、病毒侵害、第三方服务异常、政策变化、监管要求或其他不可预见、不可避免、不可控制的原因导致的损失，VAID 不承担超出法律规定范围的责任。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. 协议变更</h2>
            <p>
              VAID 有权根据业务需要、运营安排、法律法规要求或合规管理要求，对本协议内容进行修改或更新。
            </p>
            <p className="mt-4">
              如本协议发生重大变更，VAID 将通过网站公告、页面提示或其他合理方式进行通知。变更后的协议一经公布或在公告载明的生效日期起生效。您在协议更新后继续访问或使用本服务的，视为您已接受更新后的协议内容。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. 法律适用与争议解决</h2>
            <p>
              本协议的订立、效力、解释、履行及争议解决，均适用中华人民共和国法律。
            </p>
            <p className="mt-4">
              如因本协议或本服务引起任何争议，双方应首先友好协商解决；协商不成的，任何一方均有权向 VAID Company 所在地有管辖权的人民法院提起诉讼。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">12. 其他</h2>
            <p>
              如本协议任何条款被认定为无效、违法或不可执行，不影响本协议其他条款的有效性和可执行性。
            </p>
            <p className="mt-4">
              本协议标题仅为阅读方便而设，不影响条款含义解释。
            </p>
            <p className="mt-4">
              本协议未尽事宜，按法律法规规定及 VAID 相关页面规则执行；如相关页面规则与本协议存在冲突，以具体场景下另行明确说明的规则为准，但法律法规另有规定的除外。
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
