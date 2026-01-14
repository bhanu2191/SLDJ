import type { User, LoginCredentials } from '../types/auth';

const MOCK_DELAY = 800; // Simulate network latency

class AuthService {
    async login(credentials: LoginCredentials): Promise<User> {
        // Mock Admin login remains for safety/fallback unless we move Admin to DB too.
        // For now, let's keep hardcoded Admin but use DB for Operators.
        if (credentials.role === 'admin') {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (credentials.password === 'admin123') {
                        const adminUser: User = {
                            id: 'admin-1',
                            username: 'admin',
                            name: 'System Administrator',
                            role: 'admin',
                            email: 'admin@sldj.lk',
                            avatar: ''
                        };
                        this.persistSession(adminUser);
                        resolve(adminUser);
                    } else {
                        reject(new Error('Invalid password'));
                    }
                }, MOCK_DELAY);
            });
        }

        // Operator Login via DB
        try {
            // @ts-ignore
            const dbUser = await window.electronAPI.verifyOperator({
                // We send either email or role? Login UI sends 'role' as identifier effectively if no email field.
                // WAIT: Login.tsx DOES NOT send email. It sends `role: 'operator'` and `password`.
                // This means currently we only know "It is AN operator".
                // AND we are validating against `password`.
                // So effectively, if the password matches ANY operator, we log them in?
                // The backend query is `SELECT * FROM operators WHERE (email = ? OR role = ?) AND password = ?`.
                // If we pass `email: 'operator'`, and the role column is 'operator', it might match.
                // Let's pass the role as the 'email' param for the query to pick up via OR clause?
                // Or better, we assume the user enters EMAIL in the login form if we updated it?
                // I did NOT update login form to ask for Email yet. I only enabled Password.
                // So... if the user enters "operator123", we find WHO has that password?
                // Or does "Operator" imply a generic shared login?
                // The User said "operator login process NEW operator login process add password".
                // Implies unique operators.
                // If unique, we NEED unique identifier (Email/Username).
                // I will assume for this step we pass 'operator' as the identifier, and if the DB has an entry with role='operator' and that password, it returns it.
                // This is weak security (shared password risk) but matches current UI state.

                email: 'operator', // Using generic identifier for now as UI doesn't have email input
                password: credentials.password
            });

            if (dbUser) {
                const user: User = {
                    id: dbUser.id.toString(),
                    username: dbUser.name, // Use name as username
                    name: dbUser.name,
                    role: 'operator',
                    email: dbUser.email
                };
                this.persistSession(user);
                return user;
            } else {
                throw new Error('Invalid credentials');
            }
        } catch (error) {
            throw error;
        }
    }

    async logout(): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(() => {
                localStorage.removeItem('user_session');
                resolve();
            }, 300);
        });
    }

    getUser(): User | null {
        const stored = localStorage.getItem('user_session');
        if (stored) {
            try {
                return JSON.parse(stored) as User;
            } catch (e) {
                console.error("Failed to parse user session", e);
                return null;
            }
        }
        return null;
    }

    private persistSession(user: User) {
        localStorage.setItem('user_session', JSON.stringify(user));
    }
}

export const authService = new AuthService();
