'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { Card, Button, Input } from '@/components/ui';
import { BarChart3, Users, Clock, DollarSign, Download, Calendar, Filter, TrendingUp, Building2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface Employee {
    id: string;
    full_name: string;
}

interface Project {
    id: string;
    name: string;
    customer_name: string;
}

interface EmployeeEarning {
    employee_id: string;
    employee_name: string;
    total_hours: number;
    total_earnings: number;
    approved_logs: number;
}

interface ProjectHours {
    project_id: string;
    project_name: string;
    customer_name: string;
    total_hours: number;
    employee_count: number;
}

export default function ReportsPage() {
    const [activeReport, setActiveReport] = useState<'earnings' | 'project-hours' | 'employee-hours'>('earnings');
    const [loading, setLoading] = useState(false);
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

    // Data
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [earningsData, setEarningsData] = useState<EmployeeEarning[]>([]);
    const [projectHoursData, setProjectHoursData] = useState<ProjectHours[]>([]);

    useEffect(() => {
        loadEmployees();
        loadProjects();
    }, []);

    useEffect(() => {
        loadReportData();
    }, [activeReport, dateFrom, dateTo]);

    async function loadEmployees() {
        try {
            const response = await fetch(`${API_URL}/employees/profiles/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setEmployees(data.results || data);
            }
        } catch (err) {
            console.error('Failed to load employees:', err);
        }
    }

    async function loadProjects() {
        try {
            const response = await fetch(`${API_URL}/projects/projects/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setProjects(data.results || data);
            }
        } catch (err) {
            console.error('Failed to load projects:', err);
        }
    }

    async function loadReportData() {
        setLoading(true);
        try {
            // For now, we'll calculate from work logs
            const response = await fetch(`${API_URL}/worklogs/?work_date_after=${dateFrom}&work_date_before=${dateTo}&status=approved`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });

            if (response.ok) {
                const data = await response.json();
                const logs = data.results || data;

                // Calculate employee earnings
                const employeeMap = new Map<string, EmployeeEarning>();
                logs.forEach((log: any) => {
                    const key = log.employee;
                    if (!employeeMap.has(key)) {
                        employeeMap.set(key, {
                            employee_id: log.employee,
                            employee_name: log.employee_name || 'Unknown',
                            total_hours: 0,
                            total_earnings: 0,
                            approved_logs: 0,
                        });
                    }
                    const emp = employeeMap.get(key)!;
                    emp.total_hours += parseFloat(log.calculated_hours || 0);
                    emp.approved_logs += 1;
                    // Earnings would need hourly rate, simplified here
                    emp.total_earnings += parseFloat(log.calculated_hours || 0) * 25; // Default rate
                });
                setEarningsData(Array.from(employeeMap.values()));

                // Calculate project hours
                const projectMap = new Map<string, ProjectHours>();
                const projectEmployees = new Map<string, Set<string>>();
                logs.forEach((log: any) => {
                    const key = log.project;
                    if (!projectMap.has(key)) {
                        projectMap.set(key, {
                            project_id: log.project,
                            project_name: log.project_name || 'Unknown',
                            customer_name: '',
                            total_hours: 0,
                            employee_count: 0,
                        });
                        projectEmployees.set(key, new Set());
                    }
                    const proj = projectMap.get(key)!;
                    proj.total_hours += parseFloat(log.calculated_hours || 0);
                    projectEmployees.get(key)!.add(log.employee);
                });
                projectEmployees.forEach((emps, key) => {
                    const proj = projectMap.get(key)!;
                    proj.employee_count = emps.size;
                });
                setProjectHoursData(Array.from(projectMap.values()));
            }
        } catch (err) {
            console.error('Failed to load report data:', err);
        } finally {
            setLoading(false);
        }
    }

    function exportToCSV() {
        let csv = '';
        let filename = '';

        if (activeReport === 'earnings') {
            csv = 'Employee,Total Hours,Total Earnings,Approved Logs\n';
            earningsData.forEach(e => {
                csv += `"${e.employee_name}",${e.total_hours.toFixed(2)},€${e.total_earnings.toFixed(2)},${e.approved_logs}\n`;
            });
            filename = `employee-earnings-${dateFrom}-${dateTo}.csv`;
        } else if (activeReport === 'project-hours') {
            csv = 'Project,Total Hours,Employees\n';
            projectHoursData.forEach(p => {
                csv += `"${p.project_name}",${p.total_hours.toFixed(2)},${p.employee_count}\n`;
            });
            filename = `project-hours-${dateFrom}-${dateTo}.csv`;
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    const totalHours = earningsData.reduce((sum, e) => sum + e.total_hours, 0);
    const totalEarnings = earningsData.reduce((sum, e) => sum + e.total_earnings, 0);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                        <p className="text-gray-500">View earnings, hours, and performance reports</p>
                    </div>
                    <Button onClick={exportToCSV}>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Active Employees</p>
                                <p className="text-2xl font-bold text-gray-900">{earningsData.length}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-purple-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <Clock className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Hours</p>
                                <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-gradient-to-br from-green-50 to-white border-green-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 rounded-xl">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Earnings</p>
                                <p className="text-2xl font-bold text-gray-900">€{totalEarnings.toLocaleString()}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-gradient-to-br from-amber-50 to-white border-amber-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-100 rounded-xl">
                                <Building2 className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Active Projects</p>
                                <p className="text-2xl font-bold text-gray-900">{projectHoursData.length}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="p-4">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-2">
                            {[
                                { id: 'earnings', label: 'Employee Earnings', icon: DollarSign },
                                { id: 'project-hours', label: 'Project Hours', icon: BarChart3 },
                            ].map((report) => (
                                <button
                                    key={report.id}
                                    onClick={() => setActiveReport(report.id as any)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeReport === report.id
                                            ? 'bg-[#1E3A5F] text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <report.icon className="w-4 h-4" />
                                    {report.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="px-3 py-2 border rounded-lg text-sm"
                                />
                                <span className="text-gray-400">to</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="px-3 py-2 border rounded-lg text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Report Content */}
                <Card>
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F]"></div>
                        </div>
                    ) : activeReport === 'earnings' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Employee</th>
                                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Hours Worked</th>
                                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Approved Logs</th>
                                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Est. Earnings</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {earningsData.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                                <p className="font-medium">No data for selected period</p>
                                                <p className="text-sm">Try adjusting the date range</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        earningsData
                                            .sort((a, b) => b.total_hours - a.total_hours)
                                            .map((emp) => (
                                                <tr key={emp.employee_id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#3E5A8F] flex items-center justify-center text-white font-semibold">
                                                                {emp.employee_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                            </div>
                                                            <span className="font-medium">{emp.employee_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="font-semibold">{emp.total_hours.toFixed(1)}h</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-gray-500">
                                                        {emp.approved_logs}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="font-bold text-green-600">€{emp.total_earnings.toLocaleString()}</span>
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                                {earningsData.length > 0 && (
                                    <tfoot className="bg-[#1E3A5F] text-white">
                                        <tr>
                                            <td className="px-6 py-4 font-semibold">TOTAL</td>
                                            <td className="px-6 py-4 text-right font-bold">{totalHours.toFixed(1)}h</td>
                                            <td className="px-6 py-4 text-right">
                                                {earningsData.reduce((sum, e) => sum + e.approved_logs, 0)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold">€{totalEarnings.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Project</th>
                                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Total Hours</th>
                                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Employees</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {projectHoursData.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                                                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                                <p className="font-medium">No project data for selected period</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        projectHoursData
                                            .sort((a, b) => b.total_hours - a.total_hours)
                                            .map((proj) => (
                                                <tr key={proj.project_id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                                                <Building2 className="w-5 h-5 text-amber-600" />
                                                            </div>
                                                            <span className="font-medium">{proj.project_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-semibold">{proj.total_hours.toFixed(1)}h</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                                            {proj.employee_count} employees
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    );
}
