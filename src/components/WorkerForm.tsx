import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getWorkerById, saveWorker, updateWorker, getContractors } from '../services/storageService';
import { WorkerProfile, Contractor } from '../types';
import { 
  User, Building, Calendar, Award, Save, ArrowLeft, 
  Briefcase, Users, Mail, Phone
} from 'lucide-react';

export const WorkerForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [formData, setFormData] = useState<Partial<WorkerProfile>>({
    name: '',
    role: '',
    department: '',
    joinedDate: new Date().toISOString().split('T')[0],
    companyId: '',
    points: 0,
    level: 'Novice',
    badges: [],
    email: '',
    phone: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      setContractors(await getContractors());
      
      if (isEdit && id) {
        const worker = await getWorkerById(id);
        if (worker) {
          setFormData({
            ...worker,
            joinedDate: worker.joinedDate.split('T')[0] // Format for date input
          });
        } else {
          navigate('/workers');
        }
      }
    };
    load();
  }, [id, isEdit, navigate]);

  const handleInputChange = (field: keyof WorkerProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.role?.trim()) {
      newErrors.role = 'Role is required';
    }

    if (!formData.department?.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!formData.joinedDate) {
      newErrors.joinedDate = 'Join date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const worker: WorkerProfile = {
      id: isEdit ? id! : `worker-${Date.now()}`,
      name: formData.name!,
      role: formData.role!,
      department: formData.department!,
      joinedDate: formData.joinedDate!,
      companyId: formData.companyId || undefined,
      points: formData.points || 0,
      level: formData.level || 'Novice',
      badges: formData.badges || [],
      email: formData.email,
      phone: formData.phone
    };

    try {
      if (isEdit) {
        await updateWorker(worker);
      } else {
        await saveWorker(worker);
      }
      
      navigate('/workers');
    } catch (error) {
      console.error('Error saving worker:', error);
      alert('Failed to save worker. Please try again.');
    }
  };

  const departments = [
    'Operations',
    'Maintenance',
    'Construction',
    'Engineering',
    'Safety',
    'Administration',
    'Quality',
    'Logistics',
    'Security',
    'Other'
  ];

  const roles = [
    'General Worker',
    'Supervisor',
    'Manager',
    'Safety Officer',
    'Welder',
    'Electrician',
    'Mechanical Technician',
    'Operator',
    'Inspector',
    'Engineer',
    'Foreman',
    'Security Guard',
    'Administrative',
    'Other'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/workers')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
          aria-label="Go back to workers list"
          title="Return to workers list"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isEdit ? 'Edit Worker' : 'Add New Worker'}
          </h2>
          <p className="text-slate-500">
            {isEdit ? 'Update worker information and details' : 'Add a new team member to your safety program'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-slate-200'
                  }`}
                  placeholder="Enter full name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Join Date *
                </label>
                <input
                  type="date"
                  value={formData.joinedDate || ''}
                  onChange={(e) => handleInputChange('joinedDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.joinedDate ? 'border-red-300' : 'border-slate-200'
                  }`}
                />
                {errors.joinedDate && <p className="text-red-500 text-sm mt-1">{errors.joinedDate}</p>}
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Work Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role/Position *
                </label>
                <select
                  value={formData.role || ''}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.role ? 'border-red-300' : 'border-slate-200'
                  }`}
                >
                  <option value="">Select role</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Department *
                </label>
                <select
                  value={formData.department || ''}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.department ? 'border-red-300' : 'border-slate-200'
                  }`}
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Employment Type
                </label>
                <select
                  value={formData.companyId || 'direct'}
                  onChange={(e) => handleInputChange('companyId', e.target.value === 'direct' ? '' : e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="direct">Direct Employee</option>
                  {contractors.map(contractor => (
                    <option key={contractor.id} value={contractor.id}>
                      Contractor - {contractor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Safety Level
                </label>
                <select
                  value={formData.level || 'Novice'}
                  onChange={(e) => handleInputChange('level', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Novice">Novice</option>
                  <option value="Safety Pro">Safety Pro</option>
                  <option value="Safety Champ">Safety Champ</option>
                  <option value="Safety Legend">Safety Legend</option>
                </select>
              </div>
            </div>
          </div>

          {/* Safety Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Safety Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Safety Points
                </label>
                <input
                  type="number"
                  value={formData.points || 0}
                  onChange={(e) => handleInputChange('points', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  placeholder="0"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Points earned through safety activities and good practices
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Safety Badges
                </label>
                <input
                  type="text"
                  value={formData.badges?.join(', ') || ''}
                  onChange={(e) => handleInputChange('badges', e.target.value.split(',').map(b => b.trim()).filter(Boolean))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Action Hero, Safety Star (comma separated)"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter badges separated by commas
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/workers')}
              className="px-4 py-2 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isEdit ? 'Update Worker' : 'Add Worker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};