describe('Railway Product', () => {
  it('Search Flow - Railway', () => {
    cy.viewport(1280, 800);
    
    // Перехват запроса obtain-trains, который мы видели на скрине Network
    cy.intercept('POST', '**/obtain-trains').as('railSearch');

    // 1. АВТОРИЗАЦИЯ
    cy.visit('https://test.globaltravel.space/sign-in'); 

    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    
    // ПЕРЕХОД В ЖД
    cy.visit('https://test.globaltravel.space/railway');
    cy.url().should('include', '/railway');

    // 2. ЗАПОЛНЕНИЕ ПОЛЕЙ
    cy.get('input[placeholder="Откуда"]').should('be.visible')
      .click({ force: true }).clear().type('ТАШКЕНТ СЕВЕРНЫЙ', { delay: 100 });
    cy.get('.p-listbox-item').contains(/ТАШКЕНТ СЕВЕРНЫЙ/i).click({ force: true });
    
    cy.get('input[placeholder="Куда"]').should('be.visible')
      .click({ force: true }).clear().type('САМАРКАНД', { delay: 100 });
    cy.get('.p-listbox-item').contains(/САМАРКАНД/i).click({ force: true });

    // 3. ДАТА
    cy.get("input[placeholder='Когда']").click({ force: true });
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .contains(new RegExp(`^${targetDate.getDate()}$`))
      .click({ force: true });
    cy.get('body').type('{esc}');

    // 4. ПОИСК
    cy.get('button.easy-button.p-button-icon-only').should('be.visible').click({ force: true });

    // 5. УМНАЯ ПРОВЕРКА (Ждем карточки, затем проверяем API)
    cy.get('.ticket-card', { timeout: 40000 }).should('be.visible');

    // Проверяем статус API, если он уже завершился
    cy.get('@railSearch').then((xhr) => {
      if (xhr && xhr.response) {
        expect(xhr.response.statusCode).to.equal(200);
      }
    });

    // Считаем только видимые билеты (чтобы было 7, а не 10, если есть скрытые)
    cy.get('.ticket-card:visible').then(($tickets) => {
      const count = $tickets.length;
      cy.log(`Найдено реальных билетов: ${count}`);
      cy.writeFile('offers_count.txt', count.toString());
      expect(count).to.be.greaterThan(0);
    });
  });
});