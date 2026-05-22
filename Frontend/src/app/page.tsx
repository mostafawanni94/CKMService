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
  cta1: { label: Record<Lang, string>; href: string };
  cta2: { label: Record<Lang, string>; href: string };
}

/* ─────────────────────── DATA ─────────────────────── */

const SLIDES: Slide[] = [
  {
    image: '/images/hero-office.png',
    titleLine1: 'Professional Cleaning &',
    titleHighlight: 'Organizing Support',
    description:
      'Every space requires a different approach. Whether you are looking for deep cleaning, regular cleaning support, or storage and organization assistance, we begin by understanding your situation first.',
    cta1: { label: { en: 'Tell Us What You Need', nl: 'Vertel Ons Wat U Nodig Heeft' }, href: '#contact' },
    cta2: { label: { en: 'Learn More →', nl: 'Meer Informatie →' }, href: '#about' },
  },
  {
    image: '/images/hero-industrial.png',
    titleLine1: 'Deep Cleaning',
    titleHighlight: 'Support',
    description:
      'Some spaces require more than a standard cleaning routine. We first learn about the condition of the space, your priorities, and the areas that require the most attention.',
    cta1: { label: { en: 'Request More Information', nl: 'Meer Informatie Aanvragen' }, href: '#contact' },
    cta2: { label: { en: 'Our Services →', nl: 'Onze Diensten →' }, href: '#services' },
  },
  {
    image: '/images/hero-storage.png',
    titleLine1: 'Storage &',
    titleHighlight: 'Organization',
    description:
      'Organized spaces create clarity, efficiency, and peace of mind. We begin by understanding what challenges you are currently facing and explore practical solutions.',
    cta1: { label: { en: "Let's Discuss Your Situation", nl: 'Laten We Uw Situatie Bespreken' }, href: '#contact' },
    cta2: { label: { en: 'Our Process →', nl: 'Ons Proces →' }, href: '#process' },
  },
];

const SERVICES = [
  {
    icon: '✨',
    title: { en: 'Deep Cleaning Support', nl: 'Dieptereiniging Ondersteuning' },
    description: {
      en: 'Some spaces require more than a standard cleaning routine.\n\nDeep cleaning can be helpful after renovations, relocations, long periods of use, seasonal changes, or when a space simply needs a complete refresh.\n\nInstead of assuming what is needed, we first learn more about the condition of the space, your priorities, and the areas that require the most attention.\n\nThis allows us to create a practical and focused approach based on your situation.',
      nl: 'Sommige ruimtes vereisen meer dan een standaard schoonmaakroutine.\n\nDieptereiniging kan nuttig zijn na renovaties, verhuizingen, langdurig gebruik, seizoenswisselingen, of wanneer een ruimte simpelweg een volledige opfrisbeurt nodig heeft.\n\nIn plaats van aan te nemen wat er nodig is, leren we eerst meer over de staat van de ruimte, uw prioriteiten en de gebieden die de meeste aandacht vereisen.\n\nHierdoor kunnen we een praktische en gerichte aanpak creëren op basis van uw situatie.',
    },
    image: '/images/hero-industrial.png',
  },
  {
    icon: '🔄',
    title: { en: 'Regular Cleaning Services', nl: 'Reguliere Schoonmaakdiensten' },
    description: {
      en: 'Every property operates differently, which is why flexibility matters.\n\nSome clients prefer weekly support, others need occasional maintenance or customized scheduling based on their environment and daily operations.\n\nWe work with you to understand what level of support makes the most sense and how we can help maintain a clean, comfortable, and organized space over time.',
      nl: 'Elk pand werkt anders, daarom is flexibiliteit belangrijk.\n\nSommige klanten geven de voorkeur aan wekelijkse ondersteuning, anderen hebben af en toe onderhoud nodig of een aangepaste planning op basis van hun omgeving en dagelijkse werkzaamheden.\n\nWij werken met u samen om te begrijpen welk niveau van ondersteuning het meest logisch is en hoe we kunnen helpen een schone, comfortabele en georganiseerde ruimte te onderhouden.',
    },
    image: '/images/hero-office.png',
  },
  {
    icon: '📦',
    title: { en: 'Storage & Organization Assistance', nl: 'Opslag & Organisatie Ondersteuning' },
    description: {
      en: 'Organized spaces create clarity, efficiency, and peace of mind.\n\nWhether you need temporary storage support, assistance organizing materials, or help creating a more functional environment, we begin by understanding what challenges you are currently facing.\n\nFrom there, we explore practical solutions that support your workflow, space, and overall needs.',
      nl: 'Georganiseerde ruimtes creëren helderheid, efficiëntie en gemoedsrust.\n\nOf u nu tijdelijke opslagondersteuning nodig heeft, hulp bij het organiseren van materialen, of hulp bij het creëren van een functionelere omgeving, we beginnen met het begrijpen van de uitdagingen waar u momenteel mee te maken heeft.\n\nVan daaruit verkennen we praktische oplossingen die uw workflow, ruimte en algehele behoeften ondersteunen.',
    },
    image: '/images/hero-storage.png',
  },
];

