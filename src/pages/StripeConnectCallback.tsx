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
    console.log("StripeConnectCallback: useEffect triggered");
    console.log("Current URL:", window.location.href);
    console.log("Location search:", location.search);
    
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const error = params.get("error");
    const state = params.get("state");
    
    console.log("URL params:", { code: code ? "present" : "missing", error, state });

    const finish = async () => {
      if (error) {
        console.error("Stripe OAuth error:", error);
        setError(`Stripe error: ${error}`);
        setLoading(false);
        return;
      }
      
      if (!code) {
        console.error("Missing authorization code");
        setError("Missing authorization code.");
        setLoading(false);
        return;
      }
      
      console.log("Calling finish-stripe-connect function...");
      try {
        const { data, error } = await supabase.functions.invoke("finish-stripe-connect", {
          body: { code },
        });
        console.log("finish-stripe-connect response:", { data, error });
        
        if (error) throw error;
        
        // Verify the connection actually worked
        console.log("Verifying Stripe connection...");
        const { data: verificationData, error: verifyError } = await supabase.functions.invoke("check-stripe-connect");
        
        if (!verifyError && verificationData?.connected) {
          toast({
            title: "Stripe connected successfully ✓",
            description: `Your account is verified and ready to receive tournament payments.${verificationData.charges_enabled ? '' : ' Complete your account setup in Stripe to accept payments.'}`,
          });
        } else {
          toast({
            title: "Stripe connected",
            description: "Connection completed. Please check your account status on the create tournament page.",
          });
        }
        
        try { localStorage.setItem('stripe_connected', 'true'); } catch {}
        // If opened from the create-tournament page, close this tab to return
        if (window.opener && !window.opener.closed) {
          window.close();
        } else {
          navigate("/create-tournament");
        }
      } catch (e: any) {
        console.error("Error in finish-stripe-connect:", e);
        setError(e?.message || "Failed to complete Stripe connection.");
      } finally {
        setLoading(false);
      }
    };

    finish();
  }, [location.search, navigate, toast]);

  const handleReconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-stripe-oauth-url');
      if (error) throw error;
      const url = (data as any)?.url;
      if (!url) throw new Error('Failed to generate Stripe OAuth URL');
      window.location.href = url;
    } catch (e: any) {
      setLoading(false);
      setError(e?.message || 'Failed to start Stripe connection.');
    }
  };


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
    const isPlatformAccountError = error.includes("Authorization code provided does not belong to you") || error.toLowerCase().includes("invalid_grant");
    return (
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Stripe connection failed</CardTitle>
            <CardDescription>
              {error}
              {isPlatformAccountError && (
                <> — Stripe does not allow connecting the platform's own Stripe account. Please use a different Stripe account.</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={handleReconnect}>Connect a different Stripe account</Button>
            <Button variant="secondary" onClick={() => navigate("/create-tournament")}>Back to Create Tournament</Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return null;
};

export default StripeConnectCallback;
