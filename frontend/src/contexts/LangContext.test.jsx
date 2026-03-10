import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LangProvider, useLang } from './LangContext'

// A small functional component to consume and test the context
function TestComponent() {
    const { lang, switchLang } = useLang()
    return (
        <div>
            <span data-testid="lang-value">{lang}</span>
            <button onClick={() => switchLang('en')}>Set EN</button>
            <button onClick={() => switchLang('vi')}>Set VI</button>
        </div>
    )
}

describe('LangContext', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('provides the default language (vi) when no localStorage value exists', () => {
        render(
            <LangProvider>
                <TestComponent />
            </LangProvider>
        )

        expect(screen.getByTestId('lang-value')).toHaveTextContent('vi')
    })

    it('reads the initial lang from localStorage', () => {
        localStorage.setItem('lang', 'en')

        render(
            <LangProvider>
                <TestComponent />
            </LangProvider>
        )

        expect(screen.getByTestId('lang-value')).toHaveTextContent('en')
    })

    it('updates the lang and localStorage when switchLang is called', async () => {
        const user = userEvent.setup()
        render(
            <LangProvider>
                <TestComponent />
            </LangProvider>
        )

        // Initially vi
        expect(screen.getByTestId('lang-value')).toHaveTextContent('vi')

        // Click to set en
        await user.click(screen.getByText('Set EN'))

        expect(screen.getByTestId('lang-value')).toHaveTextContent('en')
        expect(localStorage.getItem('lang')).toBe('en')
    })
})
