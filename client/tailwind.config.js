/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                finmind: {
                    background: '#0f172a', // Slate 900
                    card: '#1e293b',       // Slate 800
                    primary: '#00f3ff',    // Neon Cyan
                    secondary: '#ff00ff',  // Neon Pink
                    success: '#10b981',
                    warning: '#f59e0b',
                    text: '#e2e8f0',     // Slate 200
                    muted: '#94a3b8',    // Slate 400
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
