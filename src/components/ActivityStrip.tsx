import React from 'react';
import { Link } from 'react-router-dom';

interface ActivityStripProps {
  statusCase: 1 | 2 | 3 | 4;
}

const ActivityStrip: React.FC<ActivityStripProps> = ({ statusCase }) => {
  const renderContent = () => {
    switch (statusCase) {
      case 1:
        return {
          text: 'No documents uploaded yet.',
          sub: 'Start by uploading your ID card, lab manual, and library receipt.',
          badge: null,
          action: 'Go to Documents →',
          to: '/student/vault'
        };
      case 2:
        return {
          text: '3 documents submitted — awaiting admin review.',
          sub: 'Your application is progressing through the institutional pipeline.',
          badge: 'UNDER REVIEW',
          badgeClass: 'under-review',
          action: null,
          to: null
        };
      case 3:
        return {
          text: 'All documents verified and approved.',
          sub: 'Institutional clearance complete. Download your certificate below.',
          badge: 'APPROVED',
          badgeClass: 'approved',
          action: null,
          to: null
        };
      case 4:
        return {
          text: '1 document requires resubmission.',
          sub: 'One of your uploads was rejected. Please re-upload to continue.',
          badge: 'ACTION REQUIRED',
          badgeClass: 'action-required',
          action: 'Resubmit Document →',
          to: '/student/vault'
        };
      default:
        return null;
    }
  };

  const content = renderContent();
  if (!content) return null;

  return (
    <div className="activity-strip">
      <div className="activity-info">
        <span className="activity-text">{content.text}</span>
        <span className="activity-sub">{content.sub}</span>
      </div>
      
      <div className="activity-actions">
        {content.badge && (
          <span className={`status-badge ${content.badgeClass}`}>
            {content.badge}
          </span>
        )}
        {content.action && content.to && (
          <Link to={content.to} className="label" style={{ color: 'var(--accent-color)', fontWeight: 600, textDecoration: 'none' }}>
            {content.action}
          </Link>
        )}
      </div>
    </div>
  );
};

export default ActivityStrip;
