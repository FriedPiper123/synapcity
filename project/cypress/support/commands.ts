// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Add custom commands here
Cypress.Commands.add('getByData', (selector) => {
  return cy.get(`[data-testid="${selector}"]`);
});

Cypress.Commands.add('waitForApi', (method, url) => {
  cy.intercept(method, url).as('apiCall');
  cy.wait('@apiCall');
});

declare global {
  namespace Cypress {
    interface Chainable {
      getByData(selector: string): Chainable<JQuery<HTMLElement>>;
      waitForApi(method: string, url: string): Chainable<void>;
    }
  }
} 