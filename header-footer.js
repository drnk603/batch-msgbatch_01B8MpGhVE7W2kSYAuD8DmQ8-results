(function () {
  var header = document.querySelector('.dr-header');
  var burger = document.querySelector('.dr-burger');
  var menu = document.getElementById('dr-mobile-menu');
  if (!header || !burger || !menu) return;

  // ensure exactly 3 spans directly inside burger
  (function () {
    var kids = burger.children ? Array.prototype.slice.call(burger.children) : [];
    var ok = kids.length === 3 && kids.every(function (n) { return n && n.tagName === 'SPAN'; });
    if (!ok) burger.innerHTML = '<span></span><span></span><span></span>';
  })();

  function setOpen(open) {
    open = !!open;
    header.classList.toggle('dr-open', open);
    menu.classList.toggle('dr-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.style.overflow = open ? 'hidden' : '';
  }

  burger.addEventListener('click', function (e) {
    e.preventDefault();
    var isOpen = header.classList.contains('dr-open');
    setOpen(!isOpen);
  });

  menu.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  document.addEventListener('click', function (e) {
    if (!header.classList.contains('dr-open')) return;
    var t = e.target;
    if (header.contains(t) || menu.contains(t)) return;
    setOpen(false);
  });

  // init closed
  setOpen(false);

  var ys = document.querySelectorAll('.dr-year');
  if (ys && ys.length) {
    var y = String(new Date().getFullYear());
    for (var i = 0; i < ys.length; i++) ys[i].textContent = y;
  }
})();