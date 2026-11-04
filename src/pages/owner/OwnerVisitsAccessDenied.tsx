import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, MessageSquareText } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const OwnerVisitsAccessDenied: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto my-12 p-8 sm:p-12 bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-brand text-center space-y-6 animate-fadeIn">
      <div className="w-16 h-16 rounded-3xl bg-colin-teal/10 text-colin-teal flex items-center justify-center mx-auto border border-colin-teal/20">
        <ShieldCheck size={36} className="text-colin-teal" />
      </div>

      <div className="space-y-2 max-w-lg mx-auto">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-colin-teal bg-colin-teal/10 px-3 py-1 rounded-full border border-colin-teal/20 inline-block">
          Centralized Platform Coordination
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-colin-navy font-display tracking-tight">
          Visit Management is Exclusively Controlled by COLIN
        </h1>
        <p className="text-xs sm:text-sm text-colin-charcoal-500 leading-relaxed">
          In accordance with platform safety and verified zero-brokerage standards, property owners do not manage, schedule, or approve student visit slot passes. All in-person property tours are mediated by verified COLIN campus coordinators and physically escorted by student ambassadors.
        </p>
      </div>

      <div className="p-4 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 max-w-md mx-auto text-xs text-colin-charcoal-600 text-left space-y-2">
        <div className="font-bold text-colin-navy">Platform Coordination Policy</div>
        <ul className="list-disc pl-4 space-y-1 text-[11px] text-colin-charcoal-500">
          <li>Students reserve inspection slot passes with ₹150 pre-authorization.</li>
          <li>A verified COLIN campus ambassador escorts the scholar on-site.</li>
          <li>After physical inspection, the student has 12 hours to submit their final decision.</li>
          <li>Host availability is coordinated through the Student Enquiry pipeline.</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link to="/owner/dashboard">
          <Button variant="primary" size="md" className="gap-2 font-bold text-xs">
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
        <Link to="/owner/enquiries">
          <Button variant="outline" size="md" className="gap-2 font-bold text-xs">
            <MessageSquareText size={16} />
            <span>View Student Enquiries</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
