/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Interactive Test Runner for Scenarios A through G
 * Cho phép hội đồng nghiệm thu / kiểm thử kích hoạt trực tiếp các kịch bản nghiệp vụ phức tạp
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Play, CheckCircle2, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';

interface ScenariosRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScenariosRunnerModal: React.FC<ScenariosRunnerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { runTestScenario, resetDemoData, navigateTo } = useApp();

  const [activeScenario, setActiveScenario] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'>('A');
  const [testResult, setTestResult] = useState<{
    title: string;
    steps: string[];
    result: string;
    status: 'SUCCESS' | 'WARNING';
  } | null>(null);

  const scenarios: {
    key: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
    title: string;
    description: string;
    tags: string[];
  }[] = [
    {
      key: 'A',
      title: 'Kịch bản A: Tranh chấp & Kiểm tra thiếu ngân sách (demo)',
      description:
        'Nguồn còn 100.000.000 ₫; hai đề nghị 70.000.000 ₫ và 50.000.000 ₫ cùng xử lý. Khi A giữ thành công, khả dụng còn 30M. B không thể duyệt và tự động chuyển sang Chờ nguồn.',
      tags: ['TO-BE 01', 'Atomic Hold', 'Waiting Funds', 'RC3'],
    },
    {
      key: 'B',
      title: 'Kịch bản B: Khóa phiên bản hiệu lực (5 lên 7 chiếc)',
      description:
        'Hồ sơ đã duyệt 5 màn hình. Khi người tạo sửa thành 7 màn hình, phòng Mua hàng chỉ thấy bản 5 màn hình có hiệu lực. Bản 7 màn hình phải tạo v2 và trình duyệt lại.',
      tags: ['Version Diff', 'Effective Lock', 'UC-MS06', 'RC1'],
    },
    {
      key: 'C',
      title: 'Kịch bản C: Vòng đời ngân sách & Giải phóng phần hết nghĩa vụ',
      description:
        'Hồ sơ giữ 40M, đặt hàng 35M (Cam kết), kế toán chi 30M (Used). Tuyệt đối không trừ khả dụng 2 lần; 5M dôi dư được giải phóng khi xác nhận hết nghĩa vụ.',
      tags: ['TO-BE 02', 'Non-overlapping', 'Release', 'RC4'],
    },
    {
      key: 'D',
      title: 'Kịch bản D: Ủy quyền phê duyệt & Xử lý người vắng mặt',
      description:
        'Trưởng phòng nghỉ công tác 5 ngày; ủy quyền phê duyệt theo hạn mức 10M; người nhận ủy quyền không được tự duyệt hồ sơ do chính mình lập (BR01).',
      tags: ['BR01', 'Delegation', 'UC-PD04', 'RC2'],
    },
    {
      key: 'E',
      title: 'Kịch bản E: Ngoại lệ, Thông tin không hợp lệ & Trùng lặp',
      description:
        'Kiểm tra validation thiếu trường, bắt buộc báo giá cạnh tranh cho hồ sơ trên 10 triệu, phát hiện trùng lặp số hóa đơn khi nhập tệp kế toán.',
      tags: ['Validation', 'Duplicate Detection', 'Exception Path'],
    },
    {
      key: 'F',
      title: 'Kịch bản F: Phân quyền theo Chi nhánh & Audit Trail',
      description:
        'Nhân viên Chi nhánh A không thể truy cập báo giá/ngân sách Chi nhánh B nếu không có quyền. Mọi thao tác ghi vết IP và thời gian bất biến.',
      tags: ['Branch Scope', 'Security', 'Audit Log', 'RC5'],
    },
    {
      key: 'G',
      title: 'Kịch bản G: Đăng nhập demo, MFA & Phiên (AUTH-01..07)',
      description:
        'Kiểm tra đăng nhập sai mật khẩu, xác thực 2 lớp OTP cho cấp duyệt, hết phiên và cơ chế đăng xuất an toàn xóa sạch token.',
      tags: ['AUTH-01..07', 'MFA OTP', 'Session Expiry'],
    },
  ];

  const handleExecute = (key: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G') => {
    setActiveScenario(key);
    const res = runTestScenario(key);
    setTestResult(res);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Minh họa kịch bản nghiệp vụ (A–G)"
      maxWidth="xl"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between text-xs text-[#62657A]">
          <span>Chọn một kịch bản bên dưới để chạy mô phỏng và kiểm tra logic:</span>
          <Button
            variant="ghost"
            size="small"
            disabled
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Không khôi phục dữ liệu thật
          </Button>
        </div>

        {/* Danh sách 7 kịch bản */}
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {scenarios.map((sc) => (
            <div
              key={sc.key}
              className={`p-3.5 rounded-[12px] border transition-colors ${
                activeScenario === sc.key
                  ? 'border-[#5540C7] bg-[#F0EDFF]/30'
                  : 'border-[#DDE0EA] bg-[#F7F8FC] hover:border-[#5540C7]/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#5540C7] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {sc.key}
                  </span>
                  <span className="font-bold text-sm text-[#202039]">{sc.title}</span>
                </div>
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => handleExecute(sc.key)}
                  icon={<Play className="w-3.5 h-3.5" />}
                >
                  Xem mô phỏng
                </Button>
              </div>

              <p className="text-xs text-[#4E4868] m-0 mb-2 leading-relaxed">
                {sc.description}
              </p>

              <div className="flex flex-wrap gap-1">
                {sc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-[4px] bg-white border border-[#DDE0EA] text-[10px] text-[#62657A] font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Kết quả chạy thử */}
        {testResult && (
          <div className="p-4 rounded-[12px] bg-[#E8F6EE] border border-[#176B49] text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#176B49] text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{testResult.title}</span>
            </div>

            <div className="space-y-1 text-[#202039] pl-6">
              {testResult.steps.map((st, i) => (
                <div key={i}>{st}</div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#176B49]/30 text-[#176B49] font-bold pl-6">
              Kết quả minh họa: {testResult.result}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-[#DDE0EA]">
          <span className="text-[11px] text-[#62657A] italic">
            * Sau khi chạy, bạn có thể đóng cửa sổ này và xem các biến động trực tiếp trên màn hình Ngân sách hoặc Đề nghị.
          </span>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
};
