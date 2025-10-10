import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ManualPayment {
  id: string;
  payer_name: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  status: string;
  notes: string | null;
}

interface ManualPaymentsTableProps {
  payments: ManualPayment[];
  onRefresh: () => void;
}

export function ManualPaymentsTable({ payments }: ManualPaymentsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'disputed':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'cashapp':
        return 'bg-emerald-100 text-emerald-800';
      case 'venmo':
        return 'bg-blue-100 text-blue-800';
      case 'cash':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-purple-100 text-purple-800';
    }
  };

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No manual payments recorded yet
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payer Name</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">{payment.payer_name}</TableCell>
              <TableCell className="font-semibold text-green-600">
                ${Number(payment.amount).toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={getMethodColor(payment.payment_method)}>
                  {payment.payment_method.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={getStatusColor(payment.status)}>
                  {payment.status}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {payment.notes || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}