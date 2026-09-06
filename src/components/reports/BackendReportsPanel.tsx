import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Filters {
  date_from: string;
  date_to: string;
  branch_id: string;
  warehouse_id: string;
  movement_type: string;
}

const BackendReportsPanel = () => {
  const [filters, setFilters] = useState<Filters>({
    date_from: '', date_to: '', branch_id: '', warehouse_id: '', movement_type: ''
  });
  const [submitted, setSubmitted] = useState(filters);
  const payload = { filters: Object.fromEntries(Object.entries(submitted).filter(([, value]) => value)) };

  const movements = useQuery({
    queryKey: ['backend-inventory-movements', submitted],
    queryFn: async () => (await api.post('/reports/inventory-movements', payload)).data,
  });
  const shifts = useQuery({
    queryKey: ['backend-shifts', submitted.date_from, submitted.date_to],
    queryFn: async () => (await api.post('/reports/shifts', { filters: {
      date_from: submitted.date_from || undefined,
      date_to: submitted.date_to || undefined,
    }})).data,
  });

  const update = (key: keyof Filters, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const ar = (value: unknown) => value === null || value === undefined || value === '' ? '—' : String(value);

  return (
    <Card className="card-elevated">
      <CardHeader><CardTitle>تقارير النظام من الباك إند</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Input type="date" value={filters.date_from} onChange={e => update('date_from', e.target.value)} />
          <Input type="date" value={filters.date_to} onChange={e => update('date_to', e.target.value)} />
          <Input placeholder="Branch ID" value={filters.branch_id} onChange={e => update('branch_id', e.target.value)} />
          <Input placeholder="Warehouse ID" value={filters.warehouse_id} onChange={e => update('warehouse_id', e.target.value)} />
          <Input placeholder="Movement type" value={filters.movement_type} onChange={e => update('movement_type', e.target.value)} />
        </div>
        <Button onClick={() => setSubmitted(filters)}>تطبيق الفلاتر</Button>

        <Tabs defaultValue="movements">
          <TabsList><TabsTrigger value="movements">حركة الأصناف</TabsTrigger><TabsTrigger value="shifts">تقارير الورديات</TabsTrigger></TabsList>
          <TabsContent value="movements">
            <div className="overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>الصنف</TableHead><TableHead>الوحدة</TableHead><TableHead>اللون</TableHead><TableHead>الحركة</TableHead><TableHead>الكمية</TableHead><TableHead>الرصيد</TableHead><TableHead>المستند</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(movements.data?.data || []).map((row: any) => <TableRow key={row.id}>
                    <TableCell>{ar(row.created_at)}</TableCell><TableCell>{ar(row.product?.name)}</TableCell><TableCell>{ar(row.product_unit?.barcode)}</TableCell><TableCell>{ar(row.color?.name)}</TableCell><TableCell>{ar(row.movement_type)}</TableCell><TableCell>{ar(row.quantity_delta)}</TableCell><TableCell>{ar(row.balance_after)}</TableCell><TableCell>{ar(row.reference_id)}</TableCell>
                  </TableRow>)}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="shifts">
            <div className="overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>الوردية</TableHead><TableHead>الموظف</TableHead><TableHead>الحالة</TableHead><TableHead>المبيعات النقدية</TableHead><TableHead>المتوقع</TableHead><TableHead>الفعلي</TableHead><TableHead>الفرق</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(shifts.data?.data || []).map((row: any) => <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell><TableCell>{ar(row.employee?.name || row.admin?.name)}</TableCell><TableCell>{ar(row.status)}</TableCell><TableCell>{ar(row.cash_sales)}</TableCell><TableCell>{ar(row.expected_amount)}</TableCell><TableCell>{ar(row.actual_amount)}</TableCell><TableCell>{ar(row.difference)}</TableCell>
                  </TableRow>)}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BackendReportsPanel;
