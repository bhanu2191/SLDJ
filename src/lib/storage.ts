export interface Student {
    id: string;
    regNum: string;
    name: string;
    dob?: string;
    phone?: string;
    email?: string;
    class: string;
    guardian?: string;
    guardianPhone?: string;
    status: 'paid' | 'pending' | 'overdue';
    avatar?: string;
}

const STORAGE_KEY = 'students_data';

export function getStoredStudents(): Student[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

export function saveStudent(student: Omit<Student, 'id' | 'status'>): Student {
    const students = getStoredStudents();

    const newStudent: Student = {
        ...student,
        id: crypto.randomUUID(),
        status: 'pending', // Default status
    };

    students.push(newStudent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    return newStudent;
}
