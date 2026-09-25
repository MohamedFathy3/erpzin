import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

type Summary = { employee_id: number; base_salary: number; attendance_days: number; absent_days: number; late_minutes: number; late_deduction: number; absence_deduction: number; total_attendance_deduction: number; expected_net_salary: number };
type AttendanceRow = { employee_id: number; employee_name?: string; employee_code?: string; date: string; check_in?: string; check_out?: string; status: string; source?: string; late_minutes: number; worked_minutes: number };
type Report = { period_start: string; period_end: string; rule?: { name: string; work_start: string; work_end: string; grace_minutes: number; late_deduction_type: string; late_deduction_value: number; absence_deduction_type: string; absence_deduction_value: number }; summary: Summary[]; attendance: AttendanceRow[] };

const dateValue = (date: Date) => date.toISOString().slice(0, 10);
const monthStart = dateValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const monthEnd = dateValue(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
const money = (value: number) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function BiometricReports({ employees }: { employees: Array<{ id: number; name: string; employee_code: string }> }) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [periodStart, setPeriodStart] = useState(monthStart);
  const [periodEnd, setPeriodEnd] = useState(monthEnd);
  const [requestedPeriod, setRequestedPeriod] = useState({ start: monthStart, end: monthEnd });
  const { data: report, isFetching, refetch } = useQuery<Report>({
    queryKey: ['biometric-report', requestedPeriod],
    queryFn: async () => (await api.get('/biometric/report', { params: { period_start: requestedPeriod.start, period_end: requestedPeriod.end } })).data.data,
  });

  const employeeName = (id: number) => employees.find((employee) => employee.id === id)?.name || '-';
  const employeeCode = (id: number) => employees.find((employee) => employee.id === id)?.employee_code || '-';
  const loadReport = () => { setRequestedPeriod({ start: periodStart, end: periodEnd }); void refetch(); };
  const exportExcel = () => {
    if (!report) return;
    const summaryRows = report.summary.map(row => ({
      [ar ? 'الموظف' : 'Employee']: employeeName(row.employee_id),
      [ar ? 'كود الموظف' : 'Employee code']: employeeCode(row.employee_id),
      [ar ? 'الراتب الأساسي' : 'Base salary']: row.base_salary,
      [ar ? 'أيام الحضور' : 'Attendance days']: row.attendance_days,
      [ar ? 'أيام الغياب' : 'Absent days']: row.absent_days,
      [ar ? 'دقائق التأخير' : 'Late minutes']: row.late_minutes,
      [ar ? 'خصم التأخير' : 'Late deduction']: row.late_deduction,
      [ar ? 'خصم الغياب' : 'Absence deduction']: row.absence_deduction,
      [ar ? 'إجمالي الخصم' : 'Total deduction']: row.total_attendance_deduction,
      [ar ? 'الصافي المتوقع' : 'Expected net salary']: row.expected_net_salary,
    }));
    const attendanceRows = report.attendance.map(row => ({
      [ar ? 'الموظف' : 'Employee']: row.employee_name || employeeName(row.employee_id),
      [ar ? 'الكود' : 'Code']: row.employee_code || employeeCode(row.employee_id),
      [ar ? 'التاريخ' : 'Date']: row.date,
      [ar ? 'الدخول' : 'Check in']: row.check_in || '',
      [ar ? 'الخروج' : 'Check out']: row.check_out || '',
      [ar ? 'الحالة' : 'Status']: row.status,
      [ar ? 'المصدر' : 'Source']: row.source || 'manual',
      [ar ? 'دقائق التأخير' : 'Late minutes']: row.late_minutes,
      [ar ? 'دقائق العمل' : 'Worked minutes']: row.worked_minutes,
    }));
    const rulesRows = report.rule ? [{
      [ar ? 'اسم المعادلة' : 'Rule']: report.rule.name,
      [ar ? 'بداية الدوام' : 'Work start']: report.rule.work_start,
      [ar ? 'نهاية الدوام' : 'Work end']: report.rule.work_end,
      [ar ? 'السماح بالدقائق' : 'Grace minutes']: report.rule.grace_minutes,
      [ar ? 'نوع خصم التأخير' : 'Late deduction type']: report.rule.late_deduction_type,
      [ar ? 'قيمة خصم التأخير' : 'Late deduction value']: report.rule.late_deduction_value,
      [ar ? 'نوع خصم الغياب' : 'Absence deduction type']: report.rule.absence_deduction_type,
      [ar ? 'قيمة خصم الغياب' : 'Absence deduction value']: report.rule.absence_deduction_value,
    }] : [];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), ar ? 'ملخص الموظفين' : 'Employee Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(attendanceRows), ar ? 'سجل الحضور' : 'Attendance Details');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rulesRows), ar ? 'المعادلة' : 'Formula');
    XLSX.writeFile(workbook, `hr-report-${report.period_start}-${report.period_end}.xlsx`);
  };

  return <Card className="mt-4"><CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet size={20} />{ar ? 'تقارير الموظفين والخصومات' : 'Employee & Deduction Reports'}</CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"><div><Label>{ar ? 'من تاريخ' : 'From'}</Label><Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} /></div><div><Label>{ar ? 'إلى تاريخ' : 'To'}</Label><Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} /></div><Button onClick={loadReport} disabled={isFetching}><Search size={16} className="me-2" />{ar ? 'عرض التقرير' : 'View report'}</Button><Button variant="outline" onClick={exportExcel} disabled={!report}><Download size={16} className="me-2" />{ar ? 'سحب Excel للكل' : 'Export all to Excel'}</Button></div>
    {report?.rule && <div className="rounded-lg border bg-muted/30 p-3 text-sm">{ar ? 'المعادلة المستخدمة:' : 'Applied formula:'} <strong>{report.rule.name}</strong> — {ar ? `الدوام ${report.rule.work_start} إلى ${report.rule.work_end}، سماح ${report.rule.grace_minutes} دقيقة` : `${report.rule.work_start}–${report.rule.work_end}, ${report.rule.grace_minutes} minute grace`}</div>}
    {report && <><div className="grid grid-cols-2 md:grid-cols-5 gap-3"><Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{ar ? 'الموظفون' : 'Employees'}</div><div className="text-xl font-bold">{report.summary.length}</div></CardContent></Card><Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{ar ? 'سجلات الحضور' : 'Attendance records'}</div><div className="text-xl font-bold">{report.attendance.length}</div></CardContent></Card><Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{ar ? 'دقائق التأخير' : 'Late minutes'}</div><div className="text-xl font-bold">{report.summary.reduce((sum, row) => sum + row.late_minutes, 0)}</div></CardContent></Card><Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{ar ? 'إجمالي الخصم' : 'Total deductions'}</div><div className="text-xl font-bold">{money(report.summary.reduce((sum, row) => sum + row.total_attendance_deduction, 0))}</div></CardContent></Card><Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{ar ? 'الصافي المتوقع' : 'Expected net'}</div><div className="text-xl font-bold">{money(report.summary.reduce((sum, row) => sum + row.expected_net_salary, 0))}</div></CardContent></Card></div>
    <div className="overflow-auto rounded-md border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-start">{ar ? 'الموظف' : 'Employee'}</th><th className="p-3 text-start">{ar ? 'الراتب' : 'Salary'}</th><th className="p-3 text-start">{ar ? 'حضور' : 'Present'}</th><th className="p-3 text-start">{ar ? 'غياب' : 'Absent'}</th><th className="p-3 text-start">{ar ? 'تأخير' : 'Late'}</th><th className="p-3 text-start">{ar ? 'الخصم' : 'Deduction'}</th><th className="p-3 text-start">{ar ? 'الصافي المتوقع' : 'Expected net'}</th></tr></thead><tbody>{report.summary.map(row => <tr key={row.employee_id} className="border-t"><td className="p-3">{employeeName(row.employee_id)} <small className="text-muted-foreground">({employeeCode(row.employee_id)})</small></td><td className="p-3">{money(row.base_salary)}</td><td className="p-3">{row.attendance_days}</td><td className="p-3">{row.absent_days}</td><td className="p-3">{row.late_minutes} {ar ? 'د' : 'min'}</td><td className="p-3">{money(row.total_attendance_deduction)}</td><td className="p-3 font-semibold">{money(row.expected_net_salary)}</td></tr>)}</tbody></table></div>
    <div className="overflow-auto rounded-md border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-start">{ar ? 'الموظف' : 'Employee'}</th><th className="p-3 text-start">{ar ? 'التاريخ' : 'Date'}</th><th className="p-3 text-start">{ar ? 'الدخول' : 'In'}</th><th className="p-3 text-start">{ar ? 'الخروج' : 'Out'}</th><th className="p-3 text-start">{ar ? 'الحالة' : 'Status'}</th><th className="p-3 text-start">{ar ? 'التأخير' : 'Late'}</th></tr></thead><tbody>{report.attendance.map((row, index) => <tr key={`${row.employee_id}-${row.date}-${index}`} className="border-t"><td className="p-3">{row.employee_name || employeeName(row.employee_id)}</td><td className="p-3">{row.date}</td><td className="p-3">{row.check_in || '-'}</td><td className="p-3">{row.check_out || '-'}</td><td className="p-3"><Badge variant={row.status === 'late' ? 'destructive' : 'secondary'}>{row.status}</Badge></td><td className="p-3">{row.late_minutes} {ar ? 'دقيقة' : 'min'}</td></tr>)}</tbody></table></div></>}
  </CardContent></Card>;
}
