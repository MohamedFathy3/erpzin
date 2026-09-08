import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { RegionalSettingsProvider } from "@/contexts/RegionalSettingsContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Purchasing from "./pages/Purchasing";
import Sales from "./pages/Sales";
import POS from "./pages/POS";
import POSRetrun from "./pages/POSRetrun";
import Finance from "./pages/Finance";
import HR from "./pages/HR";
import CRM from "./pages/CRM";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Industries from "./pages/Industries";
import Manufacturing from "./pages/Manufacturing";
import ManufacturingSetup from "./pages/ManufacturingSetup";
import ProductLedger from "./pages/ProductLedger";
import RepresentativeDashboard from "./pages/RepresentativeDashboard";
import Projects from "./pages/Projects";
import Workflow from "./pages/Workflow";
import NotFound from "./pages/NotFound";
import SuperAdmin from "./pages/SuperAdmin";
import { Home as MarketingHome, About, Services, Pricing, Contact, Signup } from "./pages/MarketingPages";
import AccessControl from "./pages/AccessControl";

const queryClient = new QueryClient();
const isTenantHost = () => { const host=window.location.hostname.toLowerCase(); const root=(import.meta.env.VITE_TENANT_ROOT_DOMAIN || 'example.com').toLowerCase(); return host.endsWith(`.${root}`) && host !== `www.${root}` && host !== `admin.${root}`; };
const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <RegionalSettingsProvider>
          <AppProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/about" element={<About />} />
                <Route path="/services" element={<Services />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/" element={isTenantHost() ? <ProtectedRoute><Dashboard /></ProtectedRoute> : <MarketingHome />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                <Route path="/purchasing" element={<ProtectedRoute><Purchasing /></ProtectedRoute>} />
                <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
                <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
                <Route path="/hr" element={<ProtectedRoute><HR /></ProtectedRoute>} />
                <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/industries" element={<ProtectedRoute><Industries /></ProtectedRoute>} />
                <Route path="/manufacturing" element={<ProtectedRoute><Manufacturing /></ProtectedRoute>} />
                <Route path="/manufacturing/setup" element={<ProtectedRoute><ManufacturingSetup /></ProtectedRoute>} />
                <Route path="/product-ledger" element={<ProtectedRoute><ProductLedger /></ProtectedRoute>} />
                <Route path="/representative" element={<ProtectedRoute><RepresentativeDashboard /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                <Route path="/workflow" element={<ProtectedRoute><Workflow /></ProtectedRoute>} />
                <Route path="/super-admin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
                <Route path="/access-control" element={<ProtectedRoute><AccessControl /></ProtectedRoute>} />
                <Route path="/POSRetrun" element={<ProtectedRoute><POSRetrun /></ProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AppProvider>
      </RegionalSettingsProvider>
    </AuthProvider>
  </LanguageProvider>
</QueryClientProvider>
);

export default App;
