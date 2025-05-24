describe('Setări - Perioade examinare', () => {
    beforeEach(() => {
      cy.loginWithToken();
      cy.visit('/settings');
    });
  
    it('Navighează la adăugare perioadă', () => {
      cy.contains('Adaugă perioadă').click();
      cy.url().should('include', '/settings/adaugare');
    });
  });