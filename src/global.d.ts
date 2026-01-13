export { };

declare global {
    interface Window {
        electronAPI: {
            getStudents: () => Promise<any[]>;
            addStudent: (student: any) => Promise<any>;
            updateStudent: (student: any) => Promise<any>;
            deleteStudent: (id: string) => Promise<string>;
        };
    }
}
