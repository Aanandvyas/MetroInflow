// src/components/About.jsx

import React from 'react';

const teamMembers = [
  'Anand Vyas',
  'Saksham Kriplani',
  'Yash Rathore',
  'Aditya Teja',
  'Vaishnavi Parashar',
  'Ayush Mann'
];

function About() {
  return (
    <div className="about-container" style={{
      maxWidth: '900px',
      margin: '40px auto',
      padding: '32px',
      background: 'linear-gradient(135deg, #f8fafc 60%, #e0e7ff 100%)',
      borderRadius: '18px',
      boxShadow: '0 6px 32px rgba(60,60,120,0.10)',
      fontFamily: 'Segoe UI, sans-serif'
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        fontWeight: 700,
        color: '#3b3b5c',
        marginBottom: '16px',
        letterSpacing: '1px'
      }}>
        About Our Project
      </h1>

      <section style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '28px 28px 18px 28px',
        marginBottom: '32px',
        boxShadow: '0 2px 16px rgba(60,60,120,0.09)'
      }}>
        <h2 style={{
          color: '#2563eb',
          fontWeight: 600,
          marginBottom: '12px',
          fontSize: '1.35rem'
        }}>Project Summary</h2>
        <p style={{ color: '#444', fontSize: '1.08rem', marginBottom: '10px', lineHeight: 1.7 }}>
          Since its first commercial run in 2017, KMRL has grown into a complex, multidisciplinary enterprise that stretches far beyond train operations. Every business day the organization generates and receives thousands of pages of material: engineering drawings, maintenance job cards, incident reports, vendor invoices, purchase-order correspondence, regulatory directives, environmental-impact studies, safety circulars, HR policies, legal opinions, and board-meeting minutes. These arrive through e-mail, Maximo exports, SharePoint repositories, WhatsApp PDFs, hard-copy scans, and ad-hoc cloud links—often in both English and Malayalam, sometimes in bilingual hybrids, frequently with embedded tables, photos, or signatures.
        </p>
        <ul style={{ color: '#444', fontSize: '1.08rem', marginBottom: '10px', paddingLeft: '20px', lineHeight: 1.7 }}>
          <li><b>Information latency:</b> Front-line managers spend hours skimming lengthy documents for the few actionable lines that affect their shift, delaying decisions on train availability, contractor payments, or staffing reallocations.</li>
          <li><b>Siloed awareness:</b> Procurement may negotiate a spare-parts contract without realizing that Engineering has already flagged an upcoming design change. HR may schedule refresher training unaware of a new safety bulletin released the previous evening.</li>
          <li><b>Compliance exposure:</b> Regulatory updates from the Commissioner of Metro Rail Safety and the Ministry of Housing & Urban Affairs are buried in inboxes, risking missed deadlines or audit non-conformities.</li>
          <li><b>Knowledge attrition:</b> Institutional memory remains locked in static files; when key personnel transfer or retire, hard-won insights vanish with them.</li>
          <li><b>Duplicated effort:</b> Different teams independently create summaries or slide decks of the same source documents, multiplying manual work and version-control headaches.</li>
        </ul>
        <p style={{ color: '#444', fontSize: '1.08rem', marginBottom: '10px', lineHeight: 1.7 }}>
          As KMRL prepares to expand its corridor, add two new depots, and integrate emerging technologies such as Unified Namespace (UNS) data streams and IoT condition monitoring, the documentary burden will only intensify. Without an organization-wide mechanism to condense, contextualize, and route critical information, the metro risks slower decision cycles, avoidable operating costs, diminished service reliability, and heightened safety and legal vulnerabilities.
        </p>
        <p style={{ color: '#444', fontSize: '1.08rem', marginBottom: '0', lineHeight: 1.7 }}>
          <b>The challenge:</b> Equip every stakeholder—from station controllers and rolling-stock engineers to finance officers and executive directors—with rapid, trustworthy snapshots of the documents that matter to them, while preserving traceability to the original source. Solving this problem will unlock faster cross-department coordination, strengthen regulatory compliance, safeguard institutional knowledge, and ultimately support KMRL’s mission of delivering safe, efficient, and passenger-centric urban transit to Kochi.
        </p>
      </section>

      <section className="about-details" style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 2px 12px rgba(60,60,120,0.07)'
      }}>
        <h2 style={{ color: '#4f46e5', fontWeight: 600, marginBottom: '8px' }}>Our Mission</h2>
        <p style={{ color: '#333', fontSize: '1.08rem' }}>
          To deliver innovative and user-friendly solutions that solve real-world problems.
        </p>
      </section>

      <section className="about-team" style={{
        background: '#f1f5f9',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 2px 12px rgba(60,60,120,0.05)'
      }}>
        <h2 style={{ color: '#4f46e5', fontWeight: 600, marginBottom: '12px' }}>The Team</h2>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {teamMembers.map((member, idx) => (
            <div key={idx} style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '12px 20px',
              boxShadow: '0 1px 6px rgba(60,60,120,0.06)',
              fontWeight: 500,
              color: '#3b3b5c',
              fontSize: '1rem',
              minWidth: '140px',
              textAlign: 'center'
            }}>
              {member}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default About;
