export type UserRole = 'admin' | 'operator';

export interface User {
    id: string;
    username: string;
    name: string;
    role: UserRole;
    avatar?: string;
    email?: string;
}

export interface LoginCredentials {
    role: UserRole; // Keeping role selection as per current UI flow, though usually username implies role.
    password?: string;
    otp?: string;
    phone?: string;
}

export interface AuthResponse {
    user: User;
    token: string;
}
