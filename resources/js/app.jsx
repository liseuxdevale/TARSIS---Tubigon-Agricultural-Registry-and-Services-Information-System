import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './i18n';
import { EmptyState, PageLoader } from './components/common';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './layouts/AppLayout';
import Landing from './pages/Landing';
import AboutTarsis from './pages/AboutTarsis';
import Dashboard from './pages/dashboard/Dashboard';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import AccountProfile from './pages/account/AccountProfile';
import Register from './pages/registration/Register';
import Profile from './pages/registration/Profile';
import MyProfile from './pages/registration/MyProfile';
import RsbsaPreview from './pages/registration/RsbsaPreview';
import BarangayMap from './pages/BarangayMap';
import Assistance from './pages/assistance/Assistance';
import Insurance from './pages/insurance/Insurance';
import Notifications from './pages/notifications/Notifications';
import Advisory from './pages/announcements/Advisory';
import AdvisoryDetails from './pages/announcements/AdvisoryDetails';
import PublicAnnouncementDetails from './pages/announcements/PublicAnnouncementDetails';
import PublicAnnouncements from './pages/announcements/PublicAnnouncements';
import PublicTrackerInstructions from './pages/tracking/PublicTrackerInstructions';
import TrackerGuide from './pages/tracking/TrackerGuide';
import AnnouncementManagement from './pages/announcements/AnnouncementManagement';
import RegistrationManagement from './pages/admin/RegistrationManagement';
import BarangayCoverage from './pages/admin/BarangayCoverage';
import GeoMapping from './pages/admin/GeoMapping';
import Tracking from './pages/admin/Tracking';
import Reports from './pages/reports/Reports';
import AuditLogs from './pages/admin/AuditLogs';
import UserManagement from './pages/admin/UserManagement';
import ArchivedRecords from './pages/admin/ArchivedRecords';
import Settings from './pages/settings/Settings';
import { hasAnyRole, ROLES, sectorAdminRoles } from './utils/rbac';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ScrollToLocation />
                <Routes>
                    <Route path="/login" element={<SignIn />} />
                    <Route path="/staff/login" element={<Navigate to="/login" replace />} />
                    <Route path="/staff/register" element={<Navigate to="/signup" replace />} />
                    <Route path="/signin" element={<Navigate to="/login" replace />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/" element={<Landing />} />
                    <Route path="/about-tarsis" element={<AboutTarsis />} />
                    <Route path="/announcements" element={<PublicAnnouncements />} />
                    <Route path="/announcements/:id" element={<PublicAnnouncementDetails />} />
                    <Route path="/instructions/assistance-tracker" element={<PublicTrackerInstructions kind="assistance" />} />
                    <Route path="/instructions/insurance-calamity-tracker" element={<PublicTrackerInstructions kind="insurance" />} />
                    <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/account/profile" element={<AccountProfile />} />
                        <Route path="/registration" element={<Register />} />
                        <Route path="/my-profile" element={<RequireRole roles={[ROLES.FARMER]}><MyProfile /></RequireRole>} />
                        <Route path="/profile/:registryNumber" element={<Profile />} />
                        <Route path="/rsbsa-preview/:id" element={<RsbsaPreview />} />
                        <Route path="/rsbsa-preview/:id/mao-id" element={<RsbsaPreview view="mao-id" />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/map" element={<BlockRole roles={[ROLES.SUPER_ADMIN, ...sectorAdminRoles]}><BarangayMap /></BlockRole>} />
                        <Route path="/track/assistance" element={<TrackerGuide kind="assistance" />} />
                        <Route path="/track/insurance" element={<TrackerGuide kind="insurance" />} />
                        <Route path="/assistance" element={<RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD]}><Assistance /></RequireRole>} />
                        <Route path="/insurance" element={<RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD]}><Insurance /></RequireRole>} />
                        <Route path="/notifications" element={<RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD]}><Notifications /></RequireRole>} />
                        <Route path="/advisories" element={<RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD]}><Advisory /></RequireRole>} />
                        <Route path="/advisories/:id" element={<RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD]}><AdvisoryDetails /></RequireRole>} />
                        <Route path="/registrants" element={<Navigate to="/admin/registrations" replace />} />
                        <Route path="/admin" element={<RequireAuth><AdminRedirect /></RequireAuth>} />
                        <Route path="/admin/registrations" element={<RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.BARANGAY_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD]}><RegistrationManagement /></RequireRole>} />
                        <Route path="/admin/barangays" element={<RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.BARANGAY_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD]}><BarangayCoverage /></RequireRole>} />
                        <Route path="/admin/geo-mapping" element={<RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD]}><GeoMapping /></RequireRole>} />
                        <Route path="/admin/tracking" element={<RequireRole roles={[ROLES.MAO_STAFF]}><Tracking /></RequireRole>} />
                        <Route path="/admin/reports" element={<RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD]}><Reports /></RequireRole>} />
                        <Route path="/admin/archived/registrants" element={<RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD]}><ArchivedRecords type="registrants" /></RequireRole>} />
                        <Route path="/admin/archived/assistance" element={<RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD]}><ArchivedRecords type="assistance" /></RequireRole>} />
                        <Route path="/admin/archived/insurance" element={<RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD]}><ArchivedRecords type="insurance" /></RequireRole>} />
                        <Route path="/admin/audit-logs" element={<RequireRole roles={[ROLES.SUPER_ADMIN]}><AuditLogs /></RequireRole>} />
                        <Route path="/admin/users" element={<RequireRole roles={[ROLES.SUPER_ADMIN]}><UserManagement /></RequireRole>} />
                        <Route path="/admin/announcements" element={<RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD]}><AnnouncementManagement /></RequireRole>} />
                        <Route path="*" element={<EmptyState title="Page not found" detail="The requested TARSIS page is not available." />} />
                    </Route>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

function ScrollToLocation() {
    const { hash, pathname } = useLocation();

    useEffect(() => {
        if (!hash) {
            window.scrollTo({ top: 0, left: 0 });
            return;
        }

        window.requestAnimationFrame(() => {
            document.querySelector(hash)?.scrollIntoView({ block: 'start' });
        });
    }, [hash, pathname]);

    return null;
}

function RequireAuth({ children }) {
    const { signedIn, loading } = useAuth();
    const location = useLocation();
    if (loading) return <PageLoader />;
    if (!signedIn) return <Navigate to="/login" replace state={{ from: location }} />;
    return children;
}

function RequireRole({ roles, children }) {
    const { user, signedIn, loading } = useAuth();
    const location = useLocation();
    if (loading) return <PageLoader />;
    if (!signedIn) return <Navigate to="/login" replace state={{ from: location }} />;
    if (!hasAnyRole(user, roles)) {
        return <EmptyState title="Restricted module" detail="This page is available to authorized MAO administrators only." />;
    }
    return children;
}

function BlockRole({ roles, children }) {
    const { user, signedIn, loading } = useAuth();
    const location = useLocation();
    if (loading) return <PageLoader />;
    if (!signedIn) return <Navigate to="/login" replace state={{ from: location }} />;
    if (hasAnyRole(user, roles)) {
        return <EmptyState title="Restricted module" detail="This module is not available for your account role." />;
    }
    return children;
}

function AdminRedirect() {
    return <Navigate to="/dashboard" replace />;
}

createRoot(document.getElementById('root')).render(<App />);
