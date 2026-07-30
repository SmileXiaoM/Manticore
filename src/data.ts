import {
  ProjectSummaryItem,
  DepartmentExpenseStat,
  SummaryKpiData,
  CtripReconciliationItem,
  EmployeeDeductionItem
} from './types';

export const initialSummaryKpi: SummaryKpiData = {
  totalTravelExpense: 1258600.00,
  companyApprovedExpense: 1182400.00,
  employeeDeductionAmount: 52400.00,
  overStandardPendingAmount: 23800.00,
  ctripServiceFee: 18600.00,
  totalTrips: 342
};

export const initialProjectSummaries: ProjectSummaryItem[] = [
  {
    id: '1',
    code: 'PRJ2026001',
    name: '智能工厂三期建设',
    department: '技术研发部',
    approvedExpense: 238500.00,
    tripCount: 42,
    travelerCount: 14,
    overStandardAmount: 5200.00,
    expenseComposition: {
      flight: 102000.00,
      hotel: 78000.00,
      train: 24500.00,
      localTaxi: 18000.00,
      allowance: 16000.00
    },
    notes: '项目处于关键现场交付阶段，已发生42次差旅，2笔超标机票待部门经理二次复核。'
  },
  {
    id: '2',
    code: 'PRJ2026002',
    name: '华东大区重点客户部署',
    department: '华东销售部',
    approvedExpense: 186200.00,
    tripCount: 38,
    travelerCount: 11,
    overStandardAmount: 8400.00,
    expenseComposition: {
      flight: 85000.00,
      hotel: 56000.00,
      train: 18200.00,
      localTaxi: 15000.00,
      allowance: 12000.00
    },
    notes: '客户集中在上海及苏州周边，包含商务拜访与现场演示，超标原因为紧急预订头等舱/商务舱。'
  },
  {
    id: '3',
    code: 'PRJ2026003',
    name: '品牌全国路演巡展',
    department: '品牌营销部',
    approvedExpense: 152000.00,
    tripCount: 28,
    travelerCount: 9,
    overStandardAmount: 3600.00,
    expenseComposition: {
      flight: 68000.00,
      hotel: 48000.00,
      train: 16000.00,
      localTaxi: 11000.00,
      allowance: 9000.00
    },
    notes: '涉及北京、深圳、成都三地品牌发布会，相关差旅均符合营销专项报销流程。'
  },
  {
    id: '4',
    code: 'PRJ2026004',
    name: '工业机器人智造升级',
    department: '智能制造部',
    approvedExpense: 198000.00,
    tripCount: 35,
    travelerCount: 12,
    overStandardAmount: 2100.00,
    expenseComposition: {
      flight: 72000.00,
      hotel: 65000.00,
      train: 31000.00,
      localTaxi: 16000.00,
      allowance: 14000.00
    },
    notes: '工程师驻厂调试时间较长，住宿费用占比高，整体费用控制在预算阈值内。'
  },
  {
    id: '5',
    code: 'PRJ2026005',
    name: '集团组织效能优化咨询',
    department: '人力行政部',
    approvedExpense: 89400.00,
    tripCount: 16,
    travelerCount: 5,
    overStandardAmount: 1200.00,
    expenseComposition: {
      flight: 38000.00,
      hotel: 29000.00,
      train: 9400.00,
      localTaxi: 7000.00,
      allowance: 6000.00
    },
    notes: '跨基地巡回座谈及流程调研，出差人员均按行政二等标准执行。'
  },
  {
    id: '6',
    code: 'PRJ2026006',
    name: '供应链敏捷化交付项目',
    department: '智能制造部',
    approvedExpense: 142000.00,
    tripCount: 26,
    travelerCount: 8,
    overStandardAmount: 1800.00,
    expenseComposition: {
      flight: 52000.00,
      hotel: 46000.00,
      train: 22000.00,
      localTaxi: 12000.00,
      allowance: 10000.00
    },
    notes: '重点供应商现场驻点驻巡，无严重超标记录。'
  },
  {
    id: '7',
    code: 'PRJ2026007',
    name: '海外新能源市场拓展',
    department: '华东销售部',
    approvedExpense: 176300.00,
    tripCount: 19,
    travelerCount: 6,
    overStandardAmount: 1500.00,
    expenseComposition: {
      flight: 98000.00,
      hotel: 45000.00,
      train: 5300.00,
      localTaxi: 16000.00,
      allowance: 12000.00
    },
    notes: '国际航班机票比重较高，包含商务合规预核准记录。'
  }
];

