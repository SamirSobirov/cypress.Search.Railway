describe('Railway Product', () => {
  it('Search Flow - Railway', () => {
    cy.viewport(1280, 800);
    
    // Перехватываем запрос до начала действий
    cy.intercept('POST', '**/obtain-trains').as('railSearch');

    // 1. АВТОРИЗАЦИЯ
    cy.visit('https://test.globaltravel.space/sign-in'); 

    // Используем секреты, которые теперь корректно приходят из YAML
    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    
    // ПЕРЕХОД В ЖД
    cy.visit('https://test.globaltravel.space/railway');
    cy.url().should('include', '/railway');

    // 2. ОТКУДА
    cy.get('input[placeholder="Откуда"]').should('be.visible')
      .click({ force: true }).clear().type('ТАШКЕНТ СЕВЕРНЫЙ', { delay: 150 });
    
    cy.get('.p-listbox-item', { timeout: 10000 })
      .contains(/ТАШКЕНТ СЕВЕРНЫЙ/i).click({ force: true });
    
    // 3. КУДА
    cy.get('input[placeholder="Куда"]').should('be.visible')
      .click({ force: true }).clear().type('САМАРКАНД', { delay: 150 });

    cy.get('.p-listbox-item', { timeout: 10000 })
      .contains(/САМАРКАНД/i).click({ force: true });

    // 4. ДАТА 
    cy.get("input[placeholder='Когда']").click({ force: true });
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const dayToSelect = targetDate.getDate();

    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .contains(new RegExp(`^${dayToSelect}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');

    // 5. ПОИСК
    cy.get('button.easy-button.p-button-icon-only')
      .should('be.visible')
      .click({ force: true });

    // 6. ПРОВЕРКА РЕЗУЛЬТАТА
    // Сначала ждем появления билетов в интерфейсе
    cy.get('.ticket-card', { timeout: 40000 }).should('be.visible');

    // Теперь проверяем, что запрос прошел успешно (используем get вместо wait, чтобы не упасть из-за скорости)
    cy.get('@railSearch').then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
    });

    // Считаем карточки
    cy.get('.ticket-card:visible').then(($tickets) => {
      const count = $tickets.length;
      cy.log(`Найдено билетов: ${count}`);
      cy.writeFile('offers_count.txt', count.toString());
      expect(count).to.be.greaterThan(0);
    });
  });
});