import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { generateTestTeams, simulateCheckins, simulatePayments, clearTestData } from "@/utils/testDataGenerator";
import { TestTube, Users, UserCheck, DollarSign, RotateCcw, Play, Trophy, Clock, AlertTriangle } from "lucide-react";

interface Tournament {
  id: string;
  title: string;
  brackets_generated: boolean;
  status: string;
  skill_levels: string[];
}

interface Team {
  id: string;
  name: string;
  check_in_status: string;
  payment_status: string;
}

interface TournamentTestingDashboardProps {
  tournament: Tournament;
  teams: Team[];
  onDataChange: () => void;
}

export function TournamentTestingDashboard({ 
  tournament, 
  teams, 
  onDataChange 
}: TournamentTestingDashboardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [teamCount, setTeamCount] = useState(12);
  const [checkinPercentage, setCheckinPercentage] = useState(80);
  const [paymentPercentage, setPaymentPercentage] = useState(90);
  const { toast } = useToast();

  const stats = {
    totalTeams: teams.length,
    checkedIn: teams.filter(t => t.check_in_status === 'checked_in').length,
    paid: teams.filter(t => t.payment_status === 'paid').length,
    pending: teams.filter(t => t.check_in_status === 'pending').length
  };

  const handleGenerateTeams = async () => {
    setLoading('teams');
    try {
      const result = await generateTestTeams(tournament.id, teamCount, tournament.skill_levels);
      if (result.success) {
        toast({
          title: "Test Teams Generated",
          description: `Created ${result.count} test teams successfully.`,
        });
        onDataChange();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate test teams",
        variant: "destructive",
      });
    }
    setLoading(null);
  };

  const handleSimulateCheckins = async () => {
    setLoading('checkins');
    try {
      const result = await simulateCheckins(tournament.id, checkinPercentage / 100);
      if (result.success) {
        toast({
          title: "Check-ins Simulated",
          description: `${result.checkedInCount} teams checked in successfully.`,
        });
        onDataChange();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to simulate check-ins",
        variant: "destructive",
      });
    }
    setLoading(null);
  };

  const handleSimulatePayments = async () => {
    setLoading('payments');
    try {
      const result = await simulatePayments(tournament.id, paymentPercentage / 100);
      if (result.success) {
        toast({
          title: "Payments Simulated",
          description: `${result.paidCount} teams marked as paid successfully.`,
        });
        onDataChange();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to simulate payments",
        variant: "destructive",
      });
    }
    setLoading(null);
  };

  const handleClearData = async () => {
    setLoading('clear');
    try {
      const result = await clearTestData(tournament.id);
      if (result.success) {
        toast({
          title: "Test Data Cleared",
          description: "All test teams and matches have been removed.",
        });
        onDataChange();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clear test data",
        variant: "destructive",
      });
    }
    setLoading(null);
  };

  return (
    <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <TestTube className="h-5 w-5" />
          Tournament Day Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalTeams}</div>
            <div className="text-sm text-muted-foreground">Total Teams</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.checkedIn}</div>
            <div className="text-sm text-muted-foreground">Checked In</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.paid}</div>
            <div className="text-sm text-muted-foreground">Paid</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
        </div>

        <Separator />

        {/* Phase 1: Test Data Generation */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Phase 1: Generate Test Data
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teamCount">Number of Test Teams</Label>
              <Input
                id="teamCount"
                type="number"
                min="4"
                max="24"
                value={teamCount}
                onChange={(e) => setTeamCount(parseInt(e.target.value) || 12)}
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={handleGenerateTeams}
                disabled={loading === 'teams'}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                {loading === 'teams' ? 'Generating...' : 'Generate Test Teams'}
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Phase 2: Simulate Pre-Tournament */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Phase 2: Pre-Tournament Simulation
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="checkinPercentage">Check-in Rate (%)</Label>
                <Input
                  id="checkinPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={checkinPercentage}
                  onChange={(e) => setCheckinPercentage(parseInt(e.target.value) || 80)}
                />
              </div>
              
              <Button 
                onClick={handleSimulateCheckins}
                disabled={loading === 'checkins' || stats.totalTeams === 0}
                className="w-full"
                variant="secondary"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                {loading === 'checkins' ? 'Simulating...' : 'Simulate Check-ins'}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentPercentage">Payment Rate (%)</Label>
                <Input
                  id="paymentPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={paymentPercentage}
                  onChange={(e) => setPaymentPercentage(parseInt(e.target.value) || 90)}
                />
              </div>
              
              <Button 
                onClick={handleSimulatePayments}
                disabled={loading === 'payments' || stats.totalTeams === 0}
                className="w-full"
                variant="secondary"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                {loading === 'payments' ? 'Simulating...' : 'Simulate Payments'}
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Phase 3: Tournament Day Status */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Phase 3: Tournament Day Status
          </h4>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant={stats.checkedIn >= 4 ? "default" : "secondary"}>
              {stats.checkedIn >= 4 ? "✓" : "○"} Minimum Teams ({stats.checkedIn}/4)
            </Badge>
            <Badge variant={tournament.brackets_generated ? "default" : "secondary"}>
              {tournament.brackets_generated ? "✓" : "○"} Brackets Generated
            </Badge>
            <Badge variant={stats.paid > stats.checkedIn * 0.8 ? "default" : "secondary"}>
              {stats.paid > stats.checkedIn * 0.8 ? "✓" : "○"} Most Teams Paid
            </Badge>
          </div>

          {stats.checkedIn >= 4 && !tournament.brackets_generated && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 flex items-center gap-2">
                <Play className="h-4 w-4" />
                Ready to generate pool play! Go to the "Pool Play" tab to create brackets.
              </p>
            </div>
          )}

          {stats.checkedIn < 4 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Need at least 4 checked-in teams to generate brackets.
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Reset Controls */}
        <div className="space-y-4">
          <h4 className="font-semibold text-destructive flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset Testing Data
          </h4>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={loading === 'clear' || stats.totalTeams === 0}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {loading === 'clear' ? 'Clearing...' : 'Clear All Test Data'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Test Data</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all test teams, matches, and reset the tournament brackets. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData} className="bg-destructive">
                  Clear Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}