import { useState, useEffect, useCallback } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis, CartesianGrid, AreaChart, Area, Line,
} from 'recharts';
import {
  Brain, Zap, Bot, Clock, DollarSign, TrendingUp, Shield, MessageSquare,
  FileText, Search, Database, Mail, Phone, Calendar, BarChart3, Users,
  ChevronRight, Sparkles, ArrowRight, CheckCircle, AlertTriangle, Target,
  Layers, RefreshCw, Globe, Cpu, Eye, Lock, Workflow, Building2,
  Stethoscope, UtensilsCrossed, Home, ShoppingCart, Scale, Calculator,
  Wrench, Megaphone, Cloud, Car, Smile, ChevronDown, ExternalLink,
  ArrowUpRight, Loader2, X, Star, Gauge, Map, Play,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────── CONSTANTS */
const M = '#C8A415';            // mustard-500
const ML = '#FFCA28';           // mustard-400
const MD = '#A68B10';           // mustard-600
const MG = 'rgba(200,164,21,0.12)'; // mustard glow bg
const MB = 'rgba(200,164,21,0.25)'; // mustard border
const BOOKING_URL = 'https://calendar.app.google/WX9ApsgqkK44SKwf6';
const CONTACT_URL = 'https://modern-mustard-seed-voice-agent.onrender.com/api/contact';

const STAT_C = { critical: '#EF4444', high: '#F59E0B', medium: '#22C55E' } as const;
const STAT_L = { critical: 'Critical', high: 'High', medium: 'Quick Win' } as const;

type Status = keyof typeof STAT_C;
type Tab = 'overview' | 'tools' | 'matrix' | 'workflows' | 'roadmap' | 'roi' | 'calculator';

/* ─────────────────────────────────────────────────────── DATA */
interface Tool {
  name: string; cat: string; impact: number; effort: number;
  desc: string; icon: React.FC<{ size?: number; color?: string }>; status: Status; phase: number;
}
interface WorkflowItem {
  name: string; before: string; after: string; steps: number; auto: number; savings: number;
}
interface Industry {
  name: string; icon: React.FC<{ size?: number; color?: string }>; score: number; subtitle: string;
  painPoints: string[]; tools: Tool[]; readiness: { subject: string; score: number }[];
  roi: { hoursWeek: number; costSavings: number; revenueGain: number; payback: string };
  workflows: WorkflowItem[];
  monthlyROI: { m: string; save: number; invest: number }[];
}

const INDUSTRIES: Record<string, Industry> = {
  financial: {
    name: 'Financial Advisor', icon: DollarSign, score: 87, subtitle: 'Wealth Management & Advisory',
    painPoints: ['Manual portfolio rebalancing', 'Compliance documentation', 'Client onboarding friction', 'Market research overhead', 'Follow-up gaps'],
    tools: [
      { name: 'AI Voice Agent', cat: 'Client Engagement', impact: 94, effort: 30, desc: '24/7 call handling, booking, portfolio Q&A', icon: Phone, status: 'critical', phase: 1 },
      { name: 'Document Intelligence', cat: 'Compliance', impact: 89, effort: 45, desc: 'Auto-extract, classify KYC/AML documents', icon: FileText, status: 'critical', phase: 1 },
      { name: 'Portfolio Copilot', cat: 'Advisory', impact: 91, effort: 60, desc: 'AI rebalancing suggestions & risk analysis', icon: TrendingUp, status: 'critical', phase: 2 },
      { name: 'Client Sentiment Engine', cat: 'Retention', impact: 78, effort: 50, desc: 'Communication patterns predict churn risk', icon: Eye, status: 'high', phase: 2 },
      { name: 'Meeting Summarizer', cat: 'Productivity', impact: 82, effort: 20, desc: 'Auto notes, action items, compliance records', icon: MessageSquare, status: 'high', phase: 1 },
      { name: 'Market Intel Agent', cat: 'Research', impact: 85, effort: 40, desc: 'Multi-source scanning with briefing gen', icon: Search, status: 'high', phase: 2 },
      { name: 'Smart Scheduler', cat: 'Operations', impact: 73, effort: 15, desc: 'AI calendar with preference learning', icon: Calendar, status: 'medium', phase: 1 },
      { name: 'Email Draft Agent', cat: 'Communication', impact: 76, effort: 25, desc: 'Context-aware drafting with compliance rails', icon: Mail, status: 'medium', phase: 3 },
    ],
    readiness: [{ subject: 'Data', score: 72 }, { subject: 'Process', score: 65 }, { subject: 'Team', score: 58 }, { subject: 'Compliance', score: 81 }, { subject: 'CX', score: 70 }, { subject: 'Tech', score: 63 }],
    roi: { hoursWeek: 32, costSavings: 14200, revenueGain: 28500, payback: '4.2 mo' },
    workflows: [
      { name: 'Client Onboarding', before: '4 hrs', after: '22 min', steps: 8, auto: 6, savings: 89 },
      { name: 'Portfolio Review Prep', before: '3 hrs', after: '15 min', steps: 5, auto: 4, savings: 92 },
      { name: 'Compliance Filing', before: '6 hrs', after: '35 min', steps: 12, auto: 10, savings: 90 },
      { name: 'Lead Qualification', before: '2 hrs', after: '8 min', steps: 6, auto: 5, savings: 93 },
    ],
    monthlyROI: [{ m: 'M1', save: 4200, invest: 8500 }, { m: 'M2', save: 8900, invest: 8500 }, { m: 'M3', save: 14200, invest: 8500 }, { m: 'M4', save: 19800, invest: 8500 }, { m: 'M5', save: 26100, invest: 8500 }, { m: 'M6', save: 33500, invest: 8500 }],
  },
  legal: {
    name: 'Law Firm', icon: Scale, score: 82, subtitle: 'Mid-Size Legal Practice',
    painPoints: ['Document review bottleneck', 'Billable hour gaps', 'Research overhead', 'Contract inconsistencies', 'Client delays'],
    tools: [
      { name: 'Contract Analysis AI', cat: 'Legal Ops', impact: 96, effort: 50, desc: 'Clause extraction, risk flagging, comparison', icon: FileText, status: 'critical', phase: 1 },
      { name: 'Legal Research Agent', cat: 'Research', impact: 93, effort: 55, desc: 'Multi-database case law with precedent mapping', icon: Search, status: 'critical', phase: 1 },
      { name: 'AI Voice Receptionist', cat: 'Client Intake', impact: 88, effort: 25, desc: 'Call routing, intake forms, case triage', icon: Phone, status: 'critical', phase: 1 },
      { name: 'Deposition Summarizer', cat: 'Litigation', impact: 85, effort: 35, desc: 'Auto-transcribe & extract key testimony', icon: MessageSquare, status: 'high', phase: 2 },
      { name: 'Time Capture Agent', cat: 'Billing', impact: 80, effort: 20, desc: 'Passive tracking with billing code assignment', icon: Clock, status: 'high', phase: 1 },
      { name: 'Brief Drafter', cat: 'Productivity', impact: 87, effort: 65, desc: 'AI legal writing with citation verification', icon: FileText, status: 'high', phase: 2 },
      { name: 'Client Portal AI', cat: 'Experience', impact: 74, effort: 45, desc: 'Self-service status, docs, FAQ', icon: Globe, status: 'medium', phase: 3 },
      { name: 'Conflict Checker', cat: 'Compliance', impact: 79, effort: 30, desc: 'Automated conflict screening across matters', icon: Shield, status: 'medium', phase: 2 },
    ],
    readiness: [{ subject: 'Data', score: 60 }, { subject: 'Process', score: 72 }, { subject: 'Team', score: 55 }, { subject: 'Compliance', score: 85 }, { subject: 'CX', score: 62 }, { subject: 'Tech', score: 58 }],
    roi: { hoursWeek: 38, costSavings: 18500, revenueGain: 35000, payback: '3.8 mo' },
    workflows: [
      { name: 'Contract Review', before: '5 hrs', after: '30 min', steps: 10, auto: 8, savings: 90 },
      { name: 'Case Research', before: '8 hrs', after: '45 min', steps: 7, auto: 5, savings: 91 },
      { name: 'Client Intake', before: '2 hrs', after: '12 min', steps: 9, auto: 7, savings: 90 },
      { name: 'Invoice Generation', before: '1.5 hrs', after: '10 min', steps: 6, auto: 5, savings: 89 },
    ],
    monthlyROI: [{ m: 'M1', save: 5500, invest: 9200 }, { m: 'M2', save: 12000, invest: 9200 }, { m: 'M3', save: 18500, invest: 9200 }, { m: 'M4', save: 26000, invest: 9200 }, { m: 'M5', save: 34500, invest: 9200 }, { m: 'M6', save: 44000, invest: 9200 }],
  },
  restaurant: {
    name: 'Restaurant Group', icon: UtensilsCrossed, score: 74, subtitle: 'Multi-Location Food Service',
    painPoints: ['Inconsistent experience', 'Reservation no-shows', 'Inventory waste', 'Scheduling chaos', 'Review overload'],
    tools: [
      { name: 'AI Voice Ordering', cat: 'Revenue', impact: 92, effort: 30, desc: 'Phone orders with upsell + POS integration', icon: Phone, status: 'critical', phase: 1 },
      { name: 'Reservation Agent', cat: 'Front of House', impact: 88, effort: 25, desc: 'Smart booking with no-show prediction', icon: Calendar, status: 'critical', phase: 1 },
      { name: 'Inventory Forecaster', cat: 'Operations', impact: 86, effort: 55, desc: 'Demand prediction with auto-ordering', icon: Database, status: 'critical', phase: 2 },
      { name: 'Review Responder', cat: 'Marketing', impact: 81, effort: 15, desc: 'AI responses across Yelp, Google, social', icon: MessageSquare, status: 'high', phase: 1 },
      { name: 'Staff Scheduler AI', cat: 'HR', impact: 78, effort: 40, desc: 'Demand-based scheduling + preferences', icon: Users, status: 'high', phase: 2 },
      { name: 'Menu Optimizer', cat: 'Strategy', impact: 75, effort: 45, desc: 'Pricing & placement from sales data', icon: TrendingUp, status: 'high', phase: 3 },
      { name: 'Health Compliance Bot', cat: 'Compliance', impact: 70, effort: 35, desc: 'Temp logging, inspection prep, HACCP', icon: Shield, status: 'medium', phase: 2 },
      { name: 'Social Content Engine', cat: 'Marketing', impact: 72, effort: 20, desc: 'Auto-posts from specials & kitchen content', icon: Globe, status: 'medium', phase: 1 },
    ],
    readiness: [{ subject: 'Data', score: 50 }, { subject: 'Process', score: 55 }, { subject: 'Team', score: 62 }, { subject: 'Compliance', score: 68 }, { subject: 'CX', score: 75 }, { subject: 'Tech', score: 45 }],
    roi: { hoursWeek: 25, costSavings: 9800, revenueGain: 22000, payback: '5.1 mo' },
    workflows: [
      { name: 'Phone Ordering', before: '5 min', after: 'Instant', steps: 6, auto: 5, savings: 95 },
      { name: 'Inventory Count', before: '3 hrs', after: '20 min', steps: 8, auto: 6, savings: 89 },
      { name: 'Review Response', before: '45 min', after: '3 min', steps: 4, auto: 3, savings: 93 },
      { name: 'Staff Scheduling', before: '4 hrs', after: '25 min', steps: 7, auto: 5, savings: 90 },
    ],
    monthlyROI: [{ m: 'M1', save: 3200, invest: 6800 }, { m: 'M2', save: 7100, invest: 6800 }, { m: 'M3', save: 9800, invest: 6800 }, { m: 'M4', save: 13500, invest: 6800 }, { m: 'M5', save: 17200, invest: 6800 }, { m: 'M6', save: 21800, invest: 6800 }],
  },
  realestate: {
    name: 'Real Estate', icon: Home, score: 79, subtitle: 'Brokerage & Property Mgmt',
    painPoints: ['Lead follow-up delays', 'Listing descriptions', 'Market analysis work', 'Showing coordination', 'Transaction complexity'],
    tools: [
      { name: 'Lead Nurture Agent', cat: 'Sales', impact: 95, effort: 30, desc: 'AI voice+text follow-up within 60 seconds', icon: Phone, status: 'critical', phase: 1 },
      { name: 'Listing Content AI', cat: 'Marketing', impact: 90, effort: 20, desc: 'MLS descriptions, social, virtual staging', icon: FileText, status: 'critical', phase: 1 },
      { name: 'CMA Generator', cat: 'Analytics', impact: 88, effort: 45, desc: 'Instant comp analysis + predictive pricing', icon: BarChart3, status: 'critical', phase: 2 },
      { name: 'Showing Coordinator', cat: 'Operations', impact: 83, effort: 25, desc: 'AI scheduling across agents & properties', icon: Calendar, status: 'high', phase: 1 },
      { name: 'Transaction Tracker', cat: 'Admin', impact: 80, effort: 40, desc: 'Milestone tracking + auto doc collection', icon: Layers, status: 'high', phase: 2 },
      { name: 'Market Intel Brief', cat: 'Research', impact: 77, effort: 35, desc: 'Weekly neighborhood trends + signals', icon: TrendingUp, status: 'high', phase: 2 },
      { name: 'Client Matcher', cat: 'CRM', impact: 74, effort: 50, desc: 'Property-buyer matching via behavior data', icon: Target, status: 'medium', phase: 3 },
      { name: 'Review Generator', cat: 'Reputation', impact: 71, effort: 15, desc: 'Post-close satisfaction + review requests', icon: MessageSquare, status: 'medium', phase: 1 },
    ],
    readiness: [{ subject: 'Data', score: 58 }, { subject: 'Process', score: 62 }, { subject: 'Team', score: 70 }, { subject: 'Compliance', score: 72 }, { subject: 'CX', score: 68 }, { subject: 'Tech', score: 55 }],
    roi: { hoursWeek: 28, costSavings: 11200, revenueGain: 31000, payback: '3.5 mo' },
    workflows: [
      { name: 'Lead Response', before: '4 hrs', after: '60 sec', steps: 5, auto: 4, savings: 97 },
      { name: 'Listing Launch', before: '6 hrs', after: '35 min', steps: 9, auto: 7, savings: 90 },
      { name: 'Offer to Close', before: '40 hrs', after: '8 hrs', steps: 15, auto: 11, savings: 80 },
      { name: 'Market Report', before: '3 hrs', after: '10 min', steps: 6, auto: 5, savings: 94 },
    ],
    monthlyROI: [{ m: 'M1', save: 3800, invest: 7500 }, { m: 'M2', save: 8200, invest: 7500 }, { m: 'M3', save: 11200, invest: 7500 }, { m: 'M4', save: 16500, invest: 7500 }, { m: 'M5', save: 22000, invest: 7500 }, { m: 'M6', save: 28500, invest: 7500 }],
  },
  healthcare: {
    name: 'Healthcare Practice', icon: Stethoscope, score: 76, subtitle: 'Private Practice & Specialty Clinic',
    painPoints: ['Scheduling inefficiency', 'Insurance verification', 'Documentation burden', 'Patient no-shows', 'After-hours calls'],
    tools: [
      { name: 'Patient Voice Agent', cat: 'Access', impact: 94, effort: 30, desc: '24/7 scheduling, refills, and triage', icon: Phone, status: 'critical', phase: 1 },
      { name: 'Clinical Scribe AI', cat: 'Documentation', impact: 92, effort: 55, desc: 'Real-time visit docs + EHR auto-populate', icon: FileText, status: 'critical', phase: 2 },
      { name: 'Insurance Verifier', cat: 'Revenue Cycle', impact: 87, effort: 40, desc: 'Auto eligibility + prior auth tracking', icon: Shield, status: 'critical', phase: 1 },
      { name: 'No-Show Predictor', cat: 'Operations', impact: 80, effort: 35, desc: 'Risk scoring + smart overbooking', icon: Target, status: 'high', phase: 2 },
      { name: 'Referral Coordinator', cat: 'Care', impact: 78, effort: 30, desc: 'Automated referral tracking + faxing', icon: RefreshCw, status: 'high', phase: 2 },
      { name: 'Patient Engagement', cat: 'Retention', impact: 76, effort: 20, desc: 'Personalized reminders + wellness content', icon: MessageSquare, status: 'high', phase: 1 },
      { name: 'Coding Assistant', cat: 'Billing', impact: 83, effort: 45, desc: 'AI CPT/ICD codes + compliance check', icon: Database, status: 'high', phase: 2 },
      { name: 'Waitlist Optimizer', cat: 'Scheduling', impact: 72, effort: 25, desc: 'Auto-fill cancellations from waitlist', icon: Calendar, status: 'medium', phase: 1 },
    ],
    readiness: [{ subject: 'Data', score: 68 }, { subject: 'Process', score: 70 }, { subject: 'Team', score: 52 }, { subject: 'Compliance', score: 88 }, { subject: 'CX', score: 65 }, { subject: 'Tech', score: 60 }],
    roi: { hoursWeek: 35, costSavings: 16800, revenueGain: 24000, payback: '4.0 mo' },
    workflows: [
      { name: 'Patient Intake', before: '25 min', after: '5 min', steps: 11, auto: 8, savings: 80 },
      { name: 'Visit Documentation', before: '15 min', after: '2 min', steps: 6, auto: 5, savings: 87 },
      { name: 'Insurance Auth', before: '45 min', after: '8 min', steps: 8, auto: 6, savings: 82 },
      { name: 'Appointment Booking', before: '8 min', after: 'Instant', steps: 5, auto: 4, savings: 95 },
    ],
    monthlyROI: [{ m: 'M1', save: 5200, invest: 9800 }, { m: 'M2', save: 11000, invest: 9800 }, { m: 'M3', save: 16800, invest: 9800 }, { m: 'M4', save: 23500, invest: 9800 }, { m: 'M5', save: 31000, invest: 9800 }, { m: 'M6', save: 39500, invest: 9800 }],
  },
  ecommerce: {
    name: 'E-Commerce Brand', icon: ShoppingCart, score: 84, subtitle: 'DTC & Online Retail',
    painPoints: ['Cart abandonment', 'Support volume', 'Product copy scaling', 'Return overhead', 'Personalization gaps'],
    tools: [
      { name: 'AI Shopping Assistant', cat: 'Conversion', impact: 93, effort: 45, desc: 'Conversational discovery + recommendations', icon: MessageSquare, status: 'critical', phase: 1 },
      { name: 'Support Automation', cat: 'CX', impact: 91, effort: 35, desc: 'Multi-channel AI handling 80%+ tickets', icon: Bot, status: 'critical', phase: 1 },
      { name: 'Product Copy Engine', cat: 'Content', impact: 88, effort: 20, desc: 'SEO descriptions + A+ content at scale', icon: FileText, status: 'critical', phase: 1 },
      { name: 'Cart Recovery Agent', cat: 'Revenue', impact: 86, effort: 25, desc: 'Smart abandonment + personalized offers', icon: DollarSign, status: 'high', phase: 1 },
      { name: 'Review Analyzer', cat: 'Insights', impact: 79, effort: 30, desc: 'Sentiment mining for product improvement', icon: Search, status: 'high', phase: 2 },
      { name: 'Dynamic Pricing AI', cat: 'Strategy', impact: 82, effort: 55, desc: 'Competitive pricing + margin optimization', icon: TrendingUp, status: 'high', phase: 3 },
      { name: 'Returns Processor', cat: 'Operations', impact: 75, effort: 40, desc: 'Auto RMA + fraud detection + restocking', icon: RefreshCw, status: 'medium', phase: 2 },
      { name: 'Ad Copy Generator', cat: 'Marketing', impact: 77, effort: 15, desc: 'Platform-specific creative + A/B variants', icon: Globe, status: 'medium', phase: 1 },
    ],
    readiness: [{ subject: 'Data', score: 78 }, { subject: 'Process', score: 70 }, { subject: 'Team', score: 72 }, { subject: 'Compliance', score: 65 }, { subject: 'CX', score: 80 }, { subject: 'Tech', score: 75 }],
    roi: { hoursWeek: 30, costSavings: 12500, revenueGain: 42000, payback: '2.8 mo' },
    workflows: [
      { name: 'Support Ticket', before: '20 min', after: '90 sec', steps: 7, auto: 6, savings: 92 },
      { name: 'Product Launch', before: '8 hrs', after: '45 min', steps: 12, auto: 9, savings: 91 },
      { name: 'Return Processing', before: '15 min', after: '3 min', steps: 8, auto: 6, savings: 80 },
      { name: 'Review Response', before: '10 min', after: '1 min', steps: 4, auto: 3, savings: 90 },
    ],
    monthlyROI: [{ m: 'M1', save: 4500, invest: 7000 }, { m: 'M2', save: 9200, invest: 7000 }, { m: 'M3', save: 12500, invest: 7000 }, { m: 'M4', save: 18000, invest: 7000 }, { m: 'M5', save: 24500, invest: 7000 }, { m: 'M6', save: 32000, invest: 7000 }],
  },
  saas: {
    name: 'SaaS Company', icon: Cloud, score: 86, subtitle: 'B2B Software Platform',
    painPoints: ['Churn prediction gaps', 'Onboarding complexity', 'Support ticket volume', 'Feature request chaos', 'Sales demo bottleneck'],
    tools: [
      { name: 'Churn Prediction AI', cat: 'Retention', impact: 95, effort: 55, desc: 'Usage pattern analysis + intervention triggers', icon: AlertTriangle, status: 'critical', phase: 1 },
      { name: 'AI Support Agent', cat: 'CX', impact: 93, effort: 40, desc: 'L1/L2 ticket resolution with escalation', icon: Bot, status: 'critical', phase: 1 },
      { name: 'Onboarding Copilot', cat: 'Activation', impact: 90, effort: 45, desc: 'Personalized setup guides + milestone tracking', icon: Map, status: 'critical', phase: 1 },
      { name: 'Sales Demo AI', cat: 'Revenue', impact: 87, effort: 50, desc: 'Personalized interactive demos on demand', icon: Play, status: 'high', phase: 2 },
      { name: 'Feature Prioritizer', cat: 'Product', impact: 82, effort: 35, desc: 'Request aggregation + revenue impact scoring', icon: Layers, status: 'high', phase: 2 },
      { name: 'Usage Analytics Agent', cat: 'Insights', impact: 84, effort: 30, desc: 'Behavioral cohort analysis + health scoring', icon: BarChart3, status: 'high', phase: 1 },
      { name: 'Content Generator', cat: 'Marketing', impact: 78, effort: 20, desc: 'Case studies, changelogs, help docs at scale', icon: FileText, status: 'medium', phase: 2 },
      { name: 'Integration Builder', cat: 'Platform', impact: 80, effort: 65, desc: 'AI-assisted API integration + testing', icon: Workflow, status: 'medium', phase: 3 },
    ],
    readiness: [{ subject: 'Data', score: 85 }, { subject: 'Process', score: 75 }, { subject: 'Team', score: 78 }, { subject: 'Compliance', score: 70 }, { subject: 'CX', score: 82 }, { subject: 'Tech', score: 88 }],
    roi: { hoursWeek: 42, costSavings: 22000, revenueGain: 55000, payback: '2.5 mo' },
    workflows: [
      { name: 'Support Resolution', before: '45 min', after: '4 min', steps: 6, auto: 5, savings: 91 },
      { name: 'User Onboarding', before: '5 days', after: '1 day', steps: 10, auto: 7, savings: 80 },
      { name: 'Churn Intervention', before: 'Reactive', after: 'Predictive', steps: 8, auto: 6, savings: 85 },
      { name: 'Release Comms', before: '4 hrs', after: '20 min', steps: 5, auto: 4, savings: 92 },
    ],
    monthlyROI: [{ m: 'M1', save: 8000, invest: 10500 }, { m: 'M2', save: 16500, invest: 10500 }, { m: 'M3', save: 22000, invest: 10500 }, { m: 'M4', save: 30000, invest: 10500 }, { m: 'M5', save: 39000, invest: 10500 }, { m: 'M6', save: 49000, invest: 10500 }],
  },
  agency: {
    name: 'Marketing Agency', icon: Megaphone, score: 83, subtitle: 'Digital & Creative Agency',
    painPoints: ['Content production bottleneck', 'Reporting overhead', 'Client communication gaps', 'Campaign optimization lag', 'Talent scaling issues'],
    tools: [
      { name: 'Content Factory AI', cat: 'Production', impact: 94, effort: 30, desc: 'Multi-format content generation at scale', icon: FileText, status: 'critical', phase: 1 },
      { name: 'Campaign Optimizer', cat: 'Performance', impact: 92, effort: 50, desc: 'Cross-platform bid + creative optimization', icon: TrendingUp, status: 'critical', phase: 2 },
      { name: 'Client Report Agent', cat: 'Account Mgmt', impact: 89, effort: 25, desc: 'Auto-generated performance dashboards', icon: BarChart3, status: 'critical', phase: 1 },
      { name: 'AI Voice Account Mgr', cat: 'Communication', impact: 85, effort: 30, desc: 'Status updates, briefing, and scheduling', icon: Phone, status: 'high', phase: 1 },
      { name: 'SEO Intelligence', cat: 'Strategy', impact: 83, effort: 35, desc: 'Keyword research + content gap analysis', icon: Search, status: 'high', phase: 2 },
      { name: 'Social Scheduler', cat: 'Execution', impact: 80, effort: 20, desc: 'Optimal timing + A/B caption generation', icon: Calendar, status: 'high', phase: 1 },
      { name: 'Competitor Monitor', cat: 'Research', impact: 78, effort: 40, desc: 'Real-time competitive intelligence feeds', icon: Eye, status: 'medium', phase: 2 },
      { name: 'Proposal Builder', cat: 'Sales', impact: 76, effort: 25, desc: 'Data-driven pitch decks + scope generation', icon: Target, status: 'medium', phase: 3 },
    ],
    readiness: [{ subject: 'Data', score: 72 }, { subject: 'Process', score: 68 }, { subject: 'Team', score: 75 }, { subject: 'Compliance', score: 55 }, { subject: 'CX', score: 78 }, { subject: 'Tech', score: 80 }],
    roi: { hoursWeek: 45, costSavings: 20000, revenueGain: 38000, payback: '2.9 mo' },
    workflows: [
      { name: 'Content Production', before: '6 hrs', after: '45 min', steps: 8, auto: 6, savings: 88 },
      { name: 'Client Reporting', before: '4 hrs', after: '15 min', steps: 6, auto: 5, savings: 94 },
      { name: 'Campaign Launch', before: '3 days', after: '4 hrs', steps: 12, auto: 8, savings: 83 },
      { name: 'Pitch Prep', before: '8 hrs', after: '1 hr', steps: 7, auto: 5, savings: 88 },
    ],
    monthlyROI: [{ m: 'M1', save: 7000, invest: 9500 }, { m: 'M2', save: 14500, invest: 9500 }, { m: 'M3', save: 20000, invest: 9500 }, { m: 'M4', save: 27000, invest: 9500 }, { m: 'M5', save: 35000, invest: 9500 }, { m: 'M6', save: 44000, invest: 9500 }],
  },
  accounting: {
    name: 'Accounting / CPA', icon: Calculator, score: 80, subtitle: 'CPA Firm & Bookkeeping',
    painPoints: ['Tax season overload', 'Data entry errors', 'Client document chase', 'Reconciliation tedium', 'Advisory upsell missed'],
    tools: [
      { name: 'Document Ingestion AI', cat: 'Data Entry', impact: 95, effort: 35, desc: 'Auto-extract from receipts, invoices, 1099s', icon: FileText, status: 'critical', phase: 1 },
      { name: 'AI Tax Research', cat: 'Advisory', impact: 90, effort: 50, desc: 'Code lookup + scenario modeling + updates', icon: Search, status: 'critical', phase: 2 },
      { name: 'Client Voice Agent', cat: 'Communication', impact: 87, effort: 25, desc: 'Status updates, doc requests, scheduling', icon: Phone, status: 'critical', phase: 1 },
      { name: 'Reconciliation Bot', cat: 'Bookkeeping', impact: 88, effort: 40, desc: 'Auto-match transactions + flag anomalies', icon: RefreshCw, status: 'high', phase: 1 },
      { name: 'Deadline Tracker', cat: 'Compliance', impact: 82, effort: 15, desc: 'Multi-client filing calendar + auto-reminders', icon: Calendar, status: 'high', phase: 1 },
      { name: 'Advisory Insights', cat: 'Value-Add', impact: 79, effort: 55, desc: 'Proactive tax-saving & cash flow alerts', icon: TrendingUp, status: 'high', phase: 3 },
      { name: 'Audit Prep AI', cat: 'Quality', impact: 84, effort: 45, desc: 'Auto-compile workpapers + anomaly detection', icon: Shield, status: 'high', phase: 2 },
      { name: 'Proposal Generator', cat: 'Sales', impact: 73, effort: 20, desc: 'Scope-based engagement letters + pricing', icon: Target, status: 'medium', phase: 2 },
    ],
    readiness: [{ subject: 'Data', score: 75 }, { subject: 'Process', score: 78 }, { subject: 'Team', score: 60 }, { subject: 'Compliance', score: 90 }, { subject: 'CX', score: 62 }, { subject: 'Tech', score: 65 }],
    roi: { hoursWeek: 40, costSavings: 19500, revenueGain: 22000, payback: '3.2 mo' },
    workflows: [
      { name: 'Document Processing', before: '45 min', after: '3 min', steps: 6, auto: 5, savings: 93 },
      { name: 'Monthly Close', before: '8 hrs', after: '1.5 hrs', steps: 10, auto: 7, savings: 81 },
      { name: 'Tax Prep', before: '6 hrs', after: '1 hr', steps: 12, auto: 9, savings: 83 },
      { name: 'Client Onboarding', before: '2 hrs', after: '15 min', steps: 7, auto: 5, savings: 88 },
    ],
    monthlyROI: [{ m: 'M1', save: 6500, invest: 8200 }, { m: 'M2', save: 13500, invest: 8200 }, { m: 'M3', save: 19500, invest: 8200 }, { m: 'M4', save: 27000, invest: 8200 }, { m: 'M5', save: 35000, invest: 8200 }, { m: 'M6', save: 44000, invest: 8200 }],
  },
  dental: {
    name: 'Dental Practice', icon: Smile, score: 75, subtitle: 'General & Specialty Dentistry',
    painPoints: ['Appointment gaps', 'Treatment plan acceptance', 'Insurance verification', 'Patient recall failures', 'Front desk overwhelm'],
    tools: [
      { name: 'AI Receptionist', cat: 'Front Desk', impact: 94, effort: 25, desc: '24/7 scheduling, confirmations, insurance Qs', icon: Phone, status: 'critical', phase: 1 },
      { name: 'Treatment Presenter', cat: 'Case Accept.', impact: 90, effort: 35, desc: 'Visual treatment plans + financing options', icon: Eye, status: 'critical', phase: 1 },
      { name: 'Insurance Verifier', cat: 'Revenue Cycle', impact: 88, effort: 30, desc: 'Real-time eligibility + benefit breakdown', icon: Shield, status: 'critical', phase: 1 },
      { name: 'Patient Recall AI', cat: 'Retention', impact: 85, effort: 20, desc: 'Smart recall sequences + reactivation', icon: RefreshCw, status: 'high', phase: 1 },
      { name: 'Clinical Notes AI', cat: 'Documentation', impact: 82, effort: 45, desc: 'Voice-to-chart with perio charting assist', icon: FileText, status: 'high', phase: 2 },
      { name: 'Review Manager', cat: 'Marketing', impact: 78, effort: 15, desc: 'Post-visit review requests + responses', icon: Star, status: 'high', phase: 1 },
      { name: 'Supply Optimizer', cat: 'Operations', impact: 72, effort: 40, desc: 'Usage prediction + auto-reorder triggers', icon: Database, status: 'medium', phase: 2 },
      { name: 'Marketing Engine', cat: 'Growth', impact: 75, effort: 30, desc: 'Procedure-specific campaigns + SEO content', icon: Megaphone, status: 'medium', phase: 3 },
    ],
    readiness: [{ subject: 'Data', score: 62 }, { subject: 'Process', score: 65 }, { subject: 'Team', score: 58 }, { subject: 'Compliance', score: 80 }, { subject: 'CX', score: 72 }, { subject: 'Tech', score: 52 }],
    roi: { hoursWeek: 26, costSavings: 11500, revenueGain: 32000, payback: '3.4 mo' },
    workflows: [
      { name: 'Patient Scheduling', before: '8 min', after: 'Instant', steps: 5, auto: 4, savings: 95 },
      { name: 'Insurance Verify', before: '20 min', after: '2 min', steps: 6, auto: 5, savings: 90 },
      { name: 'Treatment Planning', before: '30 min', after: '8 min', steps: 7, auto: 4, savings: 73 },
      { name: 'Patient Recall', before: '3 hrs', after: '15 min', steps: 5, auto: 4, savings: 92 },
    ],
    monthlyROI: [{ m: 'M1', save: 4000, invest: 7200 }, { m: 'M2', save: 8500, invest: 7200 }, { m: 'M3', save: 11500, invest: 7200 }, { m: 'M4', save: 16000, invest: 7200 }, { m: 'M5', save: 21000, invest: 7200 }, { m: 'M6', save: 27000, invest: 7200 }],
  },
};

/* ─────────────────────────────────────────────────────── READY TOOLS (real products) */
const READY_TOOLS: Record<string, { name: string; url: string }[]> = {
  'AI Voice Agent':          [{ name: 'Vapi', url: 'https://vapi.ai' }, { name: 'Bland.ai', url: 'https://bland.ai' }, { name: 'Retell AI', url: 'https://retellai.com' }],
  'Document Intelligence':   [{ name: 'Adobe Acrobat AI', url: 'https://acrobat.adobe.com' }, { name: 'Klippa', url: 'https://www.klippa.com' }, { name: 'Docsumo', url: 'https://www.docsumo.com' }],
  'Portfolio Copilot':       [{ name: 'Composer', url: 'https://composer.trade' }, { name: 'Magnifi', url: 'https://magnifi.com' }, { name: 'Riskalyze', url: 'https://riskalyze.com' }],
  'Client Sentiment Engine': [{ name: 'Birdeye', url: 'https://birdeye.com' }, { name: 'Medallia', url: 'https://www.medallia.com' }, { name: 'Qualtrics', url: 'https://www.qualtrics.com' }],
  'Meeting Summarizer':      [{ name: 'Otter.ai', url: 'https://otter.ai' }, { name: 'Fireflies.ai', url: 'https://fireflies.ai' }, { name: 'Fathom', url: 'https://fathom.video' }],
  'Market Intel Agent':      [{ name: 'Perplexity', url: 'https://perplexity.ai' }, { name: 'Exploding Topics', url: 'https://explodingtopics.com' }, { name: 'Crayon', url: 'https://www.crayon.co' }],
  'Smart Scheduler':         [{ name: 'Motion', url: 'https://usemotion.com' }, { name: 'Reclaim.ai', url: 'https://reclaim.ai' }, { name: 'Calendly AI', url: 'https://calendly.com' }],
  'Email Draft Agent':       [{ name: 'Superhuman', url: 'https://superhuman.com' }, { name: 'HubSpot AI', url: 'https://www.hubspot.com/artificial-intelligence' }, { name: 'Lavender', url: 'https://www.lavender.ai' }],
  'Contract Analysis AI':    [{ name: 'Harvey', url: 'https://harvey.ai' }, { name: 'Spellbook', url: 'https://www.spellbook.legal' }, { name: 'Ironclad', url: 'https://ironcladapp.com' }],
  'Legal Research Agent':    [{ name: 'Casetext', url: 'https://casetext.com' }, { name: 'Westlaw AI', url: 'https://legal.thomsonreuters.com/en/westlaw' }, { name: 'Harvey', url: 'https://harvey.ai' }],
  'AI Voice Receptionist':   [{ name: 'Vapi', url: 'https://vapi.ai' }, { name: 'Bland.ai', url: 'https://bland.ai' }, { name: 'Synthflow', url: 'https://synthflow.ai' }],
  'Deposition Summarizer':   [{ name: 'Otter.ai', url: 'https://otter.ai' }, { name: 'Fireflies.ai', url: 'https://fireflies.ai' }, { name: 'Trint', url: 'https://trint.com' }],
  'Time Capture Agent':      [{ name: 'Toggl', url: 'https://toggl.com' }, { name: 'TimeSolv', url: 'https://www.timesolv.com' }, { name: 'Clio', url: 'https://www.clio.com' }],
  'Brief Drafter':           [{ name: 'Harvey', url: 'https://harvey.ai' }, { name: 'Spellbook', url: 'https://www.spellbook.legal' }, { name: 'Lexis AI', url: 'https://www.lexisnexis.com' }],
  'Client Portal AI':        [{ name: 'Copilot', url: 'https://www.copilot.com' }, { name: 'HoneyBook', url: 'https://www.honeybook.com' }, { name: 'Clio Grow', url: 'https://www.clio.com' }],
  'Conflict Checker':        [{ name: 'Clio', url: 'https://www.clio.com' }, { name: 'MyCase', url: 'https://www.mycase.com' }, { name: 'PracticePanther', url: 'https://www.practicepanther.com' }],
  'AI Voice Ordering':       [{ name: 'SoundHound', url: 'https://www.soundhound.com' }, { name: 'Presto', url: 'https://presto.com' }, { name: 'ConverseNow', url: 'https://www.conversenow.ai' }],
  'Reservation Agent':       [{ name: 'OpenTable', url: 'https://www.opentable.com' }, { name: 'SevenRooms', url: 'https://sevenrooms.com' }, { name: 'Resy', url: 'https://resy.com' }],
  'Inventory Forecaster':    [{ name: 'MarketMan', url: 'https://www.marketman.com' }, { name: 'Jolt', url: 'https://www.jolt.com' }, { name: 'BlueCart', url: 'https://www.bluecart.com' }],
  'Review Responder':        [{ name: 'Birdeye', url: 'https://birdeye.com' }, { name: 'Podium', url: 'https://www.podium.com' }, { name: 'Widewail', url: 'https://widewail.com' }],
  'Staff Scheduler AI':      [{ name: '7shifts', url: 'https://www.7shifts.com' }, { name: 'HotSchedules', url: 'https://www.fourth.com/hotschedules' }, { name: 'Deputy', url: 'https://www.deputy.com' }],
  'Menu Optimizer':          [{ name: 'Galley', url: 'https://galleysolutions.com' }, { name: 'Apicbase', url: 'https://apicbase.com' }, { name: 'Craftable', url: 'https://www.craftable.com' }],
  'Health Compliance Bot':   [{ name: 'Jolt', url: 'https://www.jolt.com' }, { name: 'FoodDocs', url: 'https://fooddocs.eu' }, { name: 'Zenput', url: 'https://www.zenput.com' }],
  'Social Content Engine':   [{ name: 'Buffer AI', url: 'https://buffer.com' }, { name: 'Hootsuite AI', url: 'https://www.hootsuite.com' }, { name: 'Later', url: 'https://later.com' }],
  'Lead Nurture Agent':      [{ name: 'Follow Up Boss', url: 'https://www.followupboss.com' }, { name: 'Sierra', url: 'https://sierra.ai' }, { name: 'Lofty', url: 'https://lofty.com' }],
  'Listing Content AI':      [{ name: 'ListingAI', url: 'https://www.listingai.co' }, { name: 'Aryeo', url: 'https://www.aryeo.com' }, { name: 'Canva AI', url: 'https://www.canva.com' }],
  'CMA Generator':           [{ name: 'Cloud CMA', url: 'https://cloudcma.com' }, { name: 'RPR', url: 'https://www.narrpr.com' }, { name: 'W+R Studios', url: 'https://wrstudios.com' }],
  'Showing Coordinator':     [{ name: 'ShowingTime', url: 'https://www.showingtime.com' }, { name: 'Calendly', url: 'https://calendly.com' }, { name: 'NterNow', url: 'https://nternow.com' }],
  'Transaction Tracker':     [{ name: 'Dotloop', url: 'https://www.dotloop.com' }, { name: 'Skyslope', url: 'https://skyslope.com' }, { name: 'Brokermint', url: 'https://brokermint.com' }],
  'Market Intel Brief':      [{ name: 'Perplexity', url: 'https://perplexity.ai' }, { name: 'Altos Research', url: 'https://altosresearch.com' }, { name: 'Real Scout', url: 'https://www.realscout.com' }],
  'Client Matcher':          [{ name: 'Lofty', url: 'https://lofty.com' }, { name: 'HubSpot CRM', url: 'https://www.hubspot.com/crm' }, { name: 'Propertybase', url: 'https://www.propertybase.com' }],
  'Review Generator':        [{ name: 'Birdeye', url: 'https://birdeye.com' }, { name: 'Podium', url: 'https://www.podium.com' }, { name: 'NiceJob', url: 'https://nicejob.com' }],
  'Patient Voice Agent':     [{ name: 'Vapi', url: 'https://vapi.ai' }, { name: 'Luma Health', url: 'https://lumahealth.io' }, { name: 'Relatient', url: 'https://relatient.com' }],
  'Clinical Scribe AI':      [{ name: 'Nuance DAX', url: 'https://www.nuance.com' }, { name: 'Abridge', url: 'https://www.abridge.com' }, { name: 'Suki AI', url: 'https://www.suki.ai' }],
  'Insurance Verifier':      [{ name: 'Waystar', url: 'https://waystar.com' }, { name: 'Availity', url: 'https://www.availity.com' }, { name: 'Eligible', url: 'https://www.eligible.com' }],
  'No-Show Predictor':       [{ name: 'Luma Health', url: 'https://lumahealth.io' }, { name: 'Relatient', url: 'https://relatient.com' }, { name: 'Phreesia', url: 'https://www.phreesia.com' }],
  'Referral Coordinator':    [{ name: 'Kyruus', url: 'https://www.kyruus.com' }, { name: 'ReferralMD', url: 'https://referralmd.com' }, { name: 'Lumedic', url: 'https://www.lumedic.io' }],
  'Patient Engagement':      [{ name: 'Luma Health', url: 'https://lumahealth.io' }, { name: 'Phreesia', url: 'https://www.phreesia.com' }, { name: 'Klara', url: 'https://www.klara.com' }],
  'Coding Assistant':        [{ name: 'Fathom Health', url: 'https://fathomhealth.com' }, { name: 'Waystar', url: 'https://waystar.com' }, { name: 'Savista', url: 'https://savista.com' }],
  'Waitlist Optimizer':      [{ name: 'Luma Health', url: 'https://lumahealth.io' }, { name: 'Klara', url: 'https://www.klara.com' }, { name: 'Relatient', url: 'https://relatient.com' }],
  'AI Shopping Assistant':   [{ name: 'Tidio AI', url: 'https://www.tidio.com' }, { name: 'Drift', url: 'https://www.drift.com' }, { name: 'Gorgias', url: 'https://www.gorgias.com' }],
  'Support Automation':      [{ name: 'Intercom AI', url: 'https://www.intercom.com' }, { name: 'Zendesk AI', url: 'https://www.zendesk.com/ai' }, { name: 'Gorgias', url: 'https://www.gorgias.com' }],
  'Product Copy Engine':     [{ name: 'Jasper', url: 'https://www.jasper.ai' }, { name: 'Copy.ai', url: 'https://www.copy.ai' }, { name: 'Describely', url: 'https://describely.ai' }],
  'Cart Recovery Agent':     [{ name: 'Klaviyo', url: 'https://www.klaviyo.com' }, { name: 'Omnisend', url: 'https://www.omnisend.com' }, { name: 'Drip', url: 'https://www.drip.com' }],
  'Review Analyzer':         [{ name: 'Yotpo', url: 'https://www.yotpo.com' }, { name: 'Birdeye', url: 'https://birdeye.com' }, { name: 'Okendo', url: 'https://www.okendo.io' }],
  'Dynamic Pricing AI':      [{ name: 'Prisync', url: 'https://prisync.com' }, { name: 'Wiser', url: 'https://www.wiser.com' }, { name: 'Intelligence Node', url: 'https://www.intelligencenode.com' }],
  'Returns Processor':       [{ name: 'Loop Returns', url: 'https://www.loopreturns.com' }, { name: 'Narvar', url: 'https://corp.narvar.com' }, { name: 'AfterShip', url: 'https://www.aftership.com' }],
  'Ad Copy Generator':       [{ name: 'AdCreative.ai', url: 'https://www.adcreative.ai' }, { name: 'Jasper', url: 'https://www.jasper.ai' }, { name: 'Copy.ai', url: 'https://www.copy.ai' }],
  'Churn Prediction AI':     [{ name: 'Gainsight', url: 'https://www.gainsight.com' }, { name: 'ChurnZero', url: 'https://churnzero.com' }, { name: 'Mixpanel', url: 'https://mixpanel.com' }],
  'AI Support Agent':        [{ name: 'Intercom AI', url: 'https://www.intercom.com' }, { name: 'Zendesk AI', url: 'https://www.zendesk.com/ai' }, { name: 'Freshdesk', url: 'https://www.freshworks.com/freshdesk' }],
  'Onboarding Copilot':      [{ name: 'Appcues', url: 'https://www.appcues.com' }, { name: 'Userpilot', url: 'https://userpilot.com' }, { name: 'Userflow', url: 'https://userflow.com' }],
  'Sales Demo AI':           [{ name: 'Demostack', url: 'https://www.demostack.com' }, { name: 'Reprise', url: 'https://www.reprise.com' }, { name: 'Walnut', url: 'https://www.walnut.io' }],
  'Feature Prioritizer':     [{ name: 'Productboard', url: 'https://www.productboard.com' }, { name: 'Aha!', url: 'https://www.aha.io' }, { name: 'Canny', url: 'https://canny.io' }],
  'Usage Analytics Agent':   [{ name: 'Amplitude', url: 'https://amplitude.com' }, { name: 'Mixpanel', url: 'https://mixpanel.com' }, { name: 'PostHog', url: 'https://posthog.com' }],
  'Content Generator':       [{ name: 'Jasper', url: 'https://www.jasper.ai' }, { name: 'Copy.ai', url: 'https://www.copy.ai' }, { name: 'Writesonic', url: 'https://writesonic.com' }],
  'Integration Builder':     [{ name: 'Zapier', url: 'https://zapier.com' }, { name: 'Make', url: 'https://www.make.com' }, { name: 'n8n', url: 'https://n8n.io' }],
  'Content Factory AI':      [{ name: 'Jasper', url: 'https://www.jasper.ai' }, { name: 'Copy.ai', url: 'https://www.copy.ai' }, { name: 'Writesonic', url: 'https://writesonic.com' }],
  'Campaign Optimizer':      [{ name: 'Madgicx', url: 'https://madgicx.com' }, { name: 'Optmyzr', url: 'https://www.optmyzr.com' }, { name: 'Albert AI', url: 'https://albert.ai' }],
  'Client Report Agent':     [{ name: 'AgencyAnalytics', url: 'https://agencyanalytics.com' }, { name: 'DashThis', url: 'https://dashthis.com' }, { name: 'Databox', url: 'https://databox.com' }],
  'AI Voice Account Mgr':    [{ name: 'Vapi', url: 'https://vapi.ai' }, { name: 'Bland.ai', url: 'https://bland.ai' }, { name: 'Synthflow', url: 'https://synthflow.ai' }],
  'SEO Intelligence':        [{ name: 'Semrush', url: 'https://www.semrush.com' }, { name: 'Ahrefs', url: 'https://ahrefs.com' }, { name: 'Surfer SEO', url: 'https://surferseo.com' }],
  'Social Scheduler':        [{ name: 'Buffer', url: 'https://buffer.com' }, { name: 'Hootsuite', url: 'https://hootsuite.com' }, { name: 'Later', url: 'https://later.com' }],
  'Competitor Monitor':      [{ name: 'Crayon', url: 'https://www.crayon.co' }, { name: 'Klue', url: 'https://klue.com' }, { name: 'Semrush', url: 'https://www.semrush.com' }],
  'Proposal Builder':        [{ name: 'Proposify', url: 'https://www.proposify.com' }, { name: 'PandaDoc', url: 'https://www.pandadoc.com' }, { name: 'Better Proposals', url: 'https://betterproposals.io' }],
  'Document Ingestion AI':   [{ name: 'Google Doc AI', url: 'https://cloud.google.com/document-ai' }, { name: 'Klippa', url: 'https://www.klippa.com' }, { name: 'Docparser', url: 'https://docparser.com' }],
  'AI Tax Research':         [{ name: 'Thomson Reuters AI', url: 'https://legal.thomsonreuters.com' }, { name: 'Bloomberg Tax', url: 'https://pro.bloombergtax.com' }, { name: 'Casetext', url: 'https://casetext.com' }],
  'Client Voice Agent':      [{ name: 'Vapi', url: 'https://vapi.ai' }, { name: 'Bland.ai', url: 'https://bland.ai' }, { name: 'Synthflow', url: 'https://synthflow.ai' }],
  'Reconciliation Bot':      [{ name: 'Vic.ai', url: 'https://www.vic.ai' }, { name: 'AutoRec', url: 'https://autorec.ai' }, { name: 'Xero AI', url: 'https://www.xero.com' }],
  'Deadline Tracker':        [{ name: 'TaxDome', url: 'https://taxdome.com' }, { name: 'Canopy', url: 'https://www.getcanopy.com' }, { name: 'Karbon', url: 'https://karbonhq.com' }],
  'Advisory Insights':       [{ name: 'Jirav', url: 'https://www.jirav.com' }, { name: 'Fathom', url: 'https://www.fathomhq.com' }, { name: 'Futrli', url: 'https://www.futrli.com' }],
  'Audit Prep AI':           [{ name: 'Caseware', url: 'https://www.caseware.com' }, { name: 'Suralink', url: 'https://suralink.com' }, { name: 'AuditBoard', url: 'https://www.auditboard.com' }],
  'Proposal Generator':      [{ name: 'Ignition', url: 'https://ignitionapp.com' }, { name: 'PandaDoc', url: 'https://www.pandadoc.com' }, { name: 'Proposify', url: 'https://www.proposify.com' }],
  'AI Receptionist':         [{ name: 'Weave', url: 'https://www.getweave.com' }, { name: 'Vapi', url: 'https://vapi.ai' }, { name: 'Bland.ai', url: 'https://bland.ai' }],
  'Treatment Presenter':     [{ name: 'Modento', url: 'https://modento.io' }, { name: 'Dolphin Imaging', url: 'https://www.dolphinimaging.com' }, { name: 'Curve Dental', url: 'https://www.curvedental.com' }],
  'Patient Recall AI':       [{ name: 'Weave', url: 'https://www.getweave.com' }, { name: 'RevenueWell', url: 'https://www.revenuewell.com' }, { name: 'Solutionreach', url: 'https://www.solutionreach.com' }],
  'Clinical Notes AI':       [{ name: 'Nuance DAX', url: 'https://www.nuance.com' }, { name: 'Abridge', url: 'https://www.abridge.com' }, { name: 'Suki AI', url: 'https://www.suki.ai' }],
  'Review Manager':          [{ name: 'Birdeye', url: 'https://birdeye.com' }, { name: 'Podium', url: 'https://www.podium.com' }, { name: 'Weave', url: 'https://www.getweave.com' }],
  'Supply Optimizer':        [{ name: 'Henry Schein One', url: 'https://henryscheinone.com' }, { name: 'Curve Dental', url: 'https://www.curvedental.com' }, { name: 'Darby', url: 'https://www.darbydental.com' }],
  'Marketing Engine':        [{ name: 'RevenueWell', url: 'https://www.revenuewell.com' }, { name: 'Weave', url: 'https://www.getweave.com' }, { name: 'Podium', url: 'https://www.podium.com' }],
};

/* ─────────────────────────────────────────────────────── QUIZ DATA */
const QUIZ_QS = [
  { q: 'How do you handle after-hours inquiries?', opts: ['Voicemail / missed', 'Email auto-reply', 'Outsourced answering service', 'AI voice agent'], scores: [1, 2, 3, 4] },
  { q: 'How is your data currently organized?', opts: ['Spreadsheets everywhere', 'Basic CRM / database', 'Integrated systems', 'Fully connected data lake'], scores: [1, 2, 3, 4] },
  { q: 'How much time does your team spend on repetitive tasks daily?', opts: ['4+ hours', '2–4 hours', '1–2 hours', 'Under 1 hour'], scores: [1, 2, 3, 4] },
  { q: 'What\'s your current approach to AI tools?', opts: ['Haven\'t started', 'Experimenting with ChatGPT', 'Using a few AI tools', 'AI integrated into workflows'], scores: [1, 2, 3, 4] },
  { q: 'How quickly do you respond to new leads?', opts: ['Next day or later', 'Within a few hours', 'Within 1 hour', 'Under 5 minutes'], scores: [1, 2, 3, 4] },
];

/* ─────────────────────────────────────────────────────── SUB-COMPONENTS */
const AnimNum = ({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) => {
  const [d, setD] = useState(0);
  useEffect(() => {
    let s = 0;
    const step = value / 60;
    const t = setInterval(() => {
      s += step;
      if (s >= value) { setD(value); clearInterval(t); }
      else setD(Math.floor(s));
    }, 16);
    return () => clearInterval(t);
  }, [value]);
  return <span>{prefix}{d.toLocaleString()}{suffix}</span>;
};

const ChartTT = ({ active, payload, label }: { active?: boolean; payload?: { color?: string; fill?: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neutral-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-body">
      <div className="font-bold text-white mb-1 font-sans">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {p.value > 100 ? `$${p.value.toLocaleString()}` : p.value}
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────── SCORE RING */
const ScoreRing = ({ score, size = 88 }: { score: number; size?: number }) => {
  const inner = size * 0.8;
  const fontSize = size * 0.28;
  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: size, height: size,
        background: `conic-gradient(${M} ${score * 3.6}deg, rgba(255,255,255,0.04) 0deg)`,
        boxShadow: `0 0 24px rgba(200,164,21,0.15)`,
      }}
    >
      <div
        className="rounded-full bg-[#0a0804] flex items-center justify-center"
        style={{ width: inner, height: inner }}
      >
        <span className="font-mono font-bold text-white" style={{ fontSize }}>{score}</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────── READY TOOL LINK */
const ReadyToolLink = ({ name, url }: { name: string; url: string }) => {
  const [hov, setHov] = useState(false);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-mono font-bold transition-all duration-200 no-underline"
      style={{ background: hov ? MG : 'rgba(255,255,255,0.03)', color: hov ? M : 'rgba(255,255,255,0.35)', border: `1px solid ${hov ? MB : 'rgba(255,255,255,0.06)'}` }}>
      {name} <ExternalLink size={7} />
    </a>
  );
};

/* ─────────────────────────────────────────────────────── IMPACT BAR */
const ImpactBar = ({ value, className = '' }: { value: number; className?: string }) => (
  <div className={`h-1.5 rounded-full bg-white/[0.04] ${className}`}>
    <div
      className="h-full rounded-full"
      style={{ width: `${value}%`, background: `linear-gradient(90deg, ${M}, ${ML})`, boxShadow: `0 0 6px rgba(200,164,21,0.25)` }}
    />
  </div>
);

/* ─────────────────────────────────────────────────────── MAIN COMPONENT */
interface AuditResult {
  error?: boolean; businessName: string; industry: string; score: number;
  strengths: string[]; gaps: string[]; topTools: { name: string; impact: number; reason: string }[];
  monthlyTimeSaved: number; estimatedROI: number; quickWins: string[];
  competitiveEdge: string; riskOfInaction: string;
}

const AIAuditEngine: React.FC = () => {
  const [active, setActive] = useState('financial');
  const [tab, setTab] = useState<Tab>('overview');
  const [anim, setAnim] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  // Quiz
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // Audit
  const [showAudit, setShowAudit] = useState(false);
  const [auditUrl, setAuditUrl] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditPhase, setAuditPhase] = useState(0);

  // Lead
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [reportSent, setReportSent] = useState(false);

  // ROI calc
  const [roiCalc, setRoiCalc] = useState({ employees: 10, hourlyRate: 75, hoursWasted: 20 });

  const d = INDUSTRIES[active];
  const calcROI = {
    annualWaste: roiCalc.employees * roiCalc.hourlyRate * roiCalc.hoursWasted * 52,
    annualSaved: Math.round(roiCalc.employees * roiCalc.hourlyRate * roiCalc.hoursWasted * 52 * 0.7),
    hoursSaved: Math.round(roiCalc.employees * roiCalc.hoursWasted * 0.7),
  };

  const switchInd = useCallback((k: string) => {
    setActive(k);
    setTab('overview');
    setAnim(true);
    setTimeout(() => setAnim(false), 500);
  }, []);

  /* ── Lead capture to existing backend */
  const saveLead = useCallback(async (source: string) => {
    try {
      await fetch(CONTACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadName,
          email: leadEmail,
          message: `AI Audit Lead — Industry: ${d.name} | Company: ${leadCompany || 'N/A'} | Phone: ${leadPhone || 'N/A'} | URL: ${auditUrl || 'N/A'} | Source: ${source}`,
        }),
      });
    } catch (err) {
      console.error('Lead capture error:', err);
    }
  }, [leadName, leadEmail, leadPhone, leadCompany, auditUrl, d.name]);

  /* ── Run AI audit */
  const runAudit = useCallback(async () => {
    if (!auditUrl.trim() || !leadName.trim() || !leadEmail.trim()) return;
    setAuditLoading(true);
    setAuditResult(null);
    saveLead('audit-start');

    const phases = [1, 2, 3, 4, 5];
    for (const p of phases) {
      setAuditPhase(p);
      await new Promise(r => setTimeout(r, 800));
    }

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: auditUrl }),
      });
      const data = await res.json();
      setAuditResult(data);
    } catch {
      setAuditResult({
        error: true, businessName: auditUrl, industry: 'Unknown', score: 65,
        strengths: ['Web presence detected', 'Digital footprint exists', 'Growth potential identified'],
        gaps: ['AI integration opportunities found', 'Automation gaps detected', 'Process optimization needed', 'Customer experience can be enhanced'],
        topTools: [
          { name: 'AI Voice Agent', impact: 92, reason: 'Capture leads 24/7' },
          { name: 'Process Automation', impact: 87, reason: 'Reduce manual workflows' },
          { name: 'Content Intelligence', impact: 83, reason: 'Scale content production' },
          { name: 'Customer Insights AI', impact: 79, reason: 'Understand customer behavior' },
          { name: 'Smart Scheduling', impact: 75, reason: 'Optimize time management' },
        ],
        monthlyTimeSaved: 30, estimatedROI: 15000,
        quickWins: ['Deploy AI voice agent for calls', 'Automate email follow-ups', 'AI-powered content creation'],
        competitiveEdge: 'Early AI adoption creates a significant moat against slower competitors',
        riskOfInaction: 'Competitors adopting AI will capture market share through faster response times',
      });
    }
    setAuditLoading(false);
  }, [auditUrl, leadName, leadEmail, saveLead]);

  /* ── Quiz submit */
  const submitQuiz = (answerIdx: number) => {
    const newAnswers = [...quizAnswers, QUIZ_QS[quizStep].scores[answerIdx]];
    setQuizAnswers(newAnswers);
    if (quizStep < QUIZ_QS.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      const total = newAnswers.reduce((a, b) => a + b, 0);
      setQuizScore(Math.round((total / (QUIZ_QS.length * 4)) * 100));
    }
  };

  const PHASE_LABELS = ['', 'Scanning website...', 'Analyzing business model...', 'Mapping AI opportunities...', 'Calculating ROI projections...', 'Generating your audit...'];
  const TABS: { key: Tab; label: string; icon: React.FC<{ size?: number }> }[] = [
    { key: 'overview', label: 'Overview', icon: Layers },
    { key: 'tools', label: 'AI Tools', icon: Cpu },
    { key: 'matrix', label: 'Impact Matrix', icon: Target },
    { key: 'workflows', label: 'Workflows', icon: Workflow },
    { key: 'roadmap', label: 'Roadmap', icon: Map },
    { key: 'roi', label: 'ROI', icon: TrendingUp },
    { key: 'calculator', label: 'Calculator', icon: Calculator },
  ];

  return (
    <div className="min-h-screen bg-[#0a0804] text-white font-body relative overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full opacity-[0.12]"
          style={{ background: `radial-gradient(circle, ${ML} 0%, transparent 65%)` }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: `radial-gradient(circle, ${M} 0%, transparent 65%)` }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: `radial-gradient(ellipse, ${M} 0%, transparent 70%)` }} />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(rgba(200,164,21,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${M}40, transparent)` }} />
      </div>

      <div className="relative z-10 max-w-screen-2xl mx-auto px-6 md:px-10 py-10">

        {/* ═══════════ HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${MG}, transparent)`, border: `1px solid ${MB}` }}>
              <Cpu size={18} color={M} />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold tracking-[0.35em] uppercase mb-0.5" style={{ color: M }}>
                Modern Mustard Seed
              </div>
              <div className="font-sans text-xl font-extrabold text-white tracking-tight">
                AI Integration Audit Engine™
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => { setShowQuiz(true); setQuizStep(0); setQuizAnswers([]); setQuizScore(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-sans font-bold uppercase tracking-[0.15em] text-white/40 border border-white/[0.06] hover:border-mustard-500/30 hover:text-mustard-400 transition-all"
            >
              <Gauge size={12} /> AI Readiness Quiz
            </button>
            <button
              onClick={() => setShowAudit(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[11px] font-sans font-bold uppercase tracking-[0.15em] transition-all hover:scale-[1.02] text-[#0a0804]"
              style={{ background: `linear-gradient(135deg, ${M}, ${ML})`, boxShadow: `0 3px 16px rgba(200,164,21,0.35)` }}
            >
              <Sparkles size={12} /> Free AI Audit
            </button>
          </div>
        </div>

        {/* ═══════════ QUIZ MODAL */}
        {showQuiz && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
            <div className="glass-card w-full max-w-lg p-8 relative" style={{ border: `1px solid ${MB}` }}>
              <button onClick={() => setShowQuiz(false)} className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors">
                <X size={18} />
              </button>
              {quizScore === null ? (
                <>
                  <div className="text-[10px] font-mono font-bold tracking-[0.35em] uppercase mb-2" style={{ color: M }}>
                    AI Readiness Assessment
                  </div>
                  <div className="font-sans text-lg font-bold text-white mb-1">{QUIZ_QS[quizStep].q}</div>
                  <div className="text-xs text-white/30 font-body mb-5">Question {quizStep + 1} of {QUIZ_QS.length}</div>
                  {/* Progress */}
                  <div className="flex gap-1 mb-6">
                    {QUIZ_QS.map((_, i) => (
                      <div key={i} className="flex-1 h-0.5 rounded-full transition-all"
                        style={{ background: i <= quizStep ? M : 'rgba(255,255,255,0.06)' }} />
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    {QUIZ_QS[quizStep].opts.map((opt, i) => (
                      <button key={i} onClick={() => submitQuiz(i)}
                        className="text-left px-4 py-3.5 rounded-xl text-sm font-body text-white/60 border border-white/[0.06] bg-white/[0.02] hover:border-mustard-500/30 hover:text-white/90 hover:bg-mustard-500/5 transition-all">
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="text-[10px] font-mono font-bold tracking-[0.35em] uppercase mb-5" style={{ color: M }}>
                    Your AI Readiness Score
                  </div>
                  <div className="flex justify-center mb-5">
                    <ScoreRing score={quizScore} size={120} />
                  </div>
                  <div className="font-sans text-lg font-bold text-white mb-2">
                    {quizScore >= 75 ? 'You\'re AI-Ready! 🚀' : quizScore >= 50 ? 'Strong Foundation — Let\'s Build' : 'Massive Opportunity Ahead'}
                  </div>
                  <p className="text-sm text-white/40 font-body leading-relaxed mb-6 max-w-sm mx-auto">
                    {quizScore >= 75
                      ? 'Your operations are primed for advanced AI integration. Let\'s identify the highest-ROI moves.'
                      : quizScore >= 50
                      ? 'You have good building blocks in place. Strategic AI deployment could transform your efficiency.'
                      : 'You\'re sitting on a gold mine of automation opportunity. Early movers in your space are seeing 3–5x returns.'}
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <button onClick={() => { setShowQuiz(false); setShowAudit(true); }}
                      className="px-6 py-3 rounded-xl text-sm font-sans font-bold text-black transition-all"
                      style={{ background: `linear-gradient(135deg, ${M}, ${ML})` }}>
                      Get Personalized AI Audit →
                    </button>
                    <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-sans font-semibold text-white/60 border border-white/[0.08] hover:border-mustard-500/30 hover:text-mustard-400 transition-all no-underline">
                      <Calendar size={13} /> Book a Call
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ AUDIT MODAL */}
        {showAudit && (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-6 overflow-auto">
            <div className="glass-card w-full max-w-2xl p-8 relative max-h-[90vh] overflow-y-auto" style={{ border: `1px solid ${MB}` }}>
              <button
                onClick={() => { setShowAudit(false); setAuditResult(null); setAuditLoading(false); }}
                className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors z-10">
                <X size={18} />
              </button>

              {!auditResult && !auditLoading && (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                    style={{ background: MG, border: `1px solid ${MB}` }}>
                    <Sparkles size={24} color={M} />
                  </div>
                  <div className="font-sans text-2xl font-extrabold text-white tracking-tight mb-2">
                    Free AI Integration Audit
                  </div>
                  <p className="text-sm text-white/40 font-body mb-8 max-w-md mx-auto leading-relaxed">
                    Our AI will map every automation opportunity in your business and show you exactly what your custom platform could look like.
                  </p>
                  <div className="max-w-md mx-auto flex flex-col gap-3 text-left">
                    <div className="grid grid-cols-2 gap-3">
                      <input value={leadName} onChange={e => setLeadName(e.target.value)} placeholder="Your name *"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white font-body placeholder-white/20 focus:outline-none focus:border-mustard-500/30 transition-colors" />
                      <input value={leadCompany} onChange={e => setLeadCompany(e.target.value)} placeholder="Company (optional)"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white font-body placeholder-white/20 focus:outline-none focus:border-mustard-500/30 transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input value={leadEmail} onChange={e => setLeadEmail(e.target.value)} placeholder="your@email.com *" type="email"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white font-body placeholder-white/20 focus:outline-none focus:border-mustard-500/30 transition-colors" />
                      <input value={leadPhone} onChange={e => setLeadPhone(e.target.value)} placeholder="Phone (optional)"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white font-body placeholder-white/20 focus:outline-none focus:border-mustard-500/30 transition-colors" />
                    </div>
                    <div className="flex gap-3">
                      <input value={auditUrl} onChange={e => setAuditUrl(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && runAudit()}
                        placeholder="https://yourbusiness.com"
                        className="flex-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white font-body placeholder-white/20 focus:outline-none focus:border-mustard-500/30 transition-colors" />
                      <button onClick={runAudit}
                        disabled={!leadName.trim() || !leadEmail.trim() || !auditUrl.trim()}
                        className="px-6 py-3 rounded-xl text-sm font-sans font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap text-black"
                        style={{ background: `linear-gradient(135deg, ${M}, ${ML})` }}>
                        Run Audit
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/20 font-mono">
                      <Lock size={9} /> Your information is secure.
                    </div>
                  </div>
                </div>
              )}

              {auditLoading && (
                <div className="text-center py-10">
                  <Loader2 size={40} color={M} className="mx-auto mb-5 animate-spin" />
                  <div className="font-sans text-base font-bold text-white mb-1">{PHASE_LABELS[auditPhase]}</div>
                  {leadName && <div className="text-xs text-white/30 font-body mb-5">Hang tight, {leadName.split(' ')[0]} — usually takes about 15 seconds</div>}
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map(p => (
                      <div key={p} className="w-12 h-1 rounded-full transition-all duration-500"
                        style={{ background: p <= auditPhase ? M : 'rgba(255,255,255,0.06)' }} />
                    ))}
                  </div>
                </div>
              )}

              {auditResult && (
                <div>
                  {leadName && <div className="text-xs font-mono mb-3" style={{ color: M }}>Prepared for {leadName}{leadCompany ? ` · ${leadCompany}` : ''}</div>}

                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase mb-1" style={{ color: M }}>Personalized AI Audit</div>
                      <div className="font-sans text-xl font-extrabold text-white">{auditResult.businessName}</div>
                      <div className="text-xs text-white/40 font-body">{auditResult.industry}</div>
                    </div>
                    <ScoreRing score={auditResult.score} size={72} />
                  </div>

                  {/* KPI row */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { l: 'Monthly Hours Saved', v: `${auditResult.monthlyTimeSaved} hrs`, c: '#22C55E' },
                      { l: 'Est. Annual ROI', v: `$${(auditResult.estimatedROI * 12).toLocaleString()}`, c: M },
                      { l: 'Quick Wins Found', v: String(auditResult.quickWins.length), c: '#F59E0B' },
                    ].map((k, i) => (
                      <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 text-center">
                        <div className="text-[10px] text-white/30 font-body mb-1">{k.l}</div>
                        <div className="text-xl font-mono font-bold" style={{ color: k.c }}>{k.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Strengths + Gaps */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-sans font-bold text-green-400 mb-3"><CheckCircle size={12} /> Strengths</div>
                      {auditResult.strengths.map((s, i) => <div key={i} className="text-xs text-white/50 font-body mb-1.5 pl-3 border-l-2 border-green-400/20">{s}</div>)}
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-sans font-bold text-red-400 mb-3"><AlertTriangle size={12} /> AI Gaps</div>
                      {auditResult.gaps.map((g, i) => <div key={i} className="text-xs text-white/50 font-body mb-1.5 pl-3 border-l-2 border-red-400/20">{g}</div>)}
                    </div>
                  </div>

                  {/* Top Tools */}
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[11px] font-sans font-bold" style={{ color: M }}>Recommended AI Tools — By Impact</div>
                      <span className="text-[8px] font-mono text-white/25 uppercase tracking-widest">Hover for options</span>
                    </div>
                    {auditResult.topTools.map((t, i) => {
                      const readyOpts = READY_TOOLS[t.name];
                      return (
                        <div key={i} className="mb-4">
                          <div className="flex items-center gap-3 mb-1.5">
                            <div className="text-lg font-mono font-bold w-8 text-right" style={{ color: M }}>{t.impact}</div>
                            <div className="flex-1">
                              <ImpactBar value={t.impact} className="mb-1" />
                              <div className="flex justify-between">
                                <span className="text-xs font-sans font-semibold text-white/70">{t.name}</span>
                                <span className="text-[10px] text-white/30 font-body">{t.reason}</span>
                              </div>
                            </div>
                          </div>
                          {readyOpts && (
                            <div className="ml-11 flex gap-1.5 flex-wrap">
                              {readyOpts.map((rt, j) => <ReadyToolLink key={j} name={rt.name} url={rt.url} />)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Wins */}
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 mb-4">
                    <div className="text-[11px] font-sans font-bold text-amber-400 mb-3">⚡ Quick Wins — Deploy This Week</div>
                    <div className="flex gap-2 flex-wrap">
                      {auditResult.quickWins.map((w, i) => (
                        <div key={i} className="px-3 py-1.5 rounded-lg text-xs text-amber-200 font-body" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>{w}</div>
                      ))}
                    </div>
                  </div>

                  {/* Edge + Risk */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-white/[0.02] border-l-2 border-green-400/40 rounded-xl p-4">
                      <div className="text-[10px] font-mono font-bold text-green-400 mb-1">Competitive Edge</div>
                      <div className="text-xs text-white/50 font-body leading-relaxed">{auditResult.competitiveEdge}</div>
                    </div>
                    <div className="bg-white/[0.02] border-l-2 border-red-400/40 rounded-xl p-4">
                      <div className="text-[10px] font-mono font-bold text-red-400 mb-1">Risk of Inaction</div>
                      <div className="text-xs text-white/50 font-body leading-relaxed">{auditResult.riskOfInaction}</div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="rounded-2xl p-6 text-center" style={{ background: MG, border: `1px solid ${MB}` }}>
                    <div className="font-sans text-base font-extrabold text-white mb-1">Ready to turn this audit into your custom AI platform?</div>
                    <p className="text-xs text-white/40 font-body mb-5">We build everything above — one platform, your brand, fully integrated.</p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-sans font-bold text-black no-underline transition-all"
                        style={{ background: `linear-gradient(135deg, ${M}, ${ML})`, boxShadow: `0 4px 20px rgba(200,164,21,0.25)` }}>
                        <Calendar size={13} /> Book Your Free Strategy Call
                      </a>
                      <button onClick={async () => { await saveLead('email-report'); setReportSent(true); }} disabled={reportSent}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-sans font-semibold border border-white/[0.08] text-white/50 hover:border-mustard-500/30 hover:text-mustard-400 transition-all disabled:opacity-60">
                        {reportSent ? <><CheckCircle size={13} /> Report Sent!</> : <><Mail size={13} /> Email My Report</>}
                      </button>
                    </div>
                    {leadName && <p className="text-[11px] text-white/30 font-body mt-4">Hey {leadName.split(' ')[0]} — we'll follow up with a full breakdown for {leadCompany || auditResult.businessName}.</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ INDUSTRY TABS */}
        <div className="flex gap-2 flex-wrap mb-6">
          {Object.entries(INDUSTRIES).map(([k, ind]) => {
            const Icon = ind.icon;
            const isA = active === k;
            return (
              <button key={k} onClick={() => switchInd(k)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-sans font-semibold transition-all duration-200"
                style={{
                  background: isA ? `linear-gradient(135deg, ${M}, ${ML})` : 'rgba(255,255,255,0.03)',
                  border: isA ? '1px solid transparent' : '1px solid rgba(255,255,255,0.06)',
                  color: isA ? '#0a0804' : 'rgba(255,255,255,0.45)',
                  boxShadow: isA ? `0 2px 12px ${M}30` : 'none',
                  fontWeight: isA ? 700 : 500,
                }}>
                <Icon size={11} /> {ind.name}
              </button>
            );
          })}
        </div>

        {/* ═══════════ HERO BANNER */}
        <div
          className="rounded-2xl flex items-center justify-between p-6 md:p-8 mb-5 transition-all duration-500 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, rgba(200,164,21,0.12) 0%, rgba(10,8,4,0.5) 60%, rgba(200,164,21,0.06) 100%)`,
            border: `1px solid rgba(200,164,21,0.35)`,
            boxShadow: `0 0 40px rgba(200,164,21,0.08), inset 0 1px 0 rgba(200,164,21,0.15)`,
            opacity: anim ? 0.7 : 1, transform: anim ? 'translateY(4px)' : 'none',
          }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.06] pointer-events-none"
            style={{ background: `radial-gradient(circle, ${ML} 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }} />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <d.icon size={22} color={M} />
              <div>
                <div className="font-sans text-xl font-extrabold text-white">{d.name}</div>
                <div className="text-xs text-white/30 font-body">{d.subtitle}</div>
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              {d.painPoints.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10.5px] text-white/30 font-body">
                  <AlertTriangle size={9} color="#F59E0B" /> {p}
                </div>
              ))}
            </div>
          </div>
          <div className="text-center pl-8 hidden md:block">
            <div className="text-[9px] font-mono font-bold tracking-[0.25em] uppercase mb-2" style={{ color: M }}>AI Readiness</div>
            <ScoreRing score={d.score} />
          </div>
        </div>

        {/* ═══════════ SECTION TABS */}
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-sans font-semibold whitespace-nowrap transition-all duration-200"
              style={{
                background: tab === t.key ? `rgba(200,164,21,0.18)` : 'transparent',
                border: tab === t.key ? `1.5px solid ${M}55` : '1px solid transparent',
                color: tab === t.key ? ML : 'rgba(255,255,255,0.38)',
                textShadow: tab === t.key ? `0 0 12px ${M}60` : 'none',
              }}>
              <t.icon size={11} /> {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════ OVERVIEW */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Radar */}
            <div className="glass-card p-6">
              <div className="text-xs font-sans font-bold text-white mb-4">AI Readiness Radar</div>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={d.readiness}>
                  <PolarGrid stroke="rgba(255,255,255,0.04)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'Space Mono' }} />
                  <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                  <Radar dataKey="score" stroke={M} fill={M} fillOpacity={0.12} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: 'Hours Saved / Week', v: d.roi.hoursWeek, s: ' hrs', icon: Clock, c: '#22C55E' },
                { l: 'Monthly Savings', v: d.roi.costSavings, p: '$', icon: DollarSign, c: M },
                { l: 'Revenue Uplift', v: d.roi.revenueGain, p: '$', icon: TrendingUp, c: '#A78BFA' },
                { l: 'Payback Period', r: d.roi.payback, icon: RefreshCw, c: '#F59E0B' },
              ].map((k, i) => (
                <div key={i} className="glass-card p-5 relative overflow-hidden"
                  style={{ boxShadow: `0 0 30px ${k.c}12`, border: `1px solid ${k.c}22` }}>
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.06]"
                    style={{ background: `radial-gradient(circle, ${k.c} 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }} />
                  <div className="flex justify-between mb-3">
                    <span className="text-[10px] text-white/40 font-body">{k.l}</span>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${k.c}18` }}>
                      <k.icon size={12} color={k.c} />
                    </div>
                  </div>
                  <div className="text-3xl font-mono font-bold" style={{ color: k.c }}>
                    {k.r || <AnimNum value={k.v!} prefix={k.p || ''} suffix={k.s || ''} />}
                  </div>
                </div>
              ))}
            </div>

            {/* Top Recommendations */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-xs font-sans font-bold text-white">Top AI Recommendations</div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ color: ML, background: `rgba(200,164,21,0.15)`, border: `1px solid rgba(200,164,21,0.25)` }}>✦ Critical</span>
              </div>
              {d.tools.filter(t => t.status === 'critical').map((t, i) => {
                const readyOpts = READY_TOOLS[t.name];
                return (
                  <div key={i} className="mb-3 rounded-xl p-3 transition-all"
                    style={{ background: 'rgba(200,164,21,0.04)', border: '1px solid rgba(200,164,21,0.08)' }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(200,164,21,0.15)`, boxShadow: `0 0 12px rgba(200,164,21,0.15)` }}>
                        <t.icon size={14} color={ML} />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-sans font-semibold text-white">{t.name}</div>
                        <div className="text-[10px] text-white/35 font-body">{t.desc}</div>
                      </div>
                      <div className="text-sm font-mono font-bold" style={{ color: ML }}>{t.impact}%</div>
                    </div>
                    {readyOpts && (
                      <div className="flex gap-1.5 flex-wrap pl-11">
                        {readyOpts.map((rt, j) => <ReadyToolLink key={j} name={rt.name} url={rt.url} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Before → After */}
            <div className="glass-card p-6">
              <div className="text-xs font-sans font-bold text-white mb-4">Before → After AI</div>
              {d.workflows.map((w, i) => (
                <div key={i} className="mb-4">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-sans font-semibold text-white/70">{w.name}</span>
                    <span className="text-xs font-mono" style={{ color: M }}>{w.before} → {w.after}</span>
                  </div>
                  <ImpactBar value={w.savings} />
                  <div className="text-[10px] text-white/20 font-body mt-1">{w.savings}% time reduction</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ TOOLS */}
        {tab === 'tools' && (
          <div>
            {/* Delivery model banner */}
            <div className="glass-card p-6 mb-4" style={{ border: `1px solid ${MB}` }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: MG }}>
                  <Layers size={16} color={M} />
                </div>
                <div>
                  <div className="text-sm font-sans font-bold text-white">Three Ways to Get Here</div>
                  <div className="text-xs text-white/30 font-body">Full platform, individual tools, or start with existing options today</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: 'Full Custom Platform', badge: 'ALL-IN-ONE', desc: 'Your entire AI stack as one unified platform — every tool, one dashboard, your brand.', tags: ['Fully integrated', 'Your branding', 'One dashboard', 'You own it'], c: M },
                  { label: 'Individual MMS Tools', badge: 'À LA CARTE', desc: 'Pick the tools you need most — we build and deploy them individually, tailored to your business.', tags: ['Voice agents', 'Doc AI', 'Chatbots', 'Automations'], c: '#22C55E' },
                  { label: 'DIY with Existing Tools', badge: 'SELF-SERVE', desc: 'Each tool card shows third-party options you can start using today.', tags: ['Start today', 'Known brands', 'Lower upfront', 'Good for testing'], c: '#6B8AFF' },
                ].map((item, i) => (
                  <div key={i} className="bg-white/[0.02] border-l-2 rounded-xl p-4" style={{ borderColor: item.c }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-sans font-bold" style={{ color: item.c }}>{item.label}</span>
                    </div>
                    <div className="text-[9px] font-mono font-bold px-2 py-0.5 rounded inline-block mb-3" style={{ color: item.c, background: `${item.c}15` }}>{item.badge}</div>
                    <p className="text-xs text-white/40 font-body leading-relaxed mb-3">{item.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag, j) => (
                        <span key={j} className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ color: item.c, background: `${item.c}10`, border: `1px solid ${item.c}20` }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {d.tools.map((t, i) => (
                <div key={i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  className="glass-card overflow-hidden transition-all duration-300"
                  style={{ borderColor: hovered === i ? MB : 'rgba(255,255,255,0.04)', transform: hovered === i ? 'translateY(-2px)' : 'none' }}>
                  <div className="p-5">
                    <div className="flex justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: MG }}>
                          <t.icon size={15} color={M} />
                        </div>
                        <div>
                          <div className="text-sm font-sans font-semibold text-white">{t.name}</div>
                          <div className="text-[10px] text-white/30 font-body">{t.cat}</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full h-fit"
                        style={{ background: `${STAT_C[t.status]}12`, color: STAT_C[t.status], border: `1px solid ${STAT_C[t.status]}25` }}>
                        {STAT_L[t.status]}
                      </div>
                    </div>
                    <p className="text-xs text-white/40 font-body leading-relaxed mb-3">{t.desc}</p>
                    <div className="flex items-center justify-between text-[10px] text-white/30 font-body mb-3">
                      <span>Phase {t.phase}</span>
                      <span>Impact: <span className="font-bold" style={{ color: M }}>{t.impact}%</span></span>
                    </div>
                    <ImpactBar value={t.impact} />
                    {READY_TOOLS[t.name] && (
                      <div className="mt-3 pt-3 border-t border-white/[0.04]">
                        <div className="text-[8px] font-mono font-bold text-white/25 mb-2 uppercase tracking-[0.18em]">Ready to use today</div>
                        <div className="flex gap-1.5 flex-wrap">
                          {READY_TOOLS[t.name].map((rt, j) => <ReadyToolLink key={j} name={rt.name} url={rt.url} />)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-card mt-4 p-6 text-center" style={{ background: MG, border: `1px solid ${MB}` }}>
              <div className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase mb-2" style={{ color: M }}>The MMS Approach</div>
              <div className="font-sans text-base font-extrabold text-white mb-2">Need one tool or the whole stack? We build both.</div>
              <p className="text-xs text-white/40 font-body max-w-xl mx-auto mb-4 leading-relaxed">
                Deploy a single AI voice agent for your {d.name.toLowerCase()} this week, or let us build your full custom platform with every tool integrated.
              </p>
              <div className="flex justify-center gap-6 text-xs flex-wrap font-body">
                <div><span className="font-bold text-green-400">1 tool</span> <span className="text-white/30">→ deployed in days</span></div>
                <div><span className="font-bold" style={{ color: M }}>Full platform</span> <span className="text-white/30">→ live in weeks</span></div>
                <div><span className="font-bold text-[#6B8AFF]">DIY tools</span> <span className="text-white/30">→ start today</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ IMPACT MATRIX */}
        {tab === 'matrix' && (
          <div className="glass-card p-6">
            <div className="text-xs font-sans font-bold text-white mb-1">Impact vs. Effort Matrix</div>
            <div className="text-xs text-white/30 font-body mb-5">Top-right = high impact, low effort (prioritize these)</div>
            <div className="relative">
              <ResponsiveContainer width="100%" height={420}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" dataKey="effort" name="Effort" domain={[0, 70]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false}
                    label={{ value: 'Implementation Effort →', position: 'bottom', fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} reversed />
                  <YAxis type="number" dataKey="impact" name="Impact" domain={[65, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false}
                    label={{ value: 'Business Impact →', angle: -90, position: 'left', fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
                  <ZAxis range={[200, 500]} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as Tool;
                    return (
                      <div className="bg-neutral-950 border rounded-xl p-3" style={{ borderColor: MB }}>
                        <div className="text-sm font-sans font-bold text-white mb-1">{item.name}</div>
                        <div className="text-xs text-white/40 font-body mb-2">{item.cat}</div>
                        <div className="flex gap-4">
                          <div><div className="text-[9px] text-white/30">Impact</div><div className="text-sm font-mono font-bold" style={{ color: M }}>{item.impact}%</div></div>
                          <div><div className="text-[9px] text-white/30">Effort</div><div className="text-sm font-mono font-bold text-white/60">{item.effort}%</div></div>
                        </div>
                        <div className="mt-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded inline-block"
                          style={{ color: STAT_C[item.status], background: `${STAT_C[item.status]}15` }}>{STAT_L[item.status]}</div>
                      </div>
                    );
                  }} />
                  <Scatter data={d.tools}>
                    {d.tools.map((t, i) => <Cell key={i} fill={STAT_C[t.status]} fillOpacity={0.8} stroke={STAT_C[t.status]} strokeWidth={1} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div className="absolute top-6 left-12 text-[9px] font-mono font-bold text-white/10 tracking-widest">⚡ QUICK WINS</div>
              <div className="absolute top-6 right-10 text-[9px] font-mono font-bold text-white/10 tracking-widest">🎯 STRATEGIC</div>
              <div className="absolute bottom-12 left-12 text-[9px] font-mono font-bold text-white/[0.06] tracking-widest">NICE TO HAVE</div>
              <div className="absolute bottom-12 right-10 text-[9px] font-mono font-bold text-white/[0.06] tracking-widest">LONG-TERM</div>
            </div>
            <div className="flex gap-5 justify-center mt-2">
              {(Object.entries(STAT_C) as [Status, string][]).map(([k, c]) => (
                <div key={k} className="flex items-center gap-2 text-xs font-body text-white/40">
                  <div className="w-2 h-2 rounded-full" style={{ background: c }} /> {STAT_L[k]}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ WORKFLOWS */}
        {tab === 'workflows' && (
          <div className="flex flex-col gap-4">
            {d.workflows.map((w, i) => (
              <div key={i} className="glass-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="font-sans text-base font-bold text-white">{w.name}</div>
                    <div className="text-xs text-white/30 font-body">{w.steps} steps · {w.auto} automated</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-[9px] font-mono font-bold text-red-400">BEFORE</div>
                      <div className="text-base font-mono font-bold text-red-400">{w.before}</div>
                    </div>
                    <ArrowRight size={14} className="text-white/20" />
                    <div className="text-center">
                      <div className="text-[9px] font-mono font-bold text-green-400">AFTER</div>
                      <div className="text-base font-mono font-bold text-green-400">{w.after}</div>
                    </div>
                    <div className="px-4 py-2 rounded-lg" style={{ background: MG, border: `1px solid ${MB}` }}>
                      <span className="text-lg font-mono font-bold" style={{ color: M }}>{w.savings}%</span>
                      <span className="text-[9px] text-white/30 font-body ml-1">faster</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Array.from({ length: w.steps }).map((_, j) => (
                    <div key={j} className="flex items-center">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{
                          background: j < w.auto ? MG : 'rgba(255,255,255,0.02)',
                          border: j < w.auto ? `1.5px solid ${MB}` : '1.5px solid rgba(255,255,255,0.05)',
                        }}>
                        {j < w.auto ? <Bot size={14} color={M} /> : <Users size={13} className="text-white/20" />}
                      </div>
                      {j < w.steps - 1 && <ChevronRight size={11} className="text-white/10 mx-0.5" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════ ROADMAP */}
        {tab === 'roadmap' && (
          <div>
            <div className="glass-card p-5 mb-4 flex items-center gap-3" style={{ border: `1px solid ${MB}` }}>
              <Sparkles size={16} color={M} />
              <div>
                <div className="text-sm font-sans font-bold text-white">Your Custom Platform Build Roadmap</div>
                <div className="text-xs text-white/30 font-body">We deploy your AI tools in 3 phases — results from week one, full platform by month 6</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(phase => {
                const tools = d.tools.filter(t => t.phase === phase);
                const COLS = ['#22C55E', '#F59E0B', '#8B5CF6'];
                const LABELS = ['Quick Deploy', 'Core Platform', 'Advanced Intelligence'];
                const TIMES = ['Week 1–2', 'Month 1–2', 'Month 3–6'];
                const DESCS = ['High-impact tools live fast — immediate ROI', 'Your unified dashboard takes shape', 'Predictive AI & deep integrations'];
                return (
                  <div key={phase} className="glass-card p-5" style={{ border: `1px solid ${COLS[phase - 1]}20` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold"
                        style={{ background: `${COLS[phase - 1]}15`, color: COLS[phase - 1] }}>{phase}</div>
                      <div>
                        <div className="text-sm font-sans font-bold text-white">{LABELS[phase - 1]}</div>
                        <div className="text-[10px] text-white/30 font-body">{TIMES[phase - 1]}</div>
                      </div>
                    </div>
                    <p className="text-xs text-white/40 font-body leading-relaxed mb-3">{DESCS[phase - 1]}</p>
                    <div className="h-0.5 rounded-full mb-4" style={{ background: `${COLS[phase - 1]}20` }}>
                      <div className="h-full rounded-full w-full" style={{ background: COLS[phase - 1], opacity: 0.4 }} />
                    </div>
                    {tools.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2 bg-white/[0.02] rounded-xl p-3">
                        <t.icon size={13} color={COLS[phase - 1]} />
                        <div className="flex-1">
                          <div className="text-xs font-sans font-semibold text-white/80">{t.name}</div>
                          <div className="text-[10px] text-white/30 font-body">Impact: {t.impact}%</div>
                        </div>
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{ color: COLS[phase - 1], background: `${COLS[phase - 1]}10` }}>✦ Built</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ ROI */}
        {tab === 'roi' && (
          <div className="flex flex-col gap-4">
            {/* Area chart */}
            <div className="glass-card p-6">
              <div className="text-xs font-sans font-bold text-white mb-4">Cumulative ROI — 6 Month Projection</div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={d.monthlyROI}>
                  <defs>
                    <linearGradient id="mustardGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={M} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={M} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="m" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTT />} />
                  <Area type="monotone" dataKey="save" name="Cumulative Savings" stroke={M} fill="url(#mustardGrad)" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="invest" name="Investment" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="6 4" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bar chart */}
              <div className="glass-card p-6">
                <div className="text-xs font-sans font-bold text-white mb-4">Tool Impact Ranking</div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={[...d.tools].sort((a, b) => b.impact - a.impact)} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9.5 }} width={120} axisLine={false} />
                    <Tooltip content={<ChartTT />} />
                    <Bar dataKey="impact" name="Impact" radius={[0, 5, 5, 0]} barSize={12}>
                      {d.tools.map((t, i) => <Cell key={i} fill={STAT_C[t.status]} fillOpacity={0.7} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 12-month projection */}
              <div className="glass-card p-6">
                <div className="text-xs font-sans font-bold text-white mb-5">12-Month Projection</div>
                {[
                  { l: 'Annual Cost Savings', v: `$${(d.roi.costSavings * 12).toLocaleString()}` },
                  { l: 'Annual Revenue Gain', v: `$${(d.roi.revenueGain * 12).toLocaleString()}` },
                  { l: 'Total Annual ROI', v: `$${((d.roi.costSavings + d.roi.revenueGain) * 12).toLocaleString()}`, hi: true },
                  { l: 'Hours Recaptured / Year', v: `${(d.roi.hoursWeek * 52).toLocaleString()} hrs` },
                  { l: 'Payback Period', v: d.roi.payback },
                ].map((r, i) => (
                  <div key={i} className={`flex justify-between py-3 ${i < 4 ? 'border-b border-white/[0.03]' : ''}`}>
                    <span className={`text-xs font-body ${r.hi ? 'text-white' : 'text-white/40'}`}>{r.l}</span>
                    <span className={`font-mono font-bold ${r.hi ? 'text-lg' : 'text-sm text-white'}`} style={r.hi ? { color: M } : {}}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ CALCULATOR */}
        {tab === 'calculator' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-6">
              <div className="text-xs font-sans font-bold text-white mb-1">Your Custom ROI Calculator</div>
              <div className="text-xs text-white/30 font-body mb-6">See how much capacity AI can unlock for your team</div>
              {[
                { l: 'Team Size', k: 'employees' as const, min: 1, max: 500, step: 1, unit: '' },
                { l: 'Avg. Hourly Value ($/hr)', k: 'hourlyRate' as const, min: 15, max: 300, step: 5, unit: '$' },
                { l: 'Hours on Repetitive Tasks / Week', k: 'hoursWasted' as const, min: 1, max: 60, step: 1, unit: 'hrs' },
              ].map((f, i) => (
                <div key={i} className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-white/60 font-body">{f.l}</span>
                    <span className="text-sm font-mono font-bold" style={{ color: M }}>
                      {f.unit === '$' ? '$' : ''}{roiCalc[f.k]}{f.unit === 'hrs' ? ' hrs' : ''}
                    </span>
                  </div>
                  <input type="range" min={f.min} max={f.max} step={f.step} value={roiCalc[f.k]}
                    onChange={e => setRoiCalc({ ...roiCalc, [f.k]: Number(e.target.value) })}
                    className="w-full h-1 rounded-full outline-none cursor-pointer"
                    style={{ accentColor: M, background: 'rgba(255,255,255,0.06)' }} />
                </div>
              ))}
            </div>

            <div className="glass-card p-6 flex flex-col justify-center">
              <div className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase mb-5" style={{ color: M }}>Your Projected Results</div>
              {[
                { l: 'Annual Time Investment in Repetitive Tasks', v: `$${calcROI.annualWaste.toLocaleString()}`, c: '#F59E0B', desc: `${roiCalc.employees} team × $${roiCalc.hourlyRate}/hr × ${roiCalc.hoursWasted} hrs/wk × 52 weeks` },
                { l: 'Estimated Annual Savings with AI (70% automation)', v: `$${calcROI.annualSaved.toLocaleString()}`, c: '#22C55E', desc: null },
                { l: 'Hours Recaptured Per Year', v: `${calcROI.hoursSaved.toLocaleString()} hrs`, c: M, desc: `Equivalent to ${Math.round(calcROI.hoursSaved / 2000)} full-time employees` },
              ].map((item, i) => (
                <div key={i} className="mb-4 bg-white/[0.02] border-l-2 rounded-xl p-4" style={{ borderColor: item.c }}>
                  <div className="text-[10px] font-mono font-bold mb-1" style={{ color: item.c }}>{item.l.toUpperCase()}</div>
                  <div className="text-2xl font-mono font-bold mb-1" style={{ color: item.c }}>{item.v}</div>
                  {item.desc && <div className="text-[10px] text-white/30 font-body">{item.desc}</div>}
                </div>
              ))}
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 mt-2 py-3.5 rounded-xl text-sm font-sans font-bold text-black no-underline transition-all"
                style={{ background: `linear-gradient(135deg, ${M}, ${ML})`, boxShadow: `0 4px 20px rgba(200,164,21,0.2)` }}>
                <Calendar size={14} /> Turn This Into Your Custom Plan
              </a>
            </div>
          </div>
        )}

        {/* ═══════════ BOTTOM CTA */}
        <div className="mt-8 rounded-2xl p-10 text-center relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, rgba(200,164,21,0.22) 0%, rgba(200,164,21,0.08) 50%, rgba(255,202,40,0.15) 100%)`,
            border: `1px solid rgba(200,164,21,0.45)`,
            boxShadow: `0 0 80px rgba(200,164,21,0.12), inset 0 1px 0 rgba(255,202,40,0.25), 0 1px 0 rgba(200,164,21,0.2)`,
          }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-32 rounded-full opacity-20"
              style={{ background: `radial-gradient(ellipse, ${ML} 0%, transparent 70%)`, filter: 'blur(20px)' }} />
          </div>
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-mono font-bold tracking-[0.3em] uppercase mb-4"
              style={{ background: 'rgba(200,164,21,0.2)', border: `1px solid rgba(200,164,21,0.4)`, color: ML }}>
              <Sparkles size={8} /> Ready to Build?
            </div>
            <div className="font-sans text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
              Let's map your AI roadmap — <span className="text-gradient-mustard">free</span>.
            </div>
            <p className="text-sm text-white/55 font-body max-w-lg mx-auto mb-8 leading-relaxed">
              Run your AI audit above, or book a call and we'll walk you through exactly what to build, in what order, and what it'll return.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button onClick={() => setShowAudit(true)}
                className="flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-sans font-bold text-[#0a0804] transition-all hover:scale-[1.02]"
                style={{ background: `linear-gradient(135deg, ${M}, ${ML})`, boxShadow: `0 6px 30px rgba(200,164,21,0.40)` }}>
                <Sparkles size={15} /> Run Free AI Audit
              </button>
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-sans font-semibold transition-all hover:scale-[1.02] no-underline"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>
                <Calendar size={14} /> Book a Strategy Call
              </a>
            </div>
          </div>
        </div>

        {/* Footer tag */}
        <div className="text-center mt-6 text-[10px] text-white/20 font-mono">
          Powered by{' '}
          <a href="https://modernmustardseed.com" className="hover:text-mustard-400 transition-colors" style={{ color: M }}>Modern Mustard Seed</a>
          {' '}· We Build Your AI
        </div>

      </div>
    </div>
  );
};

export default AIAuditEngine;
