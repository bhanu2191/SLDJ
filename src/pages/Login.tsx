import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../context/AuthContext';
import { Shield, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/SLDJ_PNG.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import loginBg from '@/assets/login-bg.jpg';
import { ModeToggle } from '@/components/mode-toggle';

export function Login() {
    const [selectedRole, setSelectedRole] = useState<UserRole>('operator');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    const { login, isLoading, error: contextError } = useAuth();
    const navigate = useNavigate();

    // Check for existing session and redirect
    const { user } = useAuth();
    React.useEffect(() => {
        if (user) {
            navigate(user.role === 'admin' ? '/admin' : '/operator', { replace: true });
        }
    }, [user, navigate]);

    // Watch for 2FA requirement
    React.useEffect(() => {
        if (contextError === 'OTP_REQUIRED') {
            setShowOtpInput(true);
            toast.success('Code Sent!', {
                description: 'Check your mobile for the verification code.',
            });
        } else if (contextError && contextError !== 'OTP_REQUIRED') {
            toast.error('Authentication Failed', {
                description: contextError,
            });
        }
    }, [contextError]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: OTP Step
        if (showOtpInput) {
            if (!otp || otp.length !== 6) {
                toast.warning('Invalid Code', {
                    description: 'Please enter the 6-digit code sent to your mobile.'
                });
                return;
            }

            const success = await login({ role: selectedRole, password, otp });
            if (success) {
                toast.success('Welcome Back!');
                navigate(selectedRole === 'admin' ? '/admin' : '/operator', { replace: true });
            }
            return;
        }

        // Validation: Initial Login Step
        if (!password.trim()) {
            toast.warning('Password Required', {
                description: 'Please enter your password to continue.'
            });
            return;
        }

        // Standard Login
        const success = await login({ role: selectedRole, password });

        if (success) {
            toast.success('Welcome!');
            navigate(selectedRole === 'admin' ? '/admin' : '/operator', { replace: true });
        }
    };

    const handleBack = () => {
        setShowOtpInput(false);
        setOtp('');
    };

    return (
        <div className="min-h-screen flex bg-white overflow-hidden font-sans dark:bg-slate-950">
            {/* Left Side - Premium Hero / Branding */}
            <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="hidden lg:flex lg:w-[55%] relative bg-[#0F172A] text-white overflow-hidden items-center justify-center"
            >
                {/* Dynamic Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black z-10 opacity-90" />
                <motion.div
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
                    className="absolute inset-0 bg-cover bg-center opacity-40 z-0"
                    style={{ backgroundImage: `url(${loginBg})` }}
                />

                <div className="relative z-20 flex flex-col justify-between h-full w-full p-16">
                    {/* Header Logo */}
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-1 rounded-2xl shadow-lg">
                            <img src={logo} alt="SLDJ Logo" className="h-12 w-auto" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold tracking-tight text-white">SL DREAM</h3>
                            <p className="text-xs text-blue-200 tracking-[0.2em] uppercase">Japan</p>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="space-y-6 max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                        >
                            <span className="inline-block py-1 px-3 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-6">
                                Official Management Portal
                            </span>
                            <h1 className="text-6xl font-black leading-tight tracking-tight mb-6 text-white">
                                Build Your Future <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">
                                    In Japan
                                </span>
                            </h1>
                            <div className="flex border-l-4 border-red-600 pl-6 py-1">
                                <p className="text-lg text-slate-300 leading-relaxed font-light max-w-lg">
                                    Experience seamless student management and operational excellence with the SL Dream Japan official platform.
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
                        <span>© 2026 SL Dream Japan (Pvt) Ltd</span>
                        <div className="h-1 w-1 rounded-full bg-slate-700" />
                        <span>Privacy Policy</span>
                        <div className="h-1 w-1 rounded-full bg-slate-700" />
                        <span>Terms of Service</span>
                    </div>
                </div>
            </motion.div>

            {/* Right Side - Clean Login Form */}
            <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-16 xl:px-24 bg-white relative dark:bg-slate-950">
                <div className="absolute top-4 right-4">
                    <ModeToggle />
                </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-full max-w-md space-y-8"
                >
                    <div className="text-center lg:text-left space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {showOtpInput ? 'Two-Factor Authentication' : 'Welcome Back'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            {showOtpInput
                                ? 'Enter the 6-digit code sent to your device.'
                                : 'Please enter your credentials to access the account.'}
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6 mt-8">
                        <AnimatePresence mode="wait">
                            {!showOtpInput ? (
                                <motion.div
                                    key="login-step"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-6"
                                >
                                    {/* Role Select */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedRole('operator');
                                                setPassword('');
                                            }}
                                            className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 outline-none ${selectedRole === 'operator'
                                                ? 'border-blue-600 bg-blue-50/50 shadow-sm dark:bg-blue-500/10'
                                                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900/50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className={`p-2 rounded-lg ${selectedRole === 'operator' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                    <Users className="h-5 w-5" />
                                                </div>
                                                {selectedRole === 'operator' && (
                                                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                                )}
                                            </div>
                                            <span className={`block font-semibold ${selectedRole === 'operator' ? 'text-blue-900 dark:text-blue-300' : 'text-slate-900 dark:text-slate-200'
                                                }`}>Operator</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">Daily operations</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedRole('admin');
                                                setPassword('');
                                            }}
                                            className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 outline-none ${selectedRole === 'admin'
                                                ? 'border-amber-500 bg-amber-50/50 shadow-sm dark:bg-amber-500/10'
                                                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900/50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className={`p-2 rounded-lg ${selectedRole === 'admin' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                    <Shield className="h-5 w-5" />
                                                </div>
                                                {selectedRole === 'admin' && (
                                                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                                                )}
                                            </div>
                                            <span className={`block font-semibold ${selectedRole === 'admin' ? 'text-amber-900 dark:text-amber-300' : 'text-slate-900 dark:text-slate-200'
                                                }`}>Administrator</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">Full access control</span>
                                        </button>
                                    </div>

                                    {/* Password Input */}
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="dark:text-slate-300">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all text-lg dark:bg-slate-900 dark:border-slate-800 dark:text-white dark:focus:bg-slate-950 dark:placeholder:text-slate-600"
                                            placeholder="••••••••••••"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="otp-step"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-6"
                                >
                                    {/* OTP Input */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                    >
                                        <div className="grid gap-4 place-items-center">
                                            <label htmlFor="otp" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                Verification Code
                                            </label>
                                            <InputOTP
                                                maxLength={6}
                                                value={otp}
                                                onChange={(val) => setOtp(val)}
                                            >
                                                <InputOTPGroup className="gap-2">
                                                    {Array.from({ length: 6 }).map((_, index) => (
                                                        <InputOTPSlot
                                                            key={index}
                                                            index={index}
                                                            className="h-14 w-12 text-2xl font-bold border-2 rounded-lg border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                                                        />
                                                    ))}
                                                </InputOTPGroup>
                                            </InputOTP>
                                            <p className="text-xs text-center text-muted-foreground mt-2">
                                                Enter the 6-digit code sent to your mobile.
                                            </p>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full h-12 text-base font-semibold shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] ${selectedRole === 'admin'
                                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 text-white'
                                    }`}
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        {showOtpInput ? 'Verify & Login' : 'Continue'} <ArrowRight className="h-5 w-5" />
                                    </span>
                                )}
                            </Button>

                            {showOtpInput && (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="mt-6 w-full text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
                                >
                                    ← Back to Role Selection
                                </button>
                            )}
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
