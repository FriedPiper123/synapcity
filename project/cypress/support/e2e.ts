// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom commands for testing
Cypress.Commands.add('login', () => {
  // Mock login for testing - in real app this would handle Google Sign-In
  cy.window().then((win) => {
    win.localStorage.setItem('auth_token', 'mock-token');
    win.localStorage.setItem('auth_token_expiry', String(Date.now() + 3600000));
  });
});

Cypress.Commands.add('createPost', (content: string, type = 'issue', category = 'General') => {
  cy.visit('/create');
  cy.get('textarea').type(content);
  cy.get('select').first().select(type);
  cy.get('select').eq(1).select(category);
  cy.get('input[type="number"]').first().type('40.7128');
  cy.get('input[type="number"]').eq(1).type('-74.0060');
  cy.get('button[type="submit"]').click();
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
      createPost(content: string, type?: string, category?: string): Chainable<void>;
    }
  }
} 