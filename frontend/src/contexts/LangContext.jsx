import { createContext, useContext, useState, useEffect } from 'react'

const LangContext = createContext()

export function LangProvider({ children }) {
    const [lang, setLang] = useState(() => {
        // Persist across sessions
        return localStorage.getItem('lang') || 'vi'
    })

    const switchLang = (l) => {
        setLang(l)
        localStorage.setItem('lang', l)
    }

    return (
        <LangContext.Provider value={{ lang, switchLang }}>
            {children}
        </LangContext.Provider>
    )
}

/** Hook — returns { lang, switchLang } */
export function useLang() {
    return useContext(LangContext)
}
