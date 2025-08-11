import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const StripeConnectCallback: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");

    const finish = async () => {
      if (!code) {
        setError("Missing authorization code.");
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("finish-stripe-connect", {
          body: { code },
        });
        if (error) throw error;
        toast({
          title: "Stripe connected",
          description: "Your account is now ready to receive tournament payments.",
        });
        navigate("/create-tournament");
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to complete Stripe connection.");
      } finally {
        setLoading(false);
      }
    };

    finish();
  }, [location.search, navigate, toast]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Connecting Stripe…</CardTitle>
            <CardDescription>Please wait while we complete your setup.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Stripe connection failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/create-tournament")}>Back to Create Tournament</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default StripeConnectCallback;
