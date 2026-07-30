export type TabType = 'summary' | 'reconciliation' | 'deduction';

export interface SummaryFilter {
  dateRange: string;
  department: string;
  searchKeyword: string;
}

export interface ProjectExpenseComposition {
  flight: number;     // 机票
  hotel: number;      // 酒店
  train: number;      // 火车票
  localTaxi: number;  // 市内交通
  allowance: number;  // 出差津贴
}

export interface ProjectSummaryItem {
  id: string;
  code: string;
  name: string;
  department: string;
  approvedExpense: number;     // 公司认可费用
  tripCount: number;           // 出差次数
  travelerCount: number;       // 出差人数
  overStandardAmount: number;  // 超标金额
  expenseComposition: ProjectExpenseComposition;
  notes: string;
}

export interface DepartmentExpenseStat {
  department: string;
  totalApproved: number;
  projectCount: number;
  tripCount: number;
  overStandardAmount: number;
}

export interface SummaryKpiData {
  totalTravelExpense: number;        // 总差旅支出
  companyApprovedExpense: number;    // 公司认可费用
  employeeDeductionAmount: number;   // 员工承担费用
  overStandardPendingAmount: number; // 超标待确认金额
  ctripServiceFee: number;           // 携程服务费
  totalTrips: number;                // 总出差次数
}

export interface CtripReconciliationItem {
  id: string;
  orderNo: string;
  traveler: string;
  department: string;
  projectCode: string;
  projectName: string;
  type: '机票' | '酒店' | '火车票' | '用车';
  orderAmount: number;
  approvedAmount: number;
  diffAmount: number;
  serviceFee: number;
  status: '完全匹配' | '标准超扣' | '待确认' | '手工调整';
  diffReason: string;
  date: string;
}

export interface EmployeeDeductionItem {
  id: string;
  empId: string;
  empName: string;
  department: string;
  totalExpense: number;
  companyPaid: number;
  overStandardDeduction: number;
  personalPrivateExpense: number;
  allowanceOffset: number;
  netDeduction: number;
  status: '已扣款' | '待结算' | '申诉中';
  month: string;
}
