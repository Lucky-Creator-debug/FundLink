
export enum UserRole {
  FOUNDER = 'FOUNDER',
  INVESTOR = 'INVESTOR'
}

export enum OnboardingPhase {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  ROLE_SELECTION = 'ROLE_SELECTION',
  AUTH_IDENTIFIER = 'AUTH_IDENTIFIER',
  AUTH_OTP = 'AUTH_OTP',
  AUTH_PASSWORD = 'AUTH_PASSWORD',
  PROFILING = 'PROFILING',
  VERIFICATION_PENDING = 'VERIFICATION_PENDING',
  DASHBOARD = 'DASHBOARD',
  WORKSPACE = 'WORKSPACE'
}

export interface FounderProfile {
  projectName: string;
  ideaDescription: string;
  category: 'FinTech' | 'SaaS' | 'DeepTech' | 'Web3' | 'HealthTech' | string;
  industry: string;
  geography: string;
  stage: 'Idea' | 'Prototype' | 'MVP' | 'Live';
  problem: string;
  solution: string;
  competitors: string;
  pitchDeckRef?: string;
  readinessScore?: number;
}

export type InvestorType = 'Angel' | 'VC Fund' | 'Family Office' | 'Corporate' | 'Accelerator';

export type InvestmentStage = 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Growth' | 'IPO' | 'All';

export type InvestmentSector = 'FinTech' | 'AI' | 'SaaS' | 'Health' | 'Crypto' | 'D2C' | 'DeepTech' | string;

export interface InvestorProfile {
  investorType: InvestorType;
  sectors: InvestmentSector[];
  ticketSize: '$10k - $50k' | '$50k - $250k' | '$250k - $1M' | '$1M - $5M' | '$5M+' | string;
  stageFocus: InvestmentStage[];
  geographyFocus: string;
  pastInvestments: 'First-time Investor' | '1-5 deals' | '5-15 deals' | '15+ deals' | string;
}

export interface Connection {
  id: string;
  targetId: string;
  targetName: string; // The person/entity name
  projectName: string; // The project being discussed
  targetRole: UserRole;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  lastMessage?: string;
}

export interface OnboardingState {
  role: UserRole | null;
  identifier: string;
  otp: string;
  phase: OnboardingPhase;
  profile: FounderProfile | InvestorProfile | null;
  activeConnectionId?: string;
}

/**
 * Interface used for AI-generated institutional readiness and synergy reports.
 * Fixes missing export error in DeepDiveOverlay.tsx.
 */
export interface AIAnalysisReport {
  score: number;
  insights: string[];
  risks: string[];
  recommendation: string;
}
