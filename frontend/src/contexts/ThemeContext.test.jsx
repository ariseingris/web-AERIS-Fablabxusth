import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from './ThemeContext'

// A small functional component to consume and test the context
function TestComponent() {
    const { theme, setTheme } = useTheme()
    return (
        <div>
            <span data-testid="theme-value">{theme}</span>
            <button onClick={() => setTheme('light')}>Set Light</button>
            <button onClick={() => setTheme('dark')}>Set Dark</button>
            <button onClick={() => setTheme('system')}>Set System</button>
        </div>
    )
}

describe('ThemeContext', () => {
    beforeEach(() => {
        localStorage.clear()
        document.body.className = ''
        vi.clearAllMocks()

        // Mock window.matchMedia
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false, // Default to light mode for system matching
                media: query,
                onchange: null,
                addListener: vi.fn(), // Deprecated
                removeListener: vi.fn(), // Deprecated
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        })
    })

    it('provides the default theme (dark) when no localStorage value exists', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        expect(screen.getByTestId('theme-value')).toHaveTextContent('dark')
        // Body should NOT have the light-theme class
        expect(document.body.classList.contains('light-theme')).toBe(false)
    })

    it('reads the initial theme from localStorage', () => {
        localStorage.setItem('appTheme', 'light')

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        expect(screen.getByTestId('theme-value')).toHaveTextContent('light')
        expect(document.body.classList.contains('light-theme')).toBe(true)
    })

    it('updates the theme, localStorage, and body class when a new theme is set', async () => {
        const user = userEvent.setup()
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        // Initially dark
        expect(screen.getByTestId('theme-value')).toHaveTextContent('dark')

        // Click to set light
        await user.click(screen.getByText('Set Light'))

        expect(screen.getByTestId('theme-value')).toHaveTextContent('light')
        expect(localStorage.getItem('appTheme')).toBe('light')
        expect(document.body.classList.contains('light-theme')).toBe(true)
    })

    it('adds light-theme class for system mode if prefers-color-scheme is light', async () => {
        const user = userEvent.setup()
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        await user.click(screen.getByText('Set System'))

        expect(screen.getByTestId('theme-value')).toHaveTextContent('system')
        // Because our mock matches=false for dark (so it's light mode), it should apply the light-theme body class
        expect(document.body.classList.contains('light-theme')).toBe(true)
    })
})
