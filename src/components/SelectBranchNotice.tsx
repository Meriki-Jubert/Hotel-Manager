import React from 'react';
import { useHMS } from '../context/HMSContext';
import { useT } from '../i18n/LanguageContext';
import { Building2, ArrowRight } from 'lucide-react';

interface SelectBranchNoticeProps {
  screenName: string;
  description?: string;
}

export const SelectBranchNotice: React.FC<SelectBranchNoticeProps> = ({
  screenName,
  description
}) => {
  const { branches, setActiveBranchId } = useHMS();
  const { t } = useT();
  const activeBranches = branches.filter((b) => b.isActive);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-sm space-y-5 animate-in fade-in">
      <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center mx-auto shadow-xs">
        <Building2 className="w-7 h-7" />
      </div>
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-slate-900">{t('branchNotice.title')}</h3>
        {screenName && (
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mt-1">
            {screenName}
          </p>
        )}
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          {description || t('branchNotice.description')}
        </p>
      </div>
      <div className="pt-2">
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          {t('branchNotice.choosePrompt')}
        </label>
        <div className="grid grid-cols-1 gap-2.5 max-w-sm mx-auto">
          {activeBranches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => setActiveBranchId(branch.id)}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/60 text-left transition-all group cursor-pointer"
            >
              <div>
                <div className="font-bold text-xs text-slate-900 group-hover:text-teal-700">
                  {branch.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  {branch.city || t('branchNotice.unassigned')}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
