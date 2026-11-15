import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import Spinner from './Spinner';

/** Sends signed-out visitors to /login. */
export default function RequireAuth() {
    const { state } = useAuth();

    if (state.status === 'loading') {
        return (
            <div className="flex min-h-dvh items-center justify-center">
                <Spinner />
            </div>
        );
    }
    if (state.status === 'signedOut') return <Navigate to="/login" replace />;
    return <Outlet />;
}
