import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle, 
  Play,
  Users,
  Shield,
  AlertTriangle,
  ClipboardCheck,
  BookOpen,
  Settings,
  Sparkles
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    text: string;
    onClick: () => void;
  };
}

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Safedify AI! 🎉',
      description: 'Your intelligent Health, Safety & Environment (HSE) management platform. Let\'s take a quick tour to help you get started.',
      icon: <Sparkles className="w-8 h-8 text-blue-500" />
    },
    {
      id: 'dashboard',
      title: 'Your Safety Dashboard',
      description: 'Monitor your safety metrics, track incidents, and get AI-powered insights about your workplace safety performance in real-time.',
      icon: <Shield className="w-8 h-8 text-green-500" />
    },
    {
      id: 'incidents',
      title: 'Incident Reporting',
      description: 'Quickly report safety incidents, near misses, and observations. Our AI helps classify incidents and suggests corrective actions.',
      icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
      action: {
        text: 'Report Your First Incident',
        onClick: () => {
          window.location.hash = '/incidents/new';
          onComplete();
        }
      }
    },
    {
      id: 'inspections',
      title: 'Safety Inspections',
      description: 'Create and manage safety inspections with customizable checklists. Track compliance and identify trends.',
      icon: <ClipboardCheck className="w-8 h-8 text-purple-500" />,
      action: {
        text: 'Start First Inspection',
        onClick: () => {
          window.location.hash = '/inspections/new';
          onComplete();
        }
      }
    },
    {
      id: 'training',
      title: 'Training Management',
      description: 'Track worker training, manage certifications, and ensure compliance with safety requirements.',
      icon: <BookOpen className="w-8 h-8 text-indigo-500" />,
      action: {
        text: 'Explore Training',
        onClick: () => {
          window.location.hash = '/training';
          onComplete();
        }
      }
    },
    {
      id: 'team',
      title: 'Manage Your Team',
      description: 'Add team members, assign roles, and track their safety performance and training progress.',
      icon: <Users className="w-8 h-8 text-pink-500" />,
      action: {
        text: 'Add Team Members',
        onClick: () => {
          window.location.hash = '/workers';
          onComplete();
        }
      }
    },
    {
      id: 'settings',
      title: 'Customize Your Workspace',
      description: 'Configure your organization settings, notification preferences, and integrate with your existing systems.',
      icon: <Settings className="w-8 h-8 text-gray-500" />,
      action: {
        text: 'Open Settings',
        onClick: () => {
          window.location.hash = '/profile';
          onComplete();
        }
      }
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onSkip, 300);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 relative">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            {currentStepData.icon}
            <div>
              <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm opacity-90">
                  Step {currentStep + 1} of {steps.length}
                </span>
                <div className="flex-1 bg-white bg-opacity-20 rounded-full h-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            {currentStepData.description}
          </p>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index <= currentStep
                    ? 'bg-blue-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Action Button */}
          {currentStepData.action && (
            <div className="mb-6">
              <button
                onClick={currentStepData.action.onClick}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                {currentStepData.action.text}
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isFirstStep
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip Tour
              </button>
              
              <button
                onClick={handleNext}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Get Started
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Quick Start Cards Component
export const QuickStartCards: React.FC = () => {
  const quickActions = [
    {
      title: 'Report First Incident',
      description: 'Start by reporting a safety incident or near miss',
      icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
      href: '/incidents/new',
      color: 'from-yellow-400 to-orange-500'
    },
    {
      title: 'Create Inspection',
      description: 'Set up your first safety inspection checklist',
      icon: <ClipboardCheck className="w-6 h-6 text-green-500" />,
      href: '/inspections/new',
      color: 'from-green-400 to-blue-500'
    },
    {
      title: 'Add Team Members',
      description: 'Invite your team to join your safety program',
      icon: <Users className="w-6 h-6 text-purple-500" />,
      href: '/workers',
      color: 'from-purple-400 to-pink-500'
    },
    {
      title: 'Setup Training',
      description: 'Configure training modules and requirements',
      icon: <BookOpen className="w-6 h-6 text-indigo-500" />,
      href: '/training',
      color: 'from-indigo-400 to-purple-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {quickActions.map((action, index) => (
        <a
          key={index}
          href={`#${action.href}`}
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
            {action.icon}
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
          <p className="text-sm text-gray-600">{action.description}</p>
          <div className="mt-4 text-blue-500 text-sm font-medium group-hover:text-blue-600">
            Get Started →
          </div>
        </a>
      ))}
    </div>
  );
};