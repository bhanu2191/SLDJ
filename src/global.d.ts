export { };

declare global {
    interface Window {
        electronAPI: {
            getStudents: () => Promise<any[]>;
            getStudent: (id: string) => Promise<any>;
            addStudent: (student: any) => Promise<any>;
            updateStudent: (student: any) => Promise<any>;
            deleteStudent: (id: string) => Promise<string>;

            // Operator API
            getOperators: () => Promise<any[]>;
            addOperator: (operator: any) => Promise<any>;
            deleteOperator: (id: string | number) => Promise<string | number>;
            toggleOperatorStatus: (id: string | number, status: string) => Promise<any>;
            verifyOperator: (creds: { email?: string, password?: string, role?: string }) => Promise<any>;

            // 2FA API
            sendOtp: (phone: string) => Promise<any>;
            verifyOtp: (code: string) => Promise<any>;

            // Payment API
            addPayment: (payment: any) => Promise<any>;
            getStudentPayments: (regNum: string) => Promise<any[]>;

            // Dashboard API
            getDashboardStats: () => Promise<{ totalStudents: number, monthlyRevenue: number, pendingPayments: number }>;
            getRevenueChart: () => Promise<any[]>;
            getRecentActivity: () => Promise<any[]>;

            // Class Categories API
            getClassCategories: () => Promise<any[]>;
            addClassCategory: (category: any) => Promise<any>;
            updateClassCategory: (category: any) => Promise<any>;
            deleteClassCategory: (id: string | number) => Promise<string | number>;
            sendReceiptEmail: (data: { email: string; studentName: string; amount: number; date: string; receiptNo: string; course: string }) => Promise<any>;

            // SMS API
            getSmsConfig: () => Promise<any>;
            saveSmsConfig: (config: any) => Promise<any>;
            getSmsBalance: () => Promise<any>;
            sendManualSms: (data: { recipients: string[], message: string }) => Promise<{ successCount: number, failCount: number }>;
            getSmsLogs: () => Promise<any[]>;

            // Payment Reminders
            triggerPaymentReminders: () => Promise<{ success: boolean; message?: string; sent?: number; failed?: number }>;
        };
    }
}
