import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className="theme-btn"
      onClick={toggleTheme}
      aria-label="Toggle dark/light theme"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
};

export default ThemeToggle;
