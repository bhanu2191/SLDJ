const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getStudents: () => ipcRenderer.invoke('get-students'),
    getStudent: (id) => ipcRenderer.invoke('get-student', id),
    addStudent: (student) => ipcRenderer.invoke('add-student', student),
    updateStudent: (student) => ipcRenderer.invoke('update-student', student),
    deleteStudent: (id) => ipcRenderer.invoke('delete-student', id),

    // Operator API
    getOperators: () => ipcRenderer.invoke('get-operators'),
    addOperator: (operator) => ipcRenderer.invoke('add-operator', operator),
    deleteOperator: (id) => ipcRenderer.invoke('delete-operator', id),
    toggleOperatorStatus: (id, status) => ipcRenderer.invoke('toggle-operator-status', { id, status }),
    verifyOperator: (creds) => ipcRenderer.invoke('verify-operator', creds),

    // Payment API
    addPayment: (payment) => ipcRenderer.invoke('add-payment', payment),
    getStudentPayments: (regNum) => ipcRenderer.invoke('get-student-payments', regNum),

    // Dashboard API
    getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
    getRevenueChart: () => ipcRenderer.invoke('get-revenue-chart'),
    getRecentActivity: () => ipcRenderer.invoke('get-recent-activity'),

    // Class Categories API
    getClassCategories: () => ipcRenderer.invoke('get-class-categories'),
    addClassCategory: (category) => ipcRenderer.invoke('add-class-category', category),
    updateClassCategory: (category) => ipcRenderer.invoke('update-class-category', category),
    deleteClassCategory: (id) => ipcRenderer.invoke('delete-class-category', id),
    sendReceiptEmail: (data) => ipcRenderer.invoke('send-receipt-email', data),

    // Admin Payment Analytics
    getAdminPaymentStats: () => ipcRenderer.invoke('get-admin-payment-stats'),
    getAllPayments: () => ipcRenderer.invoke('get-all-payments'),
    getRevenueByClass: () => ipcRenderer.invoke('get-revenue-by-class'),
    getMonthlyRevenueTrend: () => ipcRenderer.invoke('get-monthly-revenue-trend'),

    // SMS API
    getSmsConfig: () => ipcRenderer.invoke('get-sms-config'),
    saveSmsConfig: (config) => ipcRenderer.invoke('save-sms-config', config),
    getSmsBalance: () => ipcRenderer.invoke('get-sms-balance'),
    sendManualSms: (data) => ipcRenderer.invoke('send-manual-sms', data),
    getSmsLogs: () => ipcRenderer.invoke('get-sms-logs'),

    // Payment Reminders
    triggerPaymentReminders: () => ipcRenderer.invoke('trigger-payment-reminders'),

    // Exam Results API
    getExamResults: (params) => ipcRenderer.invoke('get-exam-results', params),
    saveExamResults: (params) => ipcRenderer.invoke('save-exam-results', params),
    exportExamResults: (params) => ipcRenderer.invoke('export-exam-results', params),

    // 2FA Authentication
    sendOtp: (phone) => ipcRenderer.invoke('send-2fa-otp', { phone }),
    verifyOtp: (code) => ipcRenderer.invoke('verify-2fa-otp', code),

    // Finance API
    getFinanceRecords: (params) => ipcRenderer.invoke('get-finance-records', params),
    addFinanceRecord: (record) => ipcRenderer.invoke('add-finance-record', record),
    deleteFinanceRecord: (id) => ipcRenderer.invoke('delete-finance-record', id),
    getFinanceSummary: (params) => ipcRenderer.invoke('get-finance-summary', params),

    // Debug
    checkDbSchema: () => ipcRenderer.invoke('check-db-schema'),
});
