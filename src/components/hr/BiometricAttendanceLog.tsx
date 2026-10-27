import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BiometricPeriodPicker from '@/components/hr/BiometricPeriodPicker';
import { currentMonthPeriod } from '@/components/hr/BiometricPeriodUtils';

type AttendanceRow = {
  employee_id: number;
  employee_name: string;
  employee_code: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  late_minutes: number;
  worked_minutes: number;
};
type AttendanceReport = { attendance: AttendanceRow[] };
type Employee = { id: number; name: string; name_ar?: string; employee_code: string };

export default function BiometricAttendanceLog({ employees }: { employees: Employee[] }) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [period, setPeriod] = useState(currentMonthPeriod);
  const [employeeId, setEmployeeId] = useState('');
  const validPeriod = Boolean(period.start && period.end && period.start <= period.end);
  const { data: report, isFetching, isError, refetch } = useQuery<AttendanceReport>({
    queryKey: ['biometric-attendance-log', period.start, period.end, employeeId],
    queryFn: async () => (await api.get('/biometric/report', {
      params: {
        period_start: period.start,
        period_end: period.end,
        ...(employeeId ? { employee_id: employeeId } : {}),
      },
    })).data.data,
    enabled: validPeriod,
  });
  const rows = report?.attendance ?? [];

  const exportExcel = () => {
    if (!report) return;
    const exportRows = rows.map((row) => ({
      [ar ? 'الموظف' : 'Employee']: row.employee_name || employees.find((employee) => employee.id === row.employee_id)?.name || '-',
      [ar ? 'كود الموظف' : 'Employee code']: row.employee_code || employees.find((employee) => employee.id === row.employee_id)?.employee_code || '-',
      [ar ? 'التاريخ' : 'Date']: row.date,
      [ar ? 'وقت الحضور' : 'Check in']: row.check_in || '',
      [ar ? 'وقت الانصراف' : 'Check out']: row.check_out || '',
      [ar ? 'الحالة' : 'Status']: row.status,
      [ar ? 'دقائق التأخير' : 'Late minutes']: row.late_minutes,
      [ar ? 'دقائق العمل' : 'Worked minutes']: row.worked_minutes,
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exportRows), ar ? 'سجل الحضور' : 'Attendance Log');
    XLSX.writeFile(workbook, `attendance-log-${period.start}-${period.end}.xlsx`);
  };

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet size={20} />{ar ? 'سجل الحضور والانصراف' : 'Attendance Log'}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <BiometricPeriodPicker value={period} onChange={setPeriod} />
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="attendance-employee-filter">{ar ? 'الموظف (اختياري)' : 'Employee (optional)'}</label>
            <select id="attendance-employee-filter" className="h-10 w-full rounded-md border bg-background px-3" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              <option value="">{ar ? 'كل الموظفين' : 'All employees'}</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{ar && employee.name_ar ? employee.name_ar : employee.name} ({employee.employee_code})</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void refetch()} disabled={!validPeriod || isFetching}><Search size={16} className="me-2" />{isFetching ? (ar ? 'جاري التحميل...' : 'Loading...') : (ar ? 'تحديث السجل' : 'Refresh log')}</Button>
            <Button onClick={exportExcel} disabled={!report || rows.length === 0}><Download size={16} className="me-2" />{ar ? 'تصدير Excel' : 'Export Excel'}</Button>
          </div>
        </div>
        {!validPeriod && <p className="text-sm text-destructive">{ar ? 'تحقق من أن تاريخ البداية لا يتجاوز تاريخ النهاية.' : 'Please ensure the start date is not after the end date.'}</p>}
        {isError && <p className="text-sm text-destructive">{ar ? 'تعذر تحميل سجل الحضور. حاول مرة أخرى.' : 'Could not load attendance records. Please try again.'}</p>}
        {report && <div className="text-sm text-muted-foreground">{ar ? `عدد السجلات: ${rows.length}` : `Records: ${rows.length}`}</div>}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="p-3 text-start">{ar ? 'الموظف' : 'Employee'}</th>
              <th className="p-3 text-start">{ar ? 'الكود' : 'Code'}</th>
              <th className="p-3 text-start">{ar ? 'التاريخ' : 'Date'}</th>
              <th className="p-3 text-start">{ar ? 'الحضور' : 'Check in'}</th>
              <th className="p-3 text-start">{ar ? 'الانصراف' : 'Check out'}</th>
              <th className="p-3 text-start">{ar ? 'الحالة' : 'Status'}</th>
              <th className="p-3 text-start">{ar ? 'التأخير' : 'Late'}</th>
              <th className="p-3 text-start">{ar ? 'وقت العمل' : 'Worked'}</th>
            </tr></thead>
            <tbody>
              {rows.map((row, index) => <tr key={`${row.employee_id}-${row.date}-${index}`} className="border-t">
                <td className="p-3">{row.employee_name || employees.find((employee) => employee.id === row.employee_id)?.name || '-'}</td>
                <td className="p-3">{row.employee_code || employees.find((employee) => employee.id === row.employee_id)?.employee_code || '-'}</td>
                <td className="p-3 whitespace-nowrap">{row.date}</td>
                <td className="p-3 whitespace-nowrap">{row.check_in || '-'}</td>
                <td className="p-3 whitespace-nowrap">{row.check_out || '-'}</td>
                <td className="p-3"><Badge variant={row.status === 'late' ? 'destructive' : 'secondary'}>{row.status}</Badge></td>
                <td className="p-3">{row.late_minutes} {ar ? 'دقيقة' : 'min'}</td>
                <td className="p-3">{row.worked_minutes} {ar ? 'دقيقة' : 'min'}</td>
              </tr>)}
              {!isFetching && report && rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{ar ? 'لا توجد سجلات حضور لهذه الفترة.' : 'No attendance records for this period.'}</td></tr>}
              {isFetching && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{ar ? 'جاري تحميل السجلات...' : 'Loading records...'}</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
