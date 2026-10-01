interface QuestionTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function QuestionTypeSelector({ value, onChange }: QuestionTypeSelectorProps) {
  const options = [
    { value: "RADIO", label: "Radio (Single Choice)", desc: "Customers select exactly one option." },
    { value: "CHECKBOX", label: "Checkbox (Multiple Choice)", desc: "Customers select one or more options." },
    { value: "DROPDOWN", label: "Dropdown (Single Selection)", desc: "Single selection from a compact dropdown menu." },
    { value: "DROPDOWN_MULTI", label: "Dropdown (Multiple Selection)", desc: "Select multiple choices from a dropdown list." }
  ];

  return (
    <div className="mb-6">
      <label className="text-sm font-bold text-slate-900 block mb-2">Question Type</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <div
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 shadow-sm ${isSelected
                  ? "border-brand-600 bg-brand-50/20"
                  : "border-slate-200 hover:border-slate-350 hover:bg-slate-50/20 bg-white"
                }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="questionType"
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => { }}
                  className="accent-brand-600 cursor-pointer w-4 h-4"
                />
                <span className="font-bold text-sm text-slate-800">{opt.label}</span>
              </div>
              <div className="text-[12px] text-slate-500 mt-1.5 ml-6.5 leading-relaxed font-medium">{opt.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
