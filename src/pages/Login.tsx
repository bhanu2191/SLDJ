import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../context/AuthContext';
import { Shield, Users, ArrowRight } from 'lucide-react';
import Swal from 'sweetalert2';
import logo from '../assets/SLDJ_PNG.png';

// Cute & Short Alert Mixin (Clean White Style)
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    },
    customClass: {
        popup: 'rounded-2xl shadow-lg border border-gray-100' // Extra rounded for cuteness
    }
});

export function Login() {
    const [selectedRole, setSelectedRole] = useState<UserRole>('operator');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    // const [error, setError] = useState(''); // Removed local error state in favor of Alerts
    const { login, isLoading, error: contextError } = useAuth();
    const navigate = useNavigate();

    // Watch for 2FA requirement
    React.useEffect(() => {
        if (contextError === 'OTP_REQUIRED') {
            setShowOtpInput(true);
            Toast.fire({
                icon: 'success',
                title: 'Code Sent!',
                text: 'Check your mobile.'
            });
        } else if (contextError && contextError !== 'OTP_REQUIRED') {
            // Handle other errors via SMALL Toast
            Toast.fire({
                icon: 'error',
                title: 'Oops!',
                text: contextError
            });
        }
    }, [contextError]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: OTP Step
        if (showOtpInput) {
            if (!otp || otp.length !== 6) {
                Toast.fire({
                    icon: 'warning',
                    title: 'Invalid Code',
                    text: 'Please enter the 6-digit code sent to your mobile.'
                });
                return;
            }

            const success = await login({ role: selectedRole, password, otp });
            if (success) {
                Toast.fire({
                    icon: 'success',
                    title: 'Welcome Back!'
                });
                navigate(selectedRole === 'admin' ? '/admin' : '/operator');
            }
            return;
        }

        // Validation: Initial Login Step
        if (!password.trim()) {
            Toast.fire({
                icon: 'warning',
                title: 'Password Required',
                text: 'Please enter your password to continue.'
            });
            return;
        }

        // Standard Login
        const success = await login({ role: selectedRole, password });

        if (success) {
            Toast.fire({
                icon: 'success',
                title: 'Welcome!'
            });
            navigate(selectedRole === 'admin' ? '/admin' : '/operator');
        }
    };

    const handleBack = () => {
        setShowOtpInput(false);
        setOtp('');
    };

    return (
        <div className="min-h-screen flex bg-white">
            {/* Left Side - Hero / Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-charcoal text-white overflow-hidden">
                <div className="absolute inset-0 bg-primary/20 mix-blend-multiply z-10" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1500&q=80')] bg-cover bg-center opacity-40 z-0" />

                <div className="relative z-20 flex flex-col justify-between p-12 h-full w-full">
                    <div className="flex items-center gap-3">
                        <div className="p-1 bg-white rounded-xl shadow-lg inline-block">
                            <img src={logo} alt="SLDJ Logo" className="h-20 w-auto" />
                        </div>
                        <span className="text-3xl font-bold tracking-tight">SL Dream Japan</span>
                    </div>

                    <div className="space-y-6">
                        <h1 className="text-5xl font-extrabold leading-tight">
                            Build Your Future <br />
                            <span className="text-primary-light">In Japan</span>
                        </h1>
                        <p className="text-lg text-gray-300 max-w-md">
                            The premier institute for Japanese language education and cultural integration. Manage your journey with us.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>© 2026 SLDJ Institute</span>
                        <div className="h-1 w-1 rounded-full bg-gray-500" />
                        <span>Privacy Policy</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-gray-50 lg:bg-white">
                <div className="mx-auto w-full max-w-sm lg:max-w-md">
                    <div className="flex justify-center mb-8 lg:hidden">
                        <img src={logo} alt="SLDJ Logo" className="h-28 w-auto" />
                    </div>

                    <div className="text-center lg:text-left">
                        <h2 className="text-4xl font-extrabold text-gray-900">
                            {showOtpInput ? 'Two-Step Verification' : 'Welcome Back'}
                        </h2>
                        <p className="mt-1 text-m text-gray-600">
                            {showOtpInput
                                ? 'We sent a verification code to your mobile number.'
                                : 'Please sign in to access your dashboard.'}
                        </p>
                    </div>

                    <div className="mt-10">
                        <form onSubmit={handleLogin} className="space-y-6">

                            {!showOtpInput ? (
                                <>
                                    {/* Role Select */}
                                    <div>
                                        <label className="block text-s font-medium text-gray-700 mb-3">
                                            I am signing in as a:
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedRole('operator');
                                                    setPassword('');
                                                }}
                                                className={`relative flex flex-col items-center p-4 border rounded-xl transition-all duration-200 group ${selectedRole === 'operator'
                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                                                    : 'border-gray-200 hover:border-primary/50 hover:bg-primary/5'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-full mb-3 transition-colors ${selectedRole === 'operator' ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'
                                                    }`}>
                                                    <Users className="h-6 w-6" />
                                                </div>
                                                <span className={`font-semibold text-sm ${selectedRole === 'operator' ? 'text-primary-dark' : 'text-gray-800'
                                                    }`}>Operator</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedRole('admin');
                                                    setPassword('');
                                                }}
                                                className={`relative flex flex-col items-center p-4 border rounded-xl transition-all duration-200 group ${selectedRole === 'admin'
                                                    ? 'border-accent bg-accent/5 ring-1 ring-accent shadow-sm'
                                                    : 'border-gray-200 hover:border-accent/50 hover:bg-accent/5'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-full mb-3 transition-colors ${selectedRole === 'admin' ? 'bg-accent/20 text-accent' : 'bg-gray-100 text-gray-500 group-hover:bg-accent/10 group-hover:text-accent'
                                                    }`}>
                                                    <Shield className="h-6 w-6" />
                                                </div>
                                                <span className={`font-semibold text-sm ${selectedRole === 'admin' ? 'text-accent-dark' : 'text-gray-800'
                                                    }`}>Administrator</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Password input */}
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                            Password
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                id="password"
                                                name="password"
                                                type="password"
                                                autoComplete="off"
                                                spellCheck={false}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className={`appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition-all duration-200 ${selectedRole === 'admin'
                                                    ? 'focus:ring-accent'
                                                    : 'focus:ring-primary'
                                                    }`}
                                                placeholder="Enter your password"
                                            />
                                        </div>
                                    </div>

                                    {/* Mobile Number Input Removed (Static Admin Number Used) */}
                                </>
                            ) : (
                                <>
                                    {/* OTP Input */}
                                    <div>
                                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                                            Verification Code
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                id="otp"
                                                name="otp"
                                                type="text"
                                                autoComplete="one-time-code"
                                                required
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm text-center text-tracking-widest text-lg font-mono"
                                                placeholder="000 000"
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-center text-gray-500">
                                            Enter the 6-digit code sent to your mobile.
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* Error Block Removed in favor of SwAlert */}

                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] 
                                        ${isLoading
                                            ? 'bg-primary-dark cursor-not-allowed opacity-80'
                                            : selectedRole === 'admin'
                                                ? 'bg-accent hover:bg-accent-dark shadow-lg shadow-accent/30'
                                                : 'bg-primary hover:bg-primary-dark shadow-lg shadow-primary/30'
                                        }`}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {showOtpInput ? 'Verifying...' : 'Signing in...'}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            {showOtpInput ? 'Verify Code' : 'Continue'} <ArrowRight className="h-5 w-5" />
                                        </span>
                                    )}
                                </button>

                                {showOtpInput && (
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 font-medium"
                                    >
                                        Back to Login
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
