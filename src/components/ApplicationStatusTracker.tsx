import React from 'react'
import type { Application, Approval } from '../types/workflow'
import { Check, X, Clock, Lock } from 'lucide-react'

interface ApplicationStatusTrackerProps {
  application: Application
  approvals: Approval[]
}

const ApplicationStatusTracker: React.FC<ApplicationStatusTrackerProps> = ({ application, approvals }) => {
  const stages = [
    { role: 'librarian', label: 'Librarian' },
    { role: 'lab', label: 'Lab Assistant' },
    { role: 'hod', label: 'HOD' },
    { role: 'principal', label: 'Principal' }
  ]

  const getStageData = (role: string) => {
    const approval = approvals.find(a => a.role === role)
    const stageOrder = ['librarian', 'lab', 'hod', 'principal']
    const currentStageIndex = stageOrder.indexOf(application.current_stage)
    const thisStageIndex = stageOrder.indexOf(role)

    let status: 'approved' | 'rejected' | 'pending' | 'locked' = 'locked'
    
    if (approval?.status === 'approved') status = 'approved'
    else if (approval?.status === 'rejected') status = 'rejected'
    else if (application.current_stage === role) status = 'pending'
    else if (thisStageIndex > currentStageIndex && currentStageIndex !== -1) status = 'locked'
    else if (thisStageIndex < currentStageIndex) status = 'approved' // Should have been caught by approval check but fallback

    return { status, comment: approval?.comment }
  }

  const renderIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check size={16} strokeWidth={3} />
      case 'rejected': return <X size={16} strokeWidth={3} />
      case 'pending': return <Clock size={16} />
      case 'locked': return <Lock size={16} />
      default: return null
    }
  }

  return (
    <div className="status-tracker-container">
      <div className="pipeline-wrapper">
        {stages.map((stage, index) => {
          const { status, comment } = getStageData(stage.role)
          const isLast = index === stages.length - 1

          return (
            <React.Fragment key={stage.role}>
              <div className={`stage-node-item ${status}`}>
                <div className="node-icon-circle">
                  {renderIcon(status)}
                </div>
                <div className="node-text-box">
                  <span className="node-label-text">{stage.label}</span>
                  <span className="node-status-badge">{status.toUpperCase()}</span>
                </div>
                {comment && (
                  <div className="node-comment-bubble">
                    {comment}
                  </div>
                )}
              </div>
              {!isLast && (
                <div className={`pipeline-segment ${status === 'approved' ? 'completed' : ''}`}>
                  <div className="segment-fill"></div>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .status-tracker-container {
          padding: 30px 0;
          width: 100%;
          overflow-x: auto;
        }
        .pipeline-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-width: 600px;
          padding: 0 20px;
        }
        .stage-node-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
          flex: 0 0 100px;
        }
        .node-icon-circle {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0a;
          border: 2px solid #222;
          color: #444;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          margin-bottom: 12px;
        }
        .stage-node-item.approved .node-icon-circle {
          background: #10B981;
          border-color: #10B981;
          color: #000;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }
        .stage-node-item.rejected .node-icon-circle {
          background: #EF4444;
          border-color: #EF4444;
          color: #fff;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
        }
        .stage-node-item.pending .node-icon-circle {
          border-color: var(--accent-color);
          color: var(--accent-color);
          background: rgba(201, 168, 76, 0.1);
          box-shadow: 0 0 20px rgba(201, 168, 76, 0.2);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(201, 168, 76, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(201, 168, 76, 0); }
          100% { box-shadow: 0 0 0 0 rgba(201, 168, 76, 0); }
        }

        .node-text-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .node-label-text {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .node-status-badge {
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          opacity: 0.5;
        }
        .stage-node-item.pending .node-status-badge { color: var(--accent-color); opacity: 1; }

        .node-comment-bubble {
          position: absolute;
          top: 100%;
          margin-top: 15px;
          background: #111;
          border: 1px solid #222;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.7rem;
          color: #888;
          font-style: italic;
          width: 140px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .pipeline-segment {
          flex: 1;
          height: 2px;
          background: #222;
          margin: 0 -20px;
          margin-top: -38px;
          position: relative;
          z-index: 1;
        }
        .segment-fill {
          height: 100%;
          width: 0;
          background: #10B981;
          transition: width 0.8s ease;
        }
        .pipeline-segment.completed .segment-fill {
          width: 100%;
        }
      ` }} />
    </div>
  )
}

export default ApplicationStatusTracker
