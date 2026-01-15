export { };

declare global {
    interface Window {
        electronAPI: {
            getStudents: () => Promise<any[]>;
            getStudent: (id: string) => Promise<any>;
            addStudent: (student: any) => Promise<any>;
            updateStudent: (student: any) => Promise<any>;
            deleteStudent: (id: string) => Promise<string>;

            // Payment API
            addPayment: (payment: any) => Promise<any>;
            getStudentPayments: (regNum: string) => Promise<any[]>;

            // Dashboard API
            getDashboardStats: () => Promise<{ totalStudents: number, monthlyRevenue: number, pendingPayments: number }>;
            getRevenueChart: () => Promise<any[]>;
            getRecentActivity: () => Promise<any[]>;
        };
    }
}
