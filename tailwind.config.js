/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#ecfeff', // Cyan-50
                    100: '#cffafe', // Cyan-100
                    light: '#22d3ee', // Cyan-400
                    DEFAULT: '#0891b2', // Cyan-600 (Ocean Teal)
                    dark: '#155e75', // Cyan-800
                },
                charcoal: {
                    DEFAULT: '#1e293b', // Slate-800 (Softer than pure black)
                },
                accent: {
                    light: '#fdba74', // Orange-300
                    DEFAULT: '#f97316', // Orange-500 (Warm Coral/Orange)
                    dark: '#c2410c', // Orange-700
                },
                status: {
                    success: '#10b981', // Emerald Green
                    warning: '#f59e0b', // Amber/Yellow
                    danger: '#ef4444', // Soft Red
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
