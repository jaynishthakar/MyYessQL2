import { motion } from 'framer-motion';
import type { Application, Approval } from '../types/workflow';

interface AnimatedPipelineProps {
  application: Application | null;
  approvals: Approval[];
}

const stepsConfig = [
  { id: 'LIBRARIAN', label: 'LIBRARY' },
  { id: 'lab', label: 'LABS' },
  { id: 'hod', label: 'HOD' },
  { id: 'principal', label: 'PRINCIPAL' },
];

const AnimatedPipeline: React.FC<AnimatedPipelineProps> = ({ application, approvals }) => {
  const getStepStatus = (stepId: string) => {
    if (!application || !application.is_submitted) return 'pending';
    
    // Case-insensitive check for role
    const approval = approvals.find(a => a.role.toLowerCase() === stepId.toLowerCase());
    
    if (approval?.status === 'approved') return 'done';
    if (approval?.status === 'rejected') return 'fail';
    
    // Check if this is the current active stage
    const currentStage = application.current_stage?.toLowerCase();
    if (currentStage === stepId.toLowerCase()) return 'current';
    
    // Check if it's already passed or still ahead
    const stageOrder = stepsConfig.map(s => s.id.toLowerCase());
    const currentIndex = stageOrder.indexOf(currentStage);
    const stepIndex = stageOrder.indexOf(stepId.toLowerCase());
    
    if (stepIndex < currentIndex && currentIndex !== -1) return 'done';
    if (stepIndex > currentIndex || currentIndex === -1) return 'pending';
    
    return 'pending';
  };

  return (
    <div className="animated-pipeline" style={{ padding: '0 10px', height: '60px', display: 'flex', alignItems: 'center' }}>
      <div className="steps-wrapper" style={{ width: '100%', position: 'relative' }}>
        <div style={{ 
          position: 'absolute', 
          top: '5px', 
          left: '5%', 
          right: '5%', 
          height: '1px', 
          background: 'rgba(255,255,255,0.05)', 
          zIndex: 0 
        }} />
        
        <div className="steps-container" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          position: 'relative', 
          zIndex: 1 
        }}>
          {stepsConfig.map((step, index) => {
            const status = getStepStatus(step.id);
            const isDone = status === 'done';
            const isFail = status === 'fail';
            const isCurrent = status === 'current';
            
            let color = 'rgba(255, 255, 255, 0.1)';
            if (isDone) color = '#10B981'; // Success Emerald
            if (isFail) color = '#EF4444'; // Muted Rose
            if (isCurrent) color = 'var(--accent-color)';

            return (
              <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px' }}>
                <div style={{ height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1, type: 'spring', stiffness: 400, damping: 30 }}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: color,
                      boxShadow: isCurrent ? `0 0 15px ${color}` : 'none',
                      position: 'relative',
                      zIndex: 2,
                      border: isCurrent ? '2px solid #000' : 'none'
                    }}
                  >
                    {isCurrent && (
                      <motion.div
                        animate={{ scale: [1, 2.8], opacity: [0.5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          background: color,
                          position: 'absolute',
                          top: 0,
                          left: 0
                        }}
                      />
                    )}
                  </motion.div>
                </div>
                
                <span style={{ 
                  marginTop: '12px',
                  fontSize: '0.5rem', 
                  fontWeight: isCurrent ? 900 : 700, 
                  color: isCurrent ? '#fff' : isDone ? '#10B981' : isFail ? '#EF4444' : 'rgba(255,255,255,0.2)',
                  letterSpacing: '0.12em',
                  fontFamily: 'Inter, sans-serif'
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnimatedPipeline;
