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
});
