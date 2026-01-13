import { createContext, useContext, useState, type ReactNode } from 'react';

export type UserRole = 'admin' | 'operator' | null;

interface AuthContextType {
    userRole: UserRole;
    login: (role: UserRole, password?: string) => boolean;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [userRole, setUserRole] = useState<UserRole>(() => {
        return (localStorage.getItem('userRole') as UserRole) || null;
    });
    // We can't use useNavigate here directly if AuthProvider is wrapping BrowserRouter in App.tsx
    // But usually AuthProvider is inside BrowserRouter. I'll check App.tsx structure.

    const login = (role: UserRole, password?: string): boolean => {
        if (role === 'admin') {
            if (password === 'admin123') {
                setUserRole(role);
                localStorage.setItem('userRole', role);
                return true;
            }
            return false;
        }

        // Operator doesn't need password for now
        setUserRole(role);
        if (role) {
            localStorage.setItem('userRole', role);
        }
        return true;
    };

    const logout = () => {
        setUserRole(null);
        localStorage.removeItem('userRole');
    };

    return (
        <AuthContext.Provider value={{ userRole, login, logout, isAuthenticated: !!userRole }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
