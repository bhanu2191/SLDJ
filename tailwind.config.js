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
                    light: '#ff6b66',
                    DEFAULT: '#E6231B', // Primary Red
                    dark: '#b0160f',
                },
                charcoal: {
                    DEFAULT: '#2D2E32', // Charcoal
                },
                accent: {
                    light: '#ffc1e3',
                    DEFAULT: '#f48fb1', // Keep existing or adjust? User didn't specify, keeping for now but Primary Red is dominant.
                    dark: '#bf5f82',
                },
                status: {
                    success: '#10b981', // Emerald Green
                    warning: '#f59e0b', // Amber/Yellow
                    danger: '#ef4444', // Soft Red (Standard danger)
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