const WHY_CARDS = [
  {
    icon: '🎯',
    title: { en: 'Needs-First Approach', nl: 'Behoeften Voorop' },
    desc: {
      en: 'We focus on understanding your needs before recommending solutions',
      nl: 'Wij richten ons op het begrijpen van uw behoeften voordat we oplossingen aanbevelen',
    },
  },
  {
    icon: '💬',
    title: { en: 'Reliable Communication', nl: 'Betrouwbare Communicatie' },
    desc: {
      en: 'Reliable communication and professional service you can count on',
      nl: 'Betrouwbare communicatie en professionele dienstverlening waar u op kunt rekenen',
    },
  },
  {
    icon: '⚙️',
    title: { en: 'Flexible Support', nl: 'Flexibele Ondersteuning' },
    desc: {
      en: 'Flexible support based on your schedule and situation',
      nl: 'Flexibele ondersteuning op basis van uw planning en situatie',
    },
  },
  {
    icon: '🔍',
    title: { en: 'Attention to Detail', nl: 'Aandacht voor Detail' },
    desc: {
      en: 'Attention to detail and consistent quality in every project',
      nl: 'Aandacht voor detail en consistente kwaliteit in elk project',
    },
  },
  {
    icon: '✅',
    title: { en: 'Practical Solutions', nl: 'Praktische Oplossingen' },
    desc: {
      en: 'Practical solutions instead of unnecessary services',
      nl: 'Praktische oplossingen in plaats van onnodige diensten',
    },
  },
  {
    icon: '🤝',
    title: { en: 'Professional & Respectful', nl: 'Professioneel & Respectvol' },
    desc: {
      en: 'A professional and respectful approach to every space',
      nl: 'Een professionele en respectvolle benadering van elke ruimte',
    },
  },
];

const PROCESS_STEPS = [
  {
    step: 1,
    title: { en: 'Tell Us About Your Situation', nl: 'Vertel Ons Over Uw Situatie' },
    desc: {
      en: 'Share details about your space, needs, or current challenges.',
      nl: 'Deel details over uw ruimte, behoeften of huidige uitdagingen.',
    },
    icon: '💬',
  },
  {
    step: 2,
    title: { en: 'We Review Your Needs', nl: 'Wij Beoordelen Uw Behoeften' },
    desc: {
      en: 'We assess the information you provide and determine what type of support may be most suitable.',
      nl: 'Wij beoordelen de informatie die u verstrekt en bepalen welk type ondersteuning het meest geschikt is.',
    },
    icon: '🔍',
  },
  {
    step: 3,
    title: { en: 'Customized Recommendation', nl: 'Advies Op Maat' },
    desc: {
      en: 'Based on your situation, we discuss practical options and next steps.',
      nl: 'Op basis van uw situatie bespreken we praktische opties en volgende stappen.',
    },
    icon: '📋',
  },
  {
    step: 4,
    title: { en: 'Professional Support', nl: 'Professionele Ondersteuning' },
    desc: {
      en: 'Once everything is clear, we move forward with a service plan that fits your needs.',
      nl: 'Zodra alles duidelijk is, gaan we verder met een serviceplan dat past bij uw behoeften.',
    },
    icon: '✅',
  },
];

