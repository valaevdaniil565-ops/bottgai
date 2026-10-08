const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = entry.target.dataset.delay || 0;
      setTimeout(() => entry.target.classList.add('visible'), delay);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

if (!reduceMotion) {
  document.querySelectorAll('.magnetic').forEach(button => {
    button.addEventListener('mousemove', event => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate(${x * .08}px, ${y * .12}px)`;
    });
    button.addEventListener('mouseleave', () => button.style.transform = '');
  });
}

document.querySelectorAll('.diag-options button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.diag-options button').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    document.querySelector('.diag-result p').textContent = button.dataset.result;
  });
});

document.querySelectorAll('.price-row').forEach(row => {
  row.addEventListener('click', () => {
    document.querySelector('[name="service"]').value = row.dataset.service;
    document.querySelector('#contact').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });
});

const form = document.querySelector('#lead-form');
const status = form.querySelector('.form-status');

const nameInputs = form.querySelectorAll('[name="firstName"], [name="lastName"]');
nameInputs.forEach(input => {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/[^A-Za-zА-Яа-яЁё\s'’-]/g, '');
    input.classList.remove('invalid');
  });
});

const phoneInput = form.querySelector('[name="phone"]');
phoneInput.addEventListener('input', () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 15);
  phoneInput.classList.remove('invalid');
});

const contactInput = form.querySelector('[name="telegram"]');
contactInput.addEventListener('input', () => contactInput.classList.remove('invalid'));

form.addEventListener('submit', async event => {
  event.preventDefault();
  status.className = 'form-status';
  status.textContent = '';

  const required = [...form.querySelectorAll('[required]')];
  required.forEach(input => input.classList.toggle('invalid', !input.checkValidity()));
  if (!form.checkValidity()) {
    status.classList.add('error');
    const invalid = form.querySelector(':invalid');
    status.textContent = invalid?.validationMessage || 'Пожалуйста, проверьте обязательные поля.';
    invalid?.focus();
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  const original = button.querySelector('span').textContent;
  button.disabled = true;
  button.querySelector('span').textContent = 'Отправляем…';

  try {
    const data = Object.fromEntries(new FormData(form).entries());
    const response = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    form.reset();
    status.classList.add('success');
    status.textContent = 'Заявка отправлена. Скоро свяжемся с вами.';
  } catch (error) {
    status.classList.add('error');
    status.textContent = error.message || 'Не удалось отправить заявку.';
  } finally {
    button.disabled = false;
    button.querySelector('span').textContent = original;
  }
});
