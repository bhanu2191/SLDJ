const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getStudents: () => ipcRenderer.invoke('get-students'),
    addStudent: (student) => ipcRenderer.invoke('add-student', student),
    updateStudent: (student) => ipcRenderer.invoke('update-student', student),
    deleteStudent: (id) => ipcRenderer.invoke('delete-student', id),
});
