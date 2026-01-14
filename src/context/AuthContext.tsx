import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type User, type UserRole, type LoginCredentials } from '../types/auth';
import { authService } from '../services/authService';

export type { UserRole }; // Re-export for convenience if needed

interface AuthContextType {
    user: User | null;
    userRole: UserRole | null;
    isLoading: boolean;
    error: string | null;
    login: (credentials: LoginCredentials) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initAuth = () => {
            const storedUser = authService.getUser();
            if (storedUser) {
                setUser(storedUser);
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const login = async (credentials: LoginCredentials): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const loggedInUser = await authService.login(credentials);
            setUser(loggedInUser);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            userRole: user?.role || null,
            isLoading,
            error,
            login,
            logout,
            isAuthenticated: !!user
        }}>
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
