import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from './SettingsPage'

// Mock the context hooks and translation function
vi.mock('../contexts/LangContext', () => ({
    useLang: vi.fn(() => ({ lang: 'en', switchLang: vi.fn() }))
}))

vi.mock('../contexts/ThemeContext', () => ({
    useTheme: vi.fn(() => ({ theme: 'dark', setTheme: vi.fn() }))
}))

vi.mock('../i18n', () => ({
    t: vi.fn((key) => `mock_${key}`)
}))

// Mock Supabase to avoid errors during render
vi.mock('../supabaseClient', () => ({
    supabase: {
        auth: {
            resetPasswordForEmail: vi.fn()
        }
    }
}))

import { useLang } from '../contexts/LangContext'
import { useTheme } from '../contexts/ThemeContext'
import { t } from '../i18n'

describe('SettingsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        // Reset specific mock implementations before each test
        useLang.mockImplementation(() => ({
            lang: 'en',
            switchLang: vi.fn()
        }))
        useTheme.mockImplementation(() => ({
            theme: 'dark',
            setTheme: vi.fn()
        }))
    })

    it('renders settings page components correctly', () => {
        render(<SettingsPage />)

        // Check if the main title is rendered (using mock translation key)
        expect(screen.getByText('mock_set_title')).toBeInTheDocument()

        // Check if tabs are rendered
        expect(screen.getByText('mock_set_tab_profile')).toBeInTheDocument()
        expect(screen.getByText('mock_set_tab_notif')).toBeInTheDocument()
        expect(screen.getByText('mock_set_tab_appear')).toBeInTheDocument()
        expect(screen.getByText('mock_set_tab_sec')).toBeInTheDocument()
    })

    it('allows changing the language correctly', async () => {
        const user = userEvent.setup()
        const mockSwitchLang = vi.fn()
        useLang.mockImplementation(() => ({
            lang: 'en',
            switchLang: mockSwitchLang
        }))

        render(<SettingsPage />)

        // The language select element is the first combobox
        const selects = screen.getAllByRole('combobox')
        const langSelect = selects[0]
        expect(langSelect.value).toBe('en')

        // Change language to Vietnamese
        await user.selectOptions(langSelect, 'vi')

        expect(mockSwitchLang).toHaveBeenCalledWith('vi')
    })

    it('allows switching to appearance tab and changing theme', async () => {
        const user = userEvent.setup()
        const mockSetTheme = vi.fn()
        useTheme.mockImplementation(() => ({
            theme: 'dark',
            setTheme: mockSetTheme
        }))

        render(<SettingsPage />)

        // Switch to Appearance tab
        const appearanceTab = screen.getByText('mock_set_tab_appear')
        await user.click(appearanceTab)

        // Appearance tab details should now be visible
        expect(screen.getByText('mock_set_theme')).toBeInTheDocument()

        // Change theme to light
        const lightThemeButton = screen.getByText('mock_set_theme_light')
        await user.click(lightThemeButton)

        expect(mockSetTheme).toHaveBeenCalledWith('light')
    })
})
