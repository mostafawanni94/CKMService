/**
 * `/dashboard/hr/employees` was a second, thinner employee list that duplicated
 * `/dashboard/employees`. Rather than maintain two views of the same data, this
 * route now redirects to the canonical page.
 */
import { redirect } from 'next/navigation';

export default function HREmployeesPage() {
    redirect('/dashboard/employees');
}
