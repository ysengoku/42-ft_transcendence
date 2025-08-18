export class ThemeController {
  static #themes = ['light', 'dark'];

  static init() {
    const currentTheme = this.getTheme();
    this.setTheme(currentTheme);
  }

  static getTheme() {
    const storedTheme = localStorage.getItem('theme');
    return this.#themes.includes(storedTheme) ? storedTheme : 'light';
  }

  static setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
  }

  static toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  }
}
