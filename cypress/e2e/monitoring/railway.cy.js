describe('Railway Product', () => {
  it('Search Flow', () => {
    cy.viewport(1280, 800);
    
    // 1. Интерцепт API запроса (обновляем алиас для точности)
    cy.intercept('POST', '**/railway/offers**').as('railSearch');

    // 1. ЛОГИН 
    cy.visit('https://test.globaltravel.space/sign-in'); 

    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    cy.get('body').should('not.contain', 'Ошибка');

    // ПЕРЕХОД В ЖД
    cy.visit('https://test.globaltravel.space/railway');
    cy.url().should('include', '/railway');

    // 2. ОТКУДА
    cy.get('input[placeholder="Откуда"]').should('be.visible')
      .click({ force: true })
      .clear()
      .type('ТАШКЕНТ СЕВЕРНЫЙ', { delay: 200 });
    
    cy.get('.p-listbox-item', { timeout: 10000 })
      .contains(/ТАШКЕНТ СЕВЕРНЫЙ/i)
      .click({ force: true });
    
    cy.wait(1000); 

    // 3. КУДА
    cy.get('input[placeholder="Куда"]').should('be.visible')
      .click({ force: true })
      .clear()
      .type('САМАРКАНД', { delay: 250 });

    cy.get('.p-listbox-item', { timeout: 10000 })
      .contains(/САМАРКАНД/i)
      .click({ force: true });
    
    cy.wait(1000);

    // 4. ДАТА
    cy.get("input[placeholder='Когда']").click({ force: true });
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const dayToSelect = targetDate.getDate();

    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .contains(new RegExp(`^${dayToSelect}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');
    cy.wait(1000); 

    // 5. ПОИСК
    cy.get('button.easy-button.p-button-icon-only')
      .should('be.visible')
      .click({ force: true });

    // 6. ПРОВЕРКА РЕЗУЛЬТАТА
    // Сначала ждем ответа от сервера (интерцепт должен быть объявлен в начале теста)
    cy.wait('@railSearch', { timeout: 30000 });

    // Теперь ждем, когда эти данные превратятся в карточки на экране
    cy.get('.ticket-card', { timeout: 20000 }).should('be.visible');

    // Считаем карточки
    cy.get('.ticket-card').then(($tickets) => {
      const count = $tickets.length;
      cy.log(`Найдено билетов ЖД: ${count}`);

      // Записываем результат для Telegram
      cy.writeFile('offers_count.txt', count.toString());

      // Проверка на наличие билетов
      expect(count).to.be.greaterThan(0);
    });
  });
});