const FAQS = [
  {
    q: { en: 'Do you only work with businesses?', nl: 'Werken jullie alleen met bedrijven?' },
    a: {
      en: 'No. We can support both residential and commercial clients depending on the situation and service required.',
      nl: 'Nee. Wij kunnen zowel particuliere als zakelijke klanten ondersteunen, afhankelijk van de situatie en de gewenste dienst.',
    },
  },
  {
    q: { en: 'Do you offer customized cleaning plans?', nl: 'Bieden jullie aangepaste schoonmaakplannen aan?' },
    a: {
      en: 'Yes. We understand that every space and client has different needs, which is why we focus on flexible and situation-based support.',
      nl: 'Ja. Wij begrijpen dat elke ruimte en klant andere behoeften heeft, daarom richten wij ons op flexibele en situatiegebonden ondersteuning.',
    },
  },
  {
    q: { en: 'How do we get started?', nl: 'Hoe beginnen we?' },
    a: {
      en: 'Simply contact us and share some information about your situation. From there, we will review your needs and discuss possible next steps.',
      nl: 'Neem gewoon contact met ons op en deel wat informatie over uw situatie. Van daaruit beoordelen wij uw behoeften en bespreken we mogelijke vervolgstappen.',
    },
  },
  {
    q: { en: 'Do you provide one-time services?', nl: 'Bieden jullie eenmalige diensten aan?' },
    a: {
      en: 'Yes. Depending on your needs, we can discuss both one-time and recurring support options.',
      nl: 'Ja. Afhankelijk van uw behoeften kunnen we zowel eenmalige als terugkerende ondersteuningsopties bespreken.',
    },
  },
  {
    q: { en: 'What areas do you serve?', nl: 'Welke gebieden bedienen jullie?' },
    a: {
      en: 'We are based in Rotterdam and work with clients in surrounding areas as well.',
      nl: 'Wij zijn gevestigd in Rotterdam en werken ook met klanten in de omliggende gebieden.',
    },
  },
];

