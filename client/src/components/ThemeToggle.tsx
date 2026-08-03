import { useTheme } from '../hooks/useTheme';

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
