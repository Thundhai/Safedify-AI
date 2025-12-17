
import React from 'react';
import { Check, X, ShieldCheck, Zap, Building2, Crown, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SubscriptionTier } from '../types';
import { useNavigate } from 'react-router-dom';

export const PricingPlans: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePlanClick = (tier: SubscriptionTier) => {
      if (!user) {
          navigate('/register');
          return;
      }
      // In a real app, trigger Stripe checkout or plan change modal
      if (tier === SubscriptionTier.ENTERPRISE) {
          window.location.href = 'mailto:sales@safedify.com';
      } else {
          alert(`Switching to ${tier} plan... (Demo)`);
      }
  };

  const plans = [
    {
      name: 'Basic',
      price: '$0',
      period: '/mo',
      tier: SubscriptionTier.FREE,
      desc: 'Essential safety reporting for small teams.',
      features: [
        'Unlimited Incident Reports',
        'Basic Inspections (3 Templates)',
        'Observation Cards',
        'Standard Export (PDF)',
        '1 Admin User',
        'Community Support'
      ],
      missing: [
        'AI Analysis & Root Cause',
        'Smart Camera (Hazard Detection)',
        'Custom Forms & Workflows',
        'API Integrations',
        'Dedicated Success Manager'
      ],
      color: 'bg-slate-100',
      btnColor: 'bg-slate-800 text-white',
      icon: ShieldCheck
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/user/mo',
      tier: SubscriptionTier.PRO,
      popular: true,
      desc: 'Advanced tools & AI for growing companies.',
      features: [
        'Everything in Basic',
        'AI Risk Assessments',
        'Smart Camera & PPE Detection',
        'Advanced Analytics & Trends',
        'Unlimited Inspection Templates',
        'Priority Email Support',
        '50GB Document Storage'
      ],
      missing: [
        'SAP / Oracle Integration',
        'SSO (Single Sign-On)',
        'Unlimited Sites',
        'SLA Guarantee'
      ],
      color: 'bg-blue-50 border-blue-200',
      btnColor: 'bg-blue-600 text-white',
      icon: Zap
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      tier: SubscriptionTier.ENTERPRISE,
      desc: 'Full-scale solution for global organizations.',
      features: [
        'Everything in Pro',
        'Unlimited Users & Sites',
        'Custom ERP Integrations (SAP/Oracle/Odoo)',
        'SSO & Active Directory',
        'Dedicated Success Manager',
        'Custom AI Model Training',
        '99.9% Uptime SLA',
        'On-premise Deployment Option'
      ],
      missing: [],
      color: 'bg-slate-900 text-white',
      btnColor: 'bg-white text-slate-900',
      icon: Building2
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Choose the plan that fits your safety needs. From basic reporting to enterprise-grade AI integration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div 
            key={plan.name} 
            className={`rounded-2xl p-8 relative flex flex-col h-full border transition-transform hover:-translate-y-1 duration-300 ${
              plan.popular ? 'border-blue-500 shadow-xl ring-4 ring-blue-500/10' : 'border-slate-200 shadow-lg'
            } ${plan.tier === SubscriptionTier.ENTERPRISE ? 'bg-slate-900 text-white' : 'bg-white'}`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-md whitespace-nowrap">
                <Crown size={12} className="text-yellow-300" /> Most Popular
              </div>
            )}

            <div className="mb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  plan.tier === SubscriptionTier.ENTERPRISE ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-600'
              }`}>
                  <plan.icon size={24} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${plan.tier === SubscriptionTier.ENTERPRISE ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
              <p className={`text-sm ${plan.tier === SubscriptionTier.ENTERPRISE ? 'text-slate-400' : 'text-slate-500'}`}>{plan.desc}</p>
            </div>

            <div className="mb-6">
              <span className={`text-4xl font-bold ${plan.tier === SubscriptionTier.ENTERPRISE ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
              <span className={`text-sm ${plan.tier === SubscriptionTier.ENTERPRISE ? 'text-slate-400' : 'text-slate-500'}`}>{plan.period}</span>
            </div>

            <button 
              onClick={() => handlePlanClick(plan.tier)}
              className={`w-full py-3 rounded-xl font-bold mb-8 transition-colors ${plan.btnColor} ${
                  user?.tier === plan.tier ? 'opacity-50 cursor-default' : 'hover:opacity-90'
              }`}
            >
              {!user 
                ? 'Get Started' 
                : user.tier === plan.tier 
                    ? 'Current Plan' 
                    : plan.tier === SubscriptionTier.ENTERPRISE 
                        ? 'Contact Sales' 
                        : 'Switch Plan'
              }
            </button>

            <div className="flex-1 space-y-4">
              {plan.features.map((feat) => (
                <div key={feat} className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      plan.tier === SubscriptionTier.ENTERPRISE ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                  }`}>
                    <Check size={12} />
                  </div>
                  <span className={`text-sm ${plan.tier === SubscriptionTier.ENTERPRISE ? 'text-slate-300' : 'text-slate-600'}`}>{feat}</span>
                </div>
              ))}
              
              {plan.missing.map((feat) => (
                <div key={feat} className="flex items-start gap-3 opacity-50">
                  <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-slate-100 text-slate-400">
                    <X size={12} />
                  </div>
                  <span className="text-sm text-slate-500">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
          <div className="inline-flex p-3 bg-blue-50 rounded-xl mb-4">
              <Layers className="text-blue-600" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Enterprise Ecosystem</h2>
          <p className="text-slate-600 max-w-3xl mx-auto mb-8">
              Need to connect Safedify with your existing ERP? We support custom API integrations with SAP, Oracle, Microsoft Dynamics 365, Odoo, and other major project management systems.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
              <div className="px-6 py-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 font-bold text-lg hover:border-slate-300 transition-colors">
                  SAP
              </div>
              <div className="px-6 py-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 font-bold text-lg hover:border-slate-300 transition-colors">
                  ORACLE
              </div>
              <div className="px-6 py-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 font-bold text-lg hover:border-slate-300 transition-colors">
                  Microsoft
              </div>
              <div className="px-6 py-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 font-bold text-lg hover:border-slate-300 transition-colors">
                  Salesforce
              </div>
              <div className="px-6 py-3 bg-purple-50 rounded-lg border border-purple-200 text-purple-700 font-bold text-lg hover:border-purple-300 transition-colors">
                  Odoo
              </div>
          </div>
      </div>
    </div>
  );
};