const T = {
  en: {
    home: 'Home',
    services: 'Services',
    about: 'About Us',
    process: 'Process',
    faq: 'FAQ',
    contact: 'Contact',
    portal: 'Portal Login',
    getQuote: 'Get In Touch',
    // Hero intro
    introTitle: 'We believe good service starts with listening.',
    introP1: 'Instead of offering standard packages, we take the time to understand what you need and what works best for your space, schedule, and priorities.',
    introP2: 'Our goal is simple: provide reliable support that feels practical, clear, and tailored to you.',
    // About
    aboutBadge: 'ABOUT US',
    aboutTitle: 'A More Thoughtful Approach to Cleaning & Organization',
    aboutP1: 'We created our company with one idea in mind: every client deserves solutions that actually fit their situation.',
    aboutP2: 'Too often, cleaning and storage services feel rushed, impersonal, or focused only on selling packages. We wanted to build something different.',
    aboutP3: 'Our approach starts with understanding your needs first. Whether you need a one-time deep cleaning, ongoing maintenance, or support with storage and organization, we focus on creating a service that makes sense for you.',
    aboutP4: 'We value professionalism, consistency, communication, and attention to detail in every project we take on.',
    aboutBtn: 'Tell Us What You Need',
    // Services
    servicesBadge: 'WHAT WE OFFER',
    servicesTitle: 'Our Services',
    // Why
    whyBadge: 'WHY CHOOSE US',
    whyTitle: 'Why Clients Work With Us',
    // Process
    processBadge: 'OUR PROCESS',
    processTitle: 'How Our Process Works',
    // Contact
    contactBadge: 'GET IN TOUCH',
    contactTitle: "Let's Start With Understanding Your Needs",
    contactP1: 'Every client and every space is different.',
    contactP2: 'Tell us more about what you are looking for, what challenges you are facing, or what type of support would be most helpful.',
    contactP3: 'We will review your information and discuss the best way we may be able to assist you.',
    formName: 'Full Name',
    formCompany: 'Company Name (Optional)',
    formEmail: 'Email Address',
    formPhone: 'Phone Number',
    formService: 'Type of Service Needed',
    formServiceOptions: ['Deep Cleaning Support', 'Regular Cleaning Services', 'Storage & Organization Assistance', 'Other'],
    formMessage: 'Tell Us About Your Situation',
    formSubmit: 'Send Your Information',
    formSubmitting: 'Sending...',
    formSuccess: 'Thank you! We have received your information and will review it shortly.',
    formSelectPlaceholder: 'Select a service...',
    // FAQ
    faqBadge: 'FAQ',
    faqTitle: 'Frequently Asked Questions',
    // Footer
    footerDesc: 'Professional Cleaning, Organization & Support Services',
    footerLocation: 'Based in Rotterdam',
    quickLinks: 'Quick Links',
    ourServicesFooter: 'Our Services',
    contactInfo: 'Contact Info',
  },
  nl: {
    home: 'Home',
    services: 'Diensten',
    about: 'Over Ons',
    process: 'Proces',
    faq: 'Veelgestelde Vragen',
    contact: 'Contact',
    portal: 'Portaal Login',
    getQuote: 'Neem Contact Op',
    // Hero intro
    introTitle: 'Wij geloven dat goede dienstverlening begint met luisteren.',
    introP1: 'In plaats van standaardpakketten aan te bieden, nemen we de tijd om te begrijpen wat u nodig heeft en wat het beste werkt voor uw ruimte, planning en prioriteiten.',
    introP2: 'Ons doel is eenvoudig: betrouwbare ondersteuning bieden die praktisch, duidelijk en op maat is.',
    // About
    aboutBadge: 'OVER ONS',
    aboutTitle: 'Een Doordachtere Aanpak van Schoonmaak & Organisatie',
    aboutP1: 'Wij hebben ons bedrijf opgericht met één idee in gedachten: elke klant verdient oplossingen die daadwerkelijk bij hun situatie passen.',
    aboutP2: 'Te vaak voelen schoonmaak- en opslagdiensten gehaast, onpersoonlijk of alleen gericht op het verkopen van pakketten. Wij wilden iets anders bouwen.',
    aboutP3: 'Onze aanpak begint met het begrijpen van uw behoeften. Of u nu een eenmalige dieptereiniging nodig heeft, doorlopend onderhoud, of ondersteuning bij opslag en organisatie, wij richten ons op het creëren van een dienst die voor u logisch is.',
    aboutP4: 'Wij hechten waarde aan professionaliteit, consistentie, communicatie en aandacht voor detail in elk project dat we aannemen.',
    aboutBtn: 'Vertel Ons Wat U Nodig Heeft',
    // Services
    servicesBadge: 'WAT WIJ BIEDEN',
    servicesTitle: 'Onze Diensten',
    // Why
    whyBadge: 'WAAROM KIEZEN VOOR ONS',
    whyTitle: 'Waarom Klanten Met Ons Werken',
    // Process
    processBadge: 'ONS PROCES',
    processTitle: 'Hoe Ons Proces Werkt',
    // Contact
    contactBadge: 'NEEM CONTACT OP',
    contactTitle: 'Laten We Beginnen Met Het Begrijpen Van Uw Behoeften',
    contactP1: 'Elke klant en elke ruimte is anders.',
    contactP2: 'Vertel ons meer over wat u zoekt, welke uitdagingen u ervaart, of welk type ondersteuning het meest nuttig zou zijn.',
    contactP3: 'Wij zullen uw informatie bekijken en de beste manier bespreken waarop we u kunnen helpen.',
    formName: 'Volledige Naam',
    formCompany: 'Bedrijfsnaam (Optioneel)',
    formEmail: 'E-mailadres',
    formPhone: 'Telefoonnummer',
    formService: 'Type Dienst Gewenst',
    formServiceOptions: ['Dieptereiniging Ondersteuning', 'Reguliere Schoonmaakdiensten', 'Opslag & Organisatie Ondersteuning', 'Anders'],
    formMessage: 'Vertel Ons Over Uw Situatie',
    formSubmit: 'Verstuur Uw Informatie',
    formSubmitting: 'Verzenden...',
    formSuccess: 'Bedankt! Wij hebben uw informatie ontvangen en zullen deze binnenkort bekijken.',
    formSelectPlaceholder: 'Selecteer een dienst...',
    // FAQ
    faqBadge: 'VEELGESTELDE VRAGEN',
    faqTitle: 'Veelgestelde Vragen',
    // Footer
    footerDesc: 'Professionele Schoonmaak, Organisatie & Ondersteuningsdiensten',
    footerLocation: 'Gevestigd in Rotterdam',
    quickLinks: 'Snelle Links',
    ourServicesFooter: 'Onze Diensten',
    contactInfo: 'Contactgegevens',
  },
};

