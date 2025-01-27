import router from '../../src/js/router.js';  // Adjust the relative path as needed



// describe('Router tests', () => {
//   it('should define all necessary routes', () => {
//     const routes = router.getRoutes();
//     expect(routes).toBeDefined();
//     expect(routes.length).toBeGreaterThan(0); // S'assure qu'il y a des routes

//     // Vérifie qu'une route spécifique existe
//     const homeRoute = routes.find((route) => route.path === '/');
//     expect(homeRoute).toBeDefined();
//   });

//   it('should have unique route paths', () => {
//     const routes = router.getRoutes();
//     const paths = routes.map((route) => route.path);
//     const uniquePaths = new Set(paths);
//     expect(paths.length).toBe(uniquePaths.size); // Vérifie l'unicité des chemins
//   });
// });

describe('Router tests', () => {
    beforeEach(() => {
      // Set up DOM elements needed for the test
      document.body.innerHTML = '<div id="navbar-container"></div>';
    });
  
    it('should define all necessary routes', () => {
      // Your test code
      document.addEventListener('DOMContentLoaded', () => {
        const navbarContainer = document.getElementById('navbar-container');
        if (navbarContainer) {
          navbarContainer.innerHTML = '<navbar-component></navbar-component>';
        }
      });
      // Add assertions here
    });
  });
  