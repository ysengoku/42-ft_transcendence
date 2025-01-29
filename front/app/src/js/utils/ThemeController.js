export class ThemeController {
  static init() {
    const currentTheme = this.getTheme();
    document.documentElement.setAttribute('data-bs-theme', currentTheme);
  }

  static getTheme() {
    return localStorage.getItem('theme') || 'light';
  }

  static setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
  }

  static toggleTheme() {
    const newTheme = this.getTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  }
}
