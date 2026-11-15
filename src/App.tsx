import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import RequireAuth from './components/RequireAuth';
import AttendeeProfile from './pages/AttendeeProfile';
import Attendees from './pages/Attendees';
import Home from './pages/Home';
import Login from './pages/Login';
import Scan from './pages/Scan';
import ScanResult from './pages/ScanResult';

// Test QR codes for the mock attendees. Only exists in `npm run dev`.
const DevQrCodes = import.meta.env.DEV ? lazy(() => import('./pages/DevQrCodes')) : null;

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            {DevQrCodes && (
                <Route
                    path="/dev/qr"
                    element={
                        <Suspense fallback={null}>
                            <DevQrCodes />
                        </Suspense>
                    }
                />
            )}
            <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/scan" element={<Scan />} />
                    <Route path="/scan/result" element={<ScanResult />} />
                    <Route path="/attendees" element={<Attendees />} />
                    <Route path="/attendees/:attendeeId" element={<AttendeeProfile />} />
                </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
