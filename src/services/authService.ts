import type { User, LoginCredentials } from '../types/auth';

class AuthService {
    async login(credentials: LoginCredentials): Promise<User> {
        // Mock Admin login remains for safety/fallback unless we move Admin to DB too.
        // For now, let's keep hardcoded Admin but use DB for Operators.
        if (credentials.role === 'admin') {
            if (credentials.password === 'admin123') {
                // 2FA Flow
                if (credentials.otp) {
                    // Step 2: Verify OTP
                    const res = await window.electronAPI.verifyOtp(credentials.otp);
                    if (res.success) {
                        const adminUser: User = {
                            id: 'admin-1',
                            username: 'admin',
                            name: 'System Administrator',
                            role: 'admin',
                            email: 'admin@sldj.lk',
                            avatar: ''
                        };
                        this.persistSession(adminUser);
                        return adminUser;
                    } else {
                        throw new Error(res.error || 'Invalid Verification Code');
                    }
                } else {
                    // Step 1: Trigger OTP
                    try {
                        // Hardcoded static admin number as per request
                        const staticAdminPhone = '0710157724';
                        const res = await window.electronAPI.sendOtp(staticAdminPhone);

                        if (res.success) {
                            // We throw to stop the "login success" flow, but with specific code
                            throw new Error('OTP_REQUIRED');
                        } else {
                            throw new Error(res.error || 'Failed to send verification code');
                        }
                    } catch (e: any) {
                        console.error("OTP System Error:", e);
                        if (e.message === 'OTP_REQUIRED') throw e;
                        // If e.message contains "No handler", it means Main process needs restart
                        throw new Error(`System Error: ${e.message || 'Could not send code'}`);
                    }
                }
            } else {
                throw new Error('Invalid password');
            }
        }

        // Operator Login via DB
        try {
            const dbUser = await window.electronAPI.verifyOperator({
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
        sessionStorage.removeItem('user_session');
        // Also clear legacy local storage if present
        localStorage.removeItem('user_session');
    }

    getUser(): User | null {
        // Switch to sessionStorage for non-persistent login (clears on app close)
        const stored = sessionStorage.getItem('user_session');
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
        sessionStorage.setItem('user_session', JSON.stringify(user));
    }
}

export const authService = new AuthService();
