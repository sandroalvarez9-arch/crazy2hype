
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface EmailPlayersDialogProps {
  tournamentId: string;
  defaultSubject?: string;
}

export default function EmailPlayersDialog({ tournamentId, defaultSubject }: EmailPlayersDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);

  useEffect(() => {
    if (!open) return;

    // Compute a recipient preview on open (players + team contact emails)
    const loadRecipients = async () => {
      console.log("[EmailPlayersDialog] Loading recipient preview for tournament:", tournamentId);

      const { data: teams } = await supabase
        .from("teams")
        .select("id, contact_email, is_backup")
        .eq("tournament_id", tournamentId)
        .eq("is_backup", false);

      const teamIds = (teams || []).map(t => t.id);
      const teamEmails = (teams || [])
        .map(t => t.contact_email)
        .filter((e): e is string => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

      let playerEmails: string[] = [];
      if (teamIds.length > 0) {
        // Fetch player emails from secure player_contacts table
        const { data: playerContacts } = await supabase
          .from("player_contacts")
          .select(`
            email,
            player_id,
            players!inner(team_id)
          `)
          .in("players.team_id", teamIds);

        playerEmails = (playerContacts || [])
          .map(pc => pc.email)
          .filter((e): e is string => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      }

      const unique = new Set([...teamEmails, ...playerEmails]);
      setRecipientCount(unique.size);
      console.log("[EmailPlayersDialog] Recipient preview count:", unique.size);
    };

    loadRecipients();
  }, [open, tournamentId]);

  const canSend = useMemo(() => {
    return subject.trim().length > 0 && message.trim().length > 0 && recipientCount > 0 && !loading;
  }, [subject, message, recipientCount, loading]);

  // Escape HTML entities to prevent XSS
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const onSend = async () => {
    try {
      setLoading(true);

      // Sanitize user input before embedding in HTML
      const safeMessage = escapeHtml(message.trim()).replace(/\n/g, "<br/>");
      const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.4;">
        ${safeMessage}
      </div>`;

      const { data, error } = await supabase.functions.invoke("send-bulk-email", {
        body: {
          tournament_id: tournamentId,
          subject: subject.trim(),
          html,
        },
      });

      if (error) throw error;

      toast({
        title: "Email sent",
        description: `Sent to ${data?.totalRecipients || 0} recipients.`,
      });

      setOpen(false);
      setMessage("");
      setSubject(defaultSubject || "");
    } catch (e: any) {
      console.error("[EmailPlayersDialog] Failed to send bulk email:", e);
      toast({
        title: "Failed to send emails",
        description: "Please check your sending domain and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Email all players</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compose email to all players</DialogTitle>
          <DialogDescription>
            This will send an email to all registered players and team contacts in this tournament.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Tournament update or announcement" />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Write your message here..."
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Will be sent to approximately {recipientCount} recipients.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button onClick={onSend} disabled={!canSend}>
            {loading ? "Sending..." : "Send to all"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
