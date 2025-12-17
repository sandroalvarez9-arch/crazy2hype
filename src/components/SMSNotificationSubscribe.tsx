import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bell, BellOff, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SMSNotificationSubscribeProps {
  tournamentId: string;
  teamId?: string;
  teamName?: string;
}

export function SMSNotificationSubscribe({ tournamentId, teamId, teamName }: SMSNotificationSubscribeProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    // Add +1 if US number without country code
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    // Return with + if not already
    return phone.startsWith('+') ? phone : `+${digits}`;
  };

  const handleSubscribe = async () => {
    if (!phoneNumber) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number to receive notifications.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const { error } = await supabase
        .from('match_notifications')
        .insert({
          tournament_id: tournamentId,
          team_id: teamId || null,
          phone_number: formattedPhone,
          player_name: playerName || null,
          is_active: true,
        });

      if (error) {
        // Check if already subscribed
        if (error.code === '23505') {
          toast({
            title: "Already subscribed",
            description: "This phone number is already subscribed to notifications.",
          });
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        toast({
          title: "Subscribed!",
          description: "You'll receive SMS notifications when your matches start.",
        });
        setOpen(false);
      }
    } catch (err) {
      console.error('Error subscribing:', err);
      toast({
        title: "Error",
        description: "Failed to subscribe to notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!phoneNumber) return;
    
    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const { error } = await supabase
        .from('match_notifications')
        .update({ is_active: false })
        .eq('tournament_id', tournamentId)
        .eq('phone_number', formattedPhone);

      if (error) throw error;
      
      setIsSubscribed(false);
      toast({
        title: "Unsubscribed",
        description: "You will no longer receive SMS notifications.",
      });
      setOpen(false);
    } catch (err) {
      console.error('Error unsubscribing:', err);
      toast({
        title: "Error",
        description: "Failed to unsubscribe. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {isSubscribed ? (
            <>
              <BellOff className="h-4 w-4" />
              <span className="hidden sm:inline">SMS Alerts On</span>
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Get SMS Alerts</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            SMS Match Notifications
          </DialogTitle>
          <DialogDescription>
            {teamName 
              ? `Get notified when ${teamName}'s matches are about to start.`
              : "Get notified when matches are about to start. No login required!"
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="min-h-[44px]"
            />
            <p className="text-xs text-muted-foreground">
              US numbers will automatically be formatted with +1
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Your Name (optional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="min-h-[44px]"
            />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button 
              onClick={handleSubscribe} 
              disabled={loading || !phoneNumber}
              className="min-h-[44px]"
            >
              {loading ? 'Subscribing...' : 'Subscribe to Notifications'}
            </Button>
            {isSubscribed && (
              <Button 
                variant="outline" 
                onClick={handleUnsubscribe}
                disabled={loading}
                className="min-h-[44px]"
              >
                Unsubscribe
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Standard SMS rates may apply. You can unsubscribe anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
