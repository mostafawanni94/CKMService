'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/* ─────────────────────── TYPES ─────────────────────── */

type Lang = 'en' | 'nl';

interface Slide {
  image: string;
  titleLine1: string;
  titleHighlight: string;
  description: string;
  cta1: { label: string; href: string };
  cta2: { label: string; href: string };
}

/* ─────────────────────── DATA ─────────────────────── */

const SLIDES: Slide[] = [
  {
    image: '/images/hero-office.png',
    titleLine1: 'Professional Office',
    titleHighlight: 'Cleaning',
    description:
      'Create a productive, healthy work environment with our thorough and reliable office cleaning solutions.',
    cta1: { label: 'Our Services', href: '#services' },
    cta2: { label: 'Learn More →', href: '#about' },
  },
  {
    image: '/images/hero-industrial.png',
    titleLine1: 'Industrial Cleaning',
    titleHighlight: 'Experts',
    description:
      'Specialized cleaning for factories, production halls and industrial environments with certified equipment.',
    cta1: { label: 'Get a Quote', href: '#contact' },
    cta2: { label: 'Services →', href: '#services' },
  },
  {
    image: '/images/hero-office.png',
    titleLine1: 'Window Cleaning',
    titleHighlight: 'Specialists',
    description:
      'Crystal-clear windows for your business premises. Professional interior and exterior window cleaning.',
    cta1: { label: 'Contact Us', href: '#contact' },
    cta2: { label: 'Services →', href: '#services' },
  },
];

const SERVICES = [
  {
    icon: '🏢',
    title: { en: 'Office Cleaning', nl: 'Kantoor Reiniging' },
    description: {
      en: 'Daily, weekly or periodic cleaning of office spaces, workstations, kitchens and meeting rooms. A fresh office for your team every day.',
      nl: 'Dagelijkse, wekelijkse of periodieke reiniging van kantoorruimtes, werkplekken, keukens en vergaderzalen.',
    },
  },
  {
    icon: '🏭',
    title: { en: 'Industrial Cleaning', nl: 'Industriële Reiniging' },
    description: {
      en: 'Specialized cleaning for factories, warehouses and production facilities with professional-grade equipment meeting highest hygiene standards.',
      nl: 'Gespecialiseerde reiniging voor fabrieken, magazijnen en productieruimtes met professionele apparatuur.',
    },
  },
  {
    icon: '🪟',
    title: { en: 'Window Cleaning', nl: 'Glazenwassen' },
    description: {
      en: 'Crystal-clear windows for your business premises. Professional interior and exterior window cleaning for buildings of all sizes.',
      nl: 'Kristalheldere ramen voor uw bedrijfspand. Professionele raamreiniging voor gebouwen van elke omvang.',
    },
  },
];

const WHY_CARDS = [
  {
    icon: '✓',
    title: { en: 'Certified & Insured', nl: 'Gecertificeerd & Verzekerd' },
    desc: {
      en: 'Fully insured and certified team. Peace of mind with every service we deliver.',
      nl: 'Volledig verzekerd en gecertificeerd team. Gemoedsrust bij elke dienst.',
    },
  },
  {
    icon: '⚡',
    title: { en: 'Fast & Reliable', nl: 'Snel & Betrouwbaar' },
    desc: {
      en: 'We show up on time, every time. Our commitment to reliability sets us apart.',
      nl: 'We komen altijd op tijd. Onze toewijding aan betrouwbaarheid onderscheidt ons.',
    },
  },
  {
    icon: '🌿',
    title: { en: 'Eco-Friendly', nl: 'Milieuvriendelijk' },
    desc: {
      en: 'We use sustainable, eco-friendly cleaning products that are safe for people and planet.',
      nl: 'We gebruiken duurzame, milieuvriendelijke schoonmaakproducten.',
    },
  },
];

const STATS = [
  { value: '150+', label: { en: 'Happy Clients', nl: 'Tevreden Klanten' } },
  { value: '10K+', label: { en: 'Hours Cleaned', nl: 'Schoonmaakuren' } },
  { value: '25+', label: { en: 'Team Members', nl: 'Teamleden' } },
  { value: '99%', label: { en: 'Satisfaction', nl: 'Tevredenheid' } },
];

