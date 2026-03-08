import React from 'react';
import { ArrowLeft, Lock, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const LegalPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPrivacy = location.pathname === '/privacy';

  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';
  const icon = isPrivacy
    ? <Lock size={20} className="text-blue-600" />
    : <FileText size={20} className="text-blue-600" />;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">{icon}</div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          </div>

          <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
            {isPrivacy ? (
              <>
                <p><strong>Effective Date: October 2023</strong></p>
                <p>Safedify (&ldquo;we&rdquo;, &ldquo;our&rdquo;) is committed to protecting your privacy. This policy outlines our data practices.</p>
                <h4 className="font-bold text-slate-800 mt-4">1. Information Collection</h4>
                <p>We collect information you provide directly (e.g., incident reports, inspection data, user profiles) and automated usage data.</p>
                <h4 className="font-bold text-slate-800 mt-4">2. Data Usage</h4>
                <p>Your data is used to provide HSE services, generate analytics, and ensure compliance. We do not sell your data.</p>
                <h4 className="font-bold text-slate-800 mt-4">3. Data Retention</h4>
                <p>We retain your data for as long as your account is active or as needed to provide services. You may request deletion at any time.</p>
                <h4 className="font-bold text-slate-800 mt-4">4. Third-Party Services</h4>
                <p>We may use third-party AI services (e.g., Google Gemini) to power AI features. Data sent to these services is governed by their respective privacy policies.</p>
                <h4 className="font-bold text-slate-800 mt-4">5. Contact</h4>
                <p>For privacy-related inquiries, contact us at <span className="text-blue-600">privacy@safedify.com</span>.</p>
              </>
            ) : (
              <>
                <p><strong>Effective Date: October 2023</strong></p>
                <p>By accessing or using Safedify, you agree to be bound by these Terms.</p>
                <h4 className="font-bold text-slate-800 mt-4">1. License to Use</h4>
                <p>We grant you a limited, non-exclusive license to use the platform for internal business safety management.</p>
                <h4 className="font-bold text-slate-800 mt-4">2. User Responsibilities</h4>
                <p>You are responsible for the accuracy of data entered. Safedify is a tool and does not replace professional legal advice.</p>
                <h4 className="font-bold text-slate-800 mt-4">3. Prohibited Use</h4>
                <p>You may not reverse-engineer, modify, or distribute the platform. You may not use Safedify for any unlawful purpose.</p>
                <h4 className="font-bold text-slate-800 mt-4">4. Limitation of Liability</h4>
                <p>Safedify is provided &ldquo;as is&rdquo; without warranty. We are not liable for any indirect, incidental, or consequential damages.</p>
                <h4 className="font-bold text-slate-800 mt-4">5. Termination</h4>
                <p>We may suspend or terminate your account if you violate these Terms. Upon termination, your data will be retained for 30 days before permanent deletion.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
