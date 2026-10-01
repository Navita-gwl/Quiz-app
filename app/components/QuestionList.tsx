import { useFetcher } from "react-router";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  GripVertical, 
  Edit2, 
  Trash2,
  List,
  Inbox
} from "lucide-react";

import { useConfirmDialog } from "./ConfirmDialog";
import { QUESTION_TITLE_SOFT_MAX_LENGTH } from "../utils/validation";

const QUESTION_LIST_PREVIEW_MAX = QUESTION_TITLE_SOFT_MAX_LENGTH;

interface Question {
  id: string;
  text: string;
  type: "RADIO" | "CHECKBOX" | "DROPDOWN" | "DROPDOWN_MULTI";
  optionType?: "text" | "image";
  options: unknown;
  createdAt: string | Date;
}

interface QuestionListProps {
  questions: Question[];
  onEdit: (question: Question) => void;
}

interface SortableRowProps {
  question: Question;
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function SortableRow({ question, onEdit, onDelete, isDeleting }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "RADIO":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            Radio
          </span>
        );
      case "CHECKBOX":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-100">
            Checkbox
          </span>
        );
      case "DROPDOWN":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
            Dropdown (Single)
          </span>
        );
      case "DROPDOWN_MULTI":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-100">
            Dropdown (Multi)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-100">
            {type}
          </span>
        );
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const getOptionsDisplay = (options: unknown, optionType?: "text" | "image") => {
    if (!Array.isArray(options) || options.length === 0) return "—";

    const count = options.length;
    const countLabel = count === 1 ? "1 option" : `${count} options`;

    if (optionType === "image") {
      return `Image (${countLabel})`;
    }

    return countLabel;
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-slate-100 align-middle hover:bg-slate-50/60 transition-colors ${isDragging ? "bg-slate-50 shadow-sm" : ""}`}
    >
      <td className="px-4 py-4 w-12 text-center">
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-4 py-4 max-w-0 w-[38%]">
        <div
          className="font-bold text-[14px] text-slate-800 tracking-tight leading-snug break-words min-w-0"
          style={{ overflowWrap: "anywhere" }}
          title={question.text}
        >
          {truncateText(question.text, QUESTION_LIST_PREVIEW_MAX)}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        {getTypeBadge(question.type)}
      </td>
      <td className="px-4 py-4 max-w-[200px]">
        <div className="text-xs text-slate-500 font-medium truncate">
          {getOptionsDisplay(question.options, question.optionType)}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">
        {new Date(question.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        })}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onEdit(question)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(question.id)}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50/50 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all duration-150 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function QuestionList({ questions, onEdit }: QuestionListProps) {
  const fetcher = useFetcher();
  const { confirm } = useConfirmDialog();

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete Question?",
      message: "Are you sure you want to delete this question? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    fetcher.submit(
      {},
      {
        method: "POST",
        action: `/api/questions/${id}/delete`,
      }
    );
  };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4">
          <Inbox className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">No questions yet</h3>
        <p className="text-slate-500 text-sm max-w-sm mt-1 leading-relaxed">
          Get started by adding questions to structure your custom storefront product recommendation quiz.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left table-fixed">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-semibold text-xs uppercase bg-slate-50/50">
              <th className="px-4 py-3.5 w-12 text-center"></th>
              <th className="px-4 py-3.5">Question</th>
              <th className="px-4 py-3.5">Type</th>
              <th className="px-4 py-3.5">Options</th>
              <th className="px-4 py-3.5">Created</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {questions.map((question) => (
              <SortableRow
                key={question.id}
                question={question}
                onEdit={onEdit}
                onDelete={handleDelete}
                isDeleting={fetcher.state === "submitting" && fetcher.formAction?.includes(question.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
