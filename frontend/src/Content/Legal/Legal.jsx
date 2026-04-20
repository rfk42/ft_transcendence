import { Link, useLocation } from 'react-router'
import './Legal.scss'

const legalPages = {
  '/legal': {
    title: 'Legal Notice',
    lead:
      'This page provides the main legal information related to the ft_transcendence project and its publication.',
    sections: [
      {
        heading: 'Publisher',
        paragraphs: [
          'ft_transcendence is a student project created and maintained by Rafik Hamini, Noe Lambert, Akim Hamini and Ilan Sadi.',
          'For legal or privacy-related requests, you can contact the team at ludo@ludo.gg.',
        ],
      },
      {
        heading: 'Project Scope',
        paragraphs: [
          'ft_transcendence is an educational web project built around an online Ludo experience, including authentication, profiles, friends, leaderboards and multiplayer features.',
          'The service is provided as part of a school project and may evolve, be interrupted or be modified at any time for maintenance, testing or pedagogical purposes.',
        ],
      },
      {
        heading: 'Intellectual Property',
        paragraphs: [
          'Unless otherwise stated, the source code, interface elements, branding, written content and original game-related implementations produced for this project are protected by applicable intellectual property rules.',
          'Any unauthorized reproduction, redistribution or commercial reuse of project-specific assets is prohibited without prior permission from the team.',
        ],
      },
      {
        heading: 'Limitation of Liability',
        paragraphs: [
          'The project is provided on an as-is basis without any guarantee of uninterrupted availability, error-free operation or fitness for a particular purpose.',
          'The team cannot be held liable for indirect damages, temporary service interruptions, loss of access, or issues resulting from third-party services used during authentication or hosting.',
        ],
      },
    ],
  },
  '/privacy-policy': {
    title: 'Privacy Policy',
    lead:
      'This Privacy Policy explains what data the project may process, why it is used and how users can request changes or deletion.',
    sections: [
      {
        heading: 'Data We Process',
        paragraphs: [
          'Depending on how you use the service, the project may process account data such as username, email address, encrypted password, profile information, avatar uploads, friend relationships and gameplay-related records.',
          'When OAuth login is used, limited identity data provided by the external authentication provider may also be processed to create or connect your account.',
        ],
      },
      {
        heading: 'Purpose of Processing',
        paragraphs: [
          'Collected data is used strictly for operating the application and its core features, including account access, profile management, authentication, multiplayer sessions, friends, leaderboards and moderation or abuse prevention tools such as rate limiting.',
          'We do not use personal data for advertising purposes and we do not intentionally sell user data to third parties.',
        ],
      },
      {
        heading: 'Cookies and Technical Storage',
        paragraphs: [
          'The application may use technical cookies or comparable storage mechanisms when necessary for authentication, session continuity, security and normal operation of the platform.',
          'These elements are used to provide the service and are not intended for behavioral advertising.',
        ],
      },
      {
        heading: 'Data Sharing and Retention',
        paragraphs: [
          'User data is only shared with third-party services when necessary for the requested feature, such as OAuth authentication providers or infrastructure components involved in running the application.',
          'Data is retained only for as long as reasonably necessary for the project, legal compliance, debugging, security or academic evaluation needs.',
        ],
      },
      {
        heading: 'Your Rights',
        paragraphs: [
          'You may request access, correction or deletion of your personal data by contacting ludo@ludo.gg.',
          'Reasonable efforts will be made to process valid requests in accordance with the applicable rules and the technical constraints of the project.',
        ],
      },
    ],
  },
  '/terms-of-service': {
    title: 'Terms of Service',
    lead:
      'These Terms of Service govern access to and use of the ft_transcendence project and its related features.',
    sections: [
      {
        heading: 'Acceptance of Terms',
        paragraphs: [
          'By accessing or using the service, you agree to these Terms of Service and to comply with all applicable laws and project rules.',
          'If you do not agree with these terms, you should stop using the service.',
        ],
      },
      {
        heading: 'User Responsibilities',
        paragraphs: [
          'Users agree not to misuse the service, attempt unauthorized access, disrupt multiplayer sessions, abuse authentication flows, upload unlawful content or interfere with the experience of other users.',
          'Users remain responsible for the accuracy of the information they provide and for maintaining the confidentiality of their credentials.',
        ],
      },
      {
        heading: 'Service Availability',
        paragraphs: [
          'Because ft_transcendence is an educational project, features may change without notice and parts of the service may be unavailable during development, maintenance or evaluation periods.',
          'We reserve the right to suspend, restrict or remove access when necessary for security, technical stability or compliance reasons.',
        ],
      },
      {
        heading: 'Content and Accounts',
        paragraphs: [
          'Users are responsible for the content they submit, including profile information, avatars and in-app interactions.',
          'Accounts or content may be limited or removed if they violate these terms, applicable law or the integrity of the project.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [
          'For questions related to these terms or the use of the service, contact ludo@ludo.gg.',
        ],
      },
    ],
  },
}

const legalLinks = [
  { to: '/legal', label: 'Legal Notice' },
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms-of-service', label: 'Terms of Service' },
]

const Legal = () => {
  const { pathname } = useLocation()
  const page = legalPages[pathname] || legalPages['/legal']

  return (
    <section className="legal-container">
      <div className="legal-card">
        <nav className="legal-nav" aria-label="Legal navigation">
          {legalLinks.map((link) => {
            const isActive = pathname === link.to

            return (
              <Link
                key={link.to}
                to={link.to}
                className={`legal-nav__link ${isActive ? 'is-active' : ''}`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <h1>{page.title}</h1>
        <p className="legal-lead">{page.lead}</p>

        {page.sections.map((section) => (
          <div key={section.heading} className="legal-section">
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

export default Legal