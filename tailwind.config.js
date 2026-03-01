/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                surface: {
                    page: 'var(--color-surface-page)',
                    card: 'var(--color-surface-card)',
                    elevated: 'var(--color-surface-elevated)',
                    secondary: 'var(--color-surface-secondary)',
                    well: 'var(--color-surface-well)',
                },
                content: {
                    primary: 'var(--color-text-primary)',
                    secondary: 'var(--color-text-secondary)',
                    muted: 'var(--color-text-muted)',
                    faint: 'var(--color-text-faint)',
                },
                border: {
                    DEFAULT: 'var(--color-border-default)',
                    subtle: 'var(--color-border-subtle)',
                },
                accent: {
                    primary: 'var(--color-accent-primary)',
                    'primary-hover': 'var(--color-accent-primary-hover)',
                    coaching: 'var(--color-accent-coaching)',
                    'coaching-hover': 'var(--color-accent-coaching-hover)',
                    danger: 'var(--color-accent-danger)',
                    'danger-hover': 'var(--color-accent-danger-hover)',
                },
            },
            ringColor: {
                focus: 'var(--color-focus-ring)',
            },
        },
    },
    plugins: [],
}
