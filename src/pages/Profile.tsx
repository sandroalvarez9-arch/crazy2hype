import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserTournamentsTab } from "@/components/UserTournamentsTab";

interface ProfileFormValues {
  username: string;
  first_name?: string;
  last_name?: string;
  shirt_size?: string | undefined;
  position?: string | undefined;
}

const Profile = () => {
  const { profile, user, updateProfile, loading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    charges_enabled: boolean;
    details_submitted: boolean;
    account_id: string | null;
  } | null>(null);
  const [checkingStripe, setCheckingStripe] = useState(false);

  const form = useForm<ProfileFormValues>({
    defaultValues: {
      username: profile?.username || "",
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      shirt_size: profile?.shirt_size ?? undefined,
      position: profile?.position ?? undefined,
    },
    mode: "onBlur",
  });

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;

      const { error: updateErr } = await updateProfile({ avatar_url: publicUrl });
      if (updateErr) throw updateErr;

      toast({ title: "Avatar updated", description: "Your profile picture has been updated." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Reset form when profile loads/changes
  useEffect(() => {
if (profile) {
      form.reset({
        username: profile.username || "",
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        shirt_size: profile.shirt_size ?? undefined,
        position: profile.position ?? undefined,
      });
    }
  }, [profile, form]);

  // Check Stripe status
  useEffect(() => {
    const checkStripe = async () => {
      if (!user) return;
      setCheckingStripe(true);
      try {
        const { data, error } = await supabase.functions.invoke('check-stripe-connect');
        if (!error && data) {
          setStripeStatus({
            connected: data.connected || false,
            charges_enabled: data.charges_enabled || false,
            details_submitted: data.details_submitted || false,
            account_id: data.account_id || null,
          });
        }
      } catch (err) {
        console.error('Error checking Stripe:', err);
      } finally {
        setCheckingStripe(false);
      }
    };
    checkStripe();
  }, [user]);

  // Basic SEO for the page
  useEffect(() => {
    document.title = "Profile Settings | VolleyTournament";

    const description =
      "Manage your player profile: username, name, and optional shirt size and position.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);

    let canonical = document.querySelector('link[rel="canonical"]') as
      | HTMLLinkElement
      | null;
    const href = `${window.location.origin}/profile`;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", href);
  }, []);

const onSubmit = async (values: ProfileFormValues) => {
    const payload = {
      ...values,
      shirt_size: values.shirt_size || null,
      position: values.position || null,
    } as any;

    const { error } = await updateProfile(payload);
    if (error) {
      toast({
        title: "Update failed",
        description: (error as any)?.message || "Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profile updated",
        description: "Your profile changes have been saved.",
      });
    }
  };

  const connectStripe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-stripe-oauth-url');
      if (error || !data?.url) {
        throw new Error(error?.message || 'Failed to get Stripe OAuth URL');
      }
      window.open(data.url, '_blank', 'noopener');
      toast({
        title: "Opening Stripe",
        description: "Complete the setup in the new tab, then return here.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to connect Stripe",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Player Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile and view your tournaments.
        </p>
      </header>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="settings">Profile Settings</TabsTrigger>
          <TabsTrigger value="tournaments">My Tournaments</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">

          {/* Stripe Connection Status - Available to all users who want to organize tournaments */}
          {user && (
            <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Stripe Payment Setup
              {stripeStatus?.connected && stripeStatus?.charges_enabled && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </CardTitle>
            <CardDescription>
              Connect Stripe to accept online payments for your tournaments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkingStripe ? (
              <p className="text-sm text-muted-foreground">Checking Stripe status...</p>
            ) : stripeStatus?.connected ? (
              <>
                {stripeStatus.charges_enabled && stripeStatus.details_submitted ? (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900">Stripe Connected & Ready</AlertTitle>
                    <AlertDescription className="text-green-800">
                      Your account is fully set up and can accept payments.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900">Setup Incomplete</AlertTitle>
                    <AlertDescription className="text-amber-800">
                      Your Stripe account is connected but needs additional setup to accept payments.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={stripeStatus.details_submitted ? "default" : "secondary"}>
                      {stripeStatus.details_submitted ? "Details Submitted" : "Details Pending"}
                    </Badge>
                    <Badge variant={stripeStatus.charges_enabled ? "default" : "secondary"}>
                      {stripeStatus.charges_enabled ? "Charges Enabled" : "Charges Disabled"}
                    </Badge>
                  </div>
                  {(!stripeStatus.charges_enabled || !stripeStatus.details_submitted) && (
                    <Button 
                      variant="default"
                      onClick={() => window.open('https://dashboard.stripe.com/account/onboarding', '_blank')}
                      className="gap-2"
                    >
                      Complete Stripe Setup
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Connect your Stripe account to receive tournament registration payments directly.
                </p>
                <Button onClick={connectStripe} variant="default">
                  Connect Stripe Account
                </Button>
              </>
            )}
            </CardContent>
          </Card>
          )}

          <section aria-labelledby="profile-details">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 bg-card border border-border rounded-lg p-6"
          >
            <div className="flex items-center gap-4 sm:gap-6">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={profile?.avatar_url || ""}
                  alt={profile?.username ? `${profile.username} avatar` : "Player avatar"}
                />
                <AvatarFallback>
                  {(profile?.username || user?.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Profile picture</div>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                    Upload photo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onAvatarChange}
                  />
                </div>
                <p className="text-xs text-muted-foreground">PNG or JPG up to 5MB.</p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input value={user?.email || ""} readOnly disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </div>

              <FormField
                control={form.control}
                name="username"
                rules={{ required: "Username is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="your_username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shirt_size"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Shirt size (optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="XS">XS</SelectItem>
                        <SelectItem value="S">S</SelectItem>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="XL">XL</SelectItem>
                        <SelectItem value="XXL">XXL</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Position (optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Setter">Setter</SelectItem>
                        <SelectItem value="Outside Hitter">Outside Hitter</SelectItem>
                        <SelectItem value="Opposite">Opposite</SelectItem>
                        <SelectItem value="Middle Blocker">Middle Blocker</SelectItem>
                        <SelectItem value="Libero">Libero</SelectItem>
                        <SelectItem value="Defensive Specialist">Defensive Specialist</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="gradient-primary">
                Save changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={loading}
              >
                Reset
              </Button>
            </div>
          </form>
        </Form>
          </section>
        </TabsContent>

        <TabsContent value="tournaments">
          <UserTournamentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
