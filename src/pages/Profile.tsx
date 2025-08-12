import { useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";

interface ProfileFormValues {
  username: string;
  first_name?: string;
  last_name?: string;
  shirt_size?: string | undefined;
}

const Profile = () => {
  const { profile, user, updateProfile, loading } = useAuth();
  const { toast } = useToast();

const form = useForm<ProfileFormValues>({
    defaultValues: {
      username: profile?.username || "",
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      shirt_size: profile?.shirt_size ?? undefined,
    },
    mode: "onBlur",
  });

  // Reset form when profile loads/changes
  useEffect(() => {
if (profile) {
      form.reset({
        username: profile.username || "",
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        shirt_size: profile.shirt_size ?? undefined,
      });
    }
  }, [profile, form]);

  // Basic SEO for the page
  useEffect(() => {
    document.title = "Profile Settings | VolleyTournament";

const description =
      "Manage your player profile: username, name, and optional shirt size.";
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

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Player Profile Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and update your profile details.
        </p>
      </header>

      <section aria-labelledby="profile-details" className="max-w-2xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 bg-card border border-border rounded-lg p-6"
          >
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
    </div>
  );
};

export default Profile;
