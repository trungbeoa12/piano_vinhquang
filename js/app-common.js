function createSnowflakes() {
  var container = document.getElementById('snowflakes');
  if (!container) return;
  var flakes = ['♪', '♫', '♩', '♬', '•'];
  var count = 18;

  for (var i = 0; i < count; i++) {
    var flake = document.createElement('div');
    flake.className = 'snowflake';
    flake.textContent = flakes[Math.floor(Math.random() * flakes.length)];
    flake.style.left = Math.random() * 100 + '%';
    flake.style.fontSize = Math.random() * 0.6 + 0.5 + 'rem';
    flake.style.opacity = Math.random() * 0.4 + 0.2;
    flake.style.animationDuration = Math.random() * 15 + 20 + 's';
    flake.style.animationDelay = Math.random() * 10 + 's';
    container.appendChild(flake);
  }
}

function initNavigation() {
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (!navToggle || !navLinks) return;

  navToggle.addEventListener('click', function () {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
  });

  document.querySelectorAll('.nav-links a').forEach(function (link) {
    link.addEventListener('click', function () {
      navToggle.classList.remove('active');
      navLinks.classList.remove('active');
    });
  });
}

function initGallery() {
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxClose = document.getElementById('lightboxClose');
  var lightboxPrev = document.getElementById('lightboxPrev');
  var lightboxNext = document.getElementById('lightboxNext');
  var galleryItems = document.querySelectorAll('.gallery-item');

  if (!lightbox || !galleryItems.length) return;

  var currentIndex = 0;
  var images = Array.from(galleryItems).map(function (item) {
    return item.querySelector('img').src;
  });

  function openLightbox(index) {
    currentIndex = index;
    lightboxImg.src = images[currentIndex];
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    lightboxImg.src = images[currentIndex];
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % images.length;
    lightboxImg.src = images[currentIndex];
  }

  galleryItems.forEach(function (item, index) {
    item.addEventListener('click', function () {
      openLightbox(index);
    });
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', showPrev);
  lightboxNext.addEventListener('click', showNext);

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPrev();
    if (e.key === 'ArrowRight') showNext();
  });
}

function initContactForm() {
  var form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var interestEl = document.getElementById('interest');
    var interestText = interestEl
      ? interestEl.options[interestEl.selectedIndex].text
      : '';
    alert(
      'Cảm ơn bạn! Chúng tôi đã nhận yêu cầu (' +
        interestText +
        ') và sẽ liên hệ tư vấn sớm nhất có thể.'
    );
    form.reset();
  });
}

window.PVQ_appCommon = {
  createSnowflakes: createSnowflakes,
  initNavigation: initNavigation,
  initGallery: initGallery,
  initContactForm: initContactForm,
};
