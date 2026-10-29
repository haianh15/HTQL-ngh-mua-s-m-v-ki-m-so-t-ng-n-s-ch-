import React from 'react';
import type { InsightReport } from '../../ai/insights';
import { AlertCircle, CheckCircle2, Info, Sparkles } from 'lucide-react';

/** Presentation-only. No API, save, approval or budget side effects. */
export const InsightCard: React.FC<{ title: string; report: InsightReport; children?: React.ReactNode }> = ({title,report,children}) => (
  <section className="bg-white border border-[#DDE0EA] rounded-[16px] p-5 space-y-4" aria-label={title}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#5540C7]"/><h3 className="font-bold text-[#202039] text-base">{title}</h3></div>
      <span className="bg-[#F0EDFF] text-[#5540C7] text-[11px] font-semibold rounded-[6px] px-2 py-1">{report.source === 'gemini' ? 'Gemini · phân tích trên máy chủ' : report.source === 'none' ? 'Chưa có dữ liệu để phân tích' : 'Demo theo quy tắc · chưa gọi mô hình AI'}</span>
    </div>
    <div className="text-sm font-semibold text-[#202039]">{report.headline}</div>
    <ul className="text-xs text-[#62657A] list-disc pl-5 space-y-1">{report.details.map((d,i)=><li key={i}>{d}</li>)}</ul>
    <div className="space-y-2" aria-live="polite">
      {report.insights.length ? report.insights.map(item=><div key={item.code} className={`flex gap-3 p-3 rounded-[10px] border ${item.level==='warning'?'bg-[#FFF3D6] border-[#F2DEAB]':item.level==='success'?'bg-[#E8F6EE] border-[#CFEBD9]':'bg-[#EBF2FF] border-[#D5E2FA]'}`}>
        <span className="mt-0.5">{item.level==='warning'?<AlertCircle size={17} className="text-[#875000]"/>:item.level==='success'?<CheckCircle2 size={17} className="text-[#176B49]"/>:<Info size={17} className="text-[#2459AB]"/>}</span>
        <div className="min-w-0"><div className="text-xs font-bold text-[#202039]">{item.title}</div><div className="text-xs text-[#62657A] mt-1">{item.explanation}</div></div>
      </div>):<div className="text-xs bg-[#E8F6EE] text-[#176B49] p-3 rounded-[10px]">Bộ quy tắc chưa phát hiện điểm cần lưu ý; người dùng vẫn phải kiểm tra nội dung thực tế.</div>}
    </div>
    <p className="text-[11px] text-[#62657A] border-t border-[#DDE0EA] pt-3">{report.limitations}</p>
    {children}
  </section>
);
