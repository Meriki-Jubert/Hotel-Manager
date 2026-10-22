import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface DeactivatePromptState {
  isOpen: boolean;
  type: 'room_type' | 'room' | 'branch';
  id: string;
  title: string;
  message: string;
}

export interface DeactivatePromptModalProps {
  prompt: DeactivatePromptState;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeactivatePromptModal: React.FC<DeactivatePromptModalProps> = ({
  prompt,
  onCancel,
  onConfirm
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-3 text-amber-600">
          <div className="p-2.5 rounded-full bg-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">{prompt.title}</h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {prompt.message}
        </p>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm cursor-pointer"
          >
            Deactivate Instead
          </button>
        </div>
      </div>
    </div>
  );
};
