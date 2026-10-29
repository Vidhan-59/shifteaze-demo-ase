import React from 'react';
import { useNavigate } from 'react-router-dom';

const CARDS = [
  {
    key: 'dashboard',
    to: '/dashboard',
    title: 'Enterprise Dashboard',
    subtitle: 'Web',
    description:
      'Central / BU / Site scheduling, organization hierarchy, auctions and reporting for schedulers, coordinators and admins.',
    accent: '#3B3090',
    accentSoft: '#eeecfb',
  },
  {
    key: 'trainer',
    to: '/trainer',
    title: 'Trainer App',
    subtitle: 'Mobile',
    description:
      'Consolidated trainer & staff mobile platform: Roster scheduling, punch-in/out, monthly attendance & regularization, 4-tab leave & holiday management, help desk, and utilities.',
    accent: '#1F5A7A',
    accentSoft: '#EAF4F8',
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        padding: '48px 24px',
        background: '#f7f7fa',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxSizing: 'border-box',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#1a1a2e' }}>ShiftEaze</h1>
        <p style={{ margin: '8px 0 0', fontSize: 15, color: '#6b6b74' }}>
          Choose an experience to open
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          justifyContent: 'center',
          maxWidth: 860,
          width: '100%',
        }}
      >
        {CARDS.map((card) => (
          <button
            key={card.key}
            onClick={() => navigate(card.to)}
            style={{
              flex: '1 1 340px',
              maxWidth: 400,
              textAlign: 'left',
              cursor: 'pointer',
              border: '1px solid #e3e3e8',
              borderRadius: 16,
              padding: 28,
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(20,20,44,0.06)',
              fontFamily: 'inherit',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: card.accent,
                background: card.accentSoft,
                padding: '4px 10px',
                borderRadius: 999,
                marginBottom: 14,
              }}
            >
              {card.subtitle}
            </span>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>
              {card.title}
            </h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: '#6b6b74' }}>
              {card.description}
            </p>
            <div
              style={{
                marginTop: 18,
                fontSize: 14,
                fontWeight: 600,
                color: card.accent,
              }}
            >
              Open →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
