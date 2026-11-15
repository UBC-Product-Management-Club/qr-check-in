import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

/** Phone-width column with the bottom navbar. Wraps every signed-in page. */
export default function AppLayout() {
    return (
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
            <main className="flex flex-1 flex-col px-5 pt-6 pb-28">
                <Outlet />
            </main>
            <BottomNav />
        </div>
    );
}
