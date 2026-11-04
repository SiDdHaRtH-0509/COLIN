import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PropertyProvider } from './context/PropertyContext';
import { StudentProvider } from './context/StudentContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { AuthModal } from './components/common/AuthModal';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';

// Student Portal Components & Pages
import { StudentLayout } from './components/student/StudentLayout';
import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
import { StudentExplorePage } from './pages/student/StudentExplorePage';
import { StudentPropertyDetailPage } from './pages/student/StudentPropertyDetailPage';
import { StudentVirtualTourPage } from './pages/student/StudentVirtualTourPage';
import { StudentWishlistPage } from './pages/student/StudentWishlistPage';
import { StudentComparePage } from './pages/student/StudentComparePage';
import { StudentVisitsPage } from './pages/student/StudentVisitsPage';
import { StudentLivingPage } from './pages/student/StudentLivingPage';
import { StudentTiffinConnectPage } from './pages/student/StudentTiffinConnectPage';
import { StudentPremiumPage } from './pages/student/StudentPremiumPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';

// Owner Portal Components & Pages
import { OwnerLayout } from './components/owner/OwnerLayout';
import { OwnerDashboardPage } from './pages/owner/OwnerDashboardPage';
import { OwnerPropertiesPage } from './pages/owner/OwnerPropertiesPage';
import { OwnerRoomsPage } from './pages/owner/OwnerRoomsPage';
import { OwnerEnquiriesPage } from './pages/owner/OwnerEnquiriesPage';
import { OwnerVisitsAccessDenied } from './pages/owner/OwnerVisitsAccessDenied';
import { OwnerCertificationPage } from './pages/owner/OwnerCertificationPage';
import { OwnerMonetisationPage } from './pages/owner/OwnerMonetisationPage';
import { OwnerSubscriptionPage } from './pages/owner/OwnerSubscriptionPage';
import { OwnerAnalyticsPage } from './pages/owner/OwnerAnalyticsPage';
import { OwnerSettingsPage } from './pages/owner/OwnerSettingsPage';

// Scroll to top component on route changes
const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return null;
};

const AppContent: React.FC = () => {
  const { pathname } = useLocation();
  const isStudentWorkspace = pathname.startsWith('/student');
  const isOwnerWorkspace = pathname.startsWith('/owner');
  const isWorkspace = isStudentWorkspace || isOwnerWorkspace;

  return (
    <div className="flex flex-col min-h-screen bg-colin-offwhite font-sans text-colin-charcoal antialiased overflow-x-hidden">
      {/* Public Navbar rendered on public/landing routes */}
      {!isWorkspace && <Navbar />}

      {/* Dynamic Route Content */}
      <main className="flex-1">
        <Routes>
          {/* Public & Guest Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/property/:id" element={<PropertyDetailPage />} />

          {/* Dedicated Student Portal Workspace (Protected) */}
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<StudentDashboardPage />} />
            <Route path="dashboard" element={<StudentDashboardPage />} />
            <Route path="explore" element={<StudentExplorePage />} />
            <Route path="property/:id" element={<StudentPropertyDetailPage />} />
            <Route path="property/:id/tour" element={<StudentVirtualTourPage />} />
            <Route path="saved" element={<StudentWishlistPage />} />
            <Route path="compare" element={<StudentComparePage />} />
            <Route path="visits" element={<StudentVisitsPage />} />
            <Route path="living" element={<StudentLivingPage />} />
            <Route path="tiffin-connect" element={<StudentTiffinConnectPage />} />
            <Route path="premium" element={<StudentPremiumPage />} />
            <Route path="profile" element={<StudentProfilePage />} />
          </Route>

          {/* Dedicated Owner Portal Workspace (Protected) */}
          <Route path="/owner" element={<OwnerLayout />}>
            <Route index element={<OwnerDashboardPage />} />
            <Route path="dashboard" element={<OwnerDashboardPage />} />
            <Route path="properties" element={<OwnerPropertiesPage />} />
            <Route path="rooms" element={<OwnerRoomsPage />} />
            <Route path="enquiries" element={<OwnerEnquiriesPage />} />
            <Route path="visits" element={<OwnerVisitsAccessDenied />} />
            <Route path="certification" element={<OwnerCertificationPage />} />
            <Route path="monetisation" element={<OwnerMonetisationPage />} />
            <Route path="subscription" element={<OwnerSubscriptionPage />} />
            <Route path="analytics" element={<OwnerAnalyticsPage />} />
            <Route path="settings" element={<OwnerSettingsPage />} />
          </Route>
        </Routes>
      </main>

      {/* Member Access Restriction Modal */}
      <AuthModal />

      {/* Comprehensive Brand Footer on public/landing routes */}
      {!isWorkspace && <Footer />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <PropertyProvider>
        <StudentProvider>
          <ToastProvider>
            <BrowserRouter>
              <ScrollToTop />
              <AppContent />
            </BrowserRouter>
          </ToastProvider>
        </StudentProvider>
      </PropertyProvider>
    </AuthProvider>
  );
};

export default App;
