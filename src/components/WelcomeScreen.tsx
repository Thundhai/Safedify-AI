import React, { useState } from 'react';
import { 
  Sparkles, 
  Shield, 
  Users, 
  BarChart, 
  Bell,
  CheckCircle,
  ArrowRight,
  Play,
  FileText,
  AlertTriangle,
  Wifi,
  Globe
} from 'lucide-react';
import { OnboardingTour, QuickStartCards } from './OnboardingTour';

interface WelcomeScreenProps {
  onComplete: () => void;
  userName?: string;
  organizationName?: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onComplete, 
  userName = 'there',
  organizationName
}) => {
  const [showTour, setShowTour] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const features = [
    {
      icon: <Shield className="w-8 h-8 text-green-500" />,
      title: 'AI-Powered Safety',
      description: 'AI chat assistant, executive reports, and smart auto-complete for faster workflows'
    },
    {
      icon: <BarChart className="w-8 h-8 text-purple-500" />,
      title: 'Analytics & KPIs',
      description: 'TRIR, LTIFR, risk matrix, trend charts, and exportable PDF reports'
    },
    {
      icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
      title: 'Incidents & Risk',
      description: 'Report incidents, run risk assessments, log observations, and track corrective actions'
    },
    {
      icon: <FileText className="w-8 h-8 text-blue-500" />,
      title: 'Permits & Documents',
      description: 'Manage permits-to-work, upload documents, and maintain full audit trails'
    },
    {
      icon: <Users className="w-8 h-8 text-pink-500" />,
      title: 'Team & Training',
      description: 'Manage workers, contractors, certifications, and PPE assignments'
    },
    {
      icon: <Globe className="w-8 h-8 text-indigo-500" />,
      title: 'Multi-site & Offline',
      description: 'Works offline as a PWA — data syncs automatically when back online'
    }
  ];

  const setupSteps = [
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Set your name, role, and notification preferences',
      completed: completedSteps.includes('profile'),
      action: () => {
        window.location.hash = '/profile';
        markStepCompleted('profile');
      }
    },
    {
      id: 'team',
      title: 'Add Team Members',
      description: 'Register workers and assign roles and PPE',
      completed: completedSteps.includes('team'),
      action: () => {
        window.location.hash = '/workers';
        markStepCompleted('team');
      }
    },
    {
      id: 'first-incident',
      title: 'Report Your First Incident',
      description: 'Log an incident or near miss to see the workflow',
      completed: completedSteps.includes('first-incident'),
      action: () => {
        window.location.hash = '/incidents/new';
        markStepCompleted('first-incident');
      }
    },
    {
      id: 'inspection',
      title: 'Run a Safety Inspection',
      description: 'Use a template checklist to complete your first inspection',
      completed: completedSteps.includes('inspection'),
      action: () => {
        window.location.hash = '/inspections';
        markStepCompleted('inspection');
      }
    },
    {
      id: 'analytics',
      title: 'Review Analytics & KPIs',
      description: 'Check your TRIR, LTIFR, risk matrix, and trend data',
      completed: completedSteps.includes('analytics'),
      action: () => {
        window.location.hash = '/analytics';
        markStepCompleted('analytics');
      }
    },
    {
      id: 'risk',
      title: 'Create a Risk Assessment',
      description: 'Identify hazards and evaluate controls for a task',
      completed: completedSteps.includes('risk'),
      action: () => {
        window.location.hash = '/risk-assessments';
        markStepCompleted('risk');
      }
    }
  ];

  const markStepCompleted = (stepId: string) => {
    setCompletedSteps(prev => [...prev.filter(id => id !== stepId), stepId]);
  };

  const handleStartTour = () => {
    setShowTour(true);
  };

  const handleTourComplete = () => {
    setShowTour(false);
    localStorage.setItem('onboardingCompleted', 'true');
    onComplete();
  };

  const handleSkipTour = () => {
    setShowTour(false);
    localStorage.setItem('onboardingCompleted', 'true');
    onComplete();
  };

  const handleGetStarted = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    onComplete();
  };

  if (showTour) {
    return (
      <OnboardingTour 
        onComplete={handleTourComplete}
        onSkip={handleSkipTour}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-2xl">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Welcome to Safedify AI{organizationName && `, ${organizationName}`}!
          </h1>
          
          <p className="text-xl text-gray-600 mb-6 max-w-3xl mx-auto">
            Hello {userName}! 👋 Your intelligent Health, Safety & Environment platform is ready. 
            Let's get you set up to start managing your workplace safety like never before.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleStartTour}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Play className="w-5 h-5" />
              Take the Tour
            </button>
            
            <button
              onClick={handleGetStarted}
              className="bg-white text-gray-700 px-8 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              Skip Tour & Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            What You Can Do with Safedify AI
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 text-center"
              >
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Setup Checklist */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Quick Setup Checklist
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {setupSteps.map((step, index) => (
              <div
                key={step.id}
                className={`border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
                  step.completed 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={step.action}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center ${
                    step.completed 
                      ? 'bg-green-500 text-white' 
                      : 'border-2 border-gray-300'
                  }`}>
                    {step.completed && <CheckCircle className="w-4 h-4" />}
                    {!step.completed && <span className="text-sm font-medium text-gray-500">{index + 1}</span>}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-1 ${
                      step.completed ? 'text-green-800' : 'text-gray-900'
                    }`}>
                      {step.title}
                    </h3>
                    <p className={`text-sm ${
                      step.completed ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  
                  {!step.completed && (
                    <ArrowRight className="w-5 h-5 text-gray-400 mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Start Cards */}
        <div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Quick Actions to Get Started
          </h2>
          <QuickStartCards />
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">
            Need help? Check out our documentation or contact support.
          </p>
          <button
            onClick={handleGetStarted}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            Continue to Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
};