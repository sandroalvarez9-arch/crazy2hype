import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface RefundRecord {
  id: string;
  team_id: string;
  team_name: string;
  payment_amount: number;
  payment_method: string;
  showed_up: boolean;
  refund_status: string;
  refund_amount: number | null;
  refund_date: string | null;
  notes: string | null;
}

interface Team {
  id: string;
  name: string;
  payment_status: string;
  payment_method: string | null;
  check_in_status: string;
}

interface RefundTrackingTableProps {
  records: RefundRecord[];
  teams: Team[];
  tournamentId: string;
  onRefresh: () => void;
}

export function RefundTrackingTable({ records, teams, tournamentId, onRefresh }: RefundTrackingTableProps) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState<string | null>(null);

  const initializeRecordsForTeams = async () => {
    const teamsWithPayments = teams.filter(t => t.payment_status === 'paid');
    const existingTeamIds = new Set(records.map(r => r.team_id));
    
    const newRecords = teamsWithPayments
      .filter(t => !existingTeamIds.has(t.id))
      .map(t => ({
        tournament_id: tournamentId,
        team_id: t.id,
        team_name: t.name,
        payment_amount: 0, // This should be the actual payment amount
        payment_method: t.payment_method || 'unknown',
        showed_up: t.check_in_status === 'checked_in',
        refund_status: 'no_refund',
      }));

    if (newRecords.length > 0) {
      const { error } = await supabase
        .from('refund_tracking')
        .insert(newRecords);

      if (error) {
        console.error('Error initializing refund records:', error);
      } else {
        onRefresh();
      }
    }
  };

  const updateShowedUp = async (recordId: string, showedUp: boolean) => {
    setUpdating(recordId);
    try {
      const { error } = await supabase
        .from('refund_tracking')
        .update({ 
          showed_up: showedUp,
          refund_status: showedUp ? 'no_refund' : 'pending'
        })
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attendance status updated",
      });
      onRefresh();
    } catch (error) {
      console.error('Error updating:', error);
      toast({
        title: "Error",
        description: "Failed to update attendance",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const updateRefundStatus = async (recordId: string, status: string) => {
    setUpdating(recordId);
    try {
      const { error } = await supabase
        .from('refund_tracking')
        .update({ 
          refund_status: status,
          refund_date: status === 'refunded' ? new Date().toISOString() : null
        })
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Refund status updated",
      });
      onRefresh();
    } catch (error) {
      console.error('Error updating:', error);
      toast({
        title: "Error",
        description: "Failed to update refund status",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const getRefundStatusColor = (status: string) => {
    switch (status) {
      case 'refunded':
        return 'bg-red-100 text-red-800';
      case 'credited_next_event':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (records.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No refund tracking records yet</p>
        <Button variant="outline" onClick={initializeRecordsForTeams}>
          Initialize Refund Tracking
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team Name</TableHead>
            <TableHead>Payment Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Showed Up?</TableHead>
            <TableHead>Refund Status</TableHead>
            <TableHead>Refund Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">{record.team_name}</TableCell>
              <TableCell>${Number(record.payment_amount).toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {record.payment_method}
                </Badge>
              </TableCell>
              <TableCell>
                <Switch
                  checked={record.showed_up}
                  onCheckedChange={(checked) => updateShowedUp(record.id, checked)}
                  disabled={updating === record.id}
                />
              </TableCell>
              <TableCell>
                <Badge className={getRefundStatusColor(record.refund_status)}>
                  {record.refund_status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                {record.refund_date ? format(new Date(record.refund_date), 'MMM dd, yyyy') : '-'}
              </TableCell>
              <TableCell>
                {!record.showed_up && (
                  <Select
                    value={record.refund_status}
                    onValueChange={(value) => updateRefundStatus(record.id, value)}
                    disabled={updating === record.id}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="credited_next_event">Credited Next Event</SelectItem>
                      <SelectItem value="no_refund">No Refund</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}