/* ─────────────────────── HOOKS ─────────────────────── */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Add visible to the element itself
          el.classList.add('visible');
          // Also add visible to any child elements with reveal classes
          el.querySelectorAll('.ckm-reveal, .ckm-reveal-left, .ckm-reveal-right').forEach((child) => {
            child.classList.add('visible');
          });
          observer.unobserve(el);
        }
      },
      { threshold: 0.08 }
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

  // FAQ accordion
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Contact form
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    serviceType: '',
    message: '',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const t = T[lang];

  /* Reveal refs — each ref is placed on or above the element with ckm-reveal */
  const introRef = useReveal();
  const servicesHeaderRef = useReveal();
  const service1Ref = useReveal();
  const service2Ref = useReveal();
  const service3Ref = useReveal();
  const whyRef = useReveal();
  const aboutLeftRef = useReveal();
  const aboutRightRef = useReveal();
  const processRef = useReveal();
  const contactRef = useReveal();
  const faqRef = useReveal();

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
    const timer = setInterval(nextSlide, 7000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  /* Scroll detection for navbar */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Form handlers */
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    // Simulate sending (replace with real endpoint later)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setFormSubmitting(false);
    setFormSubmitted(true);
  };

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
            <a href="#process">{t.process}</a>
            <a href="#faq">{t.faq}</a>
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
            <a href="#process" onClick={() => setMobileMenuOpen(false)}>{t.process}</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>{t.faq}</a>
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
                {lang === 'en' ? slide.titleLine1 : (
                  i === 0 ? 'Professionele Schoonmaak &' :
                  i === 1 ? 'Dieptereiniging' : 'Opslag &'
                )}
                <br />
                <span className="ckm-highlight">
                  {lang === 'en' ? slide.titleHighlight : (
                    i === 0 ? 'Organisatie Ondersteuning' :
                    i === 1 ? 'Ondersteuning' : 'Organisatie'
                  )}
                </span>
              </h1>
              <p>
                {lang === 'en' ? slide.description : (
                  i === 0 ? 'Elke ruimte vereist een andere aanpak. Of u nu op zoek bent naar dieptereiniging, reguliere schoonmaakondersteuning, of hulp bij opslag en organisatie, wij beginnen met het begrijpen van uw situatie.' :
                  i === 1 ? 'Sommige ruimtes vereisen meer dan een standaard schoonmaakroutine. Wij leren eerst meer over de staat van de ruimte, uw prioriteiten en de gebieden die de meeste aandacht nodig hebben.' :
                  'Georganiseerde ruimtes creëren helderheid, efficiëntie en gemoedsrust. Wij beginnen met het begrijpen van de uitdagingen waar u mee te maken heeft en verkennen praktische oplossingen.'
                )}
              </p>
              <div className="ckm-hero-btns">
                <a href={slide.cta1.href} className="ckm-btn ckm-btn-primary">
                  {slide.cta1.label[lang]}
                </a>
                <a href={slide.cta2.href} className="ckm-btn ckm-btn-outline-light">
                  {slide.cta2.label[lang]}
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

      {/* ─── INTRODUCTION BAR ─── */}
      <section className="ckm-intro-section">
        <div className="ckm-container ckm-reveal" ref={introRef}>
          <div className="ckm-intro-content">
            <h2 className="ckm-intro-title">{t.introTitle}</h2>
            <p>{t.introP1}</p>
            <p>{t.introP2}</p>
          </div>
        </div>
      </section>

      {/* ─── SERVICES ─── */}
      <section id="services" className="ckm-section ckm-section-white">
        <div className="ckm-container">
          <div className="ckm-section-header ckm-reveal" ref={servicesHeaderRef}>
            <span className="ckm-badge">{t.servicesBadge}</span>
            <h2>{t.servicesTitle}</h2>
          </div>

          {SERVICES.map((service, i) => {
            const ref = i === 0 ? service1Ref : i === 1 ? service2Ref : service3Ref;
            const isReversed = i % 2 === 1;
            return (
              <div
                key={i}
                className={`ckm-service-detail ${isReversed ? 'ckm-service-detail-reversed' : ''} ckm-reveal`}
                ref={ref}
              >
                <div className="ckm-service-detail-image">
                  <Image
                    src={service.image}
                    alt={service.title[lang]}
                    width={560}
                    height={380}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  />
                </div>
                <div className="ckm-service-detail-content">
                  <div className="ckm-service-detail-icon">{service.icon}</div>
                  <h3>{service.title[lang]}</h3>
                  {service.description[lang].split('\n\n').map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── WHY CHOOSE US ─── */}
      <section className="ckm-section ckm-section-light" ref={whyRef}>
        <div className="ckm-container">
          <div className="ckm-section-header ckm-reveal">
            <span className="ckm-badge">{t.whyBadge}</span>
            <h2>{t.whyTitle}</h2>
          </div>

          <div className="ckm-why-grid">
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
      <section id="about" className="ckm-section ckm-section-white">
        <div className="ckm-container">
          <div className="ckm-about-grid">
            <div className="ckm-about-image ckm-reveal-left" ref={aboutLeftRef}>
              <Image
                src="/images/team-photo.png"
                alt="CKM Services Professional Cleaning"
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
              <p>{t.aboutP3}</p>
              <p>{t.aboutP4}</p>
              <a href="#contact" className="ckm-btn ckm-btn-primary">
                {t.aboutBtn}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PROCESS ─── */}
      <section id="process" className="ckm-process-section" ref={processRef}>
        <div className="ckm-container">
          <div className="ckm-section-header ckm-reveal">
            <span className="ckm-badge ckm-badge-light">{t.processBadge}</span>
            <h2>{t.processTitle}</h2>
          </div>

          <div className="ckm-process-steps ckm-reveal">
            {PROCESS_STEPS.map((step, i) => (
              <div key={i} className="ckm-step">
                <div className="ckm-step-top">
                  <div className="ckm-step-num">{step.step}</div>
                  {i < PROCESS_STEPS.length - 1 && <div className="ckm-step-line" />}
                </div>
                <h3>{step.title[lang]}</h3>
                <p>{step.desc[lang]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="ckm-section ckm-section-white" ref={faqRef}>
        <div className="ckm-container">
          <div className="ckm-faq-layout ckm-reveal">
            <div className="ckm-faq-sidebar">
              <span className="ckm-badge">{t.faqBadge}</span>
              <h2>{t.faqTitle}</h2>
              <p className="ckm-faq-sidebar-text">
                {lang === 'en'
                  ? 'Can\'t find the answer you\'re looking for? Feel free to contact us directly.'
                  : 'Kunt u het antwoord dat u zoekt niet vinden? Neem gerust rechtstreeks contact met ons op.'}
              </p>
              <a href="#contact" className="ckm-btn ckm-btn-primary">
                {t.getQuote}
              </a>
            </div>
            <div className="ckm-faq-list">
              {FAQS.map((faq, i) => (
                <div
                  key={i}
                  className={`ckm-faq-item ${openFaq === i ? 'open' : ''}`}
                >
                  <button
                    className="ckm-faq-question"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                  >
                    <div className="ckm-faq-q-left">
                      <span className="ckm-faq-num">{String(i + 1).padStart(2, '0')}</span>
                      <span>{faq.q[lang]}</span>
                    </div>
                    <span className="ckm-faq-chevron">{openFaq === i ? '−' : '+'}</span>
                  </button>
                  <div className="ckm-faq-answer">
                    <p>{faq.a[lang]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CONTACT ─── */}
      <section id="contact" className="ckm-section ckm-section-cta" ref={contactRef}>
        <div className="ckm-container">
          <div className="ckm-contact-grid ckm-reveal">
            <div className="ckm-contact-info">
              <span className="ckm-badge ckm-badge-light">{t.contactBadge}</span>
              <h2>{t.contactTitle}</h2>
              <p>{t.contactP1}</p>
              <p>{t.contactP2}</p>
              <p>{t.contactP3}</p>

              <div className="ckm-contact-details">
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
                  <span>Rotterdam, Netherlands</span>
                </div>
              </div>
            </div>

            <div className="ckm-contact-form-wrapper">
              {formSubmitted ? (
                <div className="ckm-form-success">
                  <div className="ckm-form-success-icon">✓</div>
                  <p>{t.formSuccess}</p>
                </div>
              ) : (
                <form className="ckm-contact-form" onSubmit={handleFormSubmit}>
                  <div className="ckm-form-row">
                    <div className="ckm-form-group">
                      <label htmlFor="fullName">{t.formName}</label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="ckm-form-group">
                      <label htmlFor="companyName">{t.formCompany}</label>
                      <input
                        id="companyName"
                        name="companyName"
                        type="text"
                        value={formData.companyName}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>
                  <div className="ckm-form-row">
                    <div className="ckm-form-group">
                      <label htmlFor="email">{t.formEmail}</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="ckm-form-group">
                      <label htmlFor="phone">{t.formPhone}</label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>
                  <div className="ckm-form-group">
                    <label htmlFor="serviceType">{t.formService}</label>
                    <select
                      id="serviceType"
                      name="serviceType"
                      required
                      value={formData.serviceType}
                      onChange={handleFormChange}
                    >
                      <option value="">{t.formSelectPlaceholder}</option>
                      {t.formServiceOptions.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ckm-form-group">
                    <label htmlFor="message">{t.formMessage}</label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      required
                      value={formData.message}
                      onChange={handleFormChange}
                    />
                  </div>
                  <button
                    type="submit"
                    className="ckm-btn ckm-btn-primary ckm-btn-full"
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? t.formSubmitting : t.formSubmit}
                  </button>
                </form>
              )}
            </div>
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
              <p>{t.footerDesc}</p>
              <p className="ckm-footer-location">{t.footerLocation}</p>
            </div>

            <div>
              <h4>{t.quickLinks}</h4>
              <ul className="ckm-footer-links">
                <li><a href="#">→ {t.home}</a></li>
                <li><a href="#services">→ {t.services}</a></li>
                <li><a href="#about">→ {t.about}</a></li>
                <li><a href="#process">→ {t.process}</a></li>
                <li><a href="#contact">→ {t.contact}</a></li>
              </ul>
            </div>

            <div>
              <h4>{t.ourServicesFooter}</h4>
              <ul className="ckm-footer-links">
                <li><a href="#services">→ {SERVICES[0].title[lang]}</a></li>
                <li><a href="#services">→ {SERVICES[1].title[lang]}</a></li>
                <li><a href="#services">→ {SERVICES[2].title[lang]}</a></li>
              </ul>
            </div>

            <div>
              <h4>{t.contactInfo}</h4>
              <ul className="ckm-footer-links">
                <li><span>✉️ info@ckmservices.nl</span></li>
                <li><span>📞 +31 (0)85 123 4567</span></li>
                <li><span>📍 Rotterdam, Netherlands</span></li>
              </ul>
            </div>
          </div>

          <div className="ckm-footer-bottom">
            <span>© 2026 CKM Services. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
