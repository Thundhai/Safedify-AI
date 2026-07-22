import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { getLiftingPlanById, saveLiftingPlan } from '../services/storageService';
import { LiftingEquipmentType, LiftingPlan, LiftingPlanRecord, LiftingPlanStatus } from '../types';
import { LiftingPlanSection } from './LiftingPlanSection';

const createDefaultLiftingPlan = (): LiftingPlan => ({
  equipmentType: LiftingEquipmentType.MOBILE_CRANE,
  loadWeight: null,
  riggingWeight: null,
  dynamicFactor: 1.1,
  parameters: {
    boomLength: null,
    boomAngle: null,
    workingRadius: null,
    hookHeight: null,
    outriggerSpread: null,
    ratedCapacity: null
  },
  status: LiftingPlanStatus.DRAFT,
  attachedToPermit: false
});

export const LiftingPlanForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [formData, setFormData] = useState<LiftingPlanRecord>({
    id: `lift-${Date.now()}`,
    title: '',
    location: '',
    description: '',
    date: new Date().toISOString(),
    author: 'Current User',
    plan: createDefaultLiftingPlan()
  });

  useEffect(() => {
    if (!isNew && id) {
      const existing = getLiftingPlanById(id);
      if (existing) {
        setFormData(existing);
      }
    }
  }, [id, isNew]);

  const handleSave = () => {
    if (!formData.title.trim()) {
      alert('Lifting plan title is required.');
      return;
    }
    saveLiftingPlan(formData);
    alert('Lifting plan saved.');
    navigate('/lifting-plans');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/lifting-plans')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">{isNew ? 'New Lifting Plan' : 'Edit Lifting Plan'}</h1>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">
          <Save size={18} /> Save Plan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Plan Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Plan Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              placeholder="e.g. Lift Generator to Roof"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              placeholder="Site or area"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
            placeholder="Short method description..."
          />
        </div>
      </div>

      <LiftingPlanSection
        value={formData.plan}
        readOnly={false}
        showAttachmentControl={false}
        onChange={plan => setFormData({ ...formData, plan })}
      />
    </div>
  );
};

