import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface StripePayout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date: number;
  created: number;
  fees: number;
  net: number;
  description: string;
}

interface StripePayoutsTableProps {
  payouts: StripePayout[];
  loading: boolean;
  onRefresh: () => void;
}

export function StripePayoutsTable({ payouts, loading, onRefresh }: StripePayoutsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (payouts.length === 0 && !loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No Stripe payouts found</p>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Load Stripe Payouts
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
        <p className="text-muted-foreground">Loading Stripe payouts...</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payout ID</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Fees</TableHead>
            <TableHead>Net</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Arrival Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payouts.map((payout) => (
            <TableRow key={payout.id}>
              <TableCell className="font-mono text-sm">{payout.id}</TableCell>
              <TableCell className="font-semibold">
                ${payout.amount.toFixed(2)} {payout.currency}
              </TableCell>
              <TableCell className="text-orange-600">
                -${payout.fees.toFixed(2)}
              </TableCell>
              <TableCell className="font-semibold text-green-600">
                ${payout.net.toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={getStatusColor(payout.status)}>
                  {payout.status}
                </Badge>
              </TableCell>
              <TableCell>
                {format(new Date(payout.created * 1000), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell>
                {format(new Date(payout.arrival_date * 1000), 'MMM dd, yyyy')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}