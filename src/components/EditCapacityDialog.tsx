import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CapacityTournament {
  id: string;
  title: string;
  divisions: string[];
  skill_levels_by_division: Record<string, string[]>;
  max_teams_per_division_skill: Record<string, Record<string, number>>;
  max_teams_per_skill_level: Record<string, number>;
  max_teams: number;
}

export default function EditCapacityDialog({
  tournament,
  onSaved,
}: {
  tournament: CapacityTournament;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local editable copy
  const [caps, setCaps] = useState<Record<string, Record<string, number>>>(() => ({
    ...tournament.max_teams_per_division_skill,
  }));

  useEffect(() => {
    if (!open) return;
    // Ensure all division/skill keys exist
    const next: Record<string, Record<string, number>> = {};
    (tournament.divisions || []).forEach((div) => {
      next[div] = { ...(caps[div] || {}) };
      const skills = tournament.skill_levels_by_division?.[div] || [];
      skills.forEach((lvl) => {
        if (typeof next[div][lvl] !== "number") next[div][lvl] = 0;
      });
      // Remove stray skills not present anymore
      Object.keys(next[div]).forEach((lvl) => {
        if (!skills.includes(lvl)) delete next[div][lvl];
      });
    });
    setCaps(next);
  }, [open]);

  const aggregatePerSkill = useMemo(() => {
    const aggregated: Record<string, number> = {};
    Object.values(caps).forEach((bySkill) => {
      Object.entries(bySkill).forEach(([lvl, cap]) => {
        aggregated[lvl] = (aggregated[lvl] || 0) + (cap || 0);
      });
    });
    return aggregated;
  }, [caps]);

  const totalTeams = useMemo(() => {
    return Object.values(aggregatePerSkill).reduce((a, b) => a + b, 0);
  }, [aggregatePerSkill]);

  const setCap = (division: string, level: string, value: number) => {
    setCaps((prev) => ({
      ...prev,
      [division]: {
        ...(prev[division] || {}),
        [level]: Math.max(0, Math.floor(value || 0)),
      },
    }));
  };

  const onSave = async () => {
    try {
      setSaving(true);
      const updates: any = {
        max_teams_per_division_skill: caps,
        max_teams_per_skill_level: aggregatePerSkill,
        max_teams: totalTeams,
      };

      const { error } = await supabase
        .from("tournaments")
        .update(updates)
        .eq("id", tournament.id);

      if (error) throw error;

      toast({
        title: "Capacity updated",
        description: `New total capacity: ${totalTeams} teams`,
      });

      onSaved();
      setOpen(false);
    } catch (e: any) {
      console.error("[EditCapacityDialog] Save failed:", e);
      toast({ title: "Save failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit division/skill caps</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit capacity by division and skill</DialogTitle>
          <DialogDescription>
            Adjust how many teams can register for each division and skill level. Totals update automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {tournament.divisions?.length ? (
            tournament.divisions.map((div) => {
              const skills = tournament.skill_levels_by_division?.[div] || [];
              return (
                <Card key={div}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{div.toUpperCase()}</div>
                      <Badge variant="secondary">
                        {Object.values(caps[div] || {}).reduce((a, b) => a + (b || 0), 0)} total
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {skills.map((lvl) => (
                        <div key={`${div}-${lvl}`} className="space-y-1">
                          <Label>{lvl.toUpperCase()}</Label>
                          <Input
                            type="number"
                            min={0}
                            value={(caps[div]?.[lvl] ?? 0).toString()}
                            onChange={(e) => setCap(div, lvl, parseInt(e.target.value || "0", 10))}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-sm text-muted-foreground">No divisions configured for this tournament.</div>
          )}

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="font-medium">Totals</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(aggregatePerSkill).map(([lvl, count]) => (
                  <Badge key={lvl} variant="outline" className="justify-between">
                    <span>{lvl.toUpperCase()}</span>
                    <span className="ml-2">{count}</span>
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">Overall max teams: {totalTeams}</div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
