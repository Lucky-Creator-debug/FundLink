import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from './components/Layout';
import { OnboardingPhase, UserRole, OnboardingState, Connection, InvestorType, InvestmentStage, InvestmentSector } from './types';
import { RoleCard } from './components/RoleCard';
import { PrimaryButton } from './components/PrimaryButton';
import { TrustFooter, WhyTooltip } from './components/TrustBadge';
import { LandingPage } from './components/LandingPage';
import { ProfilingFlow } from './components/ProfilingFlow';
import { Dashboard } from './components/Dashboard';
import { Workspace } from './components/Workspace';
import { AIChatBot } from './components/AIChatBot';
import { OpenRouterService } from './components/OpenRouterService';

const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs font-bold text-white bg-slate-800 rounded-lg shadow-lg w-48 text-center">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<OnboardingState>({
    role: null,
    identifier: '',
    otp: '',
    phase: OnboardingPhase.LANDING,
    profile: null
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [password, setPassword] = useState({ main: '', confirm: '' });
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditLog, setAuditLog] = useState<string[]>([]);
  const [readinessScore, setReadinessScore] = useState<number | null>(null);
  const [focusedOtpIndex, setFocusedOtpIndex] = useState<number | null>(null);

  // OTP Input Refs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const generateWelcomeContext = useCallback(async (role: UserRole) => {
    try {
      const ai = new OpenRouterService(process.env.API_KEY || '');
      const response = await ai.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: `Provide a short welcome message for a startup ${role === UserRole.FOUNDER ? 'Founder' : 'Investor'}. Tone: Professional, 10 words max.` }]
        }],
        model: 'mistralai/devstral-2512:free'
      });
      setAiMessage(response.text() || '');
    } catch (err) {
      setAiMessage(role === UserRole.FOUNDER ? "Welcome. Excited for your journey." : "Ready to discover capital?");
    }
  }, []);

  const runNeuralAudit = useCallback(async () => {
    setAuditProgress(0);
    setReadinessScore(null);
    setAuditLog(['Initiating Vault Security Check...', 'Analyzing Profile Signals...']);
    
    const interval = setInterval(() => {
      setAuditProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 40);

    try {
      const ai = new OpenRouterService(process.env.API_KEY || '');
      const prompt = `Perform a rapid institutional audit on this ${state.role} profile: ${JSON.stringify(state.profile)}. Return JSON ONLY: { "score": number, "logs": string[] }`;
      
      const response = await ai.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        config: {
          responseMimeType: "application/json",
        },
        model: 'mistralai/devstral-2512:free'
      });

      const data = JSON.parse(response.text() || '{"score": 85, "logs": ["Verified"]}') || {"score": 85, "logs": ["Verified"]};
      
      setTimeout(() => {
        setReadinessScore(data.score);
        setAuditLog(prev => [...prev, ...data.logs, 'Audit Complete.']);
      }, 2000);
    } catch (e) {
      console.error('Neural audit error:', e);
      setReadinessScore(82);
      setAuditLog(prev => [...prev, 'Standard Validation Applied.', 'Audit Complete.']);
    }

    // Clean up interval on component unmount or when audit completes
    return () => clearInterval(interval);
  }, [state.role, state.profile]);

  useEffect(() => {
    if (state.phase === OnboardingPhase.VERIFICATION_PENDING) {
      runNeuralAudit();
    }
  }, [state.phase, runNeuralAudit]);

  const handleRoleSelect = (role: UserRole) => {
    setState(prev => ({ ...prev, role }));
    generateWelcomeContext(role);
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.slice(-1).replace(/[^0-9]/g, '');
    const newOtpArr = state.otp.split('');
    while (newOtpArr.length < 6) newOtpArr.push('');
    newOtpArr[index] = digit;
    const finalOtp = newOtpArr.join('').slice(0, 6);
    setState(prev => ({ ...prev, otp: finalOtp }));
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !state.otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      const newOtpArr = state.otp.split('');
      newOtpArr[index - 1] = '';
      setState(prev => ({ ...prev, otp: newOtpArr.join('') }));
    }
  };

  const handleContinue = () => {
    if (state.phase === OnboardingPhase.LANDING) setState(prev => ({ ...prev, phase: OnboardingPhase.ROLE_SELECTION }));
    else if (state.phase === OnboardingPhase.LOGIN) setState(prev => ({ ...prev, phase: OnboardingPhase.DASHBOARD, role: UserRole.FOUNDER }));
    else if (state.phase === OnboardingPhase.ROLE_SELECTION) setState(prev => ({ ...prev, phase: OnboardingPhase.AUTH_IDENTIFIER }));
    else if (state.phase === OnboardingPhase.AUTH_IDENTIFIER) setState(prev => ({ ...prev, phase: OnboardingPhase.AUTH_OTP }));
    else if (state.phase === OnboardingPhase.AUTH_OTP) setState(prev => ({ ...prev, phase: OnboardingPhase.AUTH_PASSWORD }));
    else if (state.phase === OnboardingPhase.AUTH_PASSWORD) setState(prev => ({ ...prev, phase: OnboardingPhase.PROFILING }));
  };

  const handleWorkspaceTransition = (conn: Connection) => {
    setActiveConnection(conn);
    setState(prev => ({ ...prev, phase: OnboardingPhase.WORKSPACE }));
  };

  const renderPhase = () => {
    switch (state.phase) {
      case OnboardingPhase.LANDING: return <LandingPage onStart={() => setState(prev => ({ ...prev, phase: OnboardingPhase.ROLE_SELECTION }))} onLogin={() => setState(prev => ({ ...prev, phase: OnboardingPhase.LOGIN }))} />;
      case OnboardingPhase.LOGIN: return (
        <Layout title="Secure Login" subtitle="Vault Access.">
          <div className="mt-8 space-y-6">
            <div>
              <label htmlFor="login-identifier" className="sr-only">Email or Phone</label>
              <input 
                id="login-identifier"
                type="email" 
                placeholder="Verified ID" 
                className="w-full py-5 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none" 
                value={state.identifier} 
                onChange={(e) => setState(prev => ({ ...prev, identifier: e.target.value }))} 
                aria-label="Email or Phone for login"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="sr-only">Password</label>
              <input 
                id="login-password"
                type="password" 
                placeholder="Key Phrase" 
                className="w-full py-5 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none" 
                value={password.main} 
                onChange={(e) => setPassword(prev => ({ ...prev, main: e.target.value }))} 
                aria-label="Password for account access"
              />
            </div>
          </div>
          <PrimaryButton label="Login" onClick={handleContinue} loading={loading} />
        </Layout>
      );
      case OnboardingPhase.ROLE_SELECTION: return (
        <Layout title="Role Identity" subtitle="Immutable selection.">
          <div className="mt-8" role="radiogroup" aria-label="Select your role">
            <RoleCard role={UserRole.FOUNDER} title="Founder" description="Growth & Vision." icon="🚀" isSelected={state.role === UserRole.FOUNDER} onSelect={handleRoleSelect} />
            <RoleCard role={UserRole.INVESTOR} title="Investor" description="Capital & Value." icon="📈" isSelected={state.role === UserRole.INVESTOR} onSelect={handleRoleSelect} />
          </div>
          <PrimaryButton label="Commit" onClick={handleContinue} disabled={!state.role} />
        </Layout>
      );
      case OnboardingPhase.AUTH_IDENTIFIER: return (
        <Layout showProgress currentStep={1} title="Auth" subtitle="Handle verification.">
          <div>
            <label htmlFor="auth-identifier" className="sr-only">Email or Phone</label>
            <input 
              id="auth-identifier"
              type="text" 
              placeholder="Email/Phone" 
              value={state.identifier} 
              onChange={(e) => setState(prev => ({ ...prev, identifier: e.target.value }))} 
              className="w-full py-5 px-6 rounded-2xl bg-slate-50 mt-10" 
              aria-label="Enter your email or phone number for verification"
            />
          </div>
          <PrimaryButton label="Next" onClick={handleContinue} />
        </Layout>
      );
      case OnboardingPhase.AUTH_OTP: return (
        <Layout showProgress currentStep={2} title="Verify" subtitle="Sequence proof.">
          <div className="mt-10 flex space-x-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`otp-container-${i}`} className="w-full">
                <label htmlFor={`otp-${i}`} className="sr-only">Digit {i+1} of verification code</label>
                <input 
                  id={`otp-${i}`}
                  ref={el => { otpRefs.current[i] = el; }} 
                  type="text" 
                  inputMode="numeric" 
                  maxLength={1} 
                  className={`w-full h-16 bg-slate-50 border-2 rounded-2xl text-center text-2xl font-black outline-none transition-all ${focusedOtpIndex === i ? 'border-indigo-600 bg-white ring-4 ring-indigo-50 shadow-lg' : 'border-transparent'}`} 
                  value={state.otp[i] || ''} 
                  onFocus={() => setFocusedOtpIndex(i)} 
                  onBlur={() => setFocusedOtpIndex(null)} 
                  onChange={(e) => handleOtpChange(i, e.target.value)} 
                  onKeyDown={(e) => handleOtpKeyDown(i, e)} 
                  aria-label={`Digit ${i+1} of verification code`}
                  aria-describedby="otp-instructions"
                />
              </div>
            ))}
          </div>
          <div id="otp-instructions" className="sr-only">
            Enter the 6-digit verification code sent to your email or phone
          </div>
          <PrimaryButton label="Verify" onClick={handleContinue} disabled={state.otp.length < 6} />
        </Layout>
      );
      case OnboardingPhase.AUTH_PASSWORD: return (
        <Layout showProgress currentStep={3} title="Security" subtitle="Vault access key.">
          <div>
            <label htmlFor="auth-password" className="sr-only">Password</label>
            <input 
              id="auth-password"
              type="password" 
              placeholder="Password" 
              className="w-full py-5 px-6 rounded-2xl bg-slate-50 mt-10" 
              value={password.main} 
              onChange={(e) => setPassword(prev => ({ ...prev, main: e.target.value }))} 
              aria-label="Enter your password for account security"
            />
          </div>
          <PrimaryButton label="Complete" onClick={handleContinue} />
        </Layout>
      );
      case OnboardingPhase.PROFILING: return <Layout title="Deep Profiling"><ProfilingFlow role={state.role!} onComplete={(data) => { setState(prev => ({ ...prev, profile: data, phase: OnboardingPhase.VERIFICATION_PENDING })); }} /></Layout>;
      case OnboardingPhase.VERIFICATION_PENDING: return (
        <div 
          className="flex flex-col items-center justify-center min-h-[550px] w-full max-w-lg bg-white rounded-[3rem] p-10 text-center shadow-2xl animate-in"
          role="status"
          aria-live="polite"
          aria-label="Institutional Audit Progress"
        >
          <div className="relative w-40 h-40 mb-10">
            <svg className="w-full h-full transform -rotate-90" aria-hidden="true">
              <circle cx="80" cy="80" r="72" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
              <circle cx="80" cy="80" r="72" fill="transparent" stroke="#4f46e5" strokeWidth="12" strokeDasharray="452" strokeDashoffset={452 - (452 * auditProgress) / 100} className="transition-all duration-300" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-900" aria-label={`Audit progress: ${auditProgress}%`}>
                {auditProgress}%
              </span>
            </div>
          </div>
          <Tooltip content="Our AI system is analyzing your profile to generate an institutional readiness score and match you with relevant opportunities">
            <h1 className="text-3xl font-black text-slate-900 mb-2 cursor-help">Institutional Audit</h1>
          </Tooltip>
          <div 
            className="w-full h-32 bg-slate-50 rounded-2xl p-5 overflow-y-auto hide-scrollbar flex flex-col items-start gap-1.5 mb-8"
            aria-label="Audit progress log"
            role="log"
          >
            {auditLog.map((log, i) => <p key={i} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left" aria-label={`Audit step: ${log}`}>› {log}</p>)}</div>
          <button 
            onClick={() => setState(prev => ({ ...prev, phase: OnboardingPhase.DASHBOARD }))} 
            disabled={auditProgress < 100} 
            className={`w-full py-5 rounded-2xl font-black text-lg transition-all ${auditProgress >= 100 ? 'bg-indigo-600 text-white shadow-xl hover:scale-105 active:scale-95' : 'bg-slate-100 text-slate-300'}`}
            aria-label={auditProgress >= 100 ? "Access dashboard" : "Processing, please wait"}
          >
            Access Dashboard
          </button>
        </div>
      );
      case OnboardingPhase.DASHBOARD: return <Dashboard role={state.role!} profile={state.profile} onConnect={handleWorkspaceTransition} />;
      case OnboardingPhase.WORKSPACE: return activeConnection ? <Workspace role={state.role!} connection={activeConnection} onEnd={(decision) => {
        // Update connection status based on decision
        if (decision === 'ACCEPT') {
          // In a real app, this would update the connection status on the backend
          console.log('Connection accepted, contact details exchanged');
        } else {
          console.log('Connection rejected');
        }
        setState(prev => ({ ...prev, phase: OnboardingPhase.DASHBOARD }));
      }} /> : null;
      default: return null;
    }
  };

  return (
    <div 
      className={`min-h-screen transition-all ${state.phase === OnboardingPhase.LANDING ? 'bg-slate-950' : 'bg-slate-50 flex items-center justify-center p-4'}`}
      role="main"
      aria-label="FundLink Application Main Content"
    >
      <div role="region" aria-live="polite" aria-label="Application Content">
        {renderPhase()}
      </div>
      {(state.phase === OnboardingPhase.DASHBOARD || state.phase === OnboardingPhase.WORKSPACE) && <AIChatBot />}
    </div>
  );
};

export default App;
