import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthority } from '../hooks/useAuthority';
import type { AuthorityRole } from '../types/authority';

const AuthoritySignup: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuthority();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<AuthorityRole | ''>('');
  const [department, setDepartment] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roles: { label: string; value: AuthorityRole }[] = [
    { label: 'Lab Assistant', value: 'lab' },
    { label: 'HOD', value: 'hod' },
    { label: 'Principal', value: 'principal' },
    { label: 'Librarian', value: 'librarian' },
  ];

  const departments = [
    'Computer Science',
    'Electronics',
    'Mechanical',
    'Civil',
    'Information Technology',
    'Administration'
  ];

  const validate = () => {
    if (!fullName || !email || !password || !confirmPassword || !role || !department) return 'All fields are required';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Invalid email format';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await signUp(email, password, fullName, role as AuthorityRole, department);

      if (signUpError) throw signUpError;

      setSuccess('Account created. Await verification or proceed to login.');
      
      setTimeout(() => {
        navigate('/authority/login');
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="label">Authority Portal</div>
          <h1 className="title">Join Nexus</h1>
          <p className="subtitle">Staff Registration System</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="signup-grid">
            <div className="input-group wide">
              <label className="label">Full Name</label>
              <input 
                type="text" 
                placeholder="Dr. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            
            <div className="input-group wide">
              <label className="label">Staff Email</label>
              <input 
                type="email" 
                placeholder="staff@nexus.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="label">Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="label">Confirm Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="input-group wide">
              <label className="label">Select Authority Role</label>
              <div className="auth-type-toggle">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    className={`type-btn ${role === r.value ? 'active' : ''}`}
                    onClick={() => setRole(r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="input-group wide">
              <label className="label">Academic Department</label>
              <select 
                className="select-field"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid #222', color: 'white', borderRadius: '4px' }}
              >
                <option value="" disabled>Select Department...</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="error-message" style={{ color: '#ff4d4d', fontSize: '0.8rem', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}
          {success && <div className="success-message" style={{ color: 'var(--accent-color)', fontSize: '0.8rem', marginBottom: '20px', textAlign: 'center' }}>{success}</div>}

          <button 
            type="submit" 
            className="btn-primary full-width"
            disabled={loading || !role}
            style={{ opacity: (!role || loading) ? 0.5 : 1 }}
          >
            {loading ? 'Creating Account...' : 'Initialize Authority Account'}
          </button>

          <div className="form-footer">
            <p>Already have an account? <span onClick={() => navigate('/authority/login')}>Sign In</span></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthoritySignup;