const T = {
  en: {
    home: 'Home', services: 'Services', about: 'About Us',
    projects: 'Projects', contact: 'Contact', portal: 'Portal Login',
    getQuote: 'Get a Quote',
    whatWeOffer: 'WHAT WE OFFER', ourServices: 'Our Cleaning Services',
    ourServicesDesc: 'From daily office maintenance to deep industrial cleaning — we have the expertise and equipment for every environment.',
    whyUs: 'WHY CHOOSE US', whyTitle: 'The CKM Difference',
    aboutBadge: 'ABOUT CKM SERVICES', aboutTitle: 'Cleaning You Can Trust',
    aboutP1: 'CKM Services is a dedicated professional cleaning company focused on delivering spotless results for businesses of all sizes. We believe that a clean environment is the foundation for productivity, health and well-being.',
    aboutP2: 'As a young company with a passion for excellence, we bring fresh energy, modern methods and genuine care to every cleaning assignment. Our team is trained, insured and committed to exceeding your expectations.',
    aboutBtn: 'Learn More About Us',
    ctaBadge: 'GET IN TOUCH', ctaTitle: 'Ready for a Spotless Space?',
    ctaDesc: 'Get in touch for a free, no-obligation quote tailored to your needs. We would love to help make your space shine.',
    ctaBtn: 'Request a Free Quote →',
    quickLinks: 'Quick Links', ourServicesFooter: 'Our Services', contactInfo: 'Contact Info',
  },
  nl: {
    home: 'Home', services: 'Diensten', about: 'Over Ons',
    projects: 'Projecten', contact: 'Contact', portal: 'Portaal Login',
    getQuote: 'Offerte Aanvragen',
    whatWeOffer: 'WAT WIJ BIEDEN', ourServices: 'Onze Schoonmaakdiensten',
    ourServicesDesc: 'Van dagelijks kantooronderhoud tot diepgaande industriële reiniging — wij hebben de expertise en apparatuur voor elke omgeving.',
    whyUs: 'WAAROM CKM', whyTitle: 'Het CKM Verschil',
    aboutBadge: 'OVER CKM SERVICES', aboutTitle: 'Schoonmaak Die U Kunt Vertrouwen',
    aboutP1: 'CKM Services is een toegewijd professioneel schoonmaakbedrijf gericht op het leveren van vlekkeloze resultaten voor bedrijven van elke omvang.',
    aboutP2: 'Als jong bedrijf met een passie voor uitmuntendheid brengen wij frisse energie, moderne methoden en oprechte zorg bij elke schoonmaakopdracht.',
    aboutBtn: 'Meer Over Ons',
    ctaBadge: 'NEEM CONTACT OP', ctaTitle: 'Klaar voor een Vlekkeloze Ruimte?',
    ctaDesc: 'Neem contact op voor een gratis, vrijblijvende offerte op maat. Wij helpen graag uw ruimte te laten stralen.',
    ctaBtn: 'Vraag een Gratis Offerte Aan →',
    quickLinks: 'Snelle Links', ourServicesFooter: 'Onze Diensten', contactInfo: 'Contactgegevens',
  },
};

/* ─────────────────────── HOOKS ─────────────────────── */

