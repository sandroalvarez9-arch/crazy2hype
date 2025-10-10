import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  ExternalLink,
  Plus,
  Filter
} from "lucide-react";
import { ManualPaymentDialog } from "@/components/MoneyReporting/ManualPaymentDialog";
import { ManualPaymentsTable } from "@/components/MoneyReporting/ManualPaymentsTable";
import { StripePayoutsTable } from "@/components/MoneyReporting/StripePayoutsTable";
import { RefundTrackingTable } from "@/components/MoneyReporting/RefundTrackingTable";

interface Tournament {
  id: string;
  title: string;
  entry_fee: number;
  organizer_id: string;
}

interface Team {
  id: string;
  name: string;
  payment_status: string;
  payment_method: string | null;
  payment_date: string | null;
  check_in_status: string;
}

interface ManualPayment {
  id: string;
  payer_name: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  status: string;
  notes: string | null;
}

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

export default function MoneyReporting() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [manualPayments, setManualPayments] = useState<ManualPayment[]>([]);
  const [stripePayouts, setStripePayouts] = useState<StripePayout[]>([]);
  const [refundRecords, setRefundRecords] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchData();
    }
  }, [id, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

      if (tournamentError) throw tournamentError;

      setTournament(tournamentData);
      setIsOrganizer(tournamentData.organizer_id === user?.id);

      if (tournamentData.organizer_id !== user?.id) {
        return;
      }

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .eq("tournament_id", id);

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Fetch manual payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("manual_payments")
        .select("*")
        .eq("tournament_id", id)
        .order("payment_date", { ascending: false });

      if (paymentsError) throw paymentsError;
      setManualPayments(paymentsData || []);

      // Fetch refund tracking
      const { data: refundsData, error: refundsError } = await supabase
        .from("refund_tracking")
        .select("*")
        .eq("tournament_id", id)
        .order("created_at", { ascending: false });

      if (refundsError) throw refundsError;
      setRefundRecords(refundsData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStripePayouts = async () => {
    try {
      setLoadingPayouts(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("get-stripe-payouts", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { limit: 20 }
      });

      if (error) throw error;
      setStripePayouts(data.payouts || []);
    } catch (error) {
      console.error("Error fetching Stripe payouts:", error);
      toast({
        title: "Error",
        description: "Failed to load Stripe payouts",
        variant: "destructive",
      });
    } finally {
      setLoadingPayouts(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "No data to export",
        description: "There is no data available to export.",
      });
      return;
    }

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(",")
    );
    const csv = [headers, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!isOrganizer) {
    return <Navigate to="/tournaments" replace />;
  }

  // Calculate financial summary
  const stripeTotal = teams
    .filter(t => t.payment_status === 'paid' && t.payment_method === 'stripe')
    .length * (tournament?.entry_fee || 0);
  
  const manualTotal = manualPayments
    .filter(p => p.status === 'confirmed')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const totalStripeFees = stripePayouts.reduce((sum, p) => sum + p.fees, 0);
  
  const totalRefunds = refundRecords
    .filter(r => r.refund_status === 'refunded' && r.refund_amount)
    .reduce((sum, r) => sum + Number(r.refund_amount), 0);

  const totalRevenue = stripeTotal + manualTotal;
  const netProfit = totalRevenue - totalStripeFees - totalRefunds;
  
  const unpaidTeams = teams.filter(t => t.payment_status === 'pending').length;

  return (
    <div className="container mx-auto p-3 sm:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{tournament?.title} - Money & Reporting</h1>
        <p className="text-muted-foreground">Financial overview and payment reconciliation</p>
      </div>

      {/* Event Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold text-orange-600">${totalStripeFees.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-primary">${netProfit.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Refunds Issued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold text-red-600">${totalRefunds.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{unpaidTeams} teams</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              ${(unpaidTeams * (tournament?.entry_fee || 0)).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stripe" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stripe">Stripe Payouts</TabsTrigger>
          <TabsTrigger value="manual">Manual Payments</TabsTrigger>
          <TabsTrigger value="refunds">Refund Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="stripe">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stripe Payouts</CardTitle>
                  <CardDescription>View your Stripe transaction history and fees</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={fetchStripePayouts}
                    disabled={loadingPayouts}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingPayouts ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Stripe Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToCSV(stripePayouts, 'stripe-payouts')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <StripePayoutsTable 
                payouts={stripePayouts} 
                loading={loadingPayouts}
                onRefresh={fetchStripePayouts}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Manual Payment Reconciliation</CardTitle>
                  <CardDescription>Track CashApp, Venmo, and cash payments</CardDescription>
                </div>
                <div className="flex gap-2">
                  <ManualPaymentDialog 
                    tournamentId={id!}
                    teams={teams}
                    onPaymentAdded={fetchData}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToCSV(manualPayments, 'manual-payments')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ManualPaymentsTable 
                payments={manualPayments}
                onRefresh={fetchData}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>No-Show & Refund Tracker</CardTitle>
                  <CardDescription>Manage team attendance and refund requests</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(refundRecords, 'refunds')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RefundTrackingTable 
                records={refundRecords}
                teams={teams}
                tournamentId={id!}
                onRefresh={fetchData}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}