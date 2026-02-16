(function() {
  'use strict';

  if (typeof window.__app !== 'undefined') return;

  const app = window.__app = {
    state: {
      burgerOpen: false,
      formSubmitting: false
    }
  };

  const utils = {
    debounce(fn, delay) {
      let timer = null;
      return function() {
        const context = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(context, args), delay);
      };
    },

    throttle(fn, limit) {
      let inThrottle;
      return function() {
        const context = this, args = arguments;
        if (!inThrottle) {
          fn.apply(context, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    sanitizeInput(value) {
      const div = document.createElement('div');
      div.textContent = value;
      return div.innerHTML;
    }
  };

  const burger = {
    nav: null,
    toggle: null,
    navList: null,
    focusableEls: [],

    init() {
      this.nav = document.querySelector('.navbar-collapse, .c-nav__list');
      this.toggle = document.querySelector('.navbar-toggler, .c-nav__toggle');
      
      if (!this.nav || !this.toggle) return;

      this.navList = this.nav;
      this.bindEvents();
    },

    updateFocusables() {
      this.focusableEls = Array.from(
        this.navList.querySelectorAll('a[href], button')
      );
    },

    open() {
      app.state.burgerOpen = true;
      this.nav.classList.add('show');
      this.toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('u-no-scroll');
      this.updateFocusables();
      if (this.focusableEls.length) this.focusableEls[0].focus();
    },

    close() {
      app.state.burgerOpen = false;
      this.nav.classList.remove('show');
      this.toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('u-no-scroll');
    },

    bindEvents() {
      this.toggle.addEventListener('click', (e) => {
        e.preventDefault();
        app.state.burgerOpen ? this.close() : this.open();
      });

      document.addEventListener('click', (e) => {
        if (!app.state.burgerOpen) return;
        if (!this.nav.contains(e.target) && !this.toggle.contains(e.target)) {
          this.close();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (!app.state.burgerOpen) return;
        
        if (e.key === 'Escape') {
          this.close();
          this.toggle.focus();
        }

        if (e.key === 'Tab') {
          this.updateFocusables();
          if (this.focusableEls.length === 0) return;
          
          const first = this.focusableEls[0];
          const last = this.focusableEls[this.focusableEls.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });

      const links = this.navList.querySelectorAll('.nav-link, .c-nav__link');
      links.forEach(link => {
        link.addEventListener('click', () => this.close());
      });

      window.addEventListener('resize', utils.debounce(() => {
        if (window.innerWidth >= 1024 && app.state.burgerOpen) {
          this.close();
        }
      }, 200), { passive: true });
    }
  };

  const scrollSpy = {
    sections: [],
    links: [],

    init() {
      const navLinks = document.querySelectorAll('.nav-link[href^="#"], .c-nav__link[href^="#"]');
      
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.length > 1) {
          const section = document.querySelector(href);
          if (section) {
            this.sections.push({ id: href.substring(1), element: section, link });
            this.links.push(link);
          }
        }
      });

      if (this.sections.length === 0) return;

      window.addEventListener('scroll', utils.throttle(() => this.update(), 100), { passive: true });
      this.update();
    },

    update() {
      const scrollPos = window.pageYOffset + 100;

      let activeSection = null;

      for (const section of this.sections) {
        const top = section.element.offsetTop;
        const bottom = top + section.element.offsetHeight;

        if (scrollPos >= top && scrollPos < bottom) {
          activeSection = section;
        }
      }

      this.links.forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      });

      if (activeSection) {
        activeSection.link.classList.add('active');
        activeSection.link.setAttribute('aria-current', 'page');
      }
    }
  };

  const smoothScroll = {
    init() {
      const getHeaderHeight = () => {
        const header = document.querySelector('.l-header, header');
        return header ? header.offsetHeight : 72;
      };

      document.addEventListener('click', (e) => {
        let target = e.target;
        while (target && target.tagName !== 'A') {
          target = target.parentElement;
        }
        if (!target) return;

        const href = target.getAttribute('href');
        if (!href || href === '#') return;

        const hashIndex = href.indexOf('#');
        if (hashIndex === -1) return;

        const hash = href.substring(hashIndex + 1);
        if (!hash) return;

        const urlPart = href.substring(0, hashIndex);
        const currentPath = window.location.pathname;
        const isSamePage = urlPart === '' || urlPart === currentPath || 
          (urlPart === '/' && (currentPath === '/' || currentPath === '/index.html'));

        if (isSamePage) {
          const el = document.getElementById(hash);
          if (el) {
            e.preventDefault();
            const offset = getHeaderHeight();
            const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top: top, behavior: 'smooth' });
            history.replaceState(null, '', '#' + hash);
          }
        }
      });
    }
  };

  const forms = {
    validators: {
      name: /^[a-zA-ZÀ-ÿ\s-']{2,50}$/,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[\d\s+\-()]{10,20}$/,
      message: /^.{10,1000}$/
    },

    init() {
      const contactForm = document.getElementById('contactForm');
      if (contactForm) this.setupForm(contactForm);

      const newsletterForms = document.querySelectorAll('form:not(#contactForm)');
      newsletterForms.forEach(form => {
        if (form.querySelector('input[type="email"]')) {
          this.setupNewsletterForm(form);
        }
      });
    },

    setupForm(form) {
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.textContent : '';

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();

        this.clearErrors(form);

        const fields = {
          firstName: form.querySelector('#firstName, #contactName'),
          lastName: form.querySelector('#lastName'),
          email: form.querySelector('#email, #contactEmail'),
          phone: form.querySelector('#phone, #contactPhone'),
          message: form.querySelector('#message, #contactMessage'),
          privacy: form.querySelector('#privacy, #contactPrivacy')
        };

        let isValid = true;

        if (fields.firstName && !this.validators.name.test(fields.firstName.value.trim())) {
          this.showError(fields.firstName, 'Bitte geben Sie einen gültigen Namen ein (2-50 Zeichen)');
          isValid = false;
        }

        if (fields.lastName && !this.validators.name.test(fields.lastName.value.trim())) {
          this.showError(fields.lastName, 'Bitte geben Sie einen gültigen Nachnamen ein (2-50 Zeichen)');
          isValid = false;
        }

        if (fields.email && !this.validators.email.test(fields.email.value.trim())) {
          this.showError(fields.email, 'Bitte geben Sie eine gültige E-Mail-Adresse ein');
          isValid = false;
        }

        if (fields.phone && !this.validators.phone.test(fields.phone.value.trim())) {
          this.showError(fields.phone, 'Bitte geben Sie eine gültige Telefonnummer ein');
          isValid = false;
        }

        if (fields.message && !this.validators.message.test(fields.message.value.trim())) {
          this.showError(fields.message, 'Die Nachricht muss mindestens 10 Zeichen enthalten');
          isValid = false;
        }

        if (fields.privacy && !fields.privacy.checked) {
          this.showError(fields.privacy, 'Bitte akzeptieren Sie die Datenschutzbestimmungen');
          isValid = false;
        }

        if (!isValid) return;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Wird gesendet...';
        }

        setTimeout(() => {
          window.location.href = 'thank_you.html';
        }, 800);
      });
    },

    setupNewsletterForm(form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = form.querySelector('input[type="email"]');
        
        if (emailInput && this.validators.email.test(emailInput.value.trim())) {
          this.notify('Vielen Dank für Ihre Anmeldung!', 'success');
          form.reset();
        } else {
          this.notify('Bitte geben Sie eine gültige E-Mail-Adresse ein', 'danger');
        }
      });
    },

    showError(field, message) {
      field.classList.add('is-invalid');
      
      let errorDiv = field.parentElement.querySelector('.invalid-feedback');
      if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        field.parentElement.appendChild(errorDiv);
      }
      errorDiv.textContent = message;
      errorDiv.classList.add('d-block');
    },

    clearErrors(form) {
      const invalidFields = form.querySelectorAll('.is-invalid');
      invalidFields.forEach(field => field.classList.remove('is-invalid'));

      const errorMessages = form.querySelectorAll('.invalid-feedback');
      errorMessages.forEach(msg => msg.remove());
    },

    notify(message, type = 'info') {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = `alert alert-${type} alert-dismissible fade show`;
      toast.setAttribute('role', 'alert');
      toast.style.minWidth = '250px';
      toast.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;

      container.appendChild(toast);

      const closeBtn = toast.querySelector('.btn-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => toast.remove());
      }

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 150);
      }, 5000);
    }
  };

  const images = {
    init() {
      const images = document.querySelectorAll('img');

      images.forEach(img => {
        if (!img.classList.contains('img-fluid')) {
          img.classList.add('img-fluid');
        }

        const isLogo = img.classList.contains('c-logo__img');
        const isCritical = img.hasAttribute('data-critical');

        if (!img.hasAttribute('loading') && !isLogo && !isCritical) {
          img.setAttribute('loading', 'lazy');
        }

        img.addEventListener('error', () => {
          const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="#e9ecef" width="200" height="150"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#6c757d">Bild nicht verfügbar</text></svg>';
          const encoded = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
          img.src = encoded;
          img.style.objectFit = 'contain';
          if (isLogo) img.style.maxHeight = '40px';
        });
      });
    }
  };

  const activeMenu = {
    init() {
      const pathname = window.location.pathname;
      const links = document.querySelectorAll('.nav-link, .c-nav__link');

      links.forEach(link => {
        link.removeAttribute('aria-current');
        link.classList.remove('active');

        const href = link.getAttribute('href');
        if (!href) return;

        const linkPath = href.split('#')[0];

        if (pathname === linkPath || 
            (pathname === '/' && linkPath === '/') || 
            (pathname === '/index.html' && (linkPath === '/' || linkPath === '/index.html'))) {
          link.setAttribute('aria-current', 'page');
          link.classList.add('active');
        }
      });
    }
  };

  const modals = {
    init() {
      const privacyLinks = document.querySelectorAll('a[href*="privacy"]');
      
      privacyLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          const href = link.getAttribute('href');
          if (href && href.includes('privacy')) {
            if (!href.startsWith('http')) {
              e.preventDefault();
              window.location.href = href;
            }
          }
        });
      });
    }
  };

  const scrollToTop = {
    init() {
      const btn = document.querySelector('.c-button--outline, [data-scroll-top]');
      if (!btn) return;

      btn.addEventListener('click', (e) => {
        const href = btn.getAttribute('href');
        if (href === '#' || href === '#top') {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });

      window.addEventListener('scroll', utils.throttle(() => {
        if (window.pageYOffset > 300) {
          btn.classList.add('is-visible');
        } else {
          btn.classList.remove('is-visible');
        }
      }, 200), { passive: true });
    }
  };

  app.init = function() {
    if (this.initialized) return;
    this.initialized = true;

    burger.init();
    smoothScroll.init();
    scrollSpy.init();
    activeMenu.init();
    images.init();
    forms.init();
    modals.init();
    scrollToTop.init();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
  } else {
    app.init();
  }

})();