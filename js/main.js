'use strict';

function initHeaderOffset() {
  const header = document.querySelector('.site-header');

  if (!header) {
    return;
  }

  const updateHeaderHeight = () => {
    document.documentElement.style.setProperty(
      '--header-height',
      `${header.offsetHeight}px`
    );
  };

  updateHeaderHeight();
  window.addEventListener('resize', updateHeaderHeight);
}

function initFavorites() {
  const favoriteButtons = document.querySelectorAll('.product-card__favorite');

  favoriteButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const isPressed = button.getAttribute('aria-pressed') === 'true';
      const nextState = !isPressed;

      button.setAttribute('aria-pressed', String(nextState));

      const icon = button.querySelector('.product-card__favorite-icon');
      if (icon) {
        icon.textContent = nextState ? '♥' : '♡';
      }

      button
        .closest('.product-card')
        .classList.toggle('product-card--selected', nextState);
    });
  });
}

function initCatalogFilters() {
  const form = document.getElementById('filters-form');
  const cards = document.querySelectorAll('.catalog-products .product-card');

  if (!form || cards.length === 0) {
    return;
  }

  const status = document.getElementById('catalog-status');
  const emptyMessage = document.getElementById('catalog-empty');

  const applyFilters = () => {
    const data = new FormData(form);

    const categories = data.getAll('category');
    const priceFrom = parseFloat(data.get('price-from'));
    const priceTo = parseFloat(data.get('price-to'));
    const onlyInStock = data.get('in-stock') === 'on';

    let visibleCount = 0;

    cards.forEach((card) => {
      const cardCategories = card.dataset.category.split(' ');
      const price = Number(card.dataset.price);
      const isInStock = card.dataset.stock !== 'out';

      const matchesCategory =
        categories.length === 0 ||
        categories.some((category) => cardCategories.includes(category));
      const matchesFrom = Number.isNaN(priceFrom) || price >= priceFrom;
      const matchesTo = Number.isNaN(priceTo) || price <= priceTo;
      const matchesStock = !onlyInStock || isInStock;

      const isVisible =
        matchesCategory && matchesFrom && matchesTo && matchesStock;

      card.hidden = !isVisible;

      if (isVisible) {
        visibleCount += 1;
      }
    });

    status.textContent = `Найдено товаров: ${visibleCount}`;
    emptyMessage.hidden = visibleCount !== 0;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    applyFilters();
  });

  form.addEventListener('input', applyFilters);

  form.addEventListener('reset', () => {
    setTimeout(applyFilters, 0);
  });

  applyFilters();
}

const ERROR_MESSAGES = {
  'order-name': {
    valueMissing: 'Введите имя.',
    tooShort: 'Имя должно содержать не менее 2 символов.'
  },
  'order-email': {
    valueMissing: 'Введите e-mail.',
    typeMismatch: 'Введите e-mail в формате example@mail.ru.'
  },
  'order-phone': {
    valueMissing: 'Введите телефон.',
    patternMismatch: 'Телефон должен быть в формате +7 (900) 000-00-00.'
  },
  'order-topic': {
    valueMissing: 'Выберите тему заявки.'
  },
  'order-agreement': {
    valueMissing: 'Необходимо согласие на обработку данных.'
  }
};

function getErrorMessage(field) {
  if (field.validity.valid) {
    return '';
  }

  const messages = ERROR_MESSAGES[field.id] || {};

  for (const errorType in messages) {
    if (field.validity[errorType]) {
      return messages[errorType];
    }
  }

  return field.validationMessage;
}

function initOrderDialog() {
  const orderDialog = document.getElementById('order-dialog');

  if (!orderDialog) {
    return;
  }

  const orderForm = document.getElementById('order-form');
  const orderButtons = document.querySelectorAll('.product-card__button[data-product]');
  const closeButtons = orderDialog.querySelectorAll('[data-close-dialog]');
  const selectedProductInput = document.getElementById('selected-product');
  const productLabel = document.getElementById('order-dialog-product');
  const topicSelect = document.getElementById('order-topic');
  const summary = document.getElementById('order-form-summary');
  const successMessage = document.getElementById('success-message');

  const validatedFields = Array.from(
    orderForm.querySelectorAll('[required], [pattern], [minlength]')
  );

  validatedFields.forEach((field) => {
    field.dataset.baseDescribedby = field.getAttribute('aria-describedby') || '';
  });

  let lastFocusedElement = null;

  
  function clearFieldError(field) {
    const errorElement = document.getElementById(`${field.id}-error`);
    const baseDescribedby = field.dataset.baseDescribedby;

    field.removeAttribute('aria-invalid');
    errorElement.textContent = '';
    errorElement.hidden = true;

    if (baseDescribedby) {
      field.setAttribute('aria-describedby', baseDescribedby);
    } else {
      field.removeAttribute('aria-describedby');
    }
  }

  function validateField(field) {
    const message = getErrorMessage(field);

    if (!message) {
      clearFieldError(field);
      return true;
    }

    const errorElement = document.getElementById(`${field.id}-error`);

    field.setAttribute('aria-invalid', 'true');
    errorElement.textContent = message;
    errorElement.hidden = false;
    field.setAttribute(
      'aria-describedby',
      [field.dataset.baseDescribedby, errorElement.id].filter(Boolean).join(' ')
    );

    return false;
  }

  function clearErrors() {
    validatedFields.forEach(clearFieldError);
    summary.hidden = true;
    summary.textContent = '';
  }

  validatedFields.forEach((field) => {
    field.addEventListener('blur', () => {
      if (field.type === 'checkbox') {
        return;
      }

      if (field.value !== '' || field.hasAttribute('aria-invalid')) {
        validateField(field);
      }
    });

    const revalidate = () => {
      if (field.hasAttribute('aria-invalid')) {
        validateField(field);
      }
    };

    field.addEventListener('input', revalidate);
    field.addEventListener('change', revalidate);
  });

  
  function openDialog(productName, triggerElement) {
    lastFocusedElement = triggerElement;

    selectedProductInput.value = productName;
    productLabel.textContent = productName;
    topicSelect.value = 'product';

    successMessage.hidden = true;
    clearErrors();

    document.body.classList.add('is-modal-open');
    orderDialog.showModal();
  }

  orderButtons.forEach((button) => {
    button.addEventListener('click', () => {
      openDialog(button.dataset.product, button);
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      orderDialog.close();
    });
  });

  let pressStartedOnBackdrop = false;

  orderDialog.addEventListener('mousedown', (event) => {
    pressStartedOnBackdrop = event.target === orderDialog;
  });

  orderDialog.addEventListener('click', (event) => {
    if (event.target === orderDialog && pressStartedOnBackdrop) {
      orderDialog.close();
    }
  });

  orderDialog.addEventListener('close', () => {
    document.body.classList.remove('is-modal-open');

    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  });

  
  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();

    let invalidCount = 0;
    let firstInvalidField = null;

    validatedFields.forEach((field) => {
      if (!validateField(field)) {
        invalidCount += 1;

        if (!firstInvalidField) {
          firstInvalidField = field;
        }
      }
    });

    if (invalidCount > 0) {
      summary.textContent = `Форма не отправлена. Исправьте ошибки: ${invalidCount}.`;
      summary.hidden = false;
      firstInvalidField.focus();
      return;
    }

    summary.hidden = true;
    lastFocusedElement = null;

    orderDialog.close();
    orderForm.reset();

    successMessage.hidden = false;
    successMessage.focus();
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  orderForm.addEventListener('reset', clearErrors);
}

initHeaderOffset();
initFavorites();
initCatalogFilters();
initOrderDialog();