export const initialDepartmentStats: DepartmentExpenseStat[] = [
  { department: '技术研发部', totalApproved: 238500.00, projectCount: 1, tripCount: 42, overStandardAmount: 5200.00 },
  { department: '华东销售部', totalApproved: 362500.00, projectCount: 2, tripCount: 57, overStandardAmount: 9900.00 },
  { department: '智能制造部', totalApproved: 340000.00, projectCount: 2, tripCount: 61, overStandardAmount: 3900.00 },
  { department: '品牌营销部', totalApproved: 152000.00, projectCount: 1, tripCount: 28, overStandardAmount: 3600.00 },
  { department: '人力行政部', totalApproved: 89400.00, projectCount: 1, tripCount: 16, overStandardAmount: 1200.00 }
];

export const initialCtripReconciliations: CtripReconciliationItem[] = [
  {
    id: 'CTR20260601',
    orderNo: 'CT20260612001',
    traveler: '张伟',
    department: '技术研发部',
    projectCode: 'PRJ2026001',
    projectName: '智能工厂三期建设',
    type: '机票',
    orderAmount: 2450.00,
    approvedAmount: 1950.00,
    diffAmount: 500.00,
    serviceFee: 30.00,
    status: '标准超扣',
    diffReason: '预订舱位高于研发二等标准（经济舱超标），500元由个人工资抵扣',
    date: '2026-06-12'
  },
  {
    id: 'CTR20260602',
    orderNo: 'CT20260612002',
    traveler: '李娜',
    department: '华东销售部',
    projectCode: 'PRJ2026002',
    projectName: '华东大区重点客户部署',
    type: '酒店',
    orderAmount: 1280.00,
    approvedAmount: 1280.00,
    diffAmount: 0.00,
    serviceFee: 20.00,
    status: '完全匹配',
    diffReason: '符合一类城市酒店上限标准',
    date: '2026-06-14'
  },
  {
    id: 'CTR20260603',
    orderNo: 'CT20260615003',
    traveler: '王强',
    department: '品牌营销部',
    projectCode: 'PRJ2026003',
    projectName: '品牌全国路演巡展',
    type: '火车票',
    orderAmount: 650.00,
    approvedAmount: 650.00,
    diffAmount: 0.00,
    serviceFee: 10.00,
    status: '完全匹配',
    diffReason: '高铁二等座符合标准',
    date: '2026-06-15'
  },
  {
    id: 'CTR20260604',
    orderNo: 'CT20260618004',
    traveler: '刘洋',
    department: '智能制造部',
    projectCode: 'PRJ2026004',
    projectName: '工业机器人智造升级',
    type: '机票',
    orderAmount: 3100.00,
    approvedAmount: 2300.00,
    diffAmount: 800.00,
    serviceFee: 30.00,
    status: '待确认',
    diffReason: '紧急因公改签产生额外差价800元，已提交经理特批申请',
    date: '2026-06-18'
  },
  {
    id: 'CTR20260605',
    orderNo: 'CT20260620005',
    traveler: '陈敏',
    department: '人力行政部',
    projectCode: 'PRJ2026005',
    projectName: '集团组织效能优化咨询',
    type: '用车',
    orderAmount: 280.00,
    approvedAmount: 280.00,
    diffAmount: 0.00,
    serviceFee: 5.00,
    status: '完全匹配',
    diffReason: '机场接送专车预核准通过',
    date: '2026-06-20'
  }
];

export const initialEmployeeDeductions: EmployeeDeductionItem[] = [
  {
    id: 'ED202606001',
    empId: 'E10023',
    empName: '张伟',
    department: '技术研发部',
    totalExpense: 8900.00,
    companyPaid: 8400.00,
    overStandardDeduction: 500.00,
    personalPrivateExpense: 120.00,
    allowanceOffset: 200.00,
    netDeduction: 420.00,
    status: '已扣款',
    month: '2026-06'
  },
  {
    id: 'ED202606002',
    empId: 'E10089',
    empName: '刘洋',
    department: '智能制造部',
    totalExpense: 12400.00,
    companyPaid: 11600.00,
    overStandardDeduction: 800.00,
    personalPrivateExpense: 0.00,
    allowanceOffset: 300.00,
    netDeduction: 500.00,
    status: '待结算',
    month: '2026-06'
  },
  {
    id: 'ED202606003',
    empId: 'E10156',
    empName: '赵雷',
    department: '华东销售部',
    totalExpense: 15600.00,
    companyPaid: 14200.00,
    overStandardDeduction: 1400.00,
    personalPrivateExpense: 250.00,
    allowanceOffset: 400.00,
    netDeduction: 1250.00,
    status: '申诉中',
    month: '2026-06'
  }
];
