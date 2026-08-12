import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  isDarkMode: false,
  toggleTheme: () => {}
});

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('bargaincart_theme') === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('bargaincart_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);