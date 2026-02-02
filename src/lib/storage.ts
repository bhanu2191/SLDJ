export interface Student {
    regNum: string; // Primary Key now
    name: string;
    dob?: string;
    phone?: string;
    email?: string;
    class: string | string[]; // Can be array now
    guardian?: string;
    guardianPhone?: string;
    status: 'paid' | 'pending' | 'overdue';
    avatar?: string;
    gender?: 'male' | 'female';
    classStatuses?: { className: string, status: 'paid' | 'pending' | 'overdue' }[];
}

export async function getStoredStudents(): Promise<Student[]> {
    if (window.electronAPI) {
        return await window.electronAPI.getStudents();
    }
    // Fallback for non-Electron environment (dev/web) - optionally keep localStorage or return empty
    console.warn("Electron API not found, falling back to empty array");
    return [];
}

export async function getStudent(regNum: string): Promise<Student | null> {
    if (window.electronAPI) {
        return await window.electronAPI.getStudent(regNum);
    }
    return null;
}

export async function saveStudent(student: Omit<Student, 'status'>): Promise<Student> {
    const newStudent = {
        avatar: null, // Default if missing
        ...student,
        status: 'pending' as const,
    };

    if (window.electronAPI) {
        return await window.electronAPI.addStudent(newStudent);
    }
    console.warn("Electron API not found");
    return newStudent as Student;
}

export async function updateStudent(student: Student): Promise<Student> {
    if (window.electronAPI) {
        return await window.electronAPI.updateStudent(student);
    }
    return student;
}

export async function deleteStudent(id: string): Promise<string> {
    if (window.electronAPI) {
        return await window.electronAPI.deleteStudent(id);
    }
    return id;
}

