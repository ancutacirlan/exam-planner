describe('Gestionare examene', () => {
    beforeEach(() => {
      cy.loginWithToken(); // definește o comandă custom sau setează localStorage
      cy.visit('/exams');
    });
  
    it('Arată lista de examene', () => {
      cy.contains('Examene disponibile').should('exist');
    });
  
    it('Navighează către propunere examen', () => {
      cy.contains('Propune Examen').click();
      cy.url().should('include', '/exam/propose');
    });
  });