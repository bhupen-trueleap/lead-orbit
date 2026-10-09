export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'leadorbit-theme'
const DARK_CLASS = 'dark'

export const themeScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark'){document.documentElement.classList.add('${DARK_CLASS}')}}catch(e){}})()`

const listeners = new Set<() => void>()

export function currentTheme(): Theme {
  return document.documentElement.classList.contains(DARK_CLASS)
    ? 'dark'
    : 'light'
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark')
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // storage unavailable; the choice just won't persist
  }
  for (const listener of listeners) listener()
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
