import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import { TournamentCreationWizard } from "./components/TournamentCreationWizard";
import TournamentDetails from "./pages/TournamentDetails";
import TournamentManagement from "./pages/TournamentManagement";
import Tournaments from "./pages/Tournaments";
import MoneyReporting from "./pages/MoneyReporting";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import StripeConnectCallback from "./pages/StripeConnectCallback";
import Profile from "./pages/Profile";
import TournamentPublicView from "./pages/TournamentPublicView";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  return <Layout>{children}</Layout>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={
              <Layout>
                <Index />
              </Layout>
            } />
            <Route path="/auth" element={
              <AuthRoute>
                <Auth />
              </AuthRoute>
            } />
            <Route path="/create-tournament" element={
              <ProtectedRoute>
                <TournamentCreationWizard />
              </ProtectedRoute>
            } />
            <Route path="/tournaments" element={
              <Layout>
                <Tournaments />
              </Layout>
            } />
            <Route path="/my-tournaments" element={
              <ProtectedRoute>
                <Tournaments showMyTournaments={true} />
              </ProtectedRoute>
            } />
            <Route path="/tournament/:id/live" element={
              <TournamentPublicView />
            } />
            <Route path="/tournament/:id" element={
              <ProtectedRoute>
                <TournamentDetails />
              </ProtectedRoute>
            } />
            <Route path="/tournament/:id/manage" element={
              <ProtectedRoute>
                <TournamentManagement />
              </ProtectedRoute>
            } />
            <Route path="/tournament/:id/money" element={
              <ProtectedRoute>
                <MoneyReporting />
              </ProtectedRoute>
            } />
            <Route path="/payment-success" element={
              <Layout>
                <PaymentSuccess />
              </Layout>
            } />
            <Route path="/payment-canceled" element={
              <Layout>
                <PaymentCanceled />
              </Layout>
            } />
            <Route path="/stripe-connect/callback" element={
              <Layout>
                <StripeConnectCallback />
              </Layout>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
