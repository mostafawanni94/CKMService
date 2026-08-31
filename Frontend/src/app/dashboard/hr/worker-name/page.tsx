/**
 * `/dashboard/hr/worker-name` was an unreferenced stub that rendered an empty
 * table and had no backend or domain meaning. It redirects to the employee list
 * so any bookmarked link still lands somewhere useful.
 */
import { redirect } from 'next/navigation';

export default function HRWorkerNamePage() {
    redirect('/dashboard/employees');
}
