describe('Railway Product', () => {
  it('Search Flow', () => {
    // Устанавливаем размер окна как в Авиа
    cy.viewport(1280, 800);
    
    // 1. Интерцепт API запроса
    cy.intercept('POST', '**/railway/offers**').as('railSearch');

   // 1. ЛОГИН 
    cy.visit('https://test.globaltravel.space/sign-in'); 

    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    
    cy.get('body').should('not.contain', 'Ошибка');

    // Ждем перехода на главную
    cy.url({ timeout: 40000 }).should('include', '/home');

    // ПЕРЕХОД В ЖД (Твоя новая структура)
    cy.visit('https://test.globaltravel.space/railway');
    cy.url().should('include', '/railway');

    // 2. ОТКУДА (С добавлением clear() и задержки из Авиа)
    cy.get('input[placeholder="Откуда"]').should('be.visible')
      .click({ force: true })
      .clear()
      .type('ТАШКЕНТ СЕВЕРНЫЙ', { delay: 200 });
    
    cy.get('.p-listbox-item', { timeout: 10000 })
      .contains(/ТАШКЕНТ СЕВЕРНЫЙ/i)
      .click({ force: true });
    
    cy.wait(1000); // Пауза как в Авиа для стабильности

    // 3. КУДА
    cy.get('input[placeholder="Куда"]').should('be.visible')
      .click({ force: true })
      .clear()
      .type('САМАРКАНД', { delay: 250 });

    cy.get('.p-listbox-item', { timeout: 10000 })
      .contains(/САМАРКАНД/i)
      .click({ force: true });
    
    cy.wait(1000);

    // 4. ДАТА (Логика выбора "Сегодня + 2 дня")
    cy.get("input[placeholder='Когда']").click({ force: true });
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const dayToSelect = targetDate.getDate();

    // Выбираем число (исключая соседние месяцы)
    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .contains(new RegExp(`^${dayToSelect}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');
    cy.wait(1000); 

    // 5. ПОИСК
    cy.get('button.easy-button.p-button-icon-only')
      .should('be.visible')
      .click({ force: true });

    // 6. ПРОВЕРКА РЕЗУЛЬТАТА И ЗАПИСЬ ДЛЯ TELEGRAM
    cy.wait('@railSearch', { timeout: 60000 }).then((interception) => {
      // Проверяем, что API ответило успешно
      expect(interception.response.statusCode).to.be.oneOf([200, 201]);

      const body = interception.response.body;
      
      // Поиск массива данных (универсальный как в Авиа)
      const offersList = body.offers || body.data || body.flights || (Array.isArray(body) ? body : []);
      const count = offersList.length;

      cy.log(`DEBUG: Found ${count} railway offers`);

      // ЗАПИСЫВАЕМ ЧИСЛО В ФАЙЛ ДЛЯ GITHUB ACTIONS
      cy.writeFile('offers_count.txt', count.toString());
      
      // Если билеты есть, проверяем, что они отрисовались
      if (count > 0) {
        // Убедись, что .offer-item — это правильный класс карточки ЖД билета
        cy.get('.offer-item', { timeout: 20000 }).should('exist');
      }
    });
  });
});