import React from 'react';
import { motion } from 'framer-motion';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="landing-page">
      <section className="hero-landing">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="label" style={{ color: 'var(--accent-color)' }}>
              Graduation Clearance Protocol
            </span>
            <h1 className="hero-title" style={{ margin: '20px 0' }}>
              Your No-Dues.<br/>Digitized. Done.
            </h1>
            <p className="hero-sub" style={{ maxWidth: '700px' }}>
              Nexus digitizes the complex tapestry of graduation clearance into a single, 
              sovereign digital ledger. Track stage-wise approvals, securely upload documents, 
              and receive your final clearance certificate online. No queues. No stamps. Just proof.
            </p>
            <div className="hero-btns" style={{ marginTop: '40px' }}>
              <button className="btn-primary" onClick={onGetStarted}>Get Started</button>
              <button className="btn-secondary">See How It Works</button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="features-landing">
        <div className="container">
          <div className="feature-grid">
            <motion.div 
              className="feature-block"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="serif title">Multi-Stage Approvals</h3>
              <p className="desc">
                Experience a sequential digital approval flow designed for academic accuracy. 
                Move from Lab verification to HOD endorsement and final Principal clearance in real-time.
              </p>
            </motion.div>

            <motion.div 
              className="feature-block"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="serif title">Live Status Heatmap</h3>
              <p className="desc">
                Never wonder where your application stands. Our status tracking system uses 
                color-based progress indicators to show exactly which node requires attention.
              </p>
            </motion.div>

            <motion.div 
              className="feature-block"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
            >
              <h3 className="serif title">Instant Certificate</h3>
              <p className="desc">
                Once the final authority provides cryptographic endorsement, your clearance 
                certificate is automatically generated for immediate digital download.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="footer" style={{ borderTop: '1px solid var(--border-color)', marginTop: '100px' }}>
        <div className="container footer-container">
          <p className="footer-copy label">© 2025 NEXUS. Built for students, by students.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