/** Intersection Observer hook for scroll-reveal animations */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/* ─────────────────────── COMPONENT ─────────────────────── */

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [lang, setLang] = useState<Lang>('en');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const t = T[lang];

  /* Reveal refs */
  const statsRef = useReveal();
  const servicesRef = useReveal();
  const whyRef = useReveal();
  const aboutLeftRef = useReveal();
  const aboutRightRef = useReveal();
  const ctaRef = useReveal();

  /* Slider controls */
  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrentSlide(index);
      setTimeout(() => setIsTransitioning(false), 1000);
    },
    [isTransitioning]
  );

  const nextSlide = useCallback(
    () => goToSlide((currentSlide + 1) % SLIDES.length),
    [currentSlide, goToSlide]
  );

  const prevSlide = useCallback(
    () => goToSlide((currentSlide - 1 + SLIDES.length) % SLIDES.length),
    [currentSlide, goToSlide]
  );

  /* Auto-advance slides */
  useEffect(() => {
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  /* Scroll detection for navbar */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="ckm-page">
      {/* ─── NAVBAR ─── */}
      <nav className={`ckm-nav ${scrolled ? 'ckm-nav-scrolled' : ''}`}>
        <div className="ckm-nav-inner">
          <a href="#" className="ckm-logo">
            <Image
              src="/images/ckm-logo.png"
              alt="CKM Services Logo"
              width={42}
              height={42}
              className="ckm-logo-img"
              priority
            />
            <span className="ckm-logo-text">
              <span className="ckm-logo-ckm">CKM</span>
              <span className="ckm-logo-services">Services</span>
            </span>
          </a>

          <div className="ckm-nav-links">
            <a href="#">{t.home}</a>
            <a href="#services">{t.services}</a>
            <a href="#about">{t.about}</a>
            <a href="#contact">{t.contact}</a>
            <Link href="/login">{t.portal}</Link>
          </div>

          <div className="ckm-nav-right">
            <div className="ckm-lang-toggle">
              <button
                className={`ckm-lang-btn ${lang === 'nl' ? 'active' : ''}`}
                onClick={() => setLang('nl')}
              >
                NL
              </button>
              <button
                className={`ckm-lang-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => setLang('en')}
              >
                EN
              </button>
            </div>
            <a href="#contact" className="ckm-btn ckm-btn-primary">
              {t.getQuote}
            </a>
            <button
              className="ckm-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span className={mobileMenuOpen ? 'open' : ''} />
              <span className={mobileMenuOpen ? 'open' : ''} />
              <span className={mobileMenuOpen ? 'open' : ''} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="ckm-mobile-menu">
            <a href="#" onClick={() => setMobileMenuOpen(false)}>{t.home}</a>
            <a href="#services" onClick={() => setMobileMenuOpen(false)}>{t.services}</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)}>{t.about}</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)}>{t.contact}</a>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>{t.portal}</Link>
          </div>
        )}
      </nav>

      {/* ─── HERO SLIDER ─── */}
      <section className="ckm-hero">
        {SLIDES.map((slide, i) => (
          <div key={i} className={`ckm-hero-slide ${i === currentSlide ? 'active' : ''}`}>
            <Image
              src={slide.image}
              alt={slide.titleLine1}
              fill
              style={{ objectFit: 'cover' }}
              priority={i === 0}
            />
            <div className="ckm-hero-overlay" />
            <div className="ckm-hero-content">
              <h1>
                {slide.titleLine1}
                <br />
                <span className="ckm-highlight">{slide.titleHighlight}</span>
              </h1>
              <p>{slide.description}</p>
              <div className="ckm-hero-btns">
                <a href={slide.cta1.href} className="ckm-btn ckm-btn-primary">
                  {slide.cta1.label}
                </a>
                <a href={slide.cta2.href} className="ckm-btn ckm-btn-outline-light">
                  {slide.cta2.label}
                </a>
              </div>
            </div>
          </div>
        ))}

        <button className="ckm-hero-arrow ckm-hero-arrow-left" onClick={prevSlide} aria-label="Previous slide">
          ‹
        </button>
        <button className="ckm-hero-arrow ckm-hero-arrow-right" onClick={nextSlide} aria-label="Next slide">
          ›
        </button>

        <div className="ckm-hero-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`ckm-hero-dot ${i === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <div className="ckm-stats-bar" ref={statsRef}>
        <div className="ckm-stats-inner ckm-reveal ckm-stagger">
          {STATS.map((stat, i) => (
            <div key={i} className="ckm-stat">
              <div className="ckm-stat-number">{stat.value}</div>
              <div className="ckm-stat-label">{stat.label[lang]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── SERVICES ─── */}
      <section id="services" className="ckm-section ckm-section-light">
        <div className="ckm-container" ref={servicesRef}>
          <div className="ckm-section-header ckm-reveal">
            <span className="ckm-badge">{t.whatWeOffer}</span>
            <h2>{t.ourServices}</h2>
            <p>{t.ourServicesDesc}</p>
          </div>

          <div className="ckm-services-grid ckm-stagger">
            {SERVICES.map((service, i) => (
              <div key={i} className="ckm-service-card ckm-reveal">
                <div className="ckm-service-icon">{service.icon}</div>
                <h3>{service.title[lang]}</h3>
                <p>{service.description[lang]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY CHOOSE US ─── */}
      <section className="ckm-section ckm-section-white" ref={whyRef}>
        <div className="ckm-container">
          <div className="ckm-section-header ckm-reveal">
            <span className="ckm-badge">{t.whyUs}</span>
            <h2>{t.whyTitle}</h2>
          </div>

          <div className="ckm-why-grid ckm-stagger">
            {WHY_CARDS.map((card, i) => (
              <div key={i} className="ckm-why-card ckm-reveal">
                <div className="ckm-why-icon">{card.icon}</div>
                <h3>{card.title[lang]}</h3>
                <p>{card.desc[lang]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ABOUT ─── */}
      <section id="about" className="ckm-section ckm-section-light">
        <div className="ckm-container">
          <div className="ckm-about-grid">
            <div className="ckm-about-image ckm-reveal-left" ref={aboutLeftRef}>
              <Image
                src="/images/team-photo.png"
                alt="CKM Services Team"
                width={560}
                height={420}
                style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
              />
            </div>
            <div className="ckm-about-content ckm-reveal-right" ref={aboutRightRef}>
              <span className="ckm-badge">{t.aboutBadge}</span>
              <h2>{t.aboutTitle}</h2>
              <p>{t.aboutP1}</p>
              <p>{t.aboutP2}</p>
              <a href="#contact" className="ckm-btn ckm-btn-primary">
                {t.aboutBtn}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CONTACT CTA ─── */}
      <section id="contact" className="ckm-section ckm-section-cta" ref={ctaRef}>
        <div className="ckm-container">
          <div className="ckm-cta-content ckm-reveal">
            <span className="ckm-badge ckm-badge-light">{t.ctaBadge}</span>
            <h2>{t.ctaTitle}</h2>
            <p>{t.ctaDesc}</p>

            <div className="ckm-contact-row">
              <div className="ckm-contact-item">
                <div className="ckm-contact-icon">✉️</div>
                <span>info@ckmservices.nl</span>
              </div>
              <div className="ckm-contact-item">
                <div className="ckm-contact-icon">📞</div>
                <span>+31 (0)85 123 4567</span>
              </div>
              <div className="ckm-contact-item">
                <div className="ckm-contact-icon">📍</div>
                <span>Netherlands</span>
              </div>
            </div>

            <a href="mailto:info@ckmservices.nl" className="ckm-btn ckm-btn-outline-dark" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
              {t.ctaBtn}
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="ckm-footer">
        <div className="ckm-container">
          <div className="ckm-footer-grid">
            <div className="ckm-footer-brand">
              <Image
                src="/images/ckm-logo.png"
                alt="CKM Services"
                width={36}
                height={36}
                className="ckm-footer-logo"
              />
              <p>
                CKM Services — Professional cleaning solutions for offices, industrial spaces, and
                commercial buildings across the Netherlands.
              </p>
            </div>

            <div>
              <h4>{t.quickLinks}</h4>
              <ul className="ckm-footer-links">
                <li><a href="#">→ {t.home}</a></li>
                <li><a href="#services">→ {t.services}</a></li>
                <li><a href="#about">→ {t.about}</a></li>
                <li><a href="#contact">→ {t.contact}</a></li>
              </ul>
            </div>

            <div>
              <h4>{t.ourServicesFooter}</h4>
              <ul className="ckm-footer-links">
                <li><a href="#services">→ Office Cleaning</a></li>
                <li><a href="#services">→ Industrial Cleaning</a></li>
                <li><a href="#services">→ Window Cleaning</a></li>
              </ul>
            </div>

            <div>
              <h4>{t.contactInfo}</h4>
              <ul className="ckm-footer-links">
                <li><span>✉️ info@ckmservices.nl</span></li>
                <li><span>📞 +31 (0)85 123 4567</span></li>
                <li><span>📍 Netherlands</span></li>
              </ul>
            </div>
          </div>

          <div className="ckm-footer-bottom">
            <span>© 2026 CKM Services. All rights reserved.</span>
            <span>KvK: 12345678 | BTW: NL123456789B01</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
