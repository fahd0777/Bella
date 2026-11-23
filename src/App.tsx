import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { AuthGate, NewPassword } from './pages/Auth';
import AppShell from './layout/AppShell';
import { EditorProvider } from './components/Editor';
import { ListSkeleton } from './components/ui';
import { BellaMark } from './components/icons';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const CalendarPage = lazy(() => import('./pages/Calendar'));
const TasksPage = lazy(() => import('./pages/Tasks'));
const ClientsPage = lazy(() => import('./pages/Clients'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const PropertiesPage = lazy(() => import('./pages/Properties'));
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'));
const ChildrenPage = lazy(() => import('./pages/Children'));
const ChildDetail = lazy(() => import('./pages/ChildDetail'));
const HouseholdPage = lazy(() => import('./pages/Household'));
const BillsPage = lazy(() => import('./pages/Bills'));
const FinancePage = lazy(() => import('./pages/Finance'));
const NotesPage = lazy(() => import('./pages/Notes'));
const ReportsPage = lazy(() => import('./pages/Reports'));
const PrivatePage = lazy(() => import('./pages/Private'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const NotificationsPage = lazy(() => import('./pages/Notifications'));

export default function App() {
  const { session, loading, recovery } = useAuth();
  if (loading) return <div className="flex min-h-dvh items-center justify-center"><BellaMark size={56} /></div>;
  if (recovery && session) return <NewPassword />;
  if (!session) return <AuthGate />;
  return (
    <EditorProvider>
      <Routes>
        <Route element={<AppShell />}>
          {[
            ['/', Dashboard], ['/calendar', CalendarPage], ['/tasks', TasksPage], ['/crm', ClientsPage], ['/crm/:id', ClientDetail],
            ['/properties', PropertiesPage], ['/properties/:id', PropertyDetail], ['/children', ChildrenPage], ['/children/:id', ChildDetail],
            ['/household', HouseholdPage], ['/bills', BillsPage], ['/finance', FinancePage], ['/notes', NotesPage], ['/reports', ReportsPage],
            ['/private', PrivatePage], ['/settings', SettingsPage], ['/notifications', NotificationsPage],
          ].map(([path, C]) => {
            const Comp = C as React.ComponentType;
            return <Route key={path as string} path={path as string} element={<Suspense fallback={<ListSkeleton rows={5} />}><Comp /></Suspense>} />;
          })}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </EditorProvider>
  );
}
