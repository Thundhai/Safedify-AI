import React from 'react';
import { 
  Plus,
  AlertTriangle,
  ClipboardCheck,
  Users,
  FileText,
  BookOpen,
  Shield,
  Calendar,
  Database
} from 'lucide-react';

interface EmptyStateProps {
  type: 'incidents' | 'observations' | 'inspections' | 'workers' | 'documents' | 'training' | 'assets' | 'contractors' | 'permits' | 'dashboard';
  title?: string;
  description?: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionText,
  actionHref,
  onAction
}) => {
  const getEmptyStateConfig = () => {
    switch (type) {
      case 'incidents':
        return {
          icon: <AlertTriangle className="w-16 h-16 text-yellow-500" />,
          title: title || 'No Incidents Reported Yet',
          description: description || 'Start building your safety record by reporting incidents, near misses, and observations. Our AI will help you identify patterns and suggest improvements.',
          actionText: actionText || 'Report First Incident',
          actionHref: actionHref || '/incidents/new',
          tips: [
            'Report both incidents and near misses',
            'Include photos and detailed descriptions',
            'Use our AI to get safety recommendations'
          ]
        };

      case 'observations':
        return {
          icon: <ClipboardCheck className="w-16 h-16 text-blue-500" />,
          title: title || 'No Safety Observations',
          description: description || 'Safety observations help identify potential hazards before they become incidents. Start documenting what you see in the field.',
          actionText: actionText || 'Add First Observation',
          actionHref: actionHref || '/observations/new',
          tips: [
            'Document unsafe conditions and behaviors',
            'Note positive safety practices too',
            'Regular observations improve safety culture'
          ]
        };

      case 'inspections':
        return {
          icon: <Shield className="w-16 h-16 text-green-500" />,
          title: title || 'No Inspections Created',
          description: description || 'Regular safety inspections are crucial for maintaining a safe workplace. Create customizable checklists for different areas and equipment.',
          actionText: actionText || 'Create First Inspection',
          actionHref: actionHref || '/inspections/new',
          tips: [
            'Create area-specific checklists',
            'Schedule regular inspections',
            'Track compliance over time'
          ]
        };

      case 'workers':
        return {
          icon: <Users className="w-16 h-16 text-purple-500" />,
          title: title || 'No Team Members Added',
          description: description || 'Build your safety team by adding workers, contractors, and supervisors. Track their training, certifications, and safety performance.',
          actionText: actionText || 'Add Team Members',
          actionHref: actionHref || '/workers/new',
          tips: [
            'Add all workers and contractors',
            'Track training and certifications',
            'Assign appropriate roles and permissions'
          ]
        };

      case 'documents':
        return {
          icon: <FileText className="w-16 h-16 text-indigo-500" />,
          title: title || 'No Documents Uploaded',
          description: description || 'Store and manage your safety documents, procedures, and policies in one secure location. Keep everything organized and accessible.',
          actionText: actionText || 'Upload First Document',
          actionHref: actionHref || '/documents/new',
          tips: [
            'Upload safety procedures and policies',
            'Keep documents current and accessible',
            'Organize by categories and tags'
          ]
        };

      case 'training':
        return {
          icon: <BookOpen className="w-16 h-16 text-orange-500" />,
          title: title || 'No Training Programs',
          description: description || 'Create and manage training programs to ensure your team stays current with safety requirements and best practices.',
          actionText: actionText || 'Create Training Program',
          actionHref: actionHref || '/training/new',
          tips: [
            'Track mandatory safety training',
            'Set up renewal reminders',
            'Monitor completion rates'
          ]
        };

      case 'assets':
        return {
          icon: <Database className="w-16 h-16 text-cyan-500" />,
          title: title || 'No Assets Registered',
          description: description || 'Track your equipment, machinery, and other assets. Monitor their safety status, maintenance schedules, and inspection history.',
          actionText: actionText || 'Register First Asset',
          actionHref: actionHref || '/assets/new',
          tips: [
            'Register all equipment and machinery',
            'Track maintenance schedules',
            'Monitor safety compliance'
          ]
        };

      case 'contractors':
        return {
          icon: <Users className="w-16 h-16 text-pink-500" />,
          title: title || 'No Contractors Added',
          description: description || 'Manage your contractor relationships, track their safety performance, and ensure they meet your safety standards.',
          actionText: actionText || 'Add First Contractor',
          actionHref: actionHref || '/contractors/new',
          tips: [
            'Verify contractor safety credentials',
            'Track their safety performance',
            'Ensure compliance with standards'
          ]
        };

      case 'permits':
        return {
          icon: <Calendar className="w-16 h-16 text-red-500" />,
          title: title || 'No Work Permits',
          description: description || 'Manage work permits for high-risk activities. Ensure proper authorization and safety measures are in place before work begins.',
          actionText: actionText || 'Create Work Permit',
          actionHref: actionHref || '/permits/new',
          tips: [
            'Issue permits for high-risk work',
            'Verify safety precautions',
            'Track permit status and expiry'
          ]
        };

      case 'dashboard':
      default:
        return {
          icon: <Shield className="w-16 h-16 text-blue-500" />,
          title: title || 'Welcome to Your Safety Dashboard',
          description: description || 'Start by adding some data to see your safety metrics and insights. The more information you add, the better our AI can help you improve safety.',
          actionText: actionText || 'Get Started',
          actionHref: actionHref || '/incidents/new',
          tips: [
            'Start with incident reporting',
            'Add your team members',
            'Create inspection checklists'
          ]
        };
    }
  };

  const config = getEmptyStateConfig();

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (config.actionHref) {
      window.location.hash = config.actionHref;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto">
      <div className="mb-6 opacity-80">
        {config.icon}
      </div>
      
      <h3 className="text-2xl font-bold text-gray-900 mb-4">
        {config.title}
      </h3>
      
      <p className="text-gray-600 mb-8 max-w-md">
        {config.description}
      </p>

      {config.actionText && (
        <button
          onClick={handleAction}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 mb-8"
        >
          <Plus className="w-5 h-5" />
          {config.actionText}
        </button>
      )}

      {config.tips && (
        <div className="bg-gray-50 rounded-lg p-6 w-full max-w-md">
          <h4 className="font-semibold text-gray-900 mb-3">💡 Pro Tips:</h4>
          <ul className="text-left space-y-2">
            {config.tips.map((tip, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};