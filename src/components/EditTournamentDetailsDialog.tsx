import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { LocationAutocompleteInput } from "@/components/LocationAutocompleteInput";

interface TournamentForEdit {
  id: string;
  title: string;
  location?: string | null;
  first_game_time: string;
  max_teams: number;
}

interface EditTournamentDetailsDialogProps {
  tournament: TournamentForEdit;
  onSaved: () => void;
}

export default function EditTournamentDetailsDialog({ tournament, onSaved }: EditTournamentDetailsDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState<string>(tournament.location || "");
  const [firstGameTime, setFirstGameTime] = useState<string>(tournament.first_game_time || "");
  const [maxTeams, setMaxTeams] = useState<number>(tournament.max_teams);
  const [notifyPlayers, setNotifyPlayers] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLocation(tournament.location || "");
    setFirstGameTime(tournament.first_game_time || "");
    setMaxTeams(tournament.max_teams);
    setNotifyPlayers(true);
  }, [open, tournament.location, tournament.first_game_time, tournament.max_teams]);

  const changes = useMemo(() => {
    const diffs: { field: string; oldVal: string; newVal: string }[] = [];
    if ((tournament.location || "") !== location) {
      diffs.push({ field: "Location", oldVal: tournament.location || "(not set)", newVal: location || "(not set)" });
    }
    if ((tournament.first_game_time || "") !== (firstGameTime || "")) {
      diffs.push({ field: "First game time", oldVal: tournament.first_game_time || "(not set)", newVal: firstGameTime || "(not set)" });
    }
    if (tournament.max_teams !== maxTeams) {
      diffs.push({ field: "Team limit", oldVal: String(tournament.max_teams), newVal: String(maxTeams) });
    }
    return diffs;
  }, [tournament.location, tournament.first_game_time, tournament.max_teams, location, firstGameTime, maxTeams]);

  const onSave = async () => {
    if (changes.length === 0) {
      toast({ title: "No changes detected", description: "Nothing to update." });
      setOpen(false);
      return;
    }

    try {
      setSaving(true);
      const updatePayload: any = {};
      if ((tournament.location || "") !== location) updatePayload.location = location || null;
      if ((tournament.first_game_time || "") !== (firstGameTime || "")) updatePayload.first_game_time = firstGameTime || null;
      if (tournament.max_teams !== maxTeams) updatePayload.max_teams = maxTeams;

      const { error } = await supabase
        .from("tournaments")
        .update(updatePayload)
        .eq("id", tournament.id);

      if (error) throw error;

      // Optionally notify players
      if (notifyPlayers && changes.length > 0) {
        const changesHtml = changes
          .map(c => `<li><strong>${c.field}:</strong> ${c.oldVal} &rarr; ${c.newVal}</li>`)
          .join("");

        const html = `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.4;">
            <p><strong>${tournament.title}</strong> has been updated.</p>
            <ul>${changesHtml}</ul>
            <p>See details in the app for the latest information.</p>
          </div>
        `;

        const { error: fnError } = await supabase.functions.invoke("send-bulk-email", {
          body: {
            tournament_id: tournament.id,
            subject: `Tournament updated: ${tournament.title}`,
            html,
          },
        });

        if (fnError) {
          console.error("[EditTournamentDetailsDialog] Email notify error:", fnError);
          toast({
            title: "Updated, but failed to notify players",
            description: "Your changes were saved but emails failed to send.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Changes saved and players notified",
            description: `Updated ${changes.length} field${changes.length > 1 ? "s" : ""}.`,
          });
        }
      } else {
        toast({ title: "Changes saved", description: `Updated ${changes.length} field${changes.length > 1 ? "s" : ""}.` });
      }

      onSaved();
      setOpen(false);
    } catch (e: any) {
      console.error("[EditTournamentDetailsDialog] Save failed:", e);
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit details</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit tournament details</DialogTitle>
          <DialogDescription>Update key details. You can notify players about any changes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Location</Label>
            <LocationAutocompleteInput
              value={location}
              onChange={setLocation}
              placeholder="Tournament location"
            />
          </div>
          <div className="space-y-2">
            <Label>First game time</Label>
            <Input
              value={firstGameTime || ""}
              onChange={(e) => setFirstGameTime(e.target.value)}
              placeholder="e.g., 09:00"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium">Notify players about these changes</p>
              <p className="text-sm text-muted-foreground">
                {changes.length > 0 ? `Will include ${changes.length} change${changes.length > 1 ? "s" : ""}.` : "No changes detected yet."}
              </p>
            </div>
            <Switch checked={notifyPlayers} onCheckedChange={setNotifyPlayers} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} disabled={saving || changes.length === 0}